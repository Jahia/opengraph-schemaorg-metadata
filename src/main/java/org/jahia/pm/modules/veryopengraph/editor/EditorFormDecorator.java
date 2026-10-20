package org.jahia.pm.modules.veryopengraph.editor;

import org.jahia.api.Constants;
import org.jahia.pm.modules.veryopengraph.OpenGraphService;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.osgi.framework.BundleContext;
import org.osgi.framework.InvalidSyntaxException;
import org.osgi.framework.ServiceReference;
import org.osgi.framework.ServiceRegistration;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;
import org.osgi.service.component.annotations.Reference;
import org.osgi.util.tracker.ServiceTracker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;

import static org.osgi.framework.Constants.OBJECTCLASS;
import static org.osgi.framework.Constants.SERVICE_RANKING;

/**
 * Decorates the jContent service {@code EditorFormService}, and removes the section "veryOpenGraph" from the edit form
 * of a node whose type has no mapping on the site of the node.
 * <p>
 * jContent exports no package, so the decorator is a {@link Proxy} on the interface that it loads from the class loader
 * of the jContent service, and it reads the form through reflection. The proxy forwards every method, including a
 * method that a later jContent adds to the interface. It has a higher {@code service.ranking}, so jContent's GraphQL
 * API, which looks the service up on each request, gets the proxy.
 */
@Component(immediate = true)
public class EditorFormDecorator {

    private static final Logger logger = LoggerFactory.getLogger(EditorFormDecorator.class);

    private static final String SERVICE = "org.jahia.modules.contenteditor.api.forms.EditorFormService";
    private static final String DECORATOR_PROPERTY = "vog.decorator";
    private static final int RANKING = 100;
    private static final String SECTION = "veryOpenGraph";

    @Reference
    private OpenGraphService openGraphService;

    private ServiceTracker<Object, ServiceRegistration<?>> tracker;

    @Activate
    public void activate(BundleContext context) throws InvalidSyntaxException {
        // The filter leaves out the proxy itself.
        String filter = "(&(" + OBJECTCLASS + "=" + SERVICE + ")(!(" + DECORATOR_PROPERTY + "=true)))";
        tracker = new ServiceTracker<Object, ServiceRegistration<?>>(context, context.createFilter(filter), null) {
            @Override
            public ServiceRegistration<?> addingService(ServiceReference<Object> reference) {
                Object original = context.getService(reference);
                try {
                    Class<?> type = original.getClass().getClassLoader().loadClass(SERVICE);
                    Object proxy = Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, new Handler(original));
                    Hashtable<String, Object> properties = new Hashtable<>();
                    properties.put(SERVICE_RANKING, RANKING);
                    properties.put(DECORATOR_PROPERTY, true);
                    ServiceRegistration<?> registration = context.registerService(SERVICE, proxy, properties);
                    logger.info("Decorated the Content Editor form service {}", original.getClass().getName());
                    return registration;
                } catch (ClassNotFoundException | RuntimeException e) {
                    logger.error("Cannot decorate the Content Editor form service, so the section {} shows on every type",
                            SECTION, e);
                    context.ungetService(reference);
                    return null;
                }
            }

            @Override
            public void removedService(ServiceReference<Object> reference, ServiceRegistration<?> registration) {
                try {
                    registration.unregister();
                } catch (IllegalStateException e) {
                    logger.debug("The decorator of the Content Editor form service is already unregistered");
                }
                context.ungetService(reference);
            }
        };
        tracker.open();
    }

    @Deactivate
    public void deactivate() {
        tracker.close();
    }

    private final class Handler implements InvocationHandler {

        private final Object original;

        Handler(Object original) {
            this.original = original;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if (method.getDeclaringClass() == Object.class) {
                return objectMethod(proxy, method, args);
            }
            Object result;
            try {
                result = method.invoke(original, args);
            } catch (InvocationTargetException e) {
                throw e.getCause();
            }
            if (result != null && !showsSection(method, args)) {
                removeSection(result);
            }
            return result;
        }

        private Object objectMethod(Object proxy, Method method, Object[] args) {
            switch (method.getName()) {
                case "equals":
                    return proxy == args[0];
                case "hashCode":
                    return System.identityHashCode(proxy);
                default:
                    return "Very Open Graph decorator of " + original;
            }
        }

        /**
         * @return the node of an edit form: the first argument of {@code getEditForm(uuidOrPath, uiLocale, locale)}, or
         * the existing node of {@code getEditorForm(primaryNodeType, existingNode, ...)}. Null for any other method.
         */
        private JCRNodeWrapper editedNode(Method method, Object[] args) throws RepositoryException {
            if ("getEditForm".equals(method.getName()) && args != null && args[0] instanceof String) {
                String uuidOrPath = (String) args[0];
                JCRSessionWrapper session = JCRSessionFactory.getInstance().getCurrentUserSession(Constants.EDIT_WORKSPACE);
                return uuidOrPath.startsWith("/") ? session.getNode(uuidOrPath) : session.getNodeByIdentifier(uuidOrPath);
            }
            if ("getEditorForm".equals(method.getName()) && args != null && args.length > 1
                    && args[1] instanceof JCRNodeWrapper) {
                return (JCRNodeWrapper) args[1];
            }
            return null;
        }

        /**
         * @return false for the edit form of a node whose type has no mapping, or when the lookup fails, and true for
         * any other result
         */
        private boolean showsSection(Method method, Object[] args) {
            try {
                JCRNodeWrapper node = editedNode(method, args);
                return node == null || openGraphService.isMapped(node);
            } catch (RepositoryException | RuntimeException e) {
                logger.warn("Cannot read the Open Graph mapping of an edit form, so the form has no section {}: {}",
                        SECTION, e.getMessage());
                return false;
            }
        }

        private void removeSection(Object form) {
            try {
                List<?> sections = (List<?>) form.getClass().getMethod("getSections").invoke(form);
                if (sections == null) {
                    return;
                }
                List<Object> kept = new ArrayList<>();
                for (Object section : sections) {
                    if (!SECTION.equals(section.getClass().getMethod("getName").invoke(section))) {
                        kept.add(section);
                    }
                }
                if (kept.size() < sections.size()) {
                    form.getClass().getMethod("setSections", List.class).invoke(form, kept);
                }
            } catch (ReflectiveOperationException | RuntimeException e) {
                logger.error("Cannot remove the section {} from a Content Editor form", SECTION, e);
            }
        }
    }
}

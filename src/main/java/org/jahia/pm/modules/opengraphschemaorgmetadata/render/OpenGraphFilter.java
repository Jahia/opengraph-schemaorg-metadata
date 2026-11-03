package org.jahia.pm.modules.opengraphschemaorgmetadata.render;

import org.jahia.pm.modules.opengraphschemaorgmetadata.OgTag;
import org.jahia.pm.modules.opengraphschemaorgmetadata.OpenGraphService;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.URLGenerator;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.jahia.services.seo.urlrewrite.UrlRewriteService;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.servlet.ServletException;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Writes the Open Graph tags of the main resource before the first {@code </head>} tag of a live page, then its
 * schema.org JSON-LD block when its mapping has a schema.org type.
 * <p>
 * The filter runs outside the cache filter, so a mapping change applies to a cached page at once. Its input is the
 * HTML of the template: the static assets filter adds the CSS and JavaScript links later. The filter applies only on
 * the sites that have the module.
 */
@Component(service = RenderFilter.class, immediate = true)
public class OpenGraphFilter extends AbstractFilter {

    private static final Logger logger = LoggerFactory.getLogger(OpenGraphFilter.class);
    private static final String MODULE_ID = "opengraph-schemaorg-metadata";
    private static final String FILE_TYPE = "jnt:file";

    @Reference
    private OpenGraphService openGraphService;

    @Reference
    private UrlRewriteService urlRewriteService;

    @Activate
    public void activate() {
        // Outside AggregateCacheFilter, which runs at 16.
        setPriority(14);
        setApplyOnConfigurations("page");
        setApplyOnModes("live");
        setApplyOnTemplateTypes("html");
        setSkipOnAjaxRequest(true);
        addCondition(new ModuleOnSiteCondition());
    }

    @Override
    public String execute(String previousOut, RenderContext renderContext, Resource resource, RenderChain chain) {
        int headEnd = HeadWriter.headEnd(previousOut);
        if (headEnd < 0) {
            return previousOut;
        }
        JCRNodeWrapper main = renderContext.getMainResource().getNode();
        StringBuilder tags = new StringBuilder();
        try {
            for (OgTag tag : openGraphService.resolve(main, renderContext.getMainResourceLocale())) {
                String content = tag.getNode() == null ? tag.getContent() : absoluteUrl(tag.getNode(), renderContext);
                if (content != null) {
                    tags.append(HeadWriter.meta(tag.getProperty(), content));
                }
            }
            Map<String, Object> entity = openGraphService.resolveSchemaOrg(main, renderContext.getMainResourceLocale());
            if (!entity.isEmpty()) {
                tags.append(JsonLdWriter.script(withUrls(entity, renderContext)));
            }
        } catch (RepositoryException e) {
            logger.warn("Cannot write the Open Graph tags and the JSON-LD of {}: {}", main.getPath(), e.getMessage());
            logger.debug("Open Graph failure details", e);
            return previousOut;
        }
        if (tags.length() == 0) {
            return previousOut;
        }
        return previousOut.substring(0, headEnd) + tags + previousOut.substring(headEnd);
    }

    /**
     * @return a copy of the entity where the absolute URL of each node replaces the node. A node without a URL leaves
     * its property, or its place in a list.
     */
    private Map<String, Object> withUrls(Map<String, ?> entity, RenderContext renderContext) throws RepositoryException {
        Map<String, Object> copy = new LinkedHashMap<>();
        for (Map.Entry<String, ?> property : entity.entrySet()) {
            Object value = withUrl(property.getValue(), renderContext);
            if (value != null) {
                copy.put(property.getKey(), value);
            }
        }
        return copy;
    }

    @SuppressWarnings("unchecked")
    private Object withUrl(Object value, RenderContext renderContext) throws RepositoryException {
        if (value instanceof JCRNodeWrapper) {
            return absoluteUrl((JCRNodeWrapper) value, renderContext);
        }
        if (value instanceof Map) {
            return withUrls((Map<String, ?>) value, renderContext);
        }
        if (value instanceof List) {
            List<Object> values = new ArrayList<>();
            for (Object item : (List<?>) value) {
                Object withUrl = withUrl(item, renderContext);
                if (withUrl != null) {
                    values.add(withUrl);
                }
            }
            return values.isEmpty() ? null : values;
        }
        return value;
    }

    /**
     * @return the live URL of a file, or the live URL of a page or a main resource with its vanity URL, with the
     * scheme and the host of the site, or null when the node has no URL
     */
    private String absoluteUrl(JCRNodeWrapper node, RenderContext renderContext) throws RepositoryException {
        URLGenerator urlGenerator = renderContext.getURLGenerator();
        String url;
        if (node.isNodeType(FILE_TYPE)) {
            // Already holds the context path and the workspace of the session, live here.
            url = node.getUrl();
        } else {
            String language = renderContext.getMainResourceLocale().toString();
            url = rewrite(urlGenerator.getContext() + urlGenerator.buildURL(node, language, null, "html"), renderContext);
        }
        if (url == null) {
            return null;
        }
        return isAbsolute(url) ? url : urlGenerator.getServer() + url;
    }

    private String rewrite(String url, RenderContext renderContext) {
        try {
            return urlRewriteService.rewriteOutbound(url, renderContext.getRequest(), renderContext.getResponse());
        } catch (IOException | ServletException | InvocationTargetException e) {
            logger.warn("Cannot apply the URL rewrite rules to {}: {}", url, e.getMessage());
            return url;
        }
    }

    private static boolean isAbsolute(String url) {
        String lowerCase = url.toLowerCase(Locale.ROOT);
        return lowerCase.startsWith("http://") || lowerCase.startsWith("https://");
    }

    /**
     * Matches when the module is active on the site of the request.
     */
    private static final class ModuleOnSiteCondition implements ExecutionCondition {

        @Override
        public boolean matches(RenderContext renderContext, Resource resource) {
            JCRSiteNode site = renderContext.getSite();
            return site != null && site.getInstalledModules().contains(MODULE_ID);
        }

        @Override
        public String toString() {
            return "site has module " + MODULE_ID;
        }
    }
}

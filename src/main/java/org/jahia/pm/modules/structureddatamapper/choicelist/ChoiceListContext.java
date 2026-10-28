package org.jahia.pm.modules.structureddatamapper.choicelist;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;

import javax.jcr.RepositoryException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * Reads the context that the Content Editor gives to a choicelist initializer.
 * <p>
 * The context holds the parent node in {@code contextParent}, and the edited node in {@code contextNode}, which is
 * null in a creation form. When a field declares {@code dependentProperties}, the context also holds the unsaved
 * value of each property it depends on, as a list of strings under the name of the property.
 */
final class ChoiceListContext {

    static final Comparator<ChoiceListValue> BY_DISPLAY_NAME =
            Comparator.comparing(ChoiceListValue::getDisplayName, String.CASE_INSENSITIVE_ORDER);

    private static final String PARENT = "contextParent";
    private static final String NODE = "contextNode";

    private ChoiceListContext() {
    }

    /**
     * @return the site of the parent node, or null when the context has no parent node
     */
    static JCRSiteNode site(Map<String, Object> context) throws RepositoryException {
        Object parent = context.get(PARENT);
        return parent instanceof JCRNodeWrapper ? ((JCRNodeWrapper) parent).getResolveSite() : null;
    }

    /**
     * @return true in the form of an existing node, false in a creation form
     */
    static boolean isEditForm(Map<String, Object> context) {
        return context.get(NODE) instanceof JCRNodeWrapper;
    }

    /**
     * @return the stored value of the property on the edited node, or null in a creation form
     */
    static String storedValue(Map<String, Object> context, String property) {
        Object node = context.get(NODE);
        return node instanceof JCRNodeWrapper ? ((JCRNodeWrapper) node).getPropertyAsString(property) : null;
    }

    /**
     * @return the unsaved value of the property when the form sent one, otherwise its stored value
     */
    static String currentValue(Map<String, Object> context, String property) {
        if (!context.containsKey(property)) {
            return storedValue(context, property);
        }
        Object value = context.get(property);
        if (value instanceof List) {
            List<?> values = (List<?>) value;
            return values.isEmpty() || values.get(0) == null ? null : values.get(0).toString();
        }
        return value == null ? null : value.toString();
    }

    /**
     * @return the label of a name, such as {@code Title (jcr:title)}
     */
    static String label(String displayName, String name) {
        return displayName == null || displayName.isEmpty() || displayName.equals(name) ? name : displayName + " (" + name + ")";
    }
}

package org.jahia.pm.modules.structureddatamapper;

import org.jahia.services.content.JCRNodeWrapper;

/**
 * One Open Graph meta tag of a content node.
 * <p>
 * A tag holds either a text or a node. The node is the main resource for {@code og:url}, or a file for an image
 * or a URL. The caller builds the absolute URL of the node, because only a render context knows the server and
 * the vanity URL.
 */
public final class OgTag {

    private final String property;
    private final String content;
    private final JCRNodeWrapper node;
    private final String sourceProperty;

    private OgTag(String property, String content, JCRNodeWrapper node, String sourceProperty) {
        this.property = property;
        this.content = content;
        this.node = node;
        this.sourceProperty = sourceProperty;
    }

    public static OgTag text(String property, String content) {
        return new OgTag(property, content, null, null);
    }

    /**
     * @param sourceProperty the single-valued property whose text is the content, with the HTML of a rich text removed
     */
    public static OgTag text(String property, String content, String sourceProperty) {
        return new OgTag(property, content, null, sourceProperty);
    }

    public static OgTag node(String property, JCRNodeWrapper node) {
        return new OgTag(property, null, node, null);
    }

    /**
     * @return the Open Graph property, such as {@code og:title}
     */
    public String getProperty() {
        return property;
    }

    /**
     * @return the value of the tag, or null when the tag holds a node
     */
    public String getContent() {
        return content;
    }

    /**
     * @return the node whose absolute URL is the value of the tag, or null when the tag holds a text
     */
    public JCRNodeWrapper getNode() {
        return node;
    }

    /**
     * @return the single-valued property of the content whose text is the content of the tag, or null when the tag
     * comes from a date, a number, a reference, a property with several values, a value of a closed list such as
     * {@code profile:gender}, or a computed value. The root of a structured array, such as {@code video:actor}, has
     * no source property either. A root such as {@code og:video} has none when a structured property, such as
     * {@code og:video:width}, follows it. Otherwise the preview of the Content Editor would hide an empty root and
     * keep the structured values that follow it.
     */
    public String getSourceProperty() {
        return sourceProperty;
    }
}

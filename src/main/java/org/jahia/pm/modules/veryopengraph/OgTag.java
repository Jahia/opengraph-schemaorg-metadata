package org.jahia.pm.modules.veryopengraph;

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

    private OgTag(String property, String content, JCRNodeWrapper node) {
        this.property = property;
        this.content = content;
        this.node = node;
    }

    public static OgTag text(String property, String content) {
        return new OgTag(property, content, null);
    }

    public static OgTag node(String property, JCRNodeWrapper node) {
        return new OgTag(property, null, node);
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
}

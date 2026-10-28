package org.jahia.pm.modules.structureddatamapper;

/**
 * Maps one Open Graph property to one property of a content type.
 */
public final class PropertyMapping {

    private final String ogProperty;
    private final String sourceProperty;

    public PropertyMapping(String ogProperty, String sourceProperty) {
        this.ogProperty = ogProperty;
        this.sourceProperty = sourceProperty;
    }

    /**
     * @return the Open Graph property, such as {@code og:title}
     */
    public String getOgProperty() {
        return ogProperty;
    }

    /**
     * @return the JCR property of the content type, such as {@code jcr:title}
     */
    public String getSourceProperty() {
        return sourceProperty;
    }
}

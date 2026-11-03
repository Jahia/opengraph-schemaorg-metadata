package org.jahia.pm.modules.opengraphschemaorgmetadata;

/**
 * Maps one Open Graph or schema.org property to one property of a content type.
 */
public final class PropertyMapping {

    private final String property;
    private final String sourceProperty;

    public PropertyMapping(String property, String sourceProperty) {
        this.property = property;
        this.sourceProperty = sourceProperty;
    }

    /**
     * @return the Open Graph property, such as {@code og:title}, or the schema.org property, such as
     * {@code author.name}
     */
    public String getProperty() {
        return property;
    }

    /**
     * @return the JCR property of the content type, such as {@code jcr:title}
     */
    public String getSourceProperty() {
        return sourceProperty;
    }
}

package org.jahia.pm.modules.veryopengraph.vocabulary;

/**
 * An Open Graph property that a mapping can fill from a property of a content type.
 */
public final class OgProperty {

    private final String name;
    private final OgKind kind;
    private final boolean multiple;

    OgProperty(String name, OgKind kind, boolean multiple) {
        this.name = name;
        this.kind = kind;
        this.multiple = multiple;
    }

    /**
     * @return the name of the property, such as {@code og:title}
     */
    public String getName() {
        return name;
    }

    public OgKind getKind() {
        return kind;
    }

    /**
     * @return true when the page holds one meta tag for each value of the source property
     */
    public boolean isMultiple() {
        return multiple;
    }
}

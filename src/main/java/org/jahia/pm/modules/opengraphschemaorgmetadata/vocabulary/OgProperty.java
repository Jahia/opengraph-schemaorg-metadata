package org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * An Open Graph property that a mapping can fill from a property of a content type.
 */
public final class OgProperty {

    private final String name;
    private final OgKind kind;
    private final boolean multiple;
    private final Set<String> values;

    OgProperty(String name, OgKind kind, boolean multiple) {
        this(name, kind, multiple, new String[0]);
    }

    /**
     * @param values the values that the protocol accepts for the property, in lower case
     */
    OgProperty(String name, OgKind kind, boolean multiple, String... values) {
        this.name = name;
        this.kind = kind;
        this.multiple = multiple;
        this.values = Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(values)));
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

    /**
     * @return the values that the protocol accepts for the property, such as {@code male} and {@code female} for
     * {@code profile:gender}, or an empty set when the property takes any value
     */
    public Set<String> getValues() {
        return values;
    }
}

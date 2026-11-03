package org.jahia.pm.modules.opengraphschemaorgmetadata;

import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgKind;

import java.util.Collections;
import java.util.Set;

/**
 * A property of a content type that a mapping can use as the source of an Open Graph property.
 */
public final class SourceProperty {

    private final String name;
    private final String displayName;
    private final String requiredType;
    private final boolean multiple;
    private final boolean internationalized;
    private final String declaringType;
    private final Set<OgKind> compatibleOgKinds;

    @SuppressWarnings("java:S107") // one value per field of the GraphQL type
    public SourceProperty(String name, String displayName, String requiredType, boolean multiple,
                          boolean internationalized, String declaringType, Set<OgKind> compatibleOgKinds) {
        this.name = name;
        this.displayName = displayName;
        this.requiredType = requiredType;
        this.multiple = multiple;
        this.internationalized = internationalized;
        this.declaringType = declaringType;
        this.compatibleOgKinds = Collections.unmodifiableSet(compatibleOgKinds);
    }

    public String getName() {
        return name;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * @return the JCR type of the property, such as {@code STRING} or {@code WEAKREFERENCE}
     */
    public String getRequiredType() {
        return requiredType;
    }

    public boolean isMultiple() {
        return multiple;
    }

    public boolean isInternationalized() {
        return internationalized;
    }

    /**
     * @return the node type that declares the property, such as {@code jmix:seoHtmlHead}
     */
    public String getDeclaringType() {
        return declaringType;
    }

    /**
     * @return the kinds of Open Graph property that the value of this property can fill
     */
    public Set<OgKind> getCompatibleOgKinds() {
        return compatibleOgKinds;
    }
}

package org.jahia.pm.modules.veryopengraph.vocabulary;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * The og:type values of v1, and the Open Graph properties that a mapping can fill for each one.
 * <p>
 * The module computes {@code og:type}, {@code og:url}, {@code og:site_name}, {@code og:locale} and the
 * {@code og:image:*} details itself, so they are not in the lists.
 */
public enum OgType {
    WEBSITE("website"),
    ARTICLE("article",
            new OgProperty("article:published_time", OgKind.DATE, false),
            new OgProperty("article:modified_time", OgKind.DATE, false),
            new OgProperty("article:expiration_time", OgKind.DATE, false),
            new OgProperty("article:author", OgKind.TEXT, true),
            new OgProperty("article:section", OgKind.TEXT, false),
            new OgProperty("article:tag", OgKind.TEXT, true)),
    BOOK("book",
            new OgProperty("book:author", OgKind.TEXT, true),
            new OgProperty("book:isbn", OgKind.TEXT, false),
            new OgProperty("book:release_date", OgKind.DATE, false),
            new OgProperty("book:tag", OgKind.TEXT, true)),
    PROFILE("profile",
            new OgProperty("profile:first_name", OgKind.TEXT, false),
            new OgProperty("profile:last_name", OgKind.TEXT, false),
            new OgProperty("profile:username", OgKind.TEXT, false),
            new OgProperty("profile:gender", OgKind.TEXT, false));

    public static final String OG_TITLE = "og:title";
    public static final String OG_DESCRIPTION = "og:description";
    public static final String OG_IMAGE = "og:image";
    public static final String OG_IMAGE_ALT = "og:image:alt";
    public static final String PROFILE_GENDER = "profile:gender";

    private final String value;
    private final List<OgProperty> properties;

    OgType(String value, OgProperty... extraProperties) {
        this.value = value;
        List<OgProperty> all = new ArrayList<>(CommonProperties.LIST);
        all.addAll(Arrays.asList(extraProperties));
        this.properties = Collections.unmodifiableList(all);
    }

    /**
     * @return the value of the og:type meta tag, such as {@code article}
     */
    public String getValue() {
        return value;
    }

    /**
     * @return the common properties first, then the properties of this og:type
     */
    public List<OgProperty> getProperties() {
        return properties;
    }

    public Optional<OgProperty> findProperty(String name) {
        return properties.stream().filter(property -> property.getName().equals(name)).findFirst();
    }

    public static Optional<OgType> fromValue(String value) {
        return Arrays.stream(values()).filter(type -> type.value.equals(value)).findFirst();
    }

    /**
     * Holds the properties of every og:type. An enum constructor cannot read a static field of its own enum.
     */
    private static final class CommonProperties {
        private static final List<OgProperty> LIST = Arrays.asList(
                new OgProperty(OG_TITLE, OgKind.TEXT, false),
                new OgProperty(OG_DESCRIPTION, OgKind.TEXT, false),
                new OgProperty(OG_IMAGE, OgKind.IMAGE, false),
                new OgProperty(OG_IMAGE_ALT, OgKind.TEXT, false),
                new OgProperty("og:audio", OgKind.URL, false),
                new OgProperty("og:video", OgKind.URL, false));
    }
}

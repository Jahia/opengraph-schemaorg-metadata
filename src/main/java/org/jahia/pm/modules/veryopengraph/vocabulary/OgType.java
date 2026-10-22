package org.jahia.pm.modules.veryopengraph.vocabulary;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * The og:type values of the Open Graph protocol, and the Open Graph properties that a mapping can fill for each one.
 * <p>
 * The module computes {@code og:type}, {@code og:url}, {@code og:site_name}, {@code og:locale},
 * {@code og:locale:alternate}, and the {@code og:image:type}, {@code og:image:width} and {@code og:image:height} of an
 * image file itself, so they are not in the lists.
 * <p>
 * The order of a list is the order of the tags in the page. A structured property, such as {@code og:image:alt},
 * follows its root property.
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
            new OgProperty("profile:gender", OgKind.TEXT, false, "male", "female")),
    MUSIC_SONG("music.song",
            new OgProperty("music:duration", OgKind.INTEGER, false),
            new OgProperty("music:album", OgKind.URL, true),
            new OgProperty("music:album:disc", OgKind.INTEGER, true),
            new OgProperty("music:album:track", OgKind.INTEGER, true),
            SharedProperties.MUSIC_MUSICIAN),
    MUSIC_ALBUM("music.album", SharedProperties.MUSIC_SONGS,
            SharedProperties.MUSIC_MUSICIAN,
            new OgProperty("music:release_date", OgKind.DATE, false)),
    MUSIC_PLAYLIST("music.playlist", SharedProperties.MUSIC_SONGS,
            SharedProperties.MUSIC_CREATOR),
    MUSIC_RADIO_STATION("music.radio_station",
            SharedProperties.MUSIC_CREATOR),
    VIDEO_MOVIE("video.movie", SharedProperties.VIDEO),
    VIDEO_EPISODE("video.episode", SharedProperties.VIDEO,
            new OgProperty("video:series", OgKind.URL, false)),
    VIDEO_TV_SHOW("video.tv_show", SharedProperties.VIDEO),
    VIDEO_OTHER("video.other", SharedProperties.VIDEO);

    public static final String OG_TITLE = "og:title";
    public static final String OG_DESCRIPTION = "og:description";
    public static final String OG_IMAGE = "og:image";
    public static final String OG_IMAGE_ALT = "og:image:alt";

    private final String value;
    private final List<OgProperty> properties;

    OgType(String value, OgProperty... extraProperties) {
        this(value, Collections.emptyList(), extraProperties);
    }

    /**
     * @param sharedProperties the properties that this og:type has in common with other og:types, before its
     *                         extra properties
     */
    OgType(String value, List<OgProperty> sharedProperties, OgProperty... extraProperties) {
        this.value = value;
        List<OgProperty> all = new ArrayList<>(CommonProperties.LIST);
        all.addAll(sharedProperties);
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

    /**
     * @return the structured properties of a property in this og:type, such as {@code music:album:disc} and
     * {@code music:album:track} for {@code music:album}, in the order of the list
     */
    public List<OgProperty> findStructuredProperties(String name) {
        String prefix = name + ":";
        return properties.stream().filter(property -> property.getName().startsWith(prefix)).collect(Collectors.toList());
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
                // The protocol also accepts an empty value, which writes no tag.
                new OgProperty("og:determiner", OgKind.TEXT, false, "a", "an", "the", "auto"),
                new OgProperty(OG_IMAGE, OgKind.IMAGE, false),
                new OgProperty("og:image:secure_url", OgKind.URL, false),
                new OgProperty(OG_IMAGE_ALT, OgKind.TEXT, false),
                new OgProperty("og:audio", OgKind.URL, false),
                new OgProperty("og:audio:secure_url", OgKind.URL, false),
                new OgProperty("og:audio:type", OgKind.TEXT, false),
                new OgProperty("og:video", OgKind.URL, false),
                new OgProperty("og:video:secure_url", OgKind.URL, false),
                new OgProperty("og:video:type", OgKind.TEXT, false),
                new OgProperty("og:video:width", OgKind.INTEGER, false),
                new OgProperty("og:video:height", OgKind.INTEGER, false),
                new OgProperty("og:video:alt", OgKind.TEXT, false));
    }

    /**
     * Holds the properties that several og:types have. These og:types hold the same instance, so a property name has
     * one definition in the whole vocabulary.
     */
    private static final class SharedProperties {
        private static final OgProperty MUSIC_MUSICIAN = new OgProperty("music:musician", OgKind.URL, true);
        private static final OgProperty MUSIC_CREATOR = new OgProperty("music:creator", OgKind.URL, true);
        private static final List<OgProperty> MUSIC_SONGS = Arrays.asList(
                new OgProperty("music:song", OgKind.URL, true),
                new OgProperty("music:song:disc", OgKind.INTEGER, true),
                new OgProperty("music:song:track", OgKind.INTEGER, true));
        private static final List<OgProperty> VIDEO = Arrays.asList(
                new OgProperty("video:actor", OgKind.URL, true),
                new OgProperty("video:actor:role", OgKind.TEXT, true),
                new OgProperty("video:director", OgKind.URL, true),
                new OgProperty("video:writer", OgKind.URL, true),
                new OgProperty("video:duration", OgKind.INTEGER, false),
                new OgProperty("video:release_date", OgKind.DATE, false),
                new OgProperty("video:tag", OgKind.TEXT, true));
    }
}

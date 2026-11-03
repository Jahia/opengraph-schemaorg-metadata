package org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The schema.org types that a mapping can write as JSON-LD, and the schema.org properties that a mapping can fill for
 * each one.
 * <p>
 * The list holds page-level types only. {@code WebSite}, {@code Organization} and {@code BreadcrumbList} describe the
 * site or the page tree, and not one content.
 * <p>
 * The module computes {@code url}, so it is not in the lists. The first property of a list names the content, such as
 * {@code headline}. The order of a list is the order of the properties in the JSON-LD block.
 * <p>
 * A name with a dot, such as {@code author.name}, is a property of a nested entity, whose type {@link #entityType}
 * gives. A nested entity whose property takes several values, such as {@code author}, has no other property, because
 * the JSON-LD holds one nested entity per value.
 */
public enum SchemaType {
    ARTICLE("Article", Lists.ARTICLE),
    NEWS_ARTICLE("NewsArticle", Lists.ARTICLE),
    BLOG_POSTING("BlogPosting", Lists.ARTICLE),
    WEB_PAGE("WebPage", Lists.WEB_PAGE),
    PROFILE_PAGE("ProfilePage", Lists.PROFILE_PAGE),
    PRODUCT("Product", Lists.PRODUCT),
    EVENT("Event", Lists.EVENT),
    RECIPE("Recipe", Lists.RECIPE),
    VIDEO_OBJECT("VideoObject", Lists.VIDEO_OBJECT);

    /**
     * The schema.org type of each nested entity, such as {@code Person} for {@code author}.
     */
    private static final Map<String, String> ENTITY_TYPES = new HashMap<>();

    static {
        ENTITY_TYPES.put("author", "Person");
        ENTITY_TYPES.put("mainEntity", "Person");
        ENTITY_TYPES.put("brand", "Brand");
        ENTITY_TYPES.put("offers", "Offer");
        ENTITY_TYPES.put("location", "Place");
        ENTITY_TYPES.put("organizer", "Organization");
    }

    private final String value;
    private final List<SchemaProperty> properties;

    SchemaType(String value, List<SchemaProperty> properties) {
        this.value = value;
        this.properties = Collections.unmodifiableList(properties);
    }

    /**
     * @return the value of {@code @type}, such as {@code Article}
     */
    public String getValue() {
        return value;
    }

    public List<SchemaProperty> getProperties() {
        return properties;
    }

    /**
     * @return the property that names the content, such as {@code headline} for an article
     */
    public SchemaProperty getTitleProperty() {
        return properties.get(0);
    }

    public Optional<SchemaProperty> findProperty(String name) {
        return properties.stream().filter(property -> property.getName().equals(name)).findFirst();
    }

    public static Optional<SchemaType> fromValue(String value) {
        return Arrays.stream(values()).filter(type -> type.value.equals(value)).findFirst();
    }

    /**
     * @return the schema.org type of a nested entity, such as {@code Person} for {@code author}
     */
    public static String entityType(String entity) {
        return ENTITY_TYPES.get(entity);
    }

    /**
     * Holds the property lists. An enum constructor cannot read a static field of its own enum. The lists share one
     * instance of a common property, such as {@code description}.
     */
    private static final class Lists {
        private static final SchemaProperty NAME = text("name");
        private static final SchemaProperty DESCRIPTION = text("description");
        private static final SchemaProperty IMAGE = new SchemaProperty("image", OgKind.IMAGE, false);
        private static final SchemaProperty DATE_PUBLISHED = date("datePublished");
        private static final SchemaProperty DATE_MODIFIED = date("dateModified");
        private static final SchemaProperty AUTHOR_NAME = new SchemaProperty("author.name", OgKind.TEXT, true);

        private static final List<SchemaProperty> ARTICLE = Arrays.asList(
                text("headline"), DESCRIPTION, IMAGE, DATE_PUBLISHED, DATE_MODIFIED, AUTHOR_NAME);
        private static final List<SchemaProperty> WEB_PAGE = Arrays.asList(
                NAME, DESCRIPTION, IMAGE, DATE_PUBLISHED, DATE_MODIFIED);
        private static final List<SchemaProperty> PROFILE_PAGE = Arrays.asList(
                text("mainEntity.name"),
                text("mainEntity.alternateName"),
                text("mainEntity.description"),
                new SchemaProperty("mainEntity.image", OgKind.IMAGE, false),
                date("dateCreated"),
                DATE_MODIFIED);
        private static final List<SchemaProperty> PRODUCT = Arrays.asList(
                NAME,
                DESCRIPTION,
                IMAGE,
                text("sku"),
                text("brand.name"),
                new SchemaProperty("offers.price", OgKind.NUMBER, false),
                text("offers.priceCurrency"));
        private static final List<SchemaProperty> EVENT = Arrays.asList(
                NAME,
                DESCRIPTION,
                IMAGE,
                date("startDate"),
                date("endDate"),
                text("location.name"),
                text("location.address"),
                text("organizer.name"));
        // A duration, such as prepTime, is a text in ISO 8601, such as PT20M.
        private static final List<SchemaProperty> RECIPE = Arrays.asList(
                NAME,
                DESCRIPTION,
                IMAGE,
                AUTHOR_NAME,
                DATE_PUBLISHED,
                text("prepTime"),
                text("cookTime"),
                text("totalTime"),
                text("recipeYield"),
                text("recipeCategory"),
                text("recipeCuisine"),
                new SchemaProperty("recipeIngredient", OgKind.TEXT, true),
                new SchemaProperty("recipeInstructions", OgKind.TEXT, true));
        private static final List<SchemaProperty> VIDEO_OBJECT = Arrays.asList(
                NAME,
                DESCRIPTION,
                new SchemaProperty("thumbnailUrl", OgKind.IMAGE, false),
                date("uploadDate"),
                text("duration"),
                new SchemaProperty("contentUrl", OgKind.URL, false),
                new SchemaProperty("embedUrl", OgKind.URL, false));

        private Lists() {
        }

        private static SchemaProperty text(String name) {
            return new SchemaProperty(name, OgKind.TEXT, false);
        }

        private static SchemaProperty date(String name) {
            return new SchemaProperty(name, OgKind.DATE, false);
        }
    }
}

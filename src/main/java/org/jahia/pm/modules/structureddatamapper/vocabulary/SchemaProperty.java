package org.jahia.pm.modules.structureddatamapper.vocabulary;

/**
 * A schema.org property that a mapping can fill from a property of a content type.
 */
public final class SchemaProperty {

    private final String name;
    private final OgKind kind;
    private final boolean multiple;

    SchemaProperty(String name, OgKind kind, boolean multiple) {
        this.name = name;
        this.kind = kind;
        this.multiple = multiple;
    }

    /**
     * @return the name of the property, such as {@code headline}, or the name of a nested entity and of its property,
     * such as {@code author.name}
     */
    public String getName() {
        return name;
    }

    public OgKind getKind() {
        return kind;
    }

    /**
     * @return true when the JSON-LD holds each value of the source property. A property of a nested entity, such as
     * {@code author.name}, then holds one nested entity for each value.
     */
    public boolean isMultiple() {
        return multiple;
    }

    /**
     * @return the nested entity, such as {@code author} for {@code author.name}, or null for a property of the entity
     * itself
     */
    public String getEntity() {
        int dot = name.indexOf('.');
        return dot < 0 ? null : name.substring(0, dot);
    }

    /**
     * @return the property in the nested entity, such as {@code name} for {@code author.name}, or the name itself for
     * a property of the entity
     */
    public String getLocalName() {
        int dot = name.indexOf('.');
        return dot < 0 ? name : name.substring(dot + 1);
    }
}

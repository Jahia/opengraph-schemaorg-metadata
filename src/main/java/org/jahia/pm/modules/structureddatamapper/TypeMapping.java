package org.jahia.pm.modules.structureddatamapper;

import java.util.Collections;
import java.util.List;

/**
 * Maps a content type or a mixin of a site to an og:type and some of its properties to Open Graph properties, to a
 * schema.org type and some of its properties to schema.org properties, or to both. A template mapping also names a
 * template, and applies only to the contents that use it.
 */
public final class TypeMapping {

    private final String uuid;
    private final String nodeType;
    private final String templateName;
    private final String ogType;
    private final List<PropertyMapping> properties;
    private final String schemaType;
    private final List<PropertyMapping> schemaProperties;

    @SuppressWarnings("java:S107") // one value per field of the GraphQL type
    public TypeMapping(String uuid, String nodeType, String templateName, String ogType, List<PropertyMapping> properties,
                       String schemaType, List<PropertyMapping> schemaProperties) {
        this.uuid = uuid;
        this.nodeType = nodeType;
        this.templateName = templateName;
        this.ogType = ogType;
        this.properties = Collections.unmodifiableList(properties);
        this.schemaType = schemaType;
        this.schemaProperties = Collections.unmodifiableList(schemaProperties);
    }

    /**
     * @return the identifier of the node that stores the mapping
     */
    public String getUuid() {
        return uuid;
    }

    /**
     * @return the content type or the mixin, such as {@code jnt:news}
     */
    public String getNodeType() {
        return nodeType;
    }

    /**
     * @return the template, such as {@code event}, or null when the mapping applies to every template
     */
    public String getTemplateName() {
        return templateName;
    }

    /**
     * @return the og:type, such as {@code article}, or null when the mapping writes no Open Graph tag
     */
    public String getOgType() {
        return ogType;
    }

    /**
     * @return the Open Graph properties and their source property
     */
    public List<PropertyMapping> getProperties() {
        return properties;
    }

    /**
     * @return the schema.org type, such as {@code Article}, or null when the mapping writes no JSON-LD
     */
    public String getSchemaType() {
        return schemaType;
    }

    /**
     * @return the schema.org properties, such as {@code author.name}, and their source property
     */
    public List<PropertyMapping> getSchemaProperties() {
        return schemaProperties;
    }
}

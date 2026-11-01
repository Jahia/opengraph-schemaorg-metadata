package org.jahia.pm.modules.structureddatamapper.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.pm.modules.structureddatamapper.PropertyMapping;
import org.jahia.pm.modules.structureddatamapper.TypeMapping;
import org.jahia.services.content.nodetypes.NodeTypeRegistry;
import org.jahia.utils.LanguageCodeConverters;

import javax.jcr.nodetype.NoSuchNodeTypeException;
import java.util.List;
import java.util.stream.Collectors;

@GraphQLName("OpenGraphTypeMapping")
@GraphQLDescription("The mapping of a content type or of a mixin to an og:type")
public class GqlTypeMapping {

    private final TypeMapping mapping;

    GqlTypeMapping(TypeMapping mapping) {
        this.mapping = mapping;
    }

    @GraphQLField
    @GraphQLName("uuid")
    @GraphQLNonNull
    @GraphQLDescription("The identifier of the node that stores the mapping, which the Content Editor opens")
    public String getUuid() {
        return mapping.getUuid();
    }

    @GraphQLField
    @GraphQLName("nodeType")
    @GraphQLNonNull
    @GraphQLDescription("The content type or the mixin, such as jnt:news")
    public String getNodeType() {
        return mapping.getNodeType();
    }

    @GraphQLField
    @GraphQLName("nodeTypeDisplayName")
    @GraphQLDescription("The label of the content type or of the mixin, or null when no module defines it any longer")
    public String getNodeTypeDisplayName(
            @GraphQLName("language") @GraphQLNonNull @GraphQLDescription("The language of the label") String language) {
        try {
            return NodeTypeRegistry.getInstance().getNodeType(mapping.getNodeType())
                    .getLabel(LanguageCodeConverters.languageCodeToLocale(language));
        } catch (NoSuchNodeTypeException e) {
            return null;
        }
    }

    @GraphQLField
    @GraphQLName("templateName")
    @GraphQLDescription("The template of a template mapping, such as home, or null when the mapping applies to every template")
    public String getTemplateName() {
        return mapping.getTemplateName();
    }

    @GraphQLField
    @GraphQLName("ogType")
    @GraphQLNonNull
    @GraphQLDescription("The og:type, such as article")
    public String getOgType() {
        return mapping.getOgType();
    }

    @GraphQLField
    @GraphQLName("properties")
    @GraphQLNonNull
    @GraphQLDescription("The Open Graph properties and their source property")
    public List<GqlPropertyMapping> getProperties() {
        return mapping.getProperties().stream().map(GqlPropertyMapping::new).collect(Collectors.toList());
    }

    @GraphQLField
    @GraphQLName("schemaType")
    @GraphQLDescription("The schema.org type, such as Article, or null when the mapping writes no JSON-LD")
    public String getSchemaType() {
        return mapping.getSchemaType();
    }

    @GraphQLField
    @GraphQLName("schemaProperties")
    @GraphQLNonNull
    @GraphQLDescription("The schema.org properties and their source property")
    public List<GqlSchemaPropertyMapping> getSchemaProperties() {
        return mapping.getSchemaProperties().stream().map(GqlSchemaPropertyMapping::new).collect(Collectors.toList());
    }

    @GraphQLName("OpenGraphPropertyMapping")
    @GraphQLDescription("The source property of one Open Graph property")
    public static class GqlPropertyMapping {

        private final PropertyMapping property;

        GqlPropertyMapping(PropertyMapping property) {
            this.property = property;
        }

        @GraphQLField
        @GraphQLName("ogProperty")
        @GraphQLNonNull
        @GraphQLDescription("The Open Graph property, such as og:title")
        public String getOgProperty() {
            return property.getProperty();
        }

        @GraphQLField
        @GraphQLName("sourceProperty")
        @GraphQLNonNull
        @GraphQLDescription("The property of the content type, such as jcr:title")
        public String getSourceProperty() {
            return property.getSourceProperty();
        }
    }

    @GraphQLName("SchemaOrgPropertyMapping")
    @GraphQLDescription("The source property of one schema.org property")
    public static class GqlSchemaPropertyMapping {

        private final PropertyMapping property;

        GqlSchemaPropertyMapping(PropertyMapping property) {
            this.property = property;
        }

        @GraphQLField
        @GraphQLName("schemaProperty")
        @GraphQLNonNull
        @GraphQLDescription("The schema.org property, such as headline, or a property of a nested entity, such as author.name")
        public String getSchemaProperty() {
            return property.getProperty();
        }

        @GraphQLField
        @GraphQLName("sourceProperty")
        @GraphQLNonNull
        @GraphQLDescription("The property of the content type, such as jcr:title")
        public String getSourceProperty() {
            return property.getSourceProperty();
        }
    }
}

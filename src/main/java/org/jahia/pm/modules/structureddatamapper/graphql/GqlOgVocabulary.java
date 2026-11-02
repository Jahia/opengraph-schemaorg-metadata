package org.jahia.pm.modules.structureddatamapper.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgKind;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgProperty;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgType;
import org.jahia.pm.modules.structureddatamapper.vocabulary.SchemaProperty;
import org.jahia.pm.modules.structureddatamapper.vocabulary.SchemaType;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@GraphQLName("OpenGraphVocabulary")
@GraphQLDescription("The og:type values and the schema.org types that a mapping can use, and their properties")
public class GqlOgVocabulary {

    @GraphQLField
    @GraphQLName("ogTypes")
    @GraphQLNonNull
    @GraphQLDescription("The og:type values of the Open Graph protocol")
    public List<GqlOgType> getOgTypes() {
        return Arrays.stream(OgType.values()).map(GqlOgType::new).collect(Collectors.toList());
    }

    @GraphQLField
    @GraphQLName("schemaTypes")
    @GraphQLNonNull
    @GraphQLDescription("The schema.org types that a mapping can write as JSON-LD")
    public List<GqlSchemaType> getSchemaTypes() {
        return Arrays.stream(SchemaType.values()).map(GqlSchemaType::new).collect(Collectors.toList());
    }

    @GraphQLName("OpenGraphType")
    @GraphQLDescription("An og:type value and the Open Graph properties that a mapping can fill for it")
    public static class GqlOgType {

        private final OgType type;

        GqlOgType(OgType type) {
            this.type = type;
        }

        @GraphQLField
        @GraphQLName("name")
        @GraphQLNonNull
        @GraphQLDescription("The value of the og:type tag, such as article")
        public String getName() {
            return type.getValue();
        }

        @GraphQLField
        @GraphQLName("properties")
        @GraphQLNonNull
        @GraphQLDescription("The properties of every og:type, then the properties of this og:type")
        public List<GqlOgProperty> getProperties() {
            return type.getProperties().stream().map(GqlOgProperty::new).collect(Collectors.toList());
        }
    }

    @GraphQLName("OpenGraphProperty")
    @GraphQLDescription("An Open Graph property that a mapping can fill")
    public static class GqlOgProperty {

        private final OgProperty property;

        GqlOgProperty(OgProperty property) {
            this.property = property;
        }

        @GraphQLField
        @GraphQLName("name")
        @GraphQLNonNull
        @GraphQLDescription("The name of the property, such as og:title")
        public String getName() {
            return property.getName();
        }

        @GraphQLField
        @GraphQLName("kind")
        @GraphQLNonNull
        @GraphQLDescription("The kind of value that the property holds")
        public OgKind getKind() {
            return property.getKind();
        }

        @GraphQLField
        @GraphQLName("multiple")
        @GraphQLNonNull
        @GraphQLDescription("True when the page holds one meta tag for each value of the source property")
        public boolean isMultiple() {
            return property.isMultiple();
        }
    }

    @GraphQLName("SchemaOrgType")
    @GraphQLDescription("A schema.org type and the schema.org properties that a mapping can fill for it")
    public static class GqlSchemaType {

        private final SchemaType type;

        GqlSchemaType(SchemaType type) {
            this.type = type;
        }

        @GraphQLField
        @GraphQLName("name")
        @GraphQLNonNull
        @GraphQLDescription("The value of @type, such as Article")
        public String getName() {
            return type.getValue();
        }

        @GraphQLField
        @GraphQLName("properties")
        @GraphQLNonNull
        @GraphQLDescription("The properties of this type, in the order of the JSON-LD block")
        public List<GqlSchemaProperty> getProperties() {
            return type.getProperties().stream().map(GqlSchemaProperty::new).collect(Collectors.toList());
        }
    }

    @GraphQLName("SchemaOrgProperty")
    @GraphQLDescription("A schema.org property that a mapping can fill")
    public static class GqlSchemaProperty {

        private final SchemaProperty property;

        GqlSchemaProperty(SchemaProperty property) {
            this.property = property;
        }

        @GraphQLField
        @GraphQLName("name")
        @GraphQLNonNull
        @GraphQLDescription("The name of the property, such as headline, or of a nested entity and its property, such as author.name")
        public String getName() {
            return property.getName();
        }

        @GraphQLField
        @GraphQLName("kind")
        @GraphQLNonNull
        @GraphQLDescription("The kind of value that the property holds")
        public OgKind getKind() {
            return property.getKind();
        }

        @GraphQLField
        @GraphQLName("multiple")
        @GraphQLNonNull
        @GraphQLDescription("True when the JSON-LD holds each value of the source property")
        public boolean isMultiple() {
            return property.isMultiple();
        }
    }
}

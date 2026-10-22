package org.jahia.pm.modules.structureddatamapper.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgKind;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgProperty;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgType;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@GraphQLName("OpenGraphVocabulary")
@GraphQLDescription("The og:type values and the Open Graph properties that a mapping can use")
public class GqlOgVocabulary {

    @GraphQLField
    @GraphQLName("ogTypes")
    @GraphQLNonNull
    @GraphQLDescription("The og:type values of the Open Graph protocol")
    public List<GqlOgType> getOgTypes() {
        return Arrays.stream(OgType.values()).map(GqlOgType::new).collect(Collectors.toList());
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
}

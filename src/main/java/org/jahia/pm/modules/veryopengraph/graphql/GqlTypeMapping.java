package org.jahia.pm.modules.veryopengraph.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.pm.modules.veryopengraph.PropertyMapping;
import org.jahia.pm.modules.veryopengraph.TypeMapping;

import java.util.List;
import java.util.stream.Collectors;

@GraphQLName("OpenGraphTypeMapping")
@GraphQLDescription("The mapping of a content type to an og:type")
public class GqlTypeMapping {

    private final TypeMapping mapping;

    GqlTypeMapping(TypeMapping mapping) {
        this.mapping = mapping;
    }

    @GraphQLField
    @GraphQLName("nodeType")
    @GraphQLNonNull
    @GraphQLDescription("The content type, such as jnt:news")
    public String getNodeType() {
        return mapping.getNodeType();
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
            return property.getOgProperty();
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

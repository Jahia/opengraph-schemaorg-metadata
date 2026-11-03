package org.jahia.pm.modules.opengraphschemaorgmetadata.graphql;

import graphql.annotations.annotationTypes.GraphQLConstructor;
import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;

@GraphQLName("OpenGraphPropertyMapping")
@GraphQLDescription("The source property of one Open Graph property")
public class GqlPropertyMappingInput {

    private final String ogProperty;
    private final String sourceProperty;

    @GraphQLConstructor
    public GqlPropertyMappingInput(
            @GraphQLName("ogProperty") @GraphQLNonNull String ogProperty,
            @GraphQLName("sourceProperty") @GraphQLNonNull String sourceProperty) {
        this.ogProperty = ogProperty;
        this.sourceProperty = sourceProperty;
    }

    @GraphQLField
    @GraphQLName("ogProperty")
    @GraphQLNonNull
    @GraphQLDescription("The Open Graph property, such as og:title")
    public String getOgProperty() {
        return ogProperty;
    }

    @GraphQLField
    @GraphQLName("sourceProperty")
    @GraphQLNonNull
    @GraphQLDescription("The property of the content type, such as jcr:title")
    public String getSourceProperty() {
        return sourceProperty;
    }
}

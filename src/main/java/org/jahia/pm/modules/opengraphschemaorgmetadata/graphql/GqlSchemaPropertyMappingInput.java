package org.jahia.pm.modules.opengraphschemaorgmetadata.graphql;

import graphql.annotations.annotationTypes.GraphQLConstructor;
import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;

@GraphQLName("SchemaOrgPropertyMapping")
@GraphQLDescription("The source property of one schema.org property")
public class GqlSchemaPropertyMappingInput {

    private final String schemaProperty;
    private final String sourceProperty;

    @GraphQLConstructor
    public GqlSchemaPropertyMappingInput(
            @GraphQLName("schemaProperty") @GraphQLNonNull String schemaProperty,
            @GraphQLName("sourceProperty") @GraphQLNonNull String sourceProperty) {
        this.schemaProperty = schemaProperty;
        this.sourceProperty = sourceProperty;
    }

    @GraphQLField
    @GraphQLName("schemaProperty")
    @GraphQLNonNull
    @GraphQLDescription("The schema.org property, such as headline, or a property of a nested entity, such as author.name")
    public String getSchemaProperty() {
        return schemaProperty;
    }

    @GraphQLField
    @GraphQLName("sourceProperty")
    @GraphQLNonNull
    @GraphQLDescription("The property of the content type, such as jcr:title")
    public String getSourceProperty() {
        return sourceProperty;
    }
}

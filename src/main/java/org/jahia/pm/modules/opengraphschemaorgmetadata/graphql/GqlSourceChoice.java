package org.jahia.pm.modules.opengraphschemaorgmetadata.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;

@GraphQLName("OpenGraphSourceChoice")
@GraphQLDescription("A property of a content type that a field of a mapping offers as its source")
public class GqlSourceChoice {

    private final String value;
    private final String label;

    GqlSourceChoice(String value, String label) {
        this.value = value;
        this.label = label;
    }

    @GraphQLField
    @GraphQLName("value")
    @GraphQLNonNull
    @GraphQLDescription("The name of the property, such as jcr:title")
    public String getValue() {
        return value;
    }

    @GraphQLField
    @GraphQLName("label")
    @GraphQLNonNull
    @GraphQLDescription("The label of the choice in the requested language, such as Title (jcr:title)")
    public String getLabel() {
        return label;
    }
}

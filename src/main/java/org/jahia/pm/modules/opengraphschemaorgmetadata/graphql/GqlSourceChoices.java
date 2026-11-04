package org.jahia.pm.modules.opengraphschemaorgmetadata.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;

import java.util.List;

@GraphQLName("OpenGraphSourceChoices")
@GraphQLDescription("The choices of a field of a mapping that holds a source property, as the Content Editor lists them")
public class GqlSourceChoices {

    private final String property;
    private final List<GqlSourceChoice> choices;

    GqlSourceChoices(String property, List<GqlSourceChoice> choices) {
        this.property = property;
        this.choices = choices;
    }

    @GraphQLField
    @GraphQLName("property")
    @GraphQLNonNull
    @GraphQLDescription("The property of the mapping node, such as osm:og_title")
    public String getProperty() {
        return property;
    }

    @GraphQLField
    @GraphQLName("choices")
    @GraphQLNonNull
    @GraphQLDescription("The properties of the content type that can fill the field, sorted by label")
    public List<GqlSourceChoice> getChoices() {
        return choices;
    }
}

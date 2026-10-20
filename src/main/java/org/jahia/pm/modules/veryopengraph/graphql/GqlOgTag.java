package org.jahia.pm.modules.veryopengraph.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.pm.modules.veryopengraph.OgTag;

@GraphQLName("OpenGraphTag")
@GraphQLDescription("One Open Graph meta tag of a content node")
public class GqlOgTag {

    private final OgTag tag;

    GqlOgTag(OgTag tag) {
        this.tag = tag;
    }

    @GraphQLField
    @GraphQLName("property")
    @GraphQLNonNull
    @GraphQLDescription("The Open Graph property, such as og:title")
    public String getProperty() {
        return tag.getProperty();
    }

    @GraphQLField
    @GraphQLName("content")
    @GraphQLDescription("The value of the tag, or null when the value is the URL of the node at nodePath")
    public String getContent() {
        return tag.getContent();
    }

    @GraphQLField
    @GraphQLName("nodePath")
    @GraphQLDescription("The path of the node whose live URL is the value of the tag: the content node for og:url, "
            + "or a file. Null when the tag holds a text")
    public String getNodePath() {
        return tag.getNode() == null ? null : tag.getNode().getPath();
    }

    @GraphQLField
    @GraphQLName("sourceProperty")
    @GraphQLDescription("The single-valued property of the content whose text is the value of the tag, with the HTML "
            + "of a rich text removed. Null when the value comes from a date, a reference, a property with several "
            + "values, or the server")
    public String getSourceProperty() {
        return tag.getSourceProperty();
    }
}

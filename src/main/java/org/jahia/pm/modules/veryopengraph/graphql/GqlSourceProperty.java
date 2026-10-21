package org.jahia.pm.modules.veryopengraph.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.pm.modules.veryopengraph.SourceProperty;
import org.jahia.pm.modules.veryopengraph.vocabulary.OgKind;

import java.util.ArrayList;
import java.util.List;

@GraphQLName("OpenGraphSourceProperty")
@GraphQLDescription("A property of a content type that can fill an Open Graph property")
public class GqlSourceProperty {

    private final SourceProperty property;

    GqlSourceProperty(SourceProperty property) {
        this.property = property;
    }

    @GraphQLField
    @GraphQLName("name")
    @GraphQLNonNull
    @GraphQLDescription("The name of the property, such as jcr:title")
    public String getName() {
        return property.getName();
    }

    @GraphQLField
    @GraphQLName("displayName")
    @GraphQLDescription("The label of the property in the requested language")
    public String getDisplayName() {
        return property.getDisplayName();
    }

    @GraphQLField
    @GraphQLName("requiredType")
    @GraphQLNonNull
    @GraphQLDescription("The JCR type of the property, such as STRING or WEAKREFERENCE")
    public String getRequiredType() {
        return property.getRequiredType();
    }

    @GraphQLField
    @GraphQLName("multiple")
    @GraphQLNonNull
    @GraphQLDescription("True when the property holds several values")
    public boolean isMultiple() {
        return property.isMultiple();
    }

    @GraphQLField
    @GraphQLName("internationalized")
    @GraphQLNonNull
    @GraphQLDescription("True when the property holds one value for each language")
    public boolean isInternationalized() {
        return property.isInternationalized();
    }

    @GraphQLField
    @GraphQLName("declaringType")
    @GraphQLNonNull
    @GraphQLDescription("The node type that declares the property, such as jmix:seoHtmlHead")
    public String getDeclaringType() {
        return property.getDeclaringType();
    }

    @GraphQLField
    @GraphQLName("compatibleOgKinds")
    @GraphQLNonNull
    @GraphQLDescription("The kinds of Open Graph property that the value of this property can fill. A property "
            + "with several values fills a TEXT or an INTEGER Open Graph property only when that property takes "
            + "several values")
    public List<OgKind> getCompatibleOgKinds() {
        return new ArrayList<>(property.getCompatibleOgKinds());
    }
}

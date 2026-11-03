package org.jahia.pm.modules.opengraphschemaorgmetadata.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;

@GraphQLTypeExtension(DXGraphQLProvider.Query.class)
public class OpenGraphSchemaOrgMetadataQueryExtension {

    @GraphQLField
    @GraphQLName("openGraphVocabulary")
    @GraphQLNonNull
    @GraphQLDescription("The og:type values and the schema.org types that a mapping can use, and their properties")
    public static GqlOgVocabulary openGraphVocabulary() {
        return new GqlOgVocabulary();
    }
}

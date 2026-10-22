package org.jahia.pm.modules.veryopengraph.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNode;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrWrongInputException;
import org.jahia.modules.graphql.provider.dxm.node.NodeHelper;
import org.jahia.pm.modules.veryopengraph.InvalidMappingException;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.utils.LanguageCodeConverters;

import javax.jcr.RepositoryException;
import java.util.List;
import java.util.stream.Collectors;

@GraphQLTypeExtension(GqlJcrNode.class)
public class VeryOpenGraphNodeExtension {

    private final GqlJcrNode node;

    public VeryOpenGraphNodeExtension(GqlJcrNode node) {
        this.node = node;
    }

    @GraphQLField
    @GraphQLName("openGraphMappings")
    @GraphQLDescription("The Open Graph mappings of this site node. Requires the permission 'veryOpenGraphManage' on the site")
    public List<GqlTypeMapping> getOpenGraphMappings() {
        JCRSiteNode site = Resolvers.managedSite(node.getNode());
        try {
            return Resolvers.service().getMappings(site).stream().map(GqlTypeMapping::new).collect(Collectors.toList());
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
    }

    @GraphQLField
    @GraphQLName("openGraphSourceProperties")
    @GraphQLDescription("The properties of a content type that can fill an Open Graph property, with the properties of the "
            + "mixins that extend the type. Call it on the site node. Requires the permission 'veryOpenGraphManage' on the site")
    public List<GqlSourceProperty> getOpenGraphSourceProperties(
            @GraphQLName("nodeType") @GraphQLNonNull @GraphQLDescription("The content type, such as jnt:news") String nodeType,
            @GraphQLName("language") @GraphQLNonNull @GraphQLDescription("The language of the labels") String language) {
        JCRSiteNode site = Resolvers.managedSite(node.getNode());
        try {
            return Resolvers.service().getSourceProperties(site, nodeType, LanguageCodeConverters.languageCodeToLocale(language))
                    .stream().map(GqlSourceProperty::new).collect(Collectors.toList());
        } catch (InvalidMappingException e) {
            throw new GqlJcrWrongInputException(e.getMessage(), e);
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
    }

    @GraphQLField
    @GraphQLName("openGraphTags")
    @GraphQLDescription("The Open Graph tags of this content node, from the mapping of its type, and its twitter:card "
            + "tag. Empty when no mapping applies")
    public List<GqlOgTag> getOpenGraphTags(
            @GraphQLName("language") @GraphQLNonNull @GraphQLDescription("The language of the values") String language) {
        try {
            JCRNodeWrapper localized = NodeHelper.getNodeInLanguage(node.getNode(), language);
            return Resolvers.service().resolve(localized, LanguageCodeConverters.languageCodeToLocale(language))
                    .stream().map(GqlOgTag::new).collect(Collectors.toList());
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
    }
}

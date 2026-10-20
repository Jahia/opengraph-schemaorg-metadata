package org.jahia.pm.modules.veryopengraph.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNodeMutation;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrWrongInputException;
import org.jahia.pm.modules.veryopengraph.InvalidMappingException;
import org.jahia.pm.modules.veryopengraph.PropertyMapping;
import org.jahia.services.content.decorator.JCRSiteNode;

import javax.jcr.RepositoryException;
import java.util.List;
import java.util.stream.Collectors;

@GraphQLTypeExtension(GqlJcrNodeMutation.class)
public class VeryOpenGraphMutationExtension {

    private final GqlJcrNodeMutation mutation;

    public VeryOpenGraphMutationExtension(GqlJcrNodeMutation mutation) {
        this.mutation = mutation;
    }

    @GraphQLField
    @GraphQLName("createOpenGraphSettings")
    @GraphQLNonNull
    @GraphQLDescription("Creates the node that holds the Open Graph mappings of this site node when it does not exist, and "
            + "returns its path. Requires the permission 'veryOpenGraphManage' on the site")
    public String createOpenGraphSettings() {
        JCRSiteNode site = Resolvers.managedSite(mutation.jcrNode);
        try {
            return Resolvers.service().createSettings(site);
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
    }

    @GraphQLField
    @GraphQLName("saveOpenGraphMapping")
    @GraphQLNonNull
    @GraphQLDescription("Creates the Open Graph mapping of a content type on this site node, or replaces all its values. "
            + "Requires the permission 'veryOpenGraphManage' on the site")
    public boolean saveOpenGraphMapping(
            @GraphQLName("nodeType") @GraphQLNonNull @GraphQLDescription("The content type, such as jnt:news") String nodeType,
            @GraphQLName("ogType") @GraphQLNonNull @GraphQLDescription("The og:type, such as article") String ogType,
            @GraphQLName("properties") @GraphQLNonNull @GraphQLDescription("The Open Graph properties and their source property")
                    List<GqlPropertyMappingInput> properties) {
        JCRSiteNode site = Resolvers.managedSite(mutation.jcrNode);
        List<PropertyMapping> mappings = properties.stream()
                .map(property -> new PropertyMapping(property.getOgProperty(), property.getSourceProperty()))
                .collect(Collectors.toList());
        try {
            Resolvers.service().saveMapping(site, nodeType, ogType, mappings);
        } catch (InvalidMappingException e) {
            throw new GqlJcrWrongInputException(e.getMessage(), e);
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
        return true;
    }

    @GraphQLField
    @GraphQLName("deleteOpenGraphMapping")
    @GraphQLNonNull
    @GraphQLDescription("Deletes the Open Graph mapping of a content type on this site node. Does nothing when no mapping "
            + "exists. Requires the permission 'veryOpenGraphManage' on the site")
    public boolean deleteOpenGraphMapping(
            @GraphQLName("nodeType") @GraphQLNonNull @GraphQLDescription("The content type, such as jnt:news") String nodeType) {
        JCRSiteNode site = Resolvers.managedSite(mutation.jcrNode);
        try {
            Resolvers.service().deleteMapping(site, nodeType);
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
        return true;
    }
}

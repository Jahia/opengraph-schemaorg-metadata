package org.jahia.pm.modules.structureddatamapper.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNodeMutation;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrWrongInputException;
import org.jahia.pm.modules.structureddatamapper.InvalidMappingException;
import org.jahia.pm.modules.structureddatamapper.PropertyMapping;
import org.jahia.services.content.decorator.JCRSiteNode;

import javax.jcr.RepositoryException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@GraphQLTypeExtension(GqlJcrNodeMutation.class)
public class StructuredDataMapperMutationExtension {

    private final GqlJcrNodeMutation mutation;

    public StructuredDataMapperMutationExtension(GqlJcrNodeMutation mutation) {
        this.mutation = mutation;
    }

    @GraphQLField
    @GraphQLName("createOpenGraphSettings")
    @GraphQLNonNull
    @GraphQLDescription("Creates the node that holds the Open Graph mappings of this site node when it does not exist, and "
            + "returns its path. Requires the permission 'structuredDataMapperManage' on the site")
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
    @GraphQLDescription("Creates the Open Graph and schema.org mapping of a content type or of a mixin on this site node, "
            + "or replaces all its values. Requires the permission 'structuredDataMapperManage' on the site")
    public boolean saveOpenGraphMapping(
            @GraphQLName("nodeType") @GraphQLNonNull @GraphQLDescription("The content type or the mixin, such as jnt:news") String nodeType,
            @GraphQLName("ogType") @GraphQLNonNull @GraphQLDescription("The og:type, such as article") String ogType,
            @GraphQLName("properties") @GraphQLNonNull @GraphQLDescription("The Open Graph properties and their source property")
                    List<GqlPropertyMappingInput> properties,
            @GraphQLName("templateName") @GraphQLDescription("The template of a template mapping, such as home. A template "
                    + "mapping applies only to the contents of the type that use the template") String templateName,
            @GraphQLName("schemaType") @GraphQLDescription("The schema.org type, such as Article. Without it, the mapping "
                    + "writes no JSON-LD") String schemaType,
            @GraphQLName("schemaProperties") @GraphQLDescription("The schema.org properties and their source property")
                    List<GqlSchemaPropertyMappingInput> schemaProperties) {
        JCRSiteNode site = Resolvers.managedSite(mutation.jcrNode);
        List<PropertyMapping> mappings = properties.stream()
                .map(property -> new PropertyMapping(property.getOgProperty(), property.getSourceProperty()))
                .collect(Collectors.toList());
        List<PropertyMapping> schemaMappings = schemaProperties == null ? Collections.emptyList() : schemaProperties.stream()
                .map(property -> new PropertyMapping(property.getSchemaProperty(), property.getSourceProperty()))
                .collect(Collectors.toList());
        try {
            Resolvers.service().saveMapping(site, nodeType, templateName, ogType, mappings, schemaType, schemaMappings);
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
    @GraphQLDescription("Deletes the Open Graph mapping of a content type or of a mixin on this site node. Does nothing when "
            + "no mapping exists. Requires the permission 'structuredDataMapperManage' on the site")
    public boolean deleteOpenGraphMapping(
            @GraphQLName("nodeType") @GraphQLNonNull @GraphQLDescription("The content type or the mixin, such as jnt:news") String nodeType,
            @GraphQLName("templateName") @GraphQLDescription("The template of a template mapping. Without it, the mutation "
                    + "deletes the mapping of every template") String templateName) {
        JCRSiteNode site = Resolvers.managedSite(mutation.jcrNode);
        try {
            Resolvers.service().deleteMapping(site, nodeType, templateName);
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
        return true;
    }
}

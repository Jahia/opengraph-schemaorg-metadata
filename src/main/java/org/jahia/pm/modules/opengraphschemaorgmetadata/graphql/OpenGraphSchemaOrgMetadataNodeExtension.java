package org.jahia.pm.modules.opengraphschemaorgmetadata.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DataFetchingException;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrNode;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrWrongInputException;
import org.jahia.modules.graphql.provider.dxm.node.NodeHelper;
import org.jahia.pm.modules.opengraphschemaorgmetadata.InvalidMappingException;
import org.jahia.pm.modules.opengraphschemaorgmetadata.SourceProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.choicelist.SourceChoices;
import org.jahia.pm.modules.opengraphschemaorgmetadata.render.JsonLdWriter;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.utils.LanguageCodeConverters;

import javax.jcr.RepositoryException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@GraphQLTypeExtension(GqlJcrNode.class)
public class OpenGraphSchemaOrgMetadataNodeExtension {

    private final GqlJcrNode node;

    public OpenGraphSchemaOrgMetadataNodeExtension(GqlJcrNode node) {
        this.node = node;
    }

    @GraphQLField
    @GraphQLName("openGraphMappings")
    @GraphQLDescription("The Open Graph mappings of this site node. Requires the permission 'openGraphSchemaOrgMetadataManage' on the site")
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
            + "mixins that extend the type. Call it on the site node. Requires the permission 'openGraphSchemaOrgMetadataManage' on the site")
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
    @GraphQLName("openGraphSourceChoices")
    @GraphQLDescription("The choices of every field of a mapping that holds a source property, for a content type, as "
            + "the Content Editor lists them in the form of a mapping. Call it on the site node. Requires the permission "
            + "'openGraphSchemaOrgMetadataManage' on the site")
    public List<GqlSourceChoices> getOpenGraphSourceChoices(
            @GraphQLName("nodeType") @GraphQLNonNull @GraphQLDescription("The content type, such as jnt:news") String nodeType,
            @GraphQLName("language") @GraphQLNonNull @GraphQLDescription("The language of the labels") String language) {
        JCRSiteNode site = Resolvers.managedSite(node.getNode());
        try {
            List<SourceProperty> sources = Resolvers.service().getSourceProperties(site, nodeType,
                    LanguageCodeConverters.languageCodeToLocale(language));
            List<GqlSourceChoices> fields = new ArrayList<>();
            for (Map.Entry<String, List<ChoiceListValue>> field : SourceChoices.ofEveryField(sources).entrySet()) {
                List<GqlSourceChoice> choices = new ArrayList<>();
                for (ChoiceListValue choice : field.getValue()) {
                    choices.add(new GqlSourceChoice(choice.getValue().getString(), choice.getDisplayName()));
                }
                fields.add(new GqlSourceChoices(field.getKey(), choices));
            }
            return fields;
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

    @GraphQLField
    @GraphQLName("schemaOrgJsonLd")
    @GraphQLDescription("The schema.org entity of this content node as JSON text, as the JSON-LD block of the live page "
            + "holds it, with the values that an editor set. A content or a file, such as the value of url or image, is "
            + "an object with the single key nodePath in place of its live URL. Null when no mapping applies, or when "
            + "schema.org is off in the mapping")
    public String getSchemaOrgJsonLd(
            @GraphQLName("language") @GraphQLNonNull @GraphQLDescription("The language of the values") String language) {
        try {
            JCRNodeWrapper localized = NodeHelper.getNodeInLanguage(node.getNode(), language);
            Map<String, Object> entity = Resolvers.service().resolveSchemaOrg(localized,
                    LanguageCodeConverters.languageCodeToLocale(language));
            return entity.isEmpty() ? null : JsonLdWriter.json(withNodePaths(entity));
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
    }

    /**
     * @return a copy of a value of the entity where {"nodePath": path} replaces each node
     */
    private static Object withNodePaths(Object value) {
        if (value instanceof JCRNodeWrapper) {
            return Collections.singletonMap("nodePath", ((JCRNodeWrapper) value).getPath());
        }
        if (value instanceof Map) {
            Map<Object, Object> copy = new LinkedHashMap<>();
            ((Map<?, ?>) value).forEach((key, item) -> copy.put(key, withNodePaths(item)));
            return copy;
        }
        if (value instanceof List) {
            List<Object> copy = new ArrayList<>();
            ((List<?>) value).forEach(item -> copy.add(withNodePaths(item)));
            return copy;
        }
        return value;
    }
}

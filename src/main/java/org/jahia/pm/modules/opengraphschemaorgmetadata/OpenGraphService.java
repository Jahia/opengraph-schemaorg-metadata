package org.jahia.pm.modules.opengraphschemaorgmetadata;

import org.jahia.api.Constants;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgKind;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgType;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgValues;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.SchemaProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.SchemaType;
import org.jahia.services.content.JCRContentUtils;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRTemplate;
import org.jahia.services.content.JCRValueWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.ExtendedNodeType;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.NodeTypeRegistry;
import org.jahia.services.content.nodetypes.SelectorType;
import org.jahia.services.content.nodetypes.initializers.ChoiceListInitializer;
import org.jahia.services.content.nodetypes.initializers.ChoiceListInitializerService;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.RenderService;
import org.jahia.services.render.Resource;
import org.jahia.services.render.Template;
import org.json.JSONException;
import org.json.JSONObject;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.ItemNotFoundException;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import javax.jcr.nodetype.NoSuchNodeTypeException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Stores the Open Graph mappings of a site, and resolves the Open Graph tags and the schema.org entity of a content node.
 * <p>
 * The mappings live under {@code /sites/<siteKey>/opengraph-schemaorg-metadata} in the default workspace. The settings node
 * has the mixin {@code jmix:nolive}, so a publication never copies it to live, and a change applies at once.
 * The service keeps the mappings of each site in memory, because the render filter reads them on every live page.
 */
@Component(service = OpenGraphService.class, immediate = true)
public class OpenGraphService {

    public static final String MANAGE_PERMISSION = "openGraphSchemaOrgMetadataManage";
    public static final String SETTINGS_NODE_NAME = "opengraph-schemaorg-metadata";
    public static final String NODE_TYPE_PROPERTY = "osm:nodeType";
    public static final String TEMPLATE_PROPERTY = "osm:templateName";
    /**
     * The value of {@code osm:templateName} for a mapping of every template.
     */
    public static final String ALL_TEMPLATES = "*";

    private static final Logger logger = LoggerFactory.getLogger(OpenGraphService.class);

    private static final String SETTINGS_TYPE = "osmnt:settings";
    private static final String TYPE_MAPPING_TYPE = "osmnt:typeMapping";
    private static final String OPEN_GRAPH_MIXIN = "osmmix:openGraph";
    private static final String OG_TYPE_PROPERTY = "osm:ogType";
    private static final String STORAGE_PREFIX = "osm:";
    private static final String SCHEMA_ORG_MIXIN = "osmmix:schemaOrg";
    private static final String SCHEMA_TYPE_PROPERTY = "osm:schemaType";
    private static final String SCHEMA_STORAGE_PREFIX = "osm:schema_";

    /**
     * The mixin that holds the Open Graph properties of an og:type, beyond the properties of every og:type.
     */
    private static final Map<OgType, String> OG_TYPE_MIXINS = new EnumMap<>(OgType.class);

    static {
        OG_TYPE_MIXINS.put(OgType.ARTICLE, "osmmix:article");
        OG_TYPE_MIXINS.put(OgType.BOOK, "osmmix:book");
        OG_TYPE_MIXINS.put(OgType.PROFILE, "osmmix:profile");
        OG_TYPE_MIXINS.put(OgType.MUSIC_SONG, "osmmix:musicSong");
        OG_TYPE_MIXINS.put(OgType.MUSIC_ALBUM, "osmmix:musicAlbum");
        OG_TYPE_MIXINS.put(OgType.MUSIC_PLAYLIST, "osmmix:musicPlaylist");
        OG_TYPE_MIXINS.put(OgType.MUSIC_RADIO_STATION, "osmmix:musicRadioStation");
        OG_TYPE_MIXINS.put(OgType.VIDEO_MOVIE, "osmmix:videoMovie");
        OG_TYPE_MIXINS.put(OgType.VIDEO_EPISODE, "osmmix:videoEpisode");
        OG_TYPE_MIXINS.put(OgType.VIDEO_TV_SHOW, "osmmix:videoTvShow");
        OG_TYPE_MIXINS.put(OgType.VIDEO_OTHER, "osmmix:videoOther");
    }

    /**
     * The mixin that holds the schema.org properties of a schema.org type. Each type has its own mixin, as each
     * og:type does, even when two types have the same properties.
     */
    private static final Map<SchemaType, String> SCHEMA_TYPE_MIXINS = new EnumMap<>(SchemaType.class);

    static {
        SCHEMA_TYPE_MIXINS.put(SchemaType.ARTICLE, "osmmix:schemaArticle");
        SCHEMA_TYPE_MIXINS.put(SchemaType.NEWS_ARTICLE, "osmmix:schemaNewsArticle");
        SCHEMA_TYPE_MIXINS.put(SchemaType.BLOG_POSTING, "osmmix:schemaBlogPosting");
        SCHEMA_TYPE_MIXINS.put(SchemaType.WEB_PAGE, "osmmix:schemaWebPage");
        SCHEMA_TYPE_MIXINS.put(SchemaType.PROFILE_PAGE, "osmmix:schemaProfilePage");
        SCHEMA_TYPE_MIXINS.put(SchemaType.PRODUCT, "osmmix:schemaProduct");
        SCHEMA_TYPE_MIXINS.put(SchemaType.EVENT, "osmmix:schemaEvent");
        SCHEMA_TYPE_MIXINS.put(SchemaType.RECIPE, "osmmix:schemaRecipe");
        SCHEMA_TYPE_MIXINS.put(SchemaType.VIDEO_OBJECT, "osmmix:schemaVideoObject");
    }

    private static final String PAGE_TYPE = "jnt:page";
    private static final String MAIN_RESOURCE_TYPE = "jmix:mainResource";
    private static final String HAS_TEMPLATE_MIXIN = "jmix:hasTemplateNode";
    private static final String TEMPLATE_NAME_PROPERTY = "j:templateName";
    private static final String TEMPLATES_INITIALIZER = "templatesNode";
    private static final String HTML = "html";
    private static final String LIVE_SERVLET_PATH = "/cms/render/live";
    private static final String MODULE_ID = "opengraph-schemaorg-metadata";
    private static final String FILE_TYPE = "jnt:file";
    private static final String IMAGE_MIXIN = "jmix:image";
    private static final String TITLE_PROPERTY = "jcr:title";
    private static final String CUSTOM_TAGS_PROPERTY = "osm:customTags";
    private static final String SYSTEM_MODULE = "system-jahia";
    private static final String TWITTER_CARD = "twitter:card";
    private static final Set<String> FILE_PICKER_TYPES = new HashSet<>(Arrays.asList("image", "file"));

    /**
     * The mappings of each site, by site path. {@link MappingCacheListener} removes the entry of a site when its
     * settings node changes.
     */
    private final Map<String, List<TypeMapping>> mappingsBySite = new ConcurrentHashMap<>();

    /**
     * @return the mappings of the site, in the order of their creation
     */
    public List<TypeMapping> getMappings(JCRSiteNode site) throws RepositoryException {
        try {
            // A removal waits for a running load of the same site, so a load never stores a stale value.
            return mappingsBySite.computeIfAbsent(site.getPath(), OpenGraphService::readMappings);
        } catch (MappingReadException e) {
            throw e.getCause();
        }
    }

    /**
     * Removes the cached mappings of a site. The next read loads them from the repository again.
     */
    void clearMappings(String sitePath) {
        mappingsBySite.remove(sitePath);
    }

    /**
     * Removes the cached mappings of every site.
     */
    void clearMappings() {
        mappingsBySite.clear();
    }

    private static List<TypeMapping> readMappings(String sitePath) {
        String settingsPath = sitePath + "/" + SETTINGS_NODE_NAME;
        try {
            return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, Constants.EDIT_WORKSPACE, null, session -> {
                if (!session.nodeExists(settingsPath)) {
                    return Collections.emptyList();
                }
                List<TypeMapping> mappings = new ArrayList<>();
                for (JCRNodeWrapper typeNode : JCRContentUtils.getChildrenOfType(session.getNode(settingsPath), TYPE_MAPPING_TYPE)) {
                    mappings.add(readMapping(typeNode));
                }
                return Collections.unmodifiableList(mappings);
            });
        } catch (RepositoryException e) {
            throw new MappingReadException(e);
        }
    }

    private static TypeMapping readMapping(JCRNodeWrapper typeNode) throws RepositoryException {
        String ogType = typeNode.getPropertyAsString(OG_TYPE_PROPERTY);
        List<PropertyMapping> properties = new ArrayList<>();
        for (OgProperty property : OgType.fromValue(ogType).map(OgType::getProperties).orElse(Collections.emptyList())) {
            String source = typeNode.getPropertyAsString(storageName(property.getName()));
            if (source != null && !source.isEmpty()) {
                properties.add(new PropertyMapping(property.getName(), source));
            }
        }
        SchemaType schemaType = SchemaType.fromValue(typeNode.getPropertyAsString(SCHEMA_TYPE_PROPERTY)).orElse(null);
        return new TypeMapping(typeNode.getIdentifier(), typeNode.getPropertyAsString(NODE_TYPE_PROPERTY),
                templateName(typeNode), ogType, properties, schemaType == null ? null : schemaType.getValue(),
                schemaProperties(typeNode, schemaType));
    }

    /**
     * @return the schema.org properties of a mapping node that have a source property, in the order of the vocabulary
     */
    private static List<PropertyMapping> schemaProperties(JCRNodeWrapper typeNode, SchemaType schemaType) {
        if (schemaType == null) {
            return Collections.emptyList();
        }
        List<PropertyMapping> properties = new ArrayList<>();
        for (SchemaProperty property : schemaType.getProperties()) {
            String source = typeNode.getPropertyAsString(schemaStorageName(property.getName()));
            if (source != null && !source.isEmpty()) {
                properties.add(new PropertyMapping(property.getName(), source));
            }
        }
        return properties;
    }

    /**
     * @return the template of a template mapping, or null for a mapping of every template
     */
    private static String templateName(JCRNodeWrapper typeNode) {
        return templateOrNull(typeNode.getPropertyAsString(TEMPLATE_PROPERTY));
    }

    /**
     * A mapping created before {@code osm:templateName} existed has no value, and applies to every template.
     *
     * @return the template, or null for null, an empty value and {@link #ALL_TEMPLATES}
     */
    public static String templateOrNull(String templateName) {
        return templateName == null || templateName.isEmpty() || ALL_TEMPLATES.equals(templateName) ? null : templateName;
    }

    /**
     * Creates the mapping of a content type or of a mixin, or replaces all its values. A template creates or replaces
     * the template mapping of the content type for that template.
     *
     * @param templateName     the template, or null, empty or {@link #ALL_TEMPLATES} for a mapping of every template
     * @param ogType           the og:type, or null or empty for a mapping that writes no Open Graph tag
     * @param properties       the Open Graph properties and their source property, empty without an og:type
     * @param schemaType       the schema.org type, or null or empty for a mapping that writes no JSON-LD
     * @param schemaProperties the schema.org properties and their source property, empty without a schema.org type
     * @throws InvalidMappingException when the site cannot use the content type, the template, the og:type, the
     *                                 schema.org type or a property
     */
    @SuppressWarnings("java:S107") // one value per argument of the GraphQL mutation
    public void saveMapping(JCRSiteNode site, String nodeType, String templateName, String ogType,
                            List<PropertyMapping> properties, String schemaType, List<PropertyMapping> schemaProperties)
            throws InvalidMappingException, RepositoryException {
        ExtendedNodeType type = mappableType(site, nodeType);
        String template = templateOrNull(templateName);
        if (template != null && !getTemplates(site, nodeType, Locale.ENGLISH).containsKey(template)) {
            throw new InvalidMappingException("The site '" + site.getSiteKey() + "' has no template '" + template
                    + "' for the content type '" + nodeType + "'");
        }
        OgType og = ogType(ogType, properties);
        Map<String, ExtendedPropertyDefinition> sources = sourceDefinitions(site, type);
        Set<String> mapped = new HashSet<>();
        for (PropertyMapping property : properties) {
            validate(property, og, nodeType, sources, mapped);
        }
        SchemaType schema = schemaType(schemaType, schemaProperties);
        validate(schemaProperties, schema, nodeType, sources);

        JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(JCRSessionFactory.getInstance().getCurrentUser(),
                Constants.EDIT_WORKSPACE, null, session -> {
                    JCRNodeWrapper mapping = typeNode(session, site.getPath(), nodeType, template);
                    mapping.setProperty(NODE_TYPE_PROPERTY, nodeType);
                    mapping.setProperty(TEMPLATE_PROPERTY, template == null ? ALL_TEMPLATES : template);
                    setOgMapping(mapping, og, properties);
                    setSchemaMapping(mapping, schema, schemaProperties);
                    session.save();
                    return null;
                });
        clearMappings(site.getPath());
    }

    /**
     * @return the og:type, or null for a mapping without one
     * @throws InvalidMappingException when the og:type is unknown, or when Open Graph properties have no og:type
     */
    private static OgType ogType(String ogType, List<PropertyMapping> properties) throws InvalidMappingException {
        if (ogType == null || ogType.isEmpty()) {
            if (!properties.isEmpty()) {
                throw new InvalidMappingException("An Open Graph property needs an og:type");
            }
            return null;
        }
        return OgType.fromValue(ogType).orElseThrow(() -> new InvalidMappingException(
                "Unknown og:type '" + ogType + "'. Use one of "
                        + Arrays.stream(OgType.values()).map(OgType::getValue).collect(Collectors.joining(", ", "[", "]"))));
    }

    /**
     * Replaces the og:type of a mapping node, its mixins and the source of each of its Open Graph properties.
     *
     * @param og the og:type, or null to remove the Open Graph mapping
     */
    private static void setOgMapping(JCRNodeWrapper mapping, OgType og, List<PropertyMapping> properties)
            throws RepositoryException {
        removeOgProperties(mapping);
        setOgTypeMixin(mapping, og);
        if (og == null) {
            if (mapping.hasProperty(OG_TYPE_PROPERTY)) {
                mapping.getProperty(OG_TYPE_PROPERTY).remove();
            }
            if (mapping.isNodeType(OPEN_GRAPH_MIXIN)) {
                mapping.removeMixin(OPEN_GRAPH_MIXIN);
            }
            return;
        }
        if (!mapping.isNodeType(OPEN_GRAPH_MIXIN)) {
            mapping.addMixin(OPEN_GRAPH_MIXIN);
        }
        mapping.setProperty(OG_TYPE_PROPERTY, og.getValue());
        for (PropertyMapping property : properties) {
            mapping.setProperty(storageName(property.getProperty()), property.getSourceProperty());
        }
    }

    /**
     * Removes the source of every Open Graph property from a mapping node.
     */
    private static void removeOgProperties(JCRNodeWrapper mapping) throws RepositoryException {
        // Two og:types that share a property name share its storage, so the second removal finds nothing.
        for (OgType anyOgType : OgType.values()) {
            for (OgProperty property : anyOgType.getProperties()) {
                String name = storageName(property.getName());
                if (mapping.hasProperty(name)) {
                    mapping.getProperty(name).remove();
                }
            }
        }
    }

    /**
     * Keeps on a mapping node the mixin of the own Open Graph properties of its og:type only.
     *
     * @param og the og:type, or null to remove every og:type mixin
     */
    private static void setOgTypeMixin(JCRNodeWrapper mapping, OgType og) throws RepositoryException {
        for (Map.Entry<OgType, String> mixin : OG_TYPE_MIXINS.entrySet()) {
            if (mixin.getKey() != og && mapping.isNodeType(mixin.getValue())) {
                mapping.removeMixin(mixin.getValue());
            }
        }
        String mixin = OG_TYPE_MIXINS.get(og);
        if (mixin != null && !mapping.isNodeType(mixin)) {
            mapping.addMixin(mixin);
        }
    }

    /**
     * @return the schema.org type, or null for a mapping without one
     * @throws InvalidMappingException when the type is unknown, or when schema.org properties have no type
     */
    private static SchemaType schemaType(String schemaType, List<PropertyMapping> schemaProperties)
            throws InvalidMappingException {
        if (schemaType == null || schemaType.isEmpty()) {
            if (!schemaProperties.isEmpty()) {
                throw new InvalidMappingException("A schema.org property needs a schema.org type");
            }
            return null;
        }
        return SchemaType.fromValue(schemaType).orElseThrow(() -> new InvalidMappingException(
                "Unknown schema.org type '" + schemaType + "'. Use one of "
                        + Arrays.stream(SchemaType.values()).map(SchemaType::getValue).collect(Collectors.joining(", ", "[", "]"))));
    }

    /**
     * Replaces the schema.org type of a mapping node, its mixin and the source of each of its schema.org properties.
     *
     * @param schemaType the schema.org type, or null to remove the schema.org mapping
     */
    private static void setSchemaMapping(JCRNodeWrapper mapping, SchemaType schemaType, List<PropertyMapping> properties)
            throws RepositoryException {
        removeSchemaProperties(mapping);
        setSchemaTypeMixin(mapping, schemaType);
        if (schemaType == null) {
            if (mapping.hasProperty(SCHEMA_TYPE_PROPERTY)) {
                mapping.getProperty(SCHEMA_TYPE_PROPERTY).remove();
            }
            if (mapping.isNodeType(SCHEMA_ORG_MIXIN)) {
                mapping.removeMixin(SCHEMA_ORG_MIXIN);
            }
            return;
        }
        if (!mapping.isNodeType(SCHEMA_ORG_MIXIN)) {
            mapping.addMixin(SCHEMA_ORG_MIXIN);
        }
        mapping.setProperty(SCHEMA_TYPE_PROPERTY, schemaType.getValue());
        for (PropertyMapping property : properties) {
            mapping.setProperty(schemaStorageName(property.getProperty()), property.getSourceProperty());
        }
    }

    /**
     * Removes the source of every schema.org property from a mapping node.
     */
    private static void removeSchemaProperties(JCRNodeWrapper mapping) throws RepositoryException {
        for (SchemaType anySchemaType : SchemaType.values()) {
            for (SchemaProperty property : anySchemaType.getProperties()) {
                String name = schemaStorageName(property.getName());
                if (mapping.hasProperty(name)) {
                    mapping.getProperty(name).remove();
                }
            }
        }
    }

    /**
     * Keeps on a mapping node the mixin of the schema.org properties of its schema.org type only.
     *
     * @param schemaType the schema.org type, or null to remove every schema.org mixin
     */
    private static void setSchemaTypeMixin(JCRNodeWrapper mapping, SchemaType schemaType) throws RepositoryException {
        String mixin = schemaType == null ? null : SCHEMA_TYPE_MIXINS.get(schemaType);
        for (String anyMixin : SCHEMA_TYPE_MIXINS.values()) {
            if (!anyMixin.equals(mixin) && mapping.isNodeType(anyMixin)) {
                mapping.removeMixin(anyMixin);
            }
        }
        if (mixin != null && !mapping.isNodeType(mixin)) {
            mapping.addMixin(mixin);
        }
    }

    /**
     * Deletes the mapping of a content type or of a mixin. Does nothing when the site has no mapping for it.
     *
     * @param templateName the template of a template mapping, or null, empty or {@link #ALL_TEMPLATES} for the mapping
     *                     of every template
     */
    public void deleteMapping(JCRSiteNode site, String nodeType, String templateName) throws RepositoryException {
        String template = templateOrNull(templateName);
        String settingsPath = site.getPath() + "/" + SETTINGS_NODE_NAME;
        JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(JCRSessionFactory.getInstance().getCurrentUser(),
                Constants.EDIT_WORKSPACE, null, session -> {
                    if (!session.nodeExists(settingsPath)) {
                        return null;
                    }
                    // Match on the stored value: the argument is free text and never becomes a path.
                    for (JCRNodeWrapper typeNode : JCRContentUtils.getChildrenOfType(session.getNode(settingsPath), TYPE_MAPPING_TYPE)) {
                        if (nodeType.equals(typeNode.getPropertyAsString(NODE_TYPE_PROPERTY))
                                && Objects.equals(template, templateName(typeNode))) {
                            typeNode.remove();
                            session.save();
                        }
                    }
                    return null;
                });
        clearMappings(site.getPath());
    }

    /**
     * Creates the settings node of the site when it does not exist, so the Content Editor can create a mapping
     * under it.
     *
     * @return the path of the settings node
     */
    public String createSettings(JCRSiteNode site) throws RepositoryException {
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(JCRSessionFactory.getInstance().getCurrentUser(),
                Constants.EDIT_WORKSPACE, null, session -> {
                    JCRNodeWrapper settings = settingsNode(session, site.getPath());
                    session.save();
                    return settings.getPath();
                });
    }

    /**
     * @return the content types and the mixins that the site can map, from the modules of the site: {@code jnt:page},
     * the types that inherit {@code jmix:mainResource}, and the mixins that extend one of them
     */
    public List<ExtendedNodeType> getMappableTypes(JCRSiteNode site) {
        Set<String> siteModules = site.getInstalledModulesWithAllDependencies();
        List<ExtendedNodeType> types = new ArrayList<>();
        for (ExtendedNodeType type : NodeTypeRegistry.getInstance().getAllNodeTypes()) {
            if (!type.isAbstract() && isMappable(type) && isActiveOnSite(siteModules, type)) {
                types.add(type);
            }
        }
        return types;
    }

    /**
     * A mixin is mappable when it inherits {@code jmix:mainResource}, or when its {@code extends=} names a page or a
     * main resource, such as {@code jahootmix:session} with {@code extends = jnt:page}. The mixins of the module are
     * not mappable.
     *
     * @return true for {@code jnt:page}, a type that inherits {@code jmix:mainResource}, or a mappable mixin
     */
    private static boolean isMappable(ExtendedNodeType type) {
        if (!type.isMixin()) {
            return isPageOrMainResource(type);
        }
        return !MODULE_ID.equals(type.getSystemId()) && (type.isNodeType(MAIN_RESOURCE_TYPE)
                || type.getMixinExtends().stream().anyMatch(OpenGraphService::isPageOrMainResource));
    }

    private static boolean isPageOrMainResource(ExtendedNodeType type) {
        return type.isNodeType(PAGE_TYPE) || type.isNodeType(MAIN_RESOURCE_TYPE);
    }

    /**
     * A page, or a content with {@code j:templateName}, stores its template. A main resource without it takes the
     * content template that Jahia resolves for it when it renders the content as a page.
     *
     * @return true when a template mapping can use the type: a content type, not a mixin, that is a page, a main
     * resource or has {@code j:templateName}
     */
    public static boolean hasTemplates(ExtendedNodeType type) {
        return !type.isMixin() && (type.isNodeType(HAS_TEMPLATE_MIXIN) || type.isNodeType(MAIN_RESOURCE_TYPE));
    }

    /**
     * Lists the templates that a template mapping of the content type can use. The list comes from the choice list of
     * {@code j:templateName}, so it holds the templates of the template set and of the modules of the site: the page
     * templates of a page, and the content templates that apply to the type of a main resource. A JavaScript module
     * adds its own templates to this choice list.
     *
     * @return the display name of each template, by name, in the order of the choice list
     * @throws InvalidMappingException when the site cannot map the content type, or when the type has no template
     */
    public Map<String, String> getTemplates(JCRSiteNode site, String nodeType, Locale locale) throws InvalidMappingException {
        ExtendedNodeType type = mappableType(site, nodeType);
        if (!hasTemplates(type)) {
            throw new InvalidMappingException("The content type '" + nodeType + "' is not a page or a main resource and has no "
                    + TEMPLATE_NAME_PROPERTY + ", so a template mapping cannot use it");
        }
        ChoiceListInitializer initializer = ChoiceListInitializerService.getInstance().getInitializers().get(TEMPLATES_INITIALIZER);
        ExtendedPropertyDefinition definition = templateNameDefinition(type);
        if (initializer == null || definition == null) {
            return Collections.emptyMap();
        }
        // The context of the creation form of a content of the type: the choice list reads the site of the parent node.
        Map<String, Object> context = new HashMap<>();
        context.put("contextType", type);
        context.put("contextParent", site);
        // The option names the kind of template, such as templatesNode=pageTemplate, and the default depends on the type.
        Map<String, String> options = definition.getSelectorOptions();
        String param = options == null ? null : options.get(TEMPLATES_INITIALIZER);
        Map<String, String> templates = new LinkedHashMap<>();
        for (ChoiceListValue value : initializer.getChoiceListValues(definition, param == null ? "" : param,
                new ArrayList<>(), locale, context)) {
            String name = stringValue(value);
            // A heading of the list has an empty value, and a page model has the path of its page.
            if (name != null && !name.isEmpty() && !name.startsWith("/")) {
                templates.putIfAbsent(name, value.getDisplayName());
            }
        }
        return templates;
    }

    /**
     * A main resource without {@code j:templateName} takes the definition of {@code jmix:hasTemplateNode}, so the choice
     * list gives the names of the content templates that apply to its type.
     *
     * @return the definition of {@code j:templateName} that the choice list of the templates of the type reads
     */
    private static ExtendedPropertyDefinition templateNameDefinition(ExtendedNodeType type) {
        ExtendedPropertyDefinition definition = type.getPropertyDefinitionsAsMap().get(TEMPLATE_NAME_PROPERTY);
        if (definition != null) {
            return definition;
        }
        try {
            return NodeTypeRegistry.getInstance().getNodeType(HAS_TEMPLATE_MIXIN).getPropertyDefinitionsAsMap().get(TEMPLATE_NAME_PROPERTY);
        } catch (NoSuchNodeTypeException e) {
            return null;
        }
    }

    private static String stringValue(ChoiceListValue value) {
        try {
            return value.getValue() == null ? null : value.getValue().getString();
        } catch (RepositoryException e) {
            return null;
        }
    }

    /**
     * @return the property of a mapping node that holds the source of an Open Graph property, such as
     * {@code osm:og_image_alt} for {@code og:image:alt}
     */
    public static String storageName(String ogProperty) {
        return STORAGE_PREFIX + ogProperty.replace(':', '_');
    }

    /**
     * Two og:types that share a property name, such as {@code music.album} and {@code music.playlist} for
     * {@code music:song}, hold the same property, so the first match is the answer.
     *
     * @return the Open Graph property that a property of a mapping node holds, such as {@code og:image:alt} for
     * {@code osm:og_image_alt}
     */
    public static Optional<OgProperty> findOgProperty(String storageName) {
        for (OgType type : OgType.values()) {
            for (OgProperty property : type.getProperties()) {
                if (storageName(property.getName()).equals(storageName)) {
                    return Optional.of(property);
                }
            }
        }
        return Optional.empty();
    }

    /**
     * @return the mixin that holds the own Open Graph properties of the og:type, or empty for {@code website}
     */
    public static Optional<String> ogTypeMixin(OgType ogType) {
        return Optional.ofNullable(OG_TYPE_MIXINS.get(ogType));
    }

    /**
     * @return the property of a mapping node that holds the source of a schema.org property, such as
     * {@code osm:schema_author_name} for {@code author.name}
     */
    public static String schemaStorageName(String schemaProperty) {
        return SCHEMA_STORAGE_PREFIX + schemaProperty.replace('.', '_');
    }

    /**
     * Two schema.org types that share a property name, such as {@code Article} and {@code Recipe} for
     * {@code author.name}, hold the same property, so the first match is the answer.
     *
     * @return the schema.org property that a property of a mapping node holds, such as {@code author.name} for
     * {@code osm:schema_author_name}
     */
    public static Optional<SchemaProperty> findSchemaProperty(String storageName) {
        for (SchemaType type : SchemaType.values()) {
            for (SchemaProperty property : type.getProperties()) {
                if (schemaStorageName(property.getName()).equals(storageName)) {
                    return Optional.of(property);
                }
            }
        }
        return Optional.empty();
    }

    /**
     * @return the mixin that holds the schema.org properties of the schema.org type
     */
    public static String schemaTypeMixin(SchemaType schemaType) {
        return SCHEMA_TYPE_MIXINS.get(schemaType);
    }

    /**
     * Lists the properties of a content type that a mapping can use: the properties of the type and of its
     * supertypes, and the properties of the mixins that extend them with {@code extends=}, such as
     * {@code jmix:seoHtmlHead}.
     *
     * @throws InvalidMappingException when the site cannot map the content type
     */
    public List<SourceProperty> getSourceProperties(JCRSiteNode site, String nodeType, Locale locale)
            throws InvalidMappingException, RepositoryException {
        ExtendedNodeType type = mappableType(site, nodeType);
        List<SourceProperty> properties = new ArrayList<>();
        for (ExtendedPropertyDefinition definition : sourceDefinitions(site, type).values()) {
            properties.add(new SourceProperty(definition.getName(), definition.getLabel(locale, type),
                    typeName(definition), definition.isMultiple(),
                    definition.isInternationalized(), definition.getDeclaringNodeType().getName(),
                    compatibleKinds(definition)));
        }
        return properties;
    }

    /**
     * Resolves the Open Graph tags of a content node with its mapping, which {@link #findMapping} selects from the
     * template, the mixins and the type of the node. A tag that the editor sets in {@code osm:customTags} replaces the
     * mapped values of its property. A structured property, such as {@code og:video:width}, has a tag only when its
     * root has one, except {@code og:image:alt}.
     * {@link OgTag#getSourceProperty} states which root has no source property.
     * <p>
     * The {@code og:url} tag and the tags of a file hold a node, and the caller builds the absolute URL. When the
     * session of the node has another locale, the method reads the node again with the current user, in the
     * same workspace.
     * <p>
     * The last tag is {@code twitter:card}, because X has no Open Graph fallback for it: {@code summary_large_image}
     * when the tags include {@code og:image}, else {@code summary}.
     *
     * @param renderContext the render of the node as the main resource of a page, or null outside a render
     * @return the tags, or an empty list when no mapping applies to the node
     */
    public List<OgTag> resolve(JCRNodeWrapper node, Locale locale, RenderContext renderContext) throws RepositoryException {
        JCRSiteNode site = node.getResolveSite();
        if (site == null) {
            return Collections.emptyList();
        }
        JCRNodeWrapper localized = inLocale(node, locale);
        TypeMapping mapping = findMapping(getMappings(site), localized, renderContext);
        OgType ogType = mapping == null ? null : OgType.fromValue(mapping.getOgType()).orElse(null);
        if (ogType == null) {
            return Collections.emptyList();
        }

        Map<String, List<OgTag>> mapped = mappedTags(localized, mapping, ogType);
        List<OgTag> tags = new ArrayList<>();
        addTitle(tags, mapped, localized);
        tags.add(OgTag.text("og:type", ogType.getValue()));
        tags.add(OgTag.node("og:url", localized));
        addProperties(tags, ogType, mapped);

        addText(tags, "og:site_name", site.getTitle());
        tags.add(OgTag.text("og:locale", OgValues.ogLocale(locale)));
        for (Locale alternate : site.getActiveLiveLanguagesAsLocales()) {
            if (!alternate.equals(locale)) {
                tags.add(OgTag.text("og:locale:alternate", OgValues.ogLocale(alternate)));
            }
        }
        boolean hasImage = tags.stream().anyMatch(tag -> OgType.OG_IMAGE.equals(tag.getProperty()));
        tags.add(OgTag.text(TWITTER_CARD, hasImage ? "summary_large_image" : "summary"));
        return tags;
    }

    /**
     * Resolves the schema.org entity of a content node with the schema.org type of its mapping, which
     * {@link #findMapping} selects as for the Open Graph tags. {@link SchemaOrgEntity#of} states the content of the
     * entity, and the caller builds the absolute URL of each node in it.
     *
     * @param renderContext the render of the node as the main resource of a page, or null outside a render
     * @return the entity, or an empty map when no mapping applies to the node or when its mapping has no schema.org type
     */
    public Map<String, Object> resolveSchemaOrg(JCRNodeWrapper node, Locale locale, RenderContext renderContext)
            throws RepositoryException {
        JCRSiteNode site = node.getResolveSite();
        if (site == null) {
            return Collections.emptyMap();
        }
        JCRNodeWrapper localized = inLocale(node, locale);
        TypeMapping mapping = findMapping(getMappings(site), localized, renderContext);
        SchemaType schemaType = mapping == null || mapping.getSchemaType() == null ? null
                : SchemaType.fromValue(mapping.getSchemaType()).orElse(null);
        if (schemaType == null) {
            return Collections.emptyMap();
        }
        return SchemaOrgEntity.of(localized, schemaType, mapping.getSchemaProperties());
    }

    /**
     * @return the tags of each Open Graph property of the og:type, from the mapping and from {@code osm:customTags}
     */
    private static Map<String, List<OgTag>> mappedTags(JCRNodeWrapper node, TypeMapping mapping, OgType ogType)
            throws RepositoryException {
        Map<String, List<OgTag>> mapped = new HashMap<>();
        for (PropertyMapping property : mapping.getProperties()) {
            OgProperty ogProperty = ogType.findProperty(property.getProperty()).orElse(null);
            if (ogProperty != null) {
                mapped.put(ogProperty.getName(), values(node, ogProperty, property.getSourceProperty()));
            }
        }
        // A tag of the editor replaces every mapped value of the same property.
        mapped.putAll(customTags(node, ogType));
        return mapped;
    }

    /**
     * Writes the og:title tags, or the {@code jcr:title} of the node when no mapping and no tag of the editor sets
     * og:title.
     */
    private static void addTitle(List<OgTag> tags, Map<String, List<OgTag>> mapped, JCRNodeWrapper node) {
        List<OgTag> titles = mapped.getOrDefault(OgType.OG_TITLE, Collections.emptyList());
        if (titles.isEmpty()) {
            String title = node.getPropertyAsString(TITLE_PROPERTY);
            if (title != null && !title.trim().isEmpty()) {
                tags.add(OgTag.text(OgType.OG_TITLE, title.trim(), TITLE_PROPERTY));
            }
        } else {
            tags.addAll(titles);
        }
    }

    /**
     * Writes the tags of the properties of the og:type, except og:title, in the order of the list. An og:image file
     * without og:image:alt writes the title of the file as og:image:alt.
     */
    private static void addProperties(List<OgTag> tags, OgType ogType, Map<String, List<OgTag>> mapped)
            throws RepositoryException {
        // og:image comes before og:image:alt in the list of every og:type.
        JCRNodeWrapper image = imageFile(mapped);
        Set<String> written = new HashSet<>();
        Set<String> withTag = new HashSet<>();
        Set<String> rootsWithStructuredTag = new HashSet<>();
        for (OgProperty property : ogType.getProperties()) {
            String name = property.getName();
            String root = rootOf(ogType, name);
            if (!canWrite(name, root, written, withTag)) {
                continue;
            }
            if (OgType.OG_IMAGE_ALT.equals(name) && mapped.getOrDefault(name, Collections.emptyList()).isEmpty()
                    && image != null) {
                addText(tags, OgType.OG_IMAGE_ALT, image.getPropertyAsString(TITLE_PROPERTY));
            } else if (addValues(tags, ogType, property, mapped, image, written)) {
                withTag.add(name);
                if (root != null) {
                    rootsWithStructuredTag.add(root);
                }
            }
        }
        // A single root, such as og:video, loses its source property only when a structured property follows it.
        tags.replaceAll(tag -> rootsWithStructuredTag.contains(tag.getProperty()) ? withoutSource(tag) : tag);
    }

    /**
     * An og:image that an editor typed as a URL, before the image picker, has no file node and no image details.
     *
     * @return the file of the og:image tag, or null when og:image has no tag or its tag holds a URL
     */
    private static JCRNodeWrapper imageFile(Map<String, List<OgTag>> mapped) {
        List<OgTag> images = mapped.getOrDefault(OgType.OG_IMAGE, Collections.emptyList());
        return images.isEmpty() ? null : images.get(0).getNode();
    }

    /**
     * A structured array writes its structured properties with its root, so the loop does not write them again.
     *
     * @param written the structured properties that a structured array wrote
     * @param withTag the properties that wrote at least one tag
     * @return true when the loop of {@link #addProperties} writes the property: og:title has its own place, and a
     * structured property needs a tag of its root
     */
    private static boolean canWrite(String name, String root, Set<String> written, Set<String> withTag) {
        if (OgType.OG_TITLE.equals(name) || written.contains(name)) {
            return false;
        }
        // The protocol writes a structured property after its root. og:image:alt keeps its tag without og:image.
        return root == null || withTag.contains(root) || OgType.OG_IMAGE_ALT.equals(name);
    }

    /**
     * Writes the values of a property. An og:image file adds its image details, and a root with several values
     * writes a structured array.
     *
     * @param image   the file of the og:image tag, or null
     * @param written receives the structured properties that a structured array writes
     * @return true when the property wrote at least one tag
     */
    private static boolean addValues(List<OgTag> tags, OgType ogType, OgProperty property,
                                     Map<String, List<OgTag>> mapped, JCRNodeWrapper image, Set<String> written)
            throws RepositoryException {
        String name = property.getName();
        List<OgTag> values = mapped.getOrDefault(name, Collections.emptyList());
        int size = tags.size();
        // A root with several values, such as video:actor, writes each value with its structured values.
        List<OgProperty> structured = property.isMultiple() ? ogType.findStructuredProperties(name) : Collections.emptyList();
        if (structured.isEmpty()) {
            // A property with several values holds a null for a value that writes no tag.
            values.stream().filter(Objects::nonNull).forEach(tags::add);
            if (OgType.OG_IMAGE.equals(name) && image != null) {
                addImageDetails(tags, image);
            }
        } else {
            addArray(tags, values, structured, mapped);
            structured.forEach(child -> written.add(child.getName()));
        }
        return tags.size() > size;
    }

    /**
     * @return the root of a structured property in the og:type, such as {@code og:video} for {@code og:video:width},
     * or null when the name before the last colon is not a property of the og:type
     */
    private static String rootOf(OgType ogType, String name) {
        int separator = name.lastIndexOf(':');
        if (separator < 0) {
            return null;
        }
        String root = name.substring(0, separator);
        return ogType.findProperty(root).isPresent() ? root : null;
    }

    /**
     * The preview of the Content Editor hides a tag whose live text is empty. A root keeps no source property, so the
     * preview does not show the structured values of that root alone.
     *
     * @return the tag without its source property
     */
    private static OgTag withoutSource(OgTag tag) {
        return tag.getSourceProperty() == null ? tag : OgTag.text(tag.getProperty(), tag.getContent());
    }

    /**
     * Writes a structured array, such as {@code music:album} with {@code music:album:disc} and
     * {@code music:album:track}: each value of the root, then the value of each structured property at the same
     * index. A null value writes no tag and keeps its index. The method does not write a structured value that has
     * no root value at its index. A root has no source property.
     */
    private static void addArray(List<OgTag> tags, List<OgTag> roots, List<OgProperty> structured,
                                 Map<String, List<OgTag>> mapped) {
        for (int index = 0; index < roots.size(); index++) {
            OgTag root = roots.get(index);
            if (root == null) {
                continue;
            }
            tags.add(withoutSource(root));
            for (OgProperty child : structured) {
                List<OgTag> childValues = mapped.getOrDefault(child.getName(), Collections.emptyList());
                OgTag childValue = index < childValues.size() ? childValues.get(index) : null;
                if (childValue != null) {
                    tags.add(childValue);
                }
            }
        }
    }

    private static void validate(PropertyMapping property, OgType og, String nodeType,
                                 Map<String, ExtendedPropertyDefinition> sources, Set<String> mapped)
            throws InvalidMappingException {
        String ogName = property.getProperty();
        OgProperty ogProperty = og.findProperty(ogName).orElseThrow(() -> new InvalidMappingException(
                "Unknown Open Graph property '" + ogName + "' for the og:type '" + og.getValue() + "'"));
        if (!mapped.add(ogName)) {
            throw new InvalidMappingException("The Open Graph property '" + ogName + "' is mapped twice");
        }
        ExtendedPropertyDefinition source = sources.get(property.getSourceProperty());
        if (source == null) {
            throw new InvalidMappingException("The content type '" + nodeType + "' has no property '"
                    + property.getSourceProperty() + "' that can fill an Open Graph property");
        }
        if (!compatibleKinds(source).contains(ogProperty.getKind())) {
            throw new InvalidMappingException("The property '" + property.getSourceProperty() + "' ("
                    + typeName(source) + ") cannot fill '" + ogName
                    + "', which takes a " + ogProperty.getKind() + " value");
        }
        if (!canFill(compatibleKinds(source), source.isMultiple(), ogProperty)) {
            throw new InvalidMappingException("The property '" + property.getSourceProperty()
                    + "' holds several values and cannot fill '" + ogName + "', which takes one " + ogProperty.getKind() + " value");
        }
    }

    private static void validate(List<PropertyMapping> properties, SchemaType schemaType, String nodeType,
                                 Map<String, ExtendedPropertyDefinition> sources) throws InvalidMappingException {
        Set<String> mapped = new HashSet<>();
        for (PropertyMapping property : properties) {
            validate(property, schemaType, nodeType, sources, mapped);
        }
    }

    private static void validate(PropertyMapping property, SchemaType schemaType, String nodeType,
                                 Map<String, ExtendedPropertyDefinition> sources, Set<String> mapped)
            throws InvalidMappingException {
        String name = property.getProperty();
        SchemaProperty schemaProperty = schemaType.findProperty(name).orElseThrow(() -> new InvalidMappingException(
                "Unknown schema.org property '" + name + "' for the schema.org type '" + schemaType.getValue() + "'"));
        if (!mapped.add(name)) {
            throw new InvalidMappingException("The schema.org property '" + name + "' is mapped twice");
        }
        ExtendedPropertyDefinition source = sources.get(property.getSourceProperty());
        if (source == null) {
            throw new InvalidMappingException("The content type '" + nodeType + "' has no property '"
                    + property.getSourceProperty() + "' that can fill a schema.org property");
        }
        if (!compatibleKinds(source).contains(schemaProperty.getKind())) {
            throw new InvalidMappingException("The property '" + property.getSourceProperty() + "' ("
                    + typeName(source) + ") cannot fill '" + name + "', which takes a " + schemaProperty.getKind() + " value");
        }
        if (!canFill(compatibleKinds(source), source.isMultiple(), schemaProperty)) {
            throw new InvalidMappingException("The property '" + property.getSourceProperty()
                    + "' holds several values and cannot fill '" + name + "', which takes one " + schemaProperty.getKind() + " value");
        }
    }

    /**
     * @return true when a source property of these kinds can fill the Open Graph property. A text or an integer Open
     * Graph property with one value takes a source property with one value only.
     */
    public static boolean canFill(Set<OgKind> kinds, boolean multipleSource, OgProperty ogProperty) {
        return canFill(kinds, multipleSource, ogProperty.getKind(), ogProperty.isMultiple());
    }

    /**
     * @return true when a source property of these kinds can fill the schema.org property. A text or a number with one
     * value takes a source property with one value only.
     */
    public static boolean canFill(Set<OgKind> kinds, boolean multipleSource, SchemaProperty schemaProperty) {
        return canFill(kinds, multipleSource, schemaProperty.getKind(), schemaProperty.isMultiple());
    }

    private static boolean canFill(Set<OgKind> kinds, boolean multipleSource, OgKind kind, boolean multipleTarget) {
        boolean oneValue = kind == OgKind.TEXT || kind == OgKind.INTEGER || kind == OgKind.NUMBER;
        return kinds.contains(kind) && !(oneValue && !multipleTarget && multipleSource);
    }

    /**
     * @return the JCR type in upper case, such as {@code WEAKREFERENCE}, as the GraphQL API of Jahia writes it
     */
    private static String typeName(ExtendedPropertyDefinition definition) {
        return PropertyType.nameFromValue(definition.getRequiredType()).toUpperCase(Locale.ROOT);
    }

    private static ExtendedNodeType mappableType(JCRSiteNode site, String nodeType) throws InvalidMappingException {
        ExtendedNodeType type;
        try {
            type = NodeTypeRegistry.getInstance().getNodeType(nodeType);
        } catch (NoSuchNodeTypeException e) {
            throw new InvalidMappingException("Unknown content type '" + nodeType + "'");
        }
        if (!isMappable(type)) {
            throw new InvalidMappingException("The content type '" + nodeType + "' is not " + PAGE_TYPE
                    + ", does not inherit " + MAIN_RESOURCE_TYPE + ", and is not a mixin that extends one of them");
        }
        if (!isActiveOnSite(site.getInstalledModulesWithAllDependencies(), type)) {
            throw new InvalidMappingException("The content type '" + nodeType + "' belongs to the module '"
                    + type.getSystemId() + "', which is not active on the site '" + site.getSiteKey() + "'");
        }
        return type;
    }

    private static boolean isActiveOnSite(Set<String> siteModules, ExtendedNodeType type) {
        return SYSTEM_MODULE.equals(type.getSystemId()) || siteModules.contains(type.getSystemId());
    }

    /**
     * A mixin also offers the properties of the types that it extends, such as {@code jnt:page} for
     * {@code jahootmix:session}.
     *
     * @return the properties that can fill an Open Graph property, by name, the first definition winning
     */
    private static Map<String, ExtendedPropertyDefinition> sourceDefinitions(JCRSiteNode site, ExtendedNodeType type) {
        List<ExtendedNodeType> mappedTypes = new ArrayList<>();
        mappedTypes.add(type);
        if (type.isMixin()) {
            mappedTypes.addAll(type.getMixinExtends());
        }
        Map<String, ExtendedPropertyDefinition> definitions = new LinkedHashMap<>();
        Set<String> extendedTypes = new HashSet<>();
        for (ExtendedNodeType mappedType : mappedTypes) {
            addDefinitions(definitions, mappedType.getPropertyDefinitions());
            extendedTypes.add(mappedType.getName());
            for (ExtendedNodeType supertype : mappedType.getSupertypes()) {
                extendedTypes.add(supertype.getName());
            }
        }
        Set<String> siteModules = site.getInstalledModulesWithAllDependencies();
        Map<String, ExtendedNodeType> mixins = new TreeMap<>();
        for (Map.Entry<ExtendedNodeType, Set<ExtendedNodeType>> extension : NodeTypeRegistry.getInstance().getMixinExtensions().entrySet()) {
            if (extendedTypes.contains(extension.getKey().getName())) {
                for (ExtendedNodeType mixin : extension.getValue()) {
                    if (isActiveOnSite(siteModules, mixin)) {
                        mixins.put(mixin.getName(), mixin);
                    }
                }
            }
        }
        for (ExtendedNodeType mixin : mixins.values()) {
            addDefinitions(definitions, mixin.getPropertyDefinitions());
        }
        return definitions;
    }

    private static void addDefinitions(Map<String, ExtendedPropertyDefinition> definitions, ExtendedPropertyDefinition[] candidates) {
        for (ExtendedPropertyDefinition definition : candidates) {
            if (!definition.isUnstructured() && !definition.isHidden() && !compatibleKinds(definition).isEmpty()) {
                definitions.putIfAbsent(definition.getName(), definition);
            }
        }
    }

    /**
     * @return the kinds of Open Graph or schema.org property that the property can fill: a text comes from a STRING
     * only, an integer from a LONG only, a number from a LONG, a DOUBLE or a DECIMAL, and a reference fills an image or
     * a URL when it points to a file
     */
    private static Set<OgKind> compatibleKinds(ExtendedPropertyDefinition definition) {
        switch (definition.getRequiredType()) {
            case PropertyType.STRING:
                return definition.getSelector() == SelectorType.RICHTEXT ? EnumSet.of(OgKind.TEXT) : EnumSet.of(OgKind.TEXT, OgKind.URL);
            case PropertyType.URI:
                return EnumSet.of(OgKind.URL);
            case PropertyType.LONG:
                return EnumSet.of(OgKind.INTEGER, OgKind.NUMBER);
            case PropertyType.DOUBLE:
            case PropertyType.DECIMAL:
                return EnumSet.of(OgKind.NUMBER);
            case PropertyType.DATE:
                return EnumSet.of(OgKind.DATE);
            case PropertyType.REFERENCE:
            case PropertyType.WEAKREFERENCE:
                return referencesFile(definition) ? EnumSet.of(OgKind.IMAGE, OgKind.URL) : EnumSet.noneOf(OgKind.class);
            default:
                return EnumSet.noneOf(OgKind.class);
        }
    }

    private static boolean referencesFile(ExtendedPropertyDefinition definition) {
        Map<String, String> selectorOptions = definition.getSelectorOptions();
        if (selectorOptions != null && FILE_PICKER_TYPES.contains(selectorOptions.get("type"))) {
            return true;
        }
        for (String constraint : definition.getValueConstraints()) {
            if (IMAGE_MIXIN.equals(constraint) || isFileType(constraint)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isFileType(String typeName) {
        try {
            return NodeTypeRegistry.getInstance().getNodeType(typeName).isNodeType(FILE_TYPE);
        } catch (NoSuchNodeTypeException e) {
            return false;
        }
    }

    /**
     * Selects the mapping of a node. The template mappings for the template of the node come first, then the mappings
     * of every template. In each group, a mixin of the node comes first, in the order of the list, then the primary
     * type, then the closest supertype. {@link #templateOf} gives the template of the node, and runs only when a
     * template mapping exists for the type of the node.
     *
     * @return the mapping, or null when no mapping applies to the node
     */
    private static TypeMapping findMapping(List<TypeMapping> mappings, JCRNodeWrapper node, RenderContext renderContext)
            throws RepositoryException {
        List<String> types = new ArrayList<>();
        types.add(node.getPrimaryNodeType().getName());
        for (ExtendedNodeType supertype : node.getPrimaryNodeType().getSupertypes()) {
            types.add(supertype.getName());
        }
        Set<String> mixins = new HashSet<>();
        for (ExtendedNodeType mixin : node.getMixinNodeTypes()) {
            mixins.add(mixin.getName());
            for (ExtendedNodeType supertype : mixin.getSupertypes()) {
                mixins.add(supertype.getName());
            }
        }
        // A template mapping maps a content type, never a mixin.
        List<TypeMapping> ofTypeTemplates = new ArrayList<>();
        List<TypeMapping> ofEveryTemplate = new ArrayList<>();
        for (TypeMapping mapping : mappings) {
            if (mapping.getTemplateName() == null) {
                ofEveryTemplate.add(mapping);
            } else if (types.contains(mapping.getNodeType())) {
                ofTypeTemplates.add(mapping);
            }
        }
        if (!ofTypeTemplates.isEmpty()) {
            String templateName = templateOf(node, renderContext);
            List<TypeMapping> ofTemplate = ofTypeTemplates.stream()
                    .filter(mapping -> mapping.getTemplateName().equals(templateName)).collect(Collectors.toList());
            TypeMapping mapping = findTypeMapping(ofTemplate, types, mixins);
            if (mapping != null) {
                return mapping;
            }
        }
        return findTypeMapping(ofEveryTemplate, types, mixins);
    }

    /**
     * A page, or a content with {@code j:templateName}, stores its template. Jahia resolves the content template of a
     * main resource without it from the templates that apply to its type: the default one of the highest priority, or
     * the one that the URL names. Outside a render, the method resolves the template of the default URL of the node in
     * live, as jContent does to tell whether a node can display as a page.
     *
     * @param renderContext the render of the node as the main resource of a page, or null outside a render
     * @return the template of the node, or null when it has none
     */
    private static String templateOf(JCRNodeWrapper node, RenderContext renderContext) throws RepositoryException {
        String stored = node.getPropertyAsString(TEMPLATE_NAME_PROPERTY);
        if (stored != null || !node.isNodeType(MAIN_RESOURCE_TYPE)) {
            return stored;
        }
        RenderContext context = renderContext;
        if (context == null) {
            context = new RenderContext(null, null, node.getSession().getUser());
            context.setMainResource(new Resource(node, HTML, null, Resource.CONFIGURATION_PAGE));
            context.setServletPath(LIVE_SERVLET_PATH);
        }
        Template template;
        try {
            template = RenderService.getInstance().resolveTemplate(context.getMainResource(), context);
        } catch (RepositoryException | RuntimeException e) {
            logger.debug("Cannot resolve the template of {}", node.getPath(), e);
            return null;
        }
        if (template == null) {
            return null;
        }
        // A template of a JavaScript module is a view, whose key is the name of the template.
        if (template.isExternal()) {
            return template.getView();
        }
        // The chain of a template node starts at the root template and ends with the template of the content.
        while (template.getNext() != null) {
            template = template.getNext();
        }
        return template.getName();
    }

    /**
     * @param types  the primary type of the node, then its supertypes, closest first
     * @param mixins the mixins of the node, and their supertypes
     * @return the mapping of a mixin of the node, else of its primary type, else of its closest supertype, or null
     */
    private static TypeMapping findTypeMapping(List<TypeMapping> mappings, List<String> types, Set<String> mixins) {
        for (TypeMapping mapping : mappings) {
            if (mixins.contains(mapping.getNodeType()) && !types.contains(mapping.getNodeType())) {
                return mapping;
            }
        }
        Map<String, TypeMapping> byType = new HashMap<>();
        for (TypeMapping mapping : mappings) {
            byType.putIfAbsent(mapping.getNodeType(), mapping);
        }
        for (String type : types) {
            if (byType.containsKey(type)) {
                return byType.get(type);
            }
        }
        return null;
    }

    /**
     * A property with several values keeps a null in place of a value that converts to nothing, because a structured
     * array pairs its values by index.
     *
     * @return the tags of the values of the source property, in their order
     */
    private static List<OgTag> values(JCRNodeWrapper node, OgProperty ogProperty, String sourceName) throws RepositoryException {
        if (!node.hasProperty(sourceName)) {
            return Collections.emptyList();
        }
        JCRPropertyWrapper property = node.getProperty(sourceName);
        ExtendedPropertyDefinition definition = node.getApplicablePropertyDefinition(sourceName);
        boolean richText = definition != null && definition.getSelector() == SelectorType.RICHTEXT;
        JCRValueWrapper[] values = property.isMultiple() ? property.getValues() : new JCRValueWrapper[]{property.getValue()};
        String singleSource = property.isMultiple() ? null : sourceName;
        List<OgTag> tags = new ArrayList<>();
        for (JCRValueWrapper value : values) {
            OgTag tag = convert(value, ogProperty, richText, singleSource);
            if (ogProperty.isMultiple()) {
                tags.add(tag);
            } else if (tag != null) {
                tags.add(tag);
                break;
            }
        }
        return tags;
    }

    /**
     * Reads the tags that the editor set in {@code osm:customTags}. The method ignores a value that is not valid
     * JSON, or whose property the og:type does not have. A value whose text does not fit the kind of its property,
     * such as {@code next week} for a date, sets nothing. A property with one value keeps the first value of the
     * editor that sets a tag. A property with several values keeps a null in place of a value that sets nothing,
     * because a structured array pairs its values by index.
     *
     * @return the tags of the editor, by Open Graph property, in the order of the field, for each property with at
     * least one value that sets a tag
     */
    private static Map<String, List<OgTag>> customTags(JCRNodeWrapper node, OgType ogType) throws RepositoryException {
        if (!node.hasProperty(CUSTOM_TAGS_PROPERTY)) {
            return Collections.emptyMap();
        }
        JCRPropertyWrapper property = node.getProperty(CUSTOM_TAGS_PROPERTY);
        JCRValueWrapper[] values = property.isMultiple() ? property.getValues() : new JCRValueWrapper[]{property.getValue()};
        Map<String, List<OgTag>> tags = new HashMap<>();
        for (JCRValueWrapper value : values) {
            JSONObject json;
            try {
                json = new JSONObject(value.getString());
            } catch (JSONException e) {
                continue;
            }
            OgProperty ogProperty = ogType.findProperty(json.optString("property")).orElse(null);
            if (ogProperty == null) {
                continue;
            }
            OgTag tag = customTag(node.getSession(), ogProperty, json);
            List<OgTag> propertyTags = tags.computeIfAbsent(ogProperty.getName(), name -> new ArrayList<>());
            if (ogProperty.isMultiple() || (tag != null && propertyTags.isEmpty())) {
                propertyTags.add(tag);
            }
        }
        // A property whose values of the editor all set nothing, such as an empty value, keeps its mapped values.
        tags.values().removeIf(propertyTags -> propertyTags.stream().allMatch(Objects::isNull));
        return tags;
    }

    /**
     * A value of the editor holds the identifier of a file in {@code node}, such as the image of {@code og:image},
     * or a text in {@code content}.
     *
     * @return the tag of one value of the editor, or null when the value sets nothing
     */
    private static OgTag customTag(JCRSessionWrapper session, OgProperty ogProperty, JSONObject json)
            throws RepositoryException {
        String name = ogProperty.getName();
        String fileId = json.optString("node");
        if (!fileId.isEmpty()) {
            return ogProperty.getKind() == OgKind.IMAGE || ogProperty.getKind() == OgKind.URL ? fileTag(session, fileId, name) : null;
        }
        String content = acceptedFromEditor(ogProperty, json.optString("content").trim());
        return content == null || content.isEmpty() ? null : OgTag.text(name, content);
    }

    /**
     * An editor types the text of a date or of a URL, where a mapping reads a date property or a file. The selector
     * {@code OsmTag} applies the same checks before the Content Editor saves the value.
     *
     * @return the text that the protocol accepts for a value of the editor, or null: a date in ISO 8601 for a date
     * property, an absolute URL for a URL or an image property, or else what {@link #accepted} returns
     */
    private static String acceptedFromEditor(OgProperty ogProperty, String text) {
        switch (ogProperty.getKind()) {
            case DATE:
                return OgValues.isIsoDate(text) ? text : null;
            case URL:
            case IMAGE:
                return OgValues.isAbsoluteUrl(text) ? text : null;
            default:
                return accepted(ogProperty, text);
        }
    }

    /**
     * @return the text that the protocol accepts for the property, or null: a value of its closed list in lower case,
     * an integer of 1 or more for an integer property, or else the text itself
     */
    private static String accepted(OgProperty ogProperty, String text) {
        if (!ogProperty.getValues().isEmpty()) {
            return OgValues.allowedValue(text, ogProperty.getValues());
        }
        return ogProperty.getKind() == OgKind.INTEGER ? OgValues.positiveInteger(text) : text;
    }

    /**
     * @return the tag of a file, or null when the identifier names no file of the workspace, such as an image that is
     * not published yet
     */
    private static OgTag fileTag(JCRSessionWrapper session, String identifier, String name) throws RepositoryException {
        JCRNodeWrapper target;
        try {
            target = session.getNodeByIdentifier(identifier);
        } catch (ItemNotFoundException | IllegalArgumentException e) {
            return null;
        }
        return target.isNodeType(FILE_TYPE) ? OgTag.node(name, target) : null;
    }

    /**
     * @param singleSource the name of the source property when it has one value, or null
     */
    private static OgTag convert(JCRValueWrapper value, OgProperty ogProperty, boolean richText, String singleSource)
            throws RepositoryException {
        String name = ogProperty.getName();
        OgKind kind = ogProperty.getKind();
        switch (value.getType()) {
            case PropertyType.STRING:
            case PropertyType.URI:
                return textValue(value, ogProperty, richText, singleSource);
            case PropertyType.LONG:
                // No source property: the preview would copy the text of the field, and 007 or 0 is not the tag.
                String integer = kind == OgKind.INTEGER ? OgValues.positiveInteger(value.getLong()) : null;
                return integer == null ? null : OgTag.text(name, integer);
            case PropertyType.DATE:
                return kind == OgKind.DATE ? OgTag.text(name, OgValues.isoDate(value.getDate())) : null;
            case PropertyType.REFERENCE:
            case PropertyType.WEAKREFERENCE:
                return kind == OgKind.IMAGE || kind == OgKind.URL ? fileValue(value, name) : null;
            default:
                return null;
        }
    }

    /**
     * @param singleSource the name of the source property when it has one value, or null
     * @return the tag of a STRING or a URI value, or null when the property takes no text and no URL, or when the
     * protocol does not accept the text
     */
    private static OgTag textValue(JCRValueWrapper value, OgProperty ogProperty, boolean richText, String singleSource)
            throws RepositoryException {
        OgKind kind = ogProperty.getKind();
        if (kind != OgKind.TEXT && kind != OgKind.URL) {
            return null;
        }
        String text = accepted(ogProperty, richText ? OgValues.plainText(value.getString()) : value.getString().trim());
        // A value of a closed list is not the text of its source, so the preview cannot copy the field.
        String liveSource = ogProperty.getValues().isEmpty() ? singleSource : null;
        return text == null || text.isEmpty() ? null : OgTag.text(ogProperty.getName(), text, liveSource);
    }

    private static OgTag fileValue(JCRValueWrapper value, String name) throws RepositoryException {
        JCRNodeWrapper target;
        try {
            target = value.getNode();
        } catch (ItemNotFoundException e) {
            return null;
        }
        return target != null && target.isNodeType(FILE_TYPE) ? OgTag.node(name, target) : null;
    }

    private static void addImageDetails(List<OgTag> tags, JCRNodeWrapper image) throws RepositoryException {
        addText(tags, "og:image:type", image.getFileContent().getContentType());
        if (image.isNodeType(IMAGE_MIXIN)) {
            addText(tags, "og:image:width", image.getPropertyAsString("j:width"));
            addText(tags, "og:image:height", image.getPropertyAsString("j:height"));
        }
    }

    private static void addText(List<OgTag> tags, String property, String content) {
        if (content != null && !content.trim().isEmpty()) {
            tags.add(OgTag.text(property, content.trim()));
        }
    }

    private static JCRNodeWrapper inLocale(JCRNodeWrapper node, Locale locale) throws RepositoryException {
        JCRSessionWrapper session = node.getSession();
        if (locale.equals(session.getLocale())) {
            return node;
        }
        return JCRSessionFactory.getInstance().getCurrentUserSession(session.getWorkspace().getName(), locale)
                .getNodeByIdentifier(node.getIdentifier());
    }

    private static JCRNodeWrapper settingsNode(JCRSessionWrapper session, String sitePath) throws RepositoryException {
        JCRNodeWrapper site = session.getNode(sitePath);
        return site.hasNode(SETTINGS_NODE_NAME) ? site.getNode(SETTINGS_NODE_NAME) : site.addNode(SETTINGS_NODE_NAME, SETTINGS_TYPE);
    }

    /**
     * @param templateName the template of a template mapping, or null for the mapping of every template
     * @return the mapping node of the content type and the template, found by its values, because the Content Editor
     * names a new node after the label of its type
     */
    private static JCRNodeWrapper typeNode(JCRSessionWrapper session, String sitePath, String nodeType, String templateName)
            throws RepositoryException {
        JCRNodeWrapper settings = settingsNode(session, sitePath);
        for (JCRNodeWrapper typeNode : JCRContentUtils.getChildrenOfType(settings, TYPE_MAPPING_TYPE)) {
            if (nodeType.equals(typeNode.getPropertyAsString(NODE_TYPE_PROPERTY))
                    && Objects.equals(templateName, templateName(typeNode))) {
                return typeNode;
            }
        }
        return settings.addNode(JCRContentUtils.findAvailableNodeName(settings, nodeName(nodeType)), TYPE_MAPPING_TYPE);
    }

    /**
     * @return a valid JCR node name for a qualified name, such as {@code jnt_news} for {@code jnt:news}
     */
    private static String nodeName(String qualifiedName) {
        return qualifiedName.replace(':', '_');
    }

    /**
     * Carries a {@link RepositoryException} out of the loading function of the mapping cache.
     */
    private static final class MappingReadException extends RuntimeException {

        private static final long serialVersionUID = 1L;

        MappingReadException(RepositoryException cause) {
            super(cause);
        }

        @Override
        public synchronized RepositoryException getCause() {
            return (RepositoryException) super.getCause();
        }
    }
}

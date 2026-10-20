package org.jahia.pm.modules.veryopengraph;

import org.jahia.api.Constants;
import org.jahia.pm.modules.veryopengraph.vocabulary.OgKind;
import org.jahia.pm.modules.veryopengraph.vocabulary.OgProperty;
import org.jahia.pm.modules.veryopengraph.vocabulary.OgType;
import org.jahia.pm.modules.veryopengraph.vocabulary.OgValues;
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
import org.osgi.service.component.annotations.Component;

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
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Stores the Open Graph mappings of a site, and resolves the Open Graph tags of a content node.
 * <p>
 * The mappings live under {@code /sites/<siteKey>/very-open-graph} in the default workspace. The settings node
 * has the mixin {@code jmix:nolive}, so a publication never copies it to live, and a change applies at once.
 * The service keeps the mappings of each site in memory, because the render filter reads them on every live page.
 */
@Component(service = OpenGraphService.class, immediate = true)
public class OpenGraphService {

    public static final String MANAGE_PERMISSION = "veryOpenGraphManage";
    public static final String SETTINGS_NODE_NAME = "very-open-graph";
    public static final String NODE_TYPE_PROPERTY = "vog:nodeType";

    private static final String SETTINGS_TYPE = "vognt:settings";
    private static final String TYPE_MAPPING_TYPE = "vognt:typeMapping";
    private static final String OG_TYPE_PROPERTY = "vog:ogType";
    private static final String STORAGE_PREFIX = "vog:";

    /**
     * The mixin that holds the Open Graph properties of an og:type, beyond the properties of every og:type.
     */
    private static final Map<OgType, String> OG_TYPE_MIXINS = new EnumMap<>(OgType.class);

    static {
        OG_TYPE_MIXINS.put(OgType.ARTICLE, "vogmix:article");
        OG_TYPE_MIXINS.put(OgType.BOOK, "vogmix:book");
        OG_TYPE_MIXINS.put(OgType.PROFILE, "vogmix:profile");
    }

    private static final String PAGE_TYPE = "jnt:page";
    private static final String MAIN_RESOURCE_TYPE = "jmix:mainResource";
    private static final String FILE_TYPE = "jnt:file";
    private static final String IMAGE_MIXIN = "jmix:image";
    private static final String TITLE_PROPERTY = "jcr:title";
    private static final String SYSTEM_MODULE = "system-jahia";
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
                    String ogType = typeNode.getPropertyAsString(OG_TYPE_PROPERTY);
                    List<PropertyMapping> properties = new ArrayList<>();
                    for (OgProperty property : OgType.fromValue(ogType).map(OgType::getProperties).orElse(Collections.emptyList())) {
                        String source = typeNode.getPropertyAsString(storageName(property.getName()));
                        if (source != null && !source.isEmpty()) {
                            properties.add(new PropertyMapping(property.getName(), source));
                        }
                    }
                    mappings.add(new TypeMapping(typeNode.getIdentifier(), typeNode.getPropertyAsString(NODE_TYPE_PROPERTY),
                            ogType, properties));
                }
                return Collections.unmodifiableList(mappings);
            });
        } catch (RepositoryException e) {
            throw new MappingReadException(e);
        }
    }

    /**
     * Creates the mapping of a content type, or replaces all its values.
     *
     * @throws InvalidMappingException when the site cannot use the content type, the og:type or a property
     */
    public void saveMapping(JCRSiteNode site, String nodeType, String ogType, List<PropertyMapping> properties)
            throws InvalidMappingException, RepositoryException {
        ExtendedNodeType type = mappableType(site, nodeType);
        OgType og = OgType.fromValue(ogType).orElseThrow(() -> new InvalidMappingException(
                "Unknown og:type '" + ogType + "'. Use one of " + Arrays.toString(OgType.values()).toLowerCase(Locale.ROOT)));
        Map<String, ExtendedPropertyDefinition> sources = sourceDefinitions(site, type);
        Set<String> mapped = new HashSet<>();
        for (PropertyMapping property : properties) {
            validate(property, og, nodeType, sources, mapped);
        }

        JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(JCRSessionFactory.getInstance().getCurrentUser(),
                Constants.EDIT_WORKSPACE, null, session -> {
                    JCRNodeWrapper mapping = typeNode(session, site.getPath(), nodeType);
                    for (OgType anyOgType : OgType.values()) {
                        for (OgProperty property : anyOgType.getProperties()) {
                            String name = storageName(property.getName());
                            if (mapping.hasProperty(name)) {
                                mapping.getProperty(name).remove();
                            }
                        }
                    }
                    for (Map.Entry<OgType, String> mixin : OG_TYPE_MIXINS.entrySet()) {
                        if (mixin.getKey() != og && mapping.isNodeType(mixin.getValue())) {
                            mapping.removeMixin(mixin.getValue());
                        }
                    }
                    String mixin = OG_TYPE_MIXINS.get(og);
                    if (mixin != null && !mapping.isNodeType(mixin)) {
                        mapping.addMixin(mixin);
                    }
                    mapping.setProperty(NODE_TYPE_PROPERTY, nodeType);
                    mapping.setProperty(OG_TYPE_PROPERTY, og.getValue());
                    for (PropertyMapping property : properties) {
                        mapping.setProperty(storageName(property.getOgProperty()), property.getSourceProperty());
                    }
                    session.save();
                    return null;
                });
        clearMappings(site.getPath());
    }

    /**
     * Deletes the mapping of a content type. Does nothing when the site has no mapping for it.
     */
    public void deleteMapping(JCRSiteNode site, String nodeType) throws RepositoryException {
        String settingsPath = site.getPath() + "/" + SETTINGS_NODE_NAME;
        JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(JCRSessionFactory.getInstance().getCurrentUser(),
                Constants.EDIT_WORKSPACE, null, session -> {
                    if (!session.nodeExists(settingsPath)) {
                        return null;
                    }
                    // Match on the stored value: the argument is free text and never becomes a path.
                    for (JCRNodeWrapper typeNode : JCRContentUtils.getChildrenOfType(session.getNode(settingsPath), TYPE_MAPPING_TYPE)) {
                        if (nodeType.equals(typeNode.getPropertyAsString(NODE_TYPE_PROPERTY))) {
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
     * @return the content types that the site can map: {@code jnt:page} and the types that inherit
     * {@code jmix:mainResource}, from the modules of the site
     */
    public List<ExtendedNodeType> getMappableTypes(JCRSiteNode site) {
        Set<String> siteModules = site.getInstalledModulesWithAllDependencies();
        List<ExtendedNodeType> types = new ArrayList<>();
        for (ExtendedNodeType type : NodeTypeRegistry.getInstance().getAllNodeTypes()) {
            if (!type.isMixin() && !type.isAbstract() && (type.isNodeType(PAGE_TYPE) || type.isNodeType(MAIN_RESOURCE_TYPE))
                    && isActiveOnSite(siteModules, type)) {
                types.add(type);
            }
        }
        return types;
    }

    /**
     * @return the property of a mapping node that holds the source of an Open Graph property, such as
     * {@code vog:og_image_alt} for {@code og:image:alt}
     */
    public static String storageName(String ogProperty) {
        return STORAGE_PREFIX + ogProperty.replace(':', '_');
    }

    /**
     * @return the Open Graph property that a property of a mapping node holds, such as {@code og:image:alt} for
     * {@code vog:og_image_alt}
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
     * Resolves the Open Graph tags of a content node with the mapping of its type, or of its closest supertype.
     * <p>
     * The {@code og:url} tag and the tags of a file hold a node, and the caller builds the absolute URL. When the
     * session of the node has another locale, the method reads the node again with the current user, in the
     * same workspace.
     *
     * @return the tags, or an empty list when no mapping applies to the node
     */
    public List<OgTag> resolve(JCRNodeWrapper node, Locale locale) throws RepositoryException {
        JCRSiteNode site = node.getResolveSite();
        if (site == null) {
            return Collections.emptyList();
        }
        JCRNodeWrapper localized = inLocale(node, locale);
        TypeMapping mapping = findMapping(getMappings(site), localized.getPrimaryNodeType());
        OgType ogType = mapping == null ? null : OgType.fromValue(mapping.getOgType()).orElse(null);
        if (ogType == null) {
            return Collections.emptyList();
        }

        Map<String, List<OgTag>> mapped = new HashMap<>();
        for (PropertyMapping property : mapping.getProperties()) {
            OgProperty ogProperty = ogType.findProperty(property.getOgProperty()).orElse(null);
            if (ogProperty != null) {
                mapped.put(ogProperty.getName(), values(localized, ogProperty, property.getSourceProperty()));
            }
        }

        List<OgTag> tags = new ArrayList<>();
        List<OgTag> titles = mapped.getOrDefault(OgType.OG_TITLE, Collections.emptyList());
        if (titles.isEmpty()) {
            String title = localized.getPropertyAsString(TITLE_PROPERTY);
            if (title != null && !title.trim().isEmpty()) {
                tags.add(OgTag.text(OgType.OG_TITLE, title.trim(), TITLE_PROPERTY));
            }
        } else {
            tags.addAll(titles);
        }
        tags.add(OgTag.text("og:type", ogType.getValue()));
        tags.add(OgTag.node("og:url", localized));

        JCRNodeWrapper image = null;
        for (OgProperty property : ogType.getProperties()) {
            String name = property.getName();
            List<OgTag> values = mapped.getOrDefault(name, Collections.emptyList());
            if (OgType.OG_TITLE.equals(name)) {
                continue;
            }
            if (OgType.OG_IMAGE_ALT.equals(name) && values.isEmpty() && image != null) {
                addText(tags, OgType.OG_IMAGE_ALT, image.getPropertyAsString(TITLE_PROPERTY));
                continue;
            }
            tags.addAll(values);
            if (OgType.OG_IMAGE.equals(name) && !values.isEmpty()) {
                image = values.get(0).getNode();
                addImageDetails(tags, image);
            }
        }

        addText(tags, "og:site_name", site.getTitle());
        tags.add(OgTag.text("og:locale", OgValues.ogLocale(locale)));
        for (Locale alternate : site.getActiveLiveLanguagesAsLocales()) {
            if (!alternate.equals(locale)) {
                tags.add(OgTag.text("og:locale:alternate", OgValues.ogLocale(alternate)));
            }
        }
        return tags;
    }

    private static void validate(PropertyMapping property, OgType og, String nodeType,
                                 Map<String, ExtendedPropertyDefinition> sources, Set<String> mapped)
            throws InvalidMappingException {
        String ogName = property.getOgProperty();
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

    /**
     * @return true when a source property of these kinds can fill the Open Graph property. A text Open Graph property
     * with one value takes a source property with one value only.
     */
    public static boolean canFill(Set<OgKind> kinds, boolean multipleSource, OgProperty ogProperty) {
        return kinds.contains(ogProperty.getKind())
                && !(ogProperty.getKind() == OgKind.TEXT && !ogProperty.isMultiple() && multipleSource);
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
        if (!type.isNodeType(PAGE_TYPE) && !type.isNodeType(MAIN_RESOURCE_TYPE)) {
            throw new InvalidMappingException("The content type '" + nodeType + "' is not " + PAGE_TYPE
                    + " and does not inherit " + MAIN_RESOURCE_TYPE);
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
     * @return the properties that can fill an Open Graph property, by name, the first definition winning
     */
    private static Map<String, ExtendedPropertyDefinition> sourceDefinitions(JCRSiteNode site, ExtendedNodeType type) {
        Map<String, ExtendedPropertyDefinition> definitions = new LinkedHashMap<>();
        addDefinitions(definitions, type.getPropertyDefinitions());

        Set<String> extendedTypes = new HashSet<>();
        extendedTypes.add(type.getName());
        for (ExtendedNodeType supertype : type.getSupertypes()) {
            extendedTypes.add(supertype.getName());
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
     * @return the kinds of Open Graph property that the property can fill: a text comes from a STRING only, and a
     * reference fills an image or a URL when it points to a file
     */
    private static Set<OgKind> compatibleKinds(ExtendedPropertyDefinition definition) {
        switch (definition.getRequiredType()) {
            case PropertyType.STRING:
                return definition.getSelector() == SelectorType.RICHTEXT ? EnumSet.of(OgKind.TEXT) : EnumSet.of(OgKind.TEXT, OgKind.URL);
            case PropertyType.URI:
                return EnumSet.of(OgKind.URL);
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

    private static TypeMapping findMapping(List<TypeMapping> mappings, ExtendedNodeType primaryType) {
        Map<String, TypeMapping> byType = new HashMap<>();
        for (TypeMapping mapping : mappings) {
            byType.put(mapping.getNodeType(), mapping);
        }
        if (byType.containsKey(primaryType.getName())) {
            return byType.get(primaryType.getName());
        }
        for (ExtendedNodeType supertype : primaryType.getSupertypes()) {
            if (byType.containsKey(supertype.getName())) {
                return byType.get(supertype.getName());
            }
        }
        return null;
    }

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
            if (tag != null) {
                tags.add(tag);
                if (!ogProperty.isMultiple()) {
                    break;
                }
            }
        }
        return tags;
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
                if (kind != OgKind.TEXT && kind != OgKind.URL) {
                    return null;
                }
                String text = richText ? OgValues.plainText(value.getString()) : value.getString().trim();
                // The gender is not the text of its source, because the protocol accepts two values only.
                boolean isGender = OgType.PROFILE_GENDER.equals(name);
                if (isGender) {
                    text = OgValues.gender(text);
                }
                return text == null || text.isEmpty() ? null : OgTag.text(name, text, isGender ? null : singleSource);
            case PropertyType.DATE:
                return kind == OgKind.DATE ? OgTag.text(name, OgValues.isoDate(value.getDate())) : null;
            case PropertyType.REFERENCE:
            case PropertyType.WEAKREFERENCE:
                return kind == OgKind.IMAGE || kind == OgKind.URL ? fileValue(value, name) : null;
            default:
                return null;
        }
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
     * @return the mapping node of the content type, found by its value, because the Content Editor names a new node
     * after the label of its type
     */
    private static JCRNodeWrapper typeNode(JCRSessionWrapper session, String sitePath, String nodeType) throws RepositoryException {
        JCRNodeWrapper settings = settingsNode(session, sitePath);
        for (JCRNodeWrapper typeNode : JCRContentUtils.getChildrenOfType(settings, TYPE_MAPPING_TYPE)) {
            if (nodeType.equals(typeNode.getPropertyAsString(NODE_TYPE_PROPERTY))) {
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

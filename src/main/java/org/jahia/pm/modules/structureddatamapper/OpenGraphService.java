package org.jahia.pm.modules.structureddatamapper;

import org.jahia.api.Constants;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgKind;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgProperty;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgType;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgValues;
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
import org.json.JSONException;
import org.json.JSONObject;
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
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Stores the Open Graph mappings of a site, and resolves the Open Graph tags of a content node.
 * <p>
 * The mappings live under {@code /sites/<siteKey>/structured-data-mapper} in the default workspace. The settings node
 * has the mixin {@code jmix:nolive}, so a publication never copies it to live, and a change applies at once.
 * The service keeps the mappings of each site in memory, because the render filter reads them on every live page.
 */
@Component(service = OpenGraphService.class, immediate = true)
public class OpenGraphService {

    public static final String MANAGE_PERMISSION = "structuredDataMapperManage";
    public static final String SETTINGS_NODE_NAME = "structured-data-mapper";
    public static final String NODE_TYPE_PROPERTY = "sdm:nodeType";

    private static final String SETTINGS_TYPE = "sdmnt:settings";
    private static final String TYPE_MAPPING_TYPE = "sdmnt:typeMapping";
    private static final String OG_TYPE_PROPERTY = "sdm:ogType";
    private static final String STORAGE_PREFIX = "sdm:";

    /**
     * The mixin that holds the Open Graph properties of an og:type, beyond the properties of every og:type.
     */
    private static final Map<OgType, String> OG_TYPE_MIXINS = new EnumMap<>(OgType.class);

    static {
        OG_TYPE_MIXINS.put(OgType.ARTICLE, "sdmmix:article");
        OG_TYPE_MIXINS.put(OgType.BOOK, "sdmmix:book");
        OG_TYPE_MIXINS.put(OgType.PROFILE, "sdmmix:profile");
        OG_TYPE_MIXINS.put(OgType.MUSIC_SONG, "sdmmix:musicSong");
        OG_TYPE_MIXINS.put(OgType.MUSIC_ALBUM, "sdmmix:musicAlbum");
        OG_TYPE_MIXINS.put(OgType.MUSIC_PLAYLIST, "sdmmix:musicPlaylist");
        OG_TYPE_MIXINS.put(OgType.MUSIC_RADIO_STATION, "sdmmix:musicRadioStation");
        OG_TYPE_MIXINS.put(OgType.VIDEO_MOVIE, "sdmmix:videoMovie");
        OG_TYPE_MIXINS.put(OgType.VIDEO_EPISODE, "sdmmix:videoEpisode");
        OG_TYPE_MIXINS.put(OgType.VIDEO_TV_SHOW, "sdmmix:videoTvShow");
        OG_TYPE_MIXINS.put(OgType.VIDEO_OTHER, "sdmmix:videoOther");
    }

    private static final String PAGE_TYPE = "jnt:page";
    private static final String MAIN_RESOURCE_TYPE = "jmix:mainResource";
    private static final String FILE_TYPE = "jnt:file";
    private static final String IMAGE_MIXIN = "jmix:image";
    private static final String TITLE_PROPERTY = "jcr:title";
    private static final String CUSTOM_TAGS_PROPERTY = "sdm:customTags";
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
                "Unknown og:type '" + ogType + "'. Use one of "
                        + Arrays.stream(OgType.values()).map(OgType::getValue).collect(Collectors.joining(", ", "[", "]"))));
        Map<String, ExtendedPropertyDefinition> sources = sourceDefinitions(site, type);
        Set<String> mapped = new HashSet<>();
        for (PropertyMapping property : properties) {
            validate(property, og, nodeType, sources, mapped);
        }

        JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(JCRSessionFactory.getInstance().getCurrentUser(),
                Constants.EDIT_WORKSPACE, null, session -> {
                    JCRNodeWrapper mapping = typeNode(session, site.getPath(), nodeType);
                    // Two og:types that share a property name share its storage, so the second removal finds nothing.
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
     * {@code sdm:og_image_alt} for {@code og:image:alt}
     */
    public static String storageName(String ogProperty) {
        return STORAGE_PREFIX + ogProperty.replace(':', '_');
    }

    /**
     * Two og:types that share a property name, such as {@code music.album} and {@code music.playlist} for
     * {@code music:song}, hold the same property, so the first match is the answer.
     *
     * @return the Open Graph property that a property of a mapping node holds, such as {@code og:image:alt} for
     * {@code sdm:og_image_alt}
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
     * A tag that the editor sets in {@code sdm:customTags} replaces the mapped values of its property. A structured
     * property, such as {@code og:video:width}, has a tag only when its root has one, except {@code og:image:alt}.
     * {@link OgTag#getSourceProperty} states which root has no source property.
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
        return tags;
    }

    /**
     * @return the tags of each Open Graph property of the og:type, from the mapping and from {@code sdm:customTags}
     */
    private static Map<String, List<OgTag>> mappedTags(JCRNodeWrapper node, TypeMapping mapping, OgType ogType)
            throws RepositoryException {
        Map<String, List<OgTag>> mapped = new HashMap<>();
        for (PropertyMapping property : mapping.getProperties()) {
            OgProperty ogProperty = ogType.findProperty(property.getOgProperty()).orElse(null);
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
     * @return true when a source property of these kinds can fill the Open Graph property. A text or an integer Open
     * Graph property with one value takes a source property with one value only.
     */
    public static boolean canFill(Set<OgKind> kinds, boolean multipleSource, OgProperty ogProperty) {
        OgKind kind = ogProperty.getKind();
        return kinds.contains(kind)
                && !((kind == OgKind.TEXT || kind == OgKind.INTEGER) && !ogProperty.isMultiple() && multipleSource);
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
     * @return the kinds of Open Graph property that the property can fill: a text comes from a STRING only, an integer
     * from a LONG only, and a reference fills an image or a URL when it points to a file
     */
    private static Set<OgKind> compatibleKinds(ExtendedPropertyDefinition definition) {
        switch (definition.getRequiredType()) {
            case PropertyType.STRING:
                return definition.getSelector() == SelectorType.RICHTEXT ? EnumSet.of(OgKind.TEXT) : EnumSet.of(OgKind.TEXT, OgKind.URL);
            case PropertyType.URI:
                return EnumSet.of(OgKind.URL);
            case PropertyType.LONG:
                return EnumSet.of(OgKind.INTEGER);
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
     * Reads the tags that the editor set in {@code sdm:customTags}. The method ignores a value that is not valid
     * JSON, or whose property the og:type does not have. A property with one value keeps the first value of the
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
        String content = accepted(ogProperty, json.optString("content").trim());
        return content == null || content.isEmpty() ? null : OgTag.text(name, content);
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

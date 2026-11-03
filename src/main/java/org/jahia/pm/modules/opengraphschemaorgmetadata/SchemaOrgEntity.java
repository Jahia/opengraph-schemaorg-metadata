package org.jahia.pm.modules.opengraphschemaorgmetadata;

import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgKind;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgValues;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.SchemaProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.SchemaType;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRValueWrapper;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.SelectorType;
import org.json.JSONException;
import org.json.JSONObject;

import javax.jcr.ItemNotFoundException;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Builds the schema.org entity of a content node from the schema.org properties of its mapping.
 * <p>
 * A value of the entity is a text, a number, a node, a nested entity or a list of them. A node is the content node for
 * {@code url}, or a file for an image or a URL, and the caller builds its absolute URL.
 */
final class SchemaOrgEntity {

    static final String CONTEXT = "https://schema.org";

    private static final String TITLE_PROPERTY = "jcr:title";
    private static final String FILE_TYPE = "jnt:file";
    private static final String CUSTOM_VALUES_PROPERTY = "osm:customSchemaOrg";

    private SchemaOrgEntity() {
    }

    /**
     * The entity starts with {@code @context}, {@code @type} and {@code url}, then holds the mapped properties in the
     * order of the vocabulary. A value that the editor sets in {@code osm:customSchemaOrg} replaces the mapped values of
     * its property, or adds a property that the mapping does not fill. The property that names the content, such as
     * {@code headline}, takes the {@code jcr:title} of the node when the mapping and the editor give it no value.
     *
     * @param properties the schema.org properties of the mapping and their source property
     */
    static Map<String, Object> of(JCRNodeWrapper node, SchemaType schemaType, List<PropertyMapping> properties)
            throws RepositoryException {
        Map<String, String> sources = new HashMap<>();
        for (PropertyMapping property : properties) {
            sources.put(property.getProperty(), property.getSourceProperty());
        }
        Map<String, Object> entity = new LinkedHashMap<>();
        entity.put("@context", CONTEXT);
        entity.put("@type", schemaType.getValue());
        entity.put("url", node);
        Map<String, List<Object>> custom = customValues(node, schemaType);
        for (SchemaProperty property : schemaType.getProperties()) {
            List<Object> values = custom.get(property.getName());
            if (values == null) {
                String source = sources.get(property.getName());
                values = source == null ? Collections.emptyList() : values(node, property, source);
            }
            if (values.isEmpty() && property == schemaType.getTitleProperty()) {
                values = title(node);
            }
            put(entity, property, values);
        }
        return entity;
    }

    /**
     * Reads the values that the editor set in {@code osm:customSchemaOrg}. The method ignores a value that is not valid
     * JSON, whose property the schema.org type does not have, or that sets nothing. A property with one value keeps
     * the first value of the editor that sets one.
     *
     * @return the values of the editor, by schema.org property, in the order of the field, for each property with at
     * least one value that sets something
     */
    private static Map<String, List<Object>> customValues(JCRNodeWrapper node, SchemaType schemaType)
            throws RepositoryException {
        if (!node.hasProperty(CUSTOM_VALUES_PROPERTY)) {
            return Collections.emptyMap();
        }
        JCRPropertyWrapper property = node.getProperty(CUSTOM_VALUES_PROPERTY);
        JCRValueWrapper[] values = property.isMultiple() ? property.getValues() : new JCRValueWrapper[]{property.getValue()};
        Map<String, List<Object>> custom = new HashMap<>();
        for (JCRValueWrapper value : values) {
            JSONObject json;
            try {
                json = new JSONObject(value.getString());
            } catch (JSONException e) {
                continue;
            }
            SchemaProperty schemaProperty = schemaType.findProperty(json.optString("property")).orElse(null);
            Object schemaValue = schemaProperty == null ? null : customValue(node.getSession(), schemaProperty.getKind(), json);
            if (schemaValue != null) {
                List<Object> propertyValues = custom.computeIfAbsent(schemaProperty.getName(), name -> new ArrayList<>());
                if (schemaProperty.isMultiple() || propertyValues.isEmpty()) {
                    propertyValues.add(schemaValue);
                }
            }
        }
        return custom;
    }

    /**
     * A value of the editor holds the identifier of a file in {@code node}, such as the file of {@code image}, or a
     * text in {@code content}. A number property takes a decimal number, such as {@code 19.90}.
     *
     * @return the file, the number or the text of one value of the editor, or null when the value sets nothing
     */
    private static Object customValue(JCRSessionWrapper session, OgKind kind, JSONObject json) throws RepositoryException {
        String fileId = json.optString("node");
        if (!fileId.isEmpty()) {
            return kind == OgKind.IMAGE || kind == OgKind.URL ? file(session, fileId) : null;
        }
        String content = json.optString("content").trim();
        if (content.isEmpty()) {
            return null;
        }
        return kind == OgKind.NUMBER ? decimal(content) : content;
    }

    private static BigDecimal decimal(String text) {
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static List<Object> title(JCRNodeWrapper node) {
        String title = node.getPropertyAsString(TITLE_PROPERTY);
        return title == null || title.trim().isEmpty() ? Collections.emptyList() : Collections.singletonList(title.trim());
    }

    /**
     * Puts the values of a property in the entity: one value as itself, several as a list. A property of a nested
     * entity, such as {@code author.name}, puts its value in that entity, which it creates with its {@code @type}. A
     * property with several values creates one nested entity per value.
     */
    private static void put(Map<String, Object> entity, SchemaProperty property, List<Object> values) {
        if (values.isEmpty()) {
            return;
        }
        String nestedName = property.getEntity();
        if (nestedName == null) {
            entity.put(property.getLocalName(), oneOrList(values));
        } else if (property.isMultiple()) {
            List<Object> nestedEntities = new ArrayList<>();
            for (Object value : values) {
                Map<String, Object> nested = nested(nestedName);
                nested.put(property.getLocalName(), value);
                nestedEntities.add(nested);
            }
            entity.put(nestedName, oneOrList(nestedEntities));
        } else {
            Object existing = entity.get(nestedName);
            @SuppressWarnings("unchecked")
            Map<String, Object> nested = existing instanceof Map ? (Map<String, Object>) existing : nested(nestedName);
            nested.put(property.getLocalName(), values.get(0));
            entity.put(nestedName, nested);
        }
    }

    private static Map<String, Object> nested(String name) {
        Map<String, Object> nested = new LinkedHashMap<>();
        nested.put("@type", SchemaType.entityType(name));
        return nested;
    }

    private static Object oneOrList(List<Object> values) {
        return values.size() == 1 ? values.get(0) : values;
    }

    /**
     * @return the values of the source property that the schema.org property accepts, in their order: the first one
     * only for a property with one value
     */
    private static List<Object> values(JCRNodeWrapper node, SchemaProperty schemaProperty, String sourceName)
            throws RepositoryException {
        if (!node.hasProperty(sourceName)) {
            return Collections.emptyList();
        }
        JCRPropertyWrapper property = node.getProperty(sourceName);
        ExtendedPropertyDefinition definition = node.getApplicablePropertyDefinition(sourceName);
        boolean richText = definition != null && definition.getSelector() == SelectorType.RICHTEXT;
        JCRValueWrapper[] values = property.isMultiple() ? property.getValues() : new JCRValueWrapper[]{property.getValue()};
        List<Object> converted = new ArrayList<>();
        for (JCRValueWrapper value : values) {
            Object schemaValue = convert(value, schemaProperty.getKind(), richText);
            if (schemaValue != null) {
                converted.add(schemaValue);
                if (!schemaProperty.isMultiple()) {
                    break;
                }
            }
        }
        return converted;
    }

    /**
     * @return the text, the number, the date in ISO 8601 or the file of a JCR value, or null when the kind of the
     * schema.org property does not take the value
     */
    private static Object convert(JCRValueWrapper value, OgKind kind, boolean richText) throws RepositoryException {
        switch (value.getType()) {
            case PropertyType.STRING:
            case PropertyType.URI:
                return kind == OgKind.TEXT || kind == OgKind.URL ? text(value, richText) : null;
            case PropertyType.LONG:
            case PropertyType.DOUBLE:
            case PropertyType.DECIMAL:
                return number(value, kind);
            case PropertyType.DATE:
                return kind == OgKind.DATE ? OgValues.isoDate(value.getDate()) : null;
            case PropertyType.REFERENCE:
            case PropertyType.WEAKREFERENCE:
                return kind == OgKind.IMAGE || kind == OgKind.URL ? file(value) : null;
            default:
                return null;
        }
    }

    /**
     * @return the text of the value, with the HTML of a rich text removed, or null when the text is empty
     */
    private static String text(JCRValueWrapper value, boolean richText) throws RepositoryException {
        String text = richText ? OgValues.plainText(value.getString()) : value.getString().trim();
        return text.isEmpty() ? null : text;
    }

    /**
     * @return the number of a LONG, a DOUBLE or a DECIMAL value, or null when the kind takes no such number
     */
    private static Number number(JCRValueWrapper value, OgKind kind) throws RepositoryException {
        if (value.getType() == PropertyType.LONG) {
            return kind == OgKind.INTEGER || kind == OgKind.NUMBER ? value.getLong() : null;
        }
        if (kind != OgKind.NUMBER) {
            return null;
        }
        if (value.getType() == PropertyType.DECIMAL) {
            return value.getDecimal();
        }
        // JSON has no NaN and no infinity.
        double number = value.getDouble();
        return Double.isFinite(number) ? number : null;
    }

    /**
     * @return the file that the value references, or null when the value references no file of the workspace, such as
     * an image that is not published yet
     */
    private static JCRNodeWrapper file(JCRValueWrapper value) throws RepositoryException {
        JCRNodeWrapper target;
        try {
            target = value.getNode();
        } catch (ItemNotFoundException e) {
            return null;
        }
        return target != null && target.isNodeType(FILE_TYPE) ? target : null;
    }

    /**
     * @return the file of the identifier, or null when the identifier names no file of the workspace
     */
    private static JCRNodeWrapper file(JCRSessionWrapper session, String identifier) throws RepositoryException {
        JCRNodeWrapper target;
        try {
            target = session.getNodeByIdentifier(identifier);
        } catch (ItemNotFoundException | IllegalArgumentException e) {
            return null;
        }
        return target.isNodeType(FILE_TYPE) ? target : null;
    }
}

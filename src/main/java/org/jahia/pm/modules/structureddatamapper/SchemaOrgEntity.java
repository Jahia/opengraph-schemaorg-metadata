package org.jahia.pm.modules.structureddatamapper;

import org.jahia.pm.modules.structureddatamapper.vocabulary.OgKind;
import org.jahia.pm.modules.structureddatamapper.vocabulary.OgValues;
import org.jahia.pm.modules.structureddatamapper.vocabulary.SchemaProperty;
import org.jahia.pm.modules.structureddatamapper.vocabulary.SchemaType;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRValueWrapper;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.SelectorType;

import javax.jcr.ItemNotFoundException;
import javax.jcr.PropertyType;
import javax.jcr.RepositoryException;
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

    private SchemaOrgEntity() {
    }

    /**
     * The entity starts with {@code @context}, {@code @type} and {@code url}, then holds the mapped properties in the
     * order of the vocabulary. The property that names the content, such as {@code headline}, takes the
     * {@code jcr:title} of the node when the mapping gives it no value.
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
        for (SchemaProperty property : schemaType.getProperties()) {
            String source = sources.get(property.getName());
            List<Object> values = source == null ? Collections.emptyList() : values(node, property, source);
            if (values.isEmpty() && property == schemaType.getTitleProperty()) {
                values = title(node);
            }
            put(entity, property, values);
        }
        return entity;
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
                if (kind != OgKind.TEXT && kind != OgKind.URL) {
                    return null;
                }
                String text = richText ? OgValues.plainText(value.getString()) : value.getString().trim();
                return text.isEmpty() ? null : text;
            case PropertyType.LONG:
                return kind == OgKind.INTEGER || kind == OgKind.NUMBER ? value.getLong() : null;
            case PropertyType.DOUBLE:
                // JSON has no NaN and no infinity.
                double number = value.getDouble();
                return kind == OgKind.NUMBER && Double.isFinite(number) ? number : null;
            case PropertyType.DECIMAL:
                return kind == OgKind.NUMBER ? value.getDecimal() : null;
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
}

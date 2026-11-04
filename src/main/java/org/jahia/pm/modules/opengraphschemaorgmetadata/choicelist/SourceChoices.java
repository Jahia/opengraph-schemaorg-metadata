package org.jahia.pm.modules.opengraphschemaorgmetadata.choicelist;

import org.jahia.pm.modules.opengraphschemaorgmetadata.OpenGraphService;
import org.jahia.pm.modules.opengraphschemaorgmetadata.SourceProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgType;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.SchemaProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.SchemaType;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * The choices of a field of a mapping that holds a source property, such as {@code osm:og_title}: the properties of
 * the mapped content type that can fill the Open Graph or the schema.org property of the field.
 * {@link SourcePropertiesInitializer} lists them for one field, and the GraphQL field {@code openGraphSourceChoices}
 * lists them for every field at once.
 */
public final class SourceChoices {

    private SourceChoices() {
    }

    /**
     * @param storageName the field, such as {@code osm:og_title}
     * @param sources     the properties of the mapped content type
     * @return the choices of the field, sorted by label, or an empty list when the field holds neither an Open Graph
     * nor a schema.org property
     */
    static List<ChoiceListValue> ofField(String storageName, List<SourceProperty> sources) {
        OgProperty ogProperty = OpenGraphService.findOgProperty(storageName).orElse(null);
        if (ogProperty != null) {
            return choices(sources, canFill(ogProperty));
        }
        SchemaProperty schemaProperty = OpenGraphService.findSchemaProperty(storageName).orElse(null);
        if (schemaProperty != null) {
            return choices(sources, canFill(schemaProperty));
        }
        return Collections.emptyList();
    }

    /**
     * @param sources the properties of the mapped content type
     * @return the choices of every field of a mapping that holds a source, under the name of the field, such as
     * {@code osm:og_title}
     */
    public static Map<String, List<ChoiceListValue>> ofEveryField(List<SourceProperty> sources) {
        // Two og:types or two schema.org types that share a property name share its field, so the first one fills it.
        Map<String, List<ChoiceListValue>> fields = new LinkedHashMap<>();
        for (OgType ogType : OgType.values()) {
            for (OgProperty property : ogType.getProperties()) {
                fields.computeIfAbsent(OpenGraphService.storageName(property.getName()),
                        name -> choices(sources, canFill(property)));
            }
        }
        for (SchemaType schemaType : SchemaType.values()) {
            for (SchemaProperty property : schemaType.getProperties()) {
                fields.computeIfAbsent(OpenGraphService.schemaStorageName(property.getName()),
                        name -> choices(sources, canFill(property)));
            }
        }
        return fields;
    }

    private static Predicate<SourceProperty> canFill(OgProperty property) {
        return source -> OpenGraphService.canFill(source.getCompatibleOgKinds(), source.isMultiple(), property);
    }

    private static Predicate<SourceProperty> canFill(SchemaProperty property) {
        return source -> OpenGraphService.canFill(source.getCompatibleOgKinds(), source.isMultiple(), property);
    }

    private static List<ChoiceListValue> choices(List<SourceProperty> sources, Predicate<SourceProperty> canFill) {
        List<ChoiceListValue> choices = new ArrayList<>();
        for (SourceProperty source : sources) {
            if (canFill.test(source)) {
                choices.add(new ChoiceListValue(ChoiceListContext.label(source.getDisplayName(), source.getName()), source.getName()));
            }
        }
        choices.sort(ChoiceListContext.BY_DISPLAY_NAME);
        return choices;
    }
}

package org.jahia.pm.modules.structureddatamapper.choicelist;

import org.jahia.pm.modules.structureddatamapper.OpenGraphService;
import org.jahia.pm.modules.structureddatamapper.vocabulary.SchemaType;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.content.nodetypes.initializers.ModuleChoiceListInitializer;
import org.osgi.service.component.annotations.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Lists the schema.org types. Each value carries {@code addMixin}, so the Content Editor shows the fields of the
 * schema.org properties of the type when the user selects it.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class SchemaTypesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "sdmSchemaTypes";
    private static final String ADD_MIXIN = "addMixin";

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        List<ChoiceListValue> choices = new ArrayList<>();
        for (SchemaType type : SchemaType.values()) {
            ChoiceListValue choice = new ChoiceListValue(type.getValue(), type.getValue());
            choice.addProperty(ADD_MIXIN, OpenGraphService.schemaTypeMixin(type));
            choices.add(choice);
        }
        return choices;
    }

    @Override
    public void setKey(String key) {
        // The key is fixed, because the definitions of the module name it.
    }

    @Override
    public String getKey() {
        return KEY;
    }
}

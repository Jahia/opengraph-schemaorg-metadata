package org.jahia.pm.modules.veryopengraph.choicelist;

import org.jahia.pm.modules.veryopengraph.OpenGraphService;
import org.jahia.pm.modules.veryopengraph.vocabulary.OgType;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.content.nodetypes.initializers.ModuleChoiceListInitializer;
import org.osgi.service.component.annotations.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Lists the og:type values. A value with its own Open Graph properties carries {@code addMixin}, so the Content
 * Editor shows the fields of its mixin when the user selects it.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class OgTypesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "vogOgTypes";
    private static final String ADD_MIXIN = "addMixin";

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        List<ChoiceListValue> choices = new ArrayList<>();
        for (OgType type : OgType.values()) {
            ChoiceListValue choice = new ChoiceListValue(type.getValue(), type.getValue());
            OpenGraphService.ogTypeMixin(type).ifPresent(mixin -> choice.addProperty(ADD_MIXIN, mixin));
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

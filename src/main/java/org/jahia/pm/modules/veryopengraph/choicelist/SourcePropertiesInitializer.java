package org.jahia.pm.modules.veryopengraph.choicelist;

import org.jahia.pm.modules.veryopengraph.InvalidMappingException;
import org.jahia.pm.modules.veryopengraph.OpenGraphService;
import org.jahia.pm.modules.veryopengraph.SourceProperty;
import org.jahia.pm.modules.veryopengraph.vocabulary.OgProperty;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.content.nodetypes.initializers.ModuleChoiceListInitializer;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import javax.jcr.RepositoryException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Lists the properties of the mapped content type that can fill the Open Graph property of the field, such as the
 * file references for {@code vog:og_image}. The list follows the content type that the form holds.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class SourcePropertiesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "vogSourceProperties";

    @Reference
    private OpenGraphService openGraphService;

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        OgProperty ogProperty = OpenGraphService.findOgProperty(epd.getName()).orElse(null);
        String nodeType = ChoiceListContext.currentValue(context, OpenGraphService.NODE_TYPE_PROPERTY);
        if (ogProperty == null || nodeType == null || nodeType.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            JCRSiteNode site = ChoiceListContext.site(context);
            if (site == null) {
                return Collections.emptyList();
            }
            List<ChoiceListValue> choices = new ArrayList<>();
            for (SourceProperty source : openGraphService.getSourceProperties(site, nodeType, locale)) {
                if (source.getCompatibleOgKinds().contains(ogProperty.getKind())) {
                    choices.add(new ChoiceListValue(ChoiceListContext.label(source.getDisplayName(), source.getName()), source.getName()));
                }
            }
            choices.sort(ChoiceListContext.BY_DISPLAY_NAME);
            return choices;
        } catch (InvalidMappingException e) {
            return Collections.emptyList();
        } catch (RepositoryException e) {
            throw new IllegalStateException("Cannot list the source properties of " + nodeType, e);
        }
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

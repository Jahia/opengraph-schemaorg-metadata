package org.jahia.pm.modules.opengraphschemaorgmetadata.choicelist;

import org.jahia.pm.modules.opengraphschemaorgmetadata.InvalidMappingException;
import org.jahia.pm.modules.opengraphschemaorgmetadata.OpenGraphService;
import org.jahia.pm.modules.opengraphschemaorgmetadata.SourceProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.OgProperty;
import org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary.SchemaProperty;
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
import java.util.function.Predicate;

/**
 * Lists the properties of the mapped content type that can fill the Open Graph or the schema.org property of the
 * field, such as the file references for {@code osm:og_image}, or the single-valued strings for {@code osm:og_title}
 * and {@code osm:schema_headline}. The list follows the content type that the form holds.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class SourcePropertiesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "osmSourceProperties";

    @Reference
    private OpenGraphService openGraphService;

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        Predicate<SourceProperty> canFill = canFill(epd.getName());
        String nodeType = ChoiceListContext.currentValue(context, OpenGraphService.NODE_TYPE_PROPERTY);
        if (canFill == null || nodeType == null || nodeType.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            JCRSiteNode site = ChoiceListContext.site(context);
            if (site == null) {
                return Collections.emptyList();
            }
            List<ChoiceListValue> choices = new ArrayList<>();
            for (SourceProperty source : openGraphService.getSourceProperties(site, nodeType, locale)) {
                if (canFill.test(source)) {
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

    /**
     * @return the test of a source property for the Open Graph or the schema.org property of a field, or null when the
     * field holds neither
     */
    private static Predicate<SourceProperty> canFill(String storageName) {
        OgProperty ogProperty = OpenGraphService.findOgProperty(storageName).orElse(null);
        if (ogProperty != null) {
            return source -> OpenGraphService.canFill(source.getCompatibleOgKinds(), source.isMultiple(), ogProperty);
        }
        SchemaProperty schemaProperty = OpenGraphService.findSchemaProperty(storageName).orElse(null);
        if (schemaProperty != null) {
            return source -> OpenGraphService.canFill(source.getCompatibleOgKinds(), source.isMultiple(), schemaProperty);
        }
        return null;
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

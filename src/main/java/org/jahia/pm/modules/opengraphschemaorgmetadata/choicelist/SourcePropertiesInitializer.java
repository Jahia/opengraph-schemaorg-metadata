package org.jahia.pm.modules.opengraphschemaorgmetadata.choicelist;

import org.jahia.pm.modules.opengraphschemaorgmetadata.InvalidMappingException;
import org.jahia.pm.modules.opengraphschemaorgmetadata.OpenGraphService;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.content.nodetypes.initializers.ModuleChoiceListInitializer;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import javax.jcr.RepositoryException;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Lists the properties of the mapped content type that can fill the Open Graph or the schema.org property of the
 * field, such as the file references for {@code osm:og_image}, or the single-valued strings for {@code osm:og_title}
 * and {@code osm:schema_headline}.
 * <p>
 * The list follows the stored content type of the mapping, so it is empty in a creation form. When the editor picks
 * a content type, the handler {@code osmSourceChoices} of {@code init.tsx} fills every list with one query of the
 * GraphQL field {@code openGraphSourceChoices}.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class SourcePropertiesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "osmSourceProperties";

    @Reference
    private OpenGraphService openGraphService;

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        String nodeType = ChoiceListContext.currentValue(context, OpenGraphService.NODE_TYPE_PROPERTY);
        if (nodeType == null || nodeType.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            JCRSiteNode site = ChoiceListContext.site(context);
            if (site == null) {
                return Collections.emptyList();
            }
            return SourceChoices.ofField(epd.getName(), openGraphService.getSourceProperties(site, nodeType, locale));
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

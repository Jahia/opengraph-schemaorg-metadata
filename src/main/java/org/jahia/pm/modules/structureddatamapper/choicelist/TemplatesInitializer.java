package org.jahia.pm.modules.structureddatamapper.choicelist;

import org.jahia.pm.modules.structureddatamapper.InvalidMappingException;
import org.jahia.pm.modules.structureddatamapper.OpenGraphService;
import org.jahia.pm.modules.structureddatamapper.TypeMapping;
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
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lists the templates that a new template mapping can use: the templates of the content type of the form that have no
 * template mapping yet. The form of an existing template mapping lists its own template only, so the template of a
 * mapping never changes.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class TemplatesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "sdmTemplates";

    @Reference
    private OpenGraphService openGraphService;

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        String nodeType = ChoiceListContext.currentValue(context, OpenGraphService.NODE_TYPE_PROPERTY);
        if (nodeType == null || nodeType.isEmpty()) {
            return Collections.emptyList();
        }
        String current = ChoiceListContext.storedValue(context, OpenGraphService.TEMPLATE_PROPERTY);
        try {
            JCRSiteNode site = ChoiceListContext.site(context);
            if (site == null) {
                return Collections.emptyList();
            }
            Map<String, String> templates = openGraphService.getTemplates(site, nodeType, locale);
            if (current != null) {
                return Collections.singletonList(choice(current, templates.get(current)));
            }
            Set<String> mapped = openGraphService.getMappings(site).stream()
                    .filter(mapping -> nodeType.equals(mapping.getNodeType()) && mapping.getTemplateName() != null)
                    .map(TypeMapping::getTemplateName).collect(Collectors.toSet());
            List<ChoiceListValue> choices = new ArrayList<>();
            for (Map.Entry<String, String> template : templates.entrySet()) {
                if (!mapped.contains(template.getKey())) {
                    choices.add(choice(template.getKey(), template.getValue()));
                }
            }
            choices.sort(ChoiceListContext.BY_DISPLAY_NAME);
            return choices;
        } catch (InvalidMappingException e) {
            return current == null ? Collections.emptyList() : Collections.singletonList(choice(current, null));
        } catch (RepositoryException e) {
            throw new IllegalStateException("Cannot list the templates of " + nodeType, e);
        }
    }

    private static ChoiceListValue choice(String name, String displayName) {
        return new ChoiceListValue(ChoiceListContext.label(displayName, name), name);
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

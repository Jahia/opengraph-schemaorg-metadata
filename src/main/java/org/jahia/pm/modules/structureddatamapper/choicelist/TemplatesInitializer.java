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
import java.util.MissingResourceException;
import java.util.ResourceBundle;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lists the templates that a new mapping can use: {@link OpenGraphService#ALL_TEMPLATES} when the content type of the
 * form has no mapping of every template yet, then its templates that have no template mapping yet. The form of an
 * existing mapping lists its own template only, so the template of a mapping never changes.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class TemplatesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "sdmTemplates";
    private static final String BUNDLE = "resources.structured-data-mapper";
    private static final String ALL_TEMPLATES_KEY = "choice.allTemplates";

    @Reference
    private OpenGraphService openGraphService;

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        if (ChoiceListContext.isEditForm(context)) {
            String current = OpenGraphService.templateOrNull(ChoiceListContext.storedValue(context, OpenGraphService.TEMPLATE_PROPERTY));
            return Collections.singletonList(current == null ? allTemplates(locale) : choice(current, null));
        }
        String nodeType = ChoiceListContext.currentValue(context, OpenGraphService.NODE_TYPE_PROPERTY);
        // Before the user selects a content type, the list keeps the default value of the field.
        if (nodeType == null || nodeType.isEmpty()) {
            return Collections.singletonList(allTemplates(locale));
        }
        try {
            JCRSiteNode site = ChoiceListContext.site(context);
            if (site == null) {
                return Collections.emptyList();
            }
            List<TypeMapping> mappings = openGraphService.getMappings(site).stream()
                    .filter(mapping -> nodeType.equals(mapping.getNodeType())).collect(Collectors.toList());
            List<ChoiceListValue> choices = new ArrayList<>();
            if (mappings.stream().noneMatch(mapping -> mapping.getTemplateName() == null)) {
                choices.add(allTemplates(locale));
            }
            Set<String> mapped = mappings.stream().map(TypeMapping::getTemplateName).collect(Collectors.toSet());
            List<ChoiceListValue> templates = new ArrayList<>();
            for (Map.Entry<String, String> template : templates(site, nodeType, locale).entrySet()) {
                if (!mapped.contains(template.getKey())) {
                    templates.add(choice(template.getKey(), template.getValue()));
                }
            }
            templates.sort(ChoiceListContext.BY_DISPLAY_NAME);
            choices.addAll(templates);
            return choices;
        } catch (RepositoryException e) {
            throw new IllegalStateException("Cannot list the templates of " + nodeType, e);
        }
    }

    /**
     * @return the templates of the content type, or none for a mixin or a type without {@code j:templateName}
     */
    private Map<String, String> templates(JCRSiteNode site, String nodeType, Locale locale) {
        try {
            return openGraphService.getTemplates(site, nodeType, locale);
        } catch (InvalidMappingException e) {
            return Collections.emptyMap();
        }
    }

    private static ChoiceListValue allTemplates(Locale locale) {
        String label;
        try {
            label = ResourceBundle.getBundle(BUNDLE, locale, TemplatesInitializer.class.getClassLoader()).getString(ALL_TEMPLATES_KEY);
        } catch (MissingResourceException e) {
            label = OpenGraphService.ALL_TEMPLATES;
        }
        return new ChoiceListValue(label, OpenGraphService.ALL_TEMPLATES);
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

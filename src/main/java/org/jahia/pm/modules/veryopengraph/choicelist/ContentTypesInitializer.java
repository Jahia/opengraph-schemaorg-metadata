package org.jahia.pm.modules.veryopengraph.choicelist;

import org.jahia.pm.modules.veryopengraph.OpenGraphService;
import org.jahia.pm.modules.veryopengraph.TypeMapping;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.nodetypes.ExtendedNodeType;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.jahia.services.content.nodetypes.NodeTypeRegistry;
import org.jahia.services.content.nodetypes.initializers.ChoiceListValue;
import org.jahia.services.content.nodetypes.initializers.ModuleChoiceListInitializer;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

import javax.jcr.RepositoryException;
import javax.jcr.nodetype.NoSuchNodeTypeException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Lists the content types that a new mapping can use: the mappable types of the site that have no mapping yet.
 * The form of an existing mapping lists its own content type only, so the content type of a mapping never changes.
 */
@Component(service = ModuleChoiceListInitializer.class)
public class ContentTypesInitializer implements ModuleChoiceListInitializer {

    private static final String KEY = "vogContentTypes";

    @Reference
    private OpenGraphService openGraphService;

    @Override
    public List<ChoiceListValue> getChoiceListValues(ExtendedPropertyDefinition epd, String param, List<ChoiceListValue> values,
                                                     Locale locale, Map<String, Object> context) {
        String current = ChoiceListContext.storedValue(context, OpenGraphService.NODE_TYPE_PROPERTY);
        if (current != null) {
            return Collections.singletonList(new ChoiceListValue(label(current, locale), current));
        }
        try {
            JCRSiteNode site = ChoiceListContext.site(context);
            if (site == null) {
                return Collections.emptyList();
            }
            Set<String> mapped = openGraphService.getMappings(site).stream().map(TypeMapping::getNodeType).collect(Collectors.toSet());
            List<ChoiceListValue> choices = new ArrayList<>();
            for (ExtendedNodeType type : openGraphService.getMappableTypes(site)) {
                if (!mapped.contains(type.getName())) {
                    choices.add(new ChoiceListValue(ChoiceListContext.label(type.getLabel(locale), type.getName()), type.getName()));
                }
            }
            choices.sort(ChoiceListContext.BY_DISPLAY_NAME);
            return choices;
        } catch (RepositoryException e) {
            throw new IllegalStateException("Cannot list the content types of the Open Graph mappings", e);
        }
    }

    private static String label(String nodeType, Locale locale) {
        try {
            return ChoiceListContext.label(NodeTypeRegistry.getInstance().getNodeType(nodeType).getLabel(locale), nodeType);
        } catch (NoSuchNodeTypeException e) {
            return nodeType;
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

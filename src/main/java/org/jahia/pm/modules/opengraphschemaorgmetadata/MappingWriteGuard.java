package org.jahia.pm.modules.opengraphschemaorgmetadata;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.jahia.services.content.JCRStoreService;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.content.interceptor.PropertyInterceptor;
import org.jahia.services.content.nodetypes.ExtendedPropertyDefinition;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Deactivate;

import javax.jcr.AccessDeniedException;
import javax.jcr.RepositoryException;
import javax.jcr.Value;

/**
 * Refuses a change of a mapping to a user who does not hold {@code openGraphSchemaOrgMetadataManage} on its site.
 * <p>
 * The screen of the module edits a mapping with the Content Editor, which saves it through the generic node mutations
 * of GraphQL. Those check the ACL of the node only, and every editing role can write the site, so the permission must
 * bind the properties of the mapping node, and not only the resolvers of the module. A system session passes: the
 * resolvers check the permission before they open one.
 * <p>
 * Jahia calls an interceptor when a property is set or removed, and not when a node is removed or moved. So a user
 * who can write the site can still remove a mapping, but cannot create one or change its values.
 */
@Component(service = {}, immediate = true)
public class MappingWriteGuard implements PropertyInterceptor {

    private static final String TYPE_MAPPING_TYPE = "osmnt:typeMapping";
    private static final String STORAGE_PREFIX = "osm:";

    @Activate
    public void activate() {
        JCRStoreService.getInstance().addInterceptor(this);
    }

    @Deactivate
    public void deactivate() {
        JCRStoreService.getInstance().removeInterceptor(this);
    }

    @Override
    public boolean canApplyOnProperty(JCRNodeWrapper node, ExtendedPropertyDefinition definition) throws RepositoryException {
        // The chain asks every interceptor about every property that a session sets, so the name test comes first.
        return definition != null && definition.getName().startsWith(STORAGE_PREFIX) && node.isNodeType(TYPE_MAPPING_TYPE);
    }

    @Override
    public void beforeRemove(JCRNodeWrapper node, String name, ExtendedPropertyDefinition definition)
            throws RepositoryException {
        checkManage(node);
    }

    @Override
    public Value beforeSetValue(JCRNodeWrapper node, String name, ExtendedPropertyDefinition definition, Value originalValue)
            throws RepositoryException {
        checkManage(node);
        return originalValue;
    }

    @Override
    public Value[] beforeSetValues(JCRNodeWrapper node, String name, ExtendedPropertyDefinition definition,
                                   Value[] originalValues) throws RepositoryException {
        checkManage(node);
        return originalValues;
    }

    @Override
    public Value afterGetValue(JCRPropertyWrapper property, Value storedValue) {
        return storedValue;
    }

    @Override
    public Value[] afterGetValues(JCRPropertyWrapper property, Value[] storedValues) {
        return storedValues;
    }

    private static void checkManage(JCRNodeWrapper node) throws RepositoryException {
        if (node.getSession().isSystem()) {
            return;
        }
        JCRSiteNode site = node.getResolveSite();
        if (site == null || !site.hasPermission(OpenGraphService.MANAGE_PERMISSION)) {
            throw new AccessDeniedException("Permission '" + OpenGraphService.MANAGE_PERMISSION
                    + "' is required to change the mapping " + node.getPath());
        }
    }
}

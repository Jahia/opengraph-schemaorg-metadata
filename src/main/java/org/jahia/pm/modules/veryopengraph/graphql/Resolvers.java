package org.jahia.pm.modules.veryopengraph.graphql;

import org.jahia.modules.graphql.provider.dxm.DataFetchingException;
import org.jahia.modules.graphql.provider.dxm.node.GqlJcrWrongInputException;
import org.jahia.osgi.BundleUtils;
import org.jahia.pm.modules.veryopengraph.OpenGraphService;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;

import javax.jcr.AccessDeniedException;
import javax.jcr.RepositoryException;

/**
 * The checks and the lookups that every resolver of the module shares.
 */
final class Resolvers {

    private static final String SITE_TYPE = "jnt:virtualsite";

    private Resolvers() {
    }

    static OpenGraphService service() {
        OpenGraphService service = BundleUtils.getOsgiService(OpenGraphService.class, null);
        if (service == null) {
            throw new DataFetchingException("The service " + OpenGraphService.class.getSimpleName() + " is not available");
        }
        return service;
    }

    /**
     * @return the site of the node, when the node is a site node and the user holds {@code veryOpenGraphManage} on it
     */
    static JCRSiteNode managedSite(JCRNodeWrapper node) {
        try {
            if (!node.isNodeType(SITE_TYPE)) {
                throw new GqlJcrWrongInputException("The node " + node.getPath() + " is not a site node");
            }
            if (!node.hasPermission(OpenGraphService.MANAGE_PERMISSION)) {
                throw new AccessDeniedException("Permission '" + OpenGraphService.MANAGE_PERMISSION
                        + "' is required on " + node.getPath());
            }
            return node.getResolveSite();
        } catch (RepositoryException e) {
            throw new DataFetchingException(e);
        }
    }
}

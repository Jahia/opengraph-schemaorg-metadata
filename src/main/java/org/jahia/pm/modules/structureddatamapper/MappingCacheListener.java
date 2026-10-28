package org.jahia.pm.modules.structureddatamapper;

import org.jahia.api.Constants;
import org.jahia.services.content.DefaultEventListener;
import org.jahia.services.content.ExternalEventListener;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.jcr.observation.Event;
import javax.jcr.observation.EventIterator;
import java.util.HashSet;
import java.util.Set;

/**
 * Removes the cached mappings of a site from {@link OpenGraphService} when its settings node changes in the default
 * workspace, or when the site node is removed.
 * <p>
 * Jahia registers every OSGi service of type {@link DefaultEventListener}. The listener also receives the events of
 * the other cluster nodes, because it implements {@link ExternalEventListener}.
 */
@Component(service = DefaultEventListener.class, immediate = true)
public class MappingCacheListener extends DefaultEventListener implements ExternalEventListener {

    private static final Logger logger = LoggerFactory.getLogger(MappingCacheListener.class);
    private static final String SITES = "/sites/";

    @Reference
    private OpenGraphService openGraphService;

    public MappingCacheListener() {
        setWorkspace(Constants.EDIT_WORKSPACE);
    }

    @Override
    public int getEventTypes() {
        return Event.NODE_ADDED | Event.NODE_REMOVED | Event.NODE_MOVED
                | Event.PROPERTY_ADDED | Event.PROPERTY_CHANGED | Event.PROPERTY_REMOVED;
    }

    /**
     * @return a regular expression, which Jahia accepts as a path: a site node, its settings node and the subtree
     * of the settings node
     */
    @Override
    public String getPath() {
        return "/sites/[^/]+(/" + OpenGraphService.SETTINGS_NODE_NAME + "(/.*)?)?";
    }

    @Override
    public boolean isDeep() {
        return false;
    }

    @Override
    public void onEvent(EventIterator events) {
        Set<String> sitePaths = new HashSet<>();
        while (events.hasNext()) {
            try {
                sitePaths.add(sitePath(events.nextEvent().getPath()));
            } catch (RepositoryException e) {
                logger.warn("Cannot read the path of an event, so all the cached Open Graph mappings are removed: {}",
                        e.getMessage());
                openGraphService.clearMappings();
                return;
            }
        }
        sitePaths.forEach(openGraphService::clearMappings);
    }

    /**
     * @return the path of the site, such as {@code /sites/digitall} for {@code /sites/digitall/structured-data-mapper}
     */
    private static String sitePath(String path) {
        int end = path.indexOf('/', SITES.length());
        return end < 0 ? path : path.substring(0, end);
    }
}

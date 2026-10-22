package org.jahia.pm.modules.structureddatamapper;

import java.util.Collections;
import java.util.List;

/**
 * Maps a content type of a site to an og:type, and some of its properties to Open Graph properties.
 */
public final class TypeMapping {

    private final String uuid;
    private final String nodeType;
    private final String ogType;
    private final List<PropertyMapping> properties;

    public TypeMapping(String uuid, String nodeType, String ogType, List<PropertyMapping> properties) {
        this.uuid = uuid;
        this.nodeType = nodeType;
        this.ogType = ogType;
        this.properties = Collections.unmodifiableList(properties);
    }

    /**
     * @return the identifier of the node that stores the mapping
     */
    public String getUuid() {
        return uuid;
    }

    /**
     * @return the content type, such as {@code jnt:news}
     */
    public String getNodeType() {
        return nodeType;
    }

    /**
     * @return the og:type, such as {@code article}
     */
    public String getOgType() {
        return ogType;
    }

    public List<PropertyMapping> getProperties() {
        return properties;
    }
}

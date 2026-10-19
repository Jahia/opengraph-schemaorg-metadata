package org.jahia.pm.modules.veryopengraph;

/**
 * Thrown when a mapping names a content type, an og:type or a property that the site cannot use.
 */
public class InvalidMappingException extends Exception {

    private static final long serialVersionUID = 1L;

    public InvalidMappingException(String message) {
        super(message);
    }
}

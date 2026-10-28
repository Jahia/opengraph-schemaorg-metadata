package org.jahia.pm.modules.structureddatamapper.vocabulary;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLName;

/**
 * The kind of value that an Open Graph property holds.
 */
@GraphQLName("OpenGraphKind")
@GraphQLDescription("The kind of value that an Open Graph property holds")
public enum OgKind {
    /** Plain text, such as a title or a name. */
    TEXT,
    /** A date in ISO 8601. */
    DATE,
    /** An absolute URL, built from a text or from a file node. */
    URL,
    /** The absolute URL of an image, built from a file node. */
    IMAGE,
    /** A whole number, such as {@code music:duration}. */
    INTEGER
}

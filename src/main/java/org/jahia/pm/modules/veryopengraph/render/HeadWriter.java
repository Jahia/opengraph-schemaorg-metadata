package org.jahia.pm.modules.veryopengraph.render;

import org.owasp.encoder.Encode;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Writes the Open Graph meta tags, and finds where they go in the HTML of a page.
 */
final class HeadWriter {

    private static final Pattern HEAD_END = Pattern.compile("</head\\s*>", Pattern.CASE_INSENSITIVE);
    private static final String TWITTER_PREFIX = "twitter:";

    private HeadWriter() {
    }

    /**
     * @return the index of the first {@code </head>} tag in any letter case, or -1 when the HTML has none
     */
    static int headEnd(String html) {
        Matcher matcher = HEAD_END.matcher(html);
        return matcher.find() ? matcher.start() : -1;
    }

    /**
     * X documents its {@code twitter:*} tags with the attribute {@code name}, and Open Graph uses {@code property}.
     *
     * @return one meta tag on its own line, with both attribute values encoded for a double-quoted attribute
     */
    static String meta(String property, String content) {
        String attribute = property.startsWith(TWITTER_PREFIX) ? "name" : "property";
        return "<meta " + attribute + "=\"" + Encode.forHtmlAttribute(property) + "\" content=\""
                + Encode.forHtmlAttribute(content) + "\"/>\n";
    }
}

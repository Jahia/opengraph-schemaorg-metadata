package org.jahia.pm.modules.structureddatamapper.render;

import org.owasp.encoder.Encode;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Writes the Open Graph meta tags, and finds where they go in the HTML of a page.
 */
final class HeadWriter {

    private static final Pattern HEAD_END = Pattern.compile("</head\\s*>", Pattern.CASE_INSENSITIVE);

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
     * @return one meta tag on its own line, with both attribute values encoded for a double-quoted attribute
     */
    static String meta(String property, String content) {
        return "<meta property=\"" + Encode.forHtmlAttribute(property) + "\" content=\""
                + Encode.forHtmlAttribute(content) + "\"/>\n";
    }
}

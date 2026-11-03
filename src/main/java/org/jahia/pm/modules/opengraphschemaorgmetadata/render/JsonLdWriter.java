package org.jahia.pm.modules.opengraphschemaorgmetadata.render;

import java.math.BigDecimal;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Writes a schema.org entity as a JSON-LD script element.
 */
public final class JsonLdWriter {

    private static final char[] HEX = "0123456789abcdef".toCharArray();

    private JsonLdWriter() {
    }

    /**
     * @return the script element on its own line
     */
    static String script(Map<String, ?> entity) {
        return "<script type=\"application/ld+json\">" + json(entity) + "</script>\n";
    }

    /**
     * Writes a map as an object in the order of its keys, a list as an array, a number as a number, and any other
     * value as a string. A string writes {@code <}, {@code >} and {@code &} as Unicode escapes, so a value cannot close
     * the script element or open a comment in it. It also escapes U+2028 and U+2029, which end a line in JavaScript
     * before ES2019.
     *
     * @return the JSON text of the value, on one line
     */
    public static String json(Object value) {
        StringBuilder json = new StringBuilder();
        write(json, value);
        return json.toString();
    }

    private static void write(StringBuilder json, Object value) {
        if (value == null) {
            json.append("null");
        } else if (value instanceof Map) {
            writeObject(json, (Map<?, ?>) value);
        } else if (value instanceof List) {
            writeArray(json, (List<?>) value);
        } else if (value instanceof BigDecimal) {
            json.append(((BigDecimal) value).toPlainString());
        } else if (value instanceof Number || value instanceof Boolean) {
            json.append(value);
        } else {
            writeString(json, value.toString());
        }
    }

    private static void writeObject(StringBuilder json, Map<?, ?> object) {
        json.append('{');
        Iterator<? extends Map.Entry<?, ?>> entries = object.entrySet().iterator();
        while (entries.hasNext()) {
            Map.Entry<?, ?> entry = entries.next();
            writeString(json, String.valueOf(entry.getKey()));
            json.append(':');
            write(json, entry.getValue());
            if (entries.hasNext()) {
                json.append(',');
            }
        }
        json.append('}');
    }

    private static void writeArray(StringBuilder json, List<?> array) {
        json.append('[');
        for (int index = 0; index < array.size(); index++) {
            if (index > 0) {
                json.append(',');
            }
            write(json, array.get(index));
        }
        json.append(']');
    }

    private static void writeString(StringBuilder json, String text) {
        json.append('"');
        for (int index = 0; index < text.length(); index++) {
            char character = text.charAt(index);
            switch (character) {
                case '"':
                    json.append("\\\"");
                    break;
                case '\\':
                    json.append("\\\\");
                    break;
                case '\n':
                    json.append("\\n");
                    break;
                case '\r':
                    json.append("\\r");
                    break;
                case '\t':
                    json.append("\\t");
                    break;
                case '<':
                case '>':
                case '&':
                case '\u2028':
                case '\u2029':
                    appendUnicodeEscape(json, character);
                    break;
                default:
                    if (character < 0x20) {
                        appendUnicodeEscape(json, character);
                    } else {
                        json.append(character);
                    }
            }
        }
        json.append('"');
    }

    private static void appendUnicodeEscape(StringBuilder json, char character) {
        json.append("\\u")
                .append(HEX[(character >> 12) & 0xF])
                .append(HEX[(character >> 8) & 0xF])
                .append(HEX[(character >> 4) & 0xF])
                .append(HEX[character & 0xF]);
    }
}

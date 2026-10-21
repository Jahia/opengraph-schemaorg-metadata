package org.jahia.pm.modules.veryopengraph.vocabulary;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Calendar;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Converts a JCR value to the text of an Open Graph meta tag.
 */
public final class OgValues {

    private static final DateTimeFormatter ISO_DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

    private static final Pattern INVISIBLE_ELEMENT = Pattern.compile("<(script|style)\\b[^>]*>.*?</\\1\\s*>",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern COMMENT = Pattern.compile("<!--.*?-->", Pattern.DOTALL);
    private static final Pattern BLOCK_TAG = Pattern.compile(
            "</?(p|div|br|hr|li|ul|ol|h[1-6]|tr|td|th|table|blockquote|pre|section|article|header|footer)\\b[^>]*>",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern TAG = Pattern.compile("<[^>]*>");
    private static final Pattern ENTITY = Pattern.compile("&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]+);");
    private static final Pattern WHITE_SPACE = Pattern.compile("[\\s\\u00A0]+");
    // Long.parseLong also reads the digits of other scripts. Without UNICODE_CHARACTER_CLASS, \d matches the ASCII
    // digits only.
    private static final Pattern DIGITS = Pattern.compile("\\d+");

    private static final Map<String, String> NAMED_ENTITIES = new TreeMap<>();

    static {
        NAMED_ENTITIES.put("amp", "&");
        NAMED_ENTITIES.put("lt", "<");
        NAMED_ENTITIES.put("gt", ">");
        NAMED_ENTITIES.put("quot", "\"");
        NAMED_ENTITIES.put("apos", "'");
        NAMED_ENTITIES.put("nbsp", " ");
    }

    private OgValues() {
    }

    /**
     * @return the date in ISO 8601 in UTC, to the second, such as {@code 2026-10-19T09:30:00Z}
     */
    public static String isoDate(Calendar date) {
        return date.toInstant().truncatedTo(ChronoUnit.SECONDS).atOffset(ZoneOffset.UTC).format(ISO_DATE_TIME);
    }

    /**
     * Removes the HTML elements of a rich text, decodes the character references and joins the white space.
     *
     * @return the text, or an empty string when the HTML holds no text
     */
    public static String plainText(String html) {
        String text = INVISIBLE_ELEMENT.matcher(html).replaceAll(" ");
        text = COMMENT.matcher(text).replaceAll(" ");
        text = BLOCK_TAG.matcher(text).replaceAll(" ");
        text = TAG.matcher(text).replaceAll("");
        text = decodeEntities(text);
        return WHITE_SPACE.matcher(text).replaceAll(" ").trim();
    }

    /**
     * @return the locale as {@code language_TERRITORY}, such as {@code fr_FR}, or the language alone when the
     * locale has no country
     */
    public static String ogLocale(Locale locale) {
        String country = locale.getCountry();
        return country.isEmpty() ? locale.getLanguage() : locale.getLanguage() + "_" + country;
    }

    /**
     * Reads a value of a closed list, such as {@code male} or {@code female} for {@code profile:gender}.
     *
     * @param allowed the values that the protocol accepts, in lower case
     * @return the value without its outer white space and in lower case, or null when it is not in the list
     */
    public static String allowedValue(String value, Set<String> allowed) {
        String lowerCase = value.trim().toLowerCase(Locale.ROOT);
        return allowed.contains(lowerCase) ? lowerCase : null;
    }

    /**
     * The protocol writes a number, such as {@code music:duration}, as an integer of 1 or more. Its type Integer is a
     * 32-bit signed integer, so the largest value is 2147483647.
     *
     * @return the number in decimal, or null when it is less than 1 or greater than 2147483647
     */
    public static String positiveInteger(long value) {
        return value < 1 || value > Integer.MAX_VALUE ? null : Long.toString(value);
    }

    /**
     * Reads a number that an editor typed. The text holds decimal digits only, after the removal of its outer white
     * space.
     *
     * @return the number in decimal without leading zeros, or null when the text is not an integer from 1 to
     * 2147483647
     */
    public static String positiveInteger(String value) {
        String digits = value.trim();
        if (!DIGITS.matcher(digits).matches()) {
            return null;
        }
        try {
            return positiveInteger(Long.parseLong(digits));
        } catch (NumberFormatException e) {
            // The number is greater than the largest long.
            return null;
        }
    }

    private static String decodeEntities(String text) {
        Matcher matcher = ENTITY.matcher(text);
        StringBuilder decoded = new StringBuilder(text.length());
        while (matcher.find()) {
            matcher.appendReplacement(decoded, Matcher.quoteReplacement(decodeEntity(matcher.group(1), matcher.group())));
        }
        matcher.appendTail(decoded);
        return decoded.toString();
    }

    private static String decodeEntity(String body, String reference) {
        if (body.charAt(0) != '#') {
            return NAMED_ENTITIES.getOrDefault(body, reference);
        }
        boolean hexadecimal = body.charAt(1) == 'x' || body.charAt(1) == 'X';
        int codePoint = Integer.parseInt(body.substring(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
        return Character.isValidCodePoint(codePoint) ? new String(Character.toChars(codePoint)) : reference;
    }
}

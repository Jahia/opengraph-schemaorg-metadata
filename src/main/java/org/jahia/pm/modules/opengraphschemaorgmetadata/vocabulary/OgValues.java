package org.jahia.pm.modules.opengraphschemaorgmetadata.vocabulary;

import java.time.ZoneOffset;
import java.time.chrono.IsoChronology;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.time.temporal.ChronoUnit;
import java.util.Calendar;
import java.util.HashSet;
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
    // The extended format of ISO 8601: a date, then an optional time, then an optional offset. ISO_LOCAL_TIME reads the
    // seconds and their fraction as optional.
    private static final DateTimeFormatter ISO_DATE_OR_DATE_TIME = new DateTimeFormatterBuilder()
            .parseCaseInsensitive()
            .append(DateTimeFormatter.ISO_LOCAL_DATE)
            .optionalStart()
            .appendLiteral('T')
            .append(DateTimeFormatter.ISO_LOCAL_TIME)
            .optionalStart()
            .appendOffsetId()
            .optionalEnd()
            .optionalEnd()
            .toFormatter(Locale.ROOT)
            .withChronology(IsoChronology.INSTANCE)
            .withResolverStyle(ResolverStyle.STRICT);
    private static final Pattern URL_START = Pattern.compile("https?://([^/?#]*)", Pattern.CASE_INSENSITIVE);
    private static final Pattern URL_FORBIDDEN = Pattern.compile("[\\p{Cc}\\p{Z}]");
    // A host name, or an IPv6 address in brackets, then an optional port.
    private static final Pattern HOST_AND_PORT = Pattern.compile("(?:\\[[\\p{XDigit}:.]+\\]|[^\\[\\]:]+)(?::\\d*)?");

    private static final String[] INVISIBLE_ELEMENTS = {"script", "style"};
    private static final String[] BLOCK_ELEMENTS = {"p", "div", "br", "hr", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5",
            "h6", "tr", "td", "th", "table", "blockquote", "pre", "section", "article", "header", "footer"};
    private static final String COMMENT_START = "<!--";
    private static final String COMMENT_END = "-->";
    private static final int NO_MATCH = -1;
    private static final int NO_MORE_MATCHES = -2;
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
        String text = decodeEntities(withoutElements(html));
        return WHITE_SPACE.matcher(text).replaceAll(" ").trim();
    }

    /**
     * Replaces what these expressions matched, in this order: {@code <(script|style)\b[^>]*>.*?</\1\s*>},
     * {@code <!--.*?-->} and {@code </?(p|div|...)\b[^>]*>} with a space, then {@code <[^>]*>} with nothing. Each step
     * reads the text once. The expressions read to the end of the text again from each opener without a closer, so a
     * rich text of 64 KB of {@code <} or {@code <!--} took seconds on every live page of its content.
     *
     * @return the HTML without its elements, with its character references
     */
    static String withoutElements(String html) {
        String text = replaceElements(html, " ", new InvisibleElements());
        text = replaceElements(text, " ", OgValues::commentEnd);
        text = replaceElements(text, " ", OgValues::blockTagEnd);
        return replaceElements(text, "", OgValues::tagEnd);
    }

    /**
     * Finds the end of an element of one kind that starts at a {@code <}.
     */
    @FunctionalInterface
    private interface ElementEnd {

        /**
         * @return the index after the element that starts at {@code start}, {@code NO_MATCH} when none starts there,
         * or {@code NO_MORE_MATCHES} when none starts there or at any later index
         */
        int at(String text, int start);
    }

    /**
     * @return the text where the replacement takes the place of each element, from left to right and without overlap,
     * as {@link Matcher#replaceAll} does
     */
    private static String replaceElements(String text, String replacement, ElementEnd element) {
        StringBuilder result = new StringBuilder(text.length());
        int copied = 0;
        int start = text.indexOf('<');
        while (start >= 0) {
            int end = element.at(text, start);
            if (end == NO_MORE_MATCHES) {
                break;
            }
            if (end == NO_MATCH) {
                start = text.indexOf('<', start + 1);
            } else {
                result.append(text, copied, start).append(replacement);
                copied = end;
                start = text.indexOf('<', end);
            }
        }
        return result.append(text, copied, text.length()).toString();
    }

    /**
     * {@code <(script|style)\b[^>]*>.*?</\1\s*>}, case insensitive. An element without a closer leaves no closer for a
     * later element of the same name either, so the matcher remembers the name and reads the text once per name.
     */
    private static final class InvisibleElements implements ElementEnd {

        private final Set<String> withoutCloser = new HashSet<>();

        @Override
        public int at(String text, int start) {
            String name = elementName(text, start + 1, INVISIBLE_ELEMENTS);
            if (name == null || withoutCloser.contains(name)) {
                return NO_MATCH;
            }
            int openerEnd = text.indexOf('>', start + 1 + name.length());
            if (openerEnd < 0) {
                return NO_MORE_MATCHES;
            }
            int end = closerEnd(text, openerEnd + 1, name);
            if (end < 0) {
                withoutCloser.add(name);
                return NO_MATCH;
            }
            return end;
        }
    }

    /**
     * {@code <!--.*?-->}: a comment ends at the first {@code -->} after its opener.
     */
    private static int commentEnd(String text, int start) {
        if (!text.startsWith(COMMENT_START, start)) {
            return NO_MATCH;
        }
        int end = text.indexOf(COMMENT_END, start + COMMENT_START.length());
        return end < 0 ? NO_MORE_MATCHES : end + COMMENT_END.length();
    }

    /**
     * {@code </?(p|div|...)\b[^>]*>}, case insensitive.
     */
    private static int blockTagEnd(String text, int start) {
        int nameStart = start + 1;
        if (nameStart < text.length() && text.charAt(nameStart) == '/') {
            nameStart++;
        }
        String name = elementName(text, nameStart, BLOCK_ELEMENTS);
        if (name == null) {
            return NO_MATCH;
        }
        int end = text.indexOf('>', nameStart + name.length());
        return end < 0 ? NO_MORE_MATCHES : end + 1;
    }

    /**
     * {@code <[^>]*>}: a tag ends at the first {@code >} after its {@code <}.
     */
    private static int tagEnd(String text, int start) {
        int end = text.indexOf('>', start + 1);
        return end < 0 ? NO_MORE_MATCHES : end + 1;
    }

    /**
     * Without {@code UNICODE_CASE}, a case insensitive expression folds the ASCII letters only. A name ends where
     * {@code \b} of Java 17 finds a boundary: before a character that is not a letter, a digit, {@code _} or a
     * non-spacing mark.
     *
     * @return the name, in lower case, that starts at the index and ends at a word boundary, or null
     */
    private static String elementName(String text, int index, String[] names) {
        for (String name : names) {
            int end = index + name.length();
            if (end <= text.length() && equalsIgnoreAsciiCase(text, index, name)
                    && (end == text.length() || !isWordCharacter(text.codePointAt(end)))) {
                return name;
            }
        }
        return null;
    }

    /**
     * @return the index after the first {@code </name\s*>}, case insensitive, at or after {@code from}, or -1
     */
    private static int closerEnd(String text, int from, String name) {
        int index = text.indexOf("</", from);
        while (index >= 0) {
            int end = index + 2 + name.length();
            if (end <= text.length() && equalsIgnoreAsciiCase(text, index + 2, name)) {
                while (end < text.length() && isSpace(text.charAt(end))) {
                    end++;
                }
                if (end < text.length() && text.charAt(end) == '>') {
                    return end + 1;
                }
            }
            index = text.indexOf("</", index + 1);
        }
        return -1;
    }

    /**
     * @param lowerCase a name in lower case ASCII
     */
    private static boolean equalsIgnoreAsciiCase(String text, int index, String lowerCase) {
        for (int offset = 0; offset < lowerCase.length(); offset++) {
            char character = text.charAt(index + offset);
            char folded = character >= 'A' && character <= 'Z' ? (char) (character + ('a' - 'A')) : character;
            if (folded != lowerCase.charAt(offset)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isWordCharacter(int codePoint) {
        return codePoint == '_' || Character.isLetterOrDigit(codePoint)
                || Character.getType(codePoint) == Character.NON_SPACING_MARK;
    }

    /**
     * @return true for a character of {@code \s} without {@code UNICODE_CHARACTER_CLASS}
     */
    private static boolean isSpace(char character) {
        return character == ' ' || (character >= '\t' && character <= '\r');
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

    /**
     * Reads a date that an editor typed, in the extended format of ISO 8601: a date, such as {@code 2026-10-19}, or a
     * date and a time with an optional offset, such as {@code 2026-10-19T09:30} or {@code 2026-10-19T09:30:00Z}.
     * The date and the time must exist, so {@code 2026-02-30} is not a date.
     *
     * @return true when the text is such a date
     */
    public static boolean isIsoDate(String value) {
        try {
            ISO_DATE_OR_DATE_TIME.parse(value);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    /**
     * Reads a URL that an editor typed. An absolute URL starts with {@code http://} or {@code https://} in any case,
     * names a host, and holds no white space and no control character.
     *
     * @return true when the text is such a URL
     */
    public static boolean isAbsoluteUrl(String value) {
        Matcher start = URL_START.matcher(value);
        if (!start.lookingAt() || URL_FORBIDDEN.matcher(value).find()) {
            return false;
        }
        // The user information ends at the last @ of the authority.
        String authority = start.group(1);
        return HOST_AND_PORT.matcher(authority.substring(authority.lastIndexOf('@') + 1)).matches();
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

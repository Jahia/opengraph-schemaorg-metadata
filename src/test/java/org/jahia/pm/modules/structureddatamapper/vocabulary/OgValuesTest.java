package org.jahia.pm.modules.structureddatamapper.vocabulary;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.TimeZone;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

class OgValuesTest {

    @Test
    void isoDateWritesUtcToTheSecond() {
        Calendar date = new GregorianCalendar(TimeZone.getTimeZone("Europe/Paris"));
        date.clear();
        date.set(2026, Calendar.OCTOBER, 19, 11, 30, 0);
        date.set(Calendar.MILLISECOND, 750);

        assertEquals("2026-10-19T09:30:00Z", OgValues.isoDate(date));
    }

    @Test
    void plainTextRemovesTagsAndJoinsWhiteSpace() {
        assertEquals("Title Body text and more.",
                OgValues.plainText("<h2>Title</h2>\n<p>Body <strong>text</strong>&nbsp;and<br/>more.</p>"));
    }

    @Test
    void plainTextDropsScriptsStylesAndComments() {
        assertEquals("Visible text",
                OgValues.plainText("<style>p{color:red}</style><!-- note --><p>Visible</p><script>alert(1)</script> text"));
    }

    @Test
    void plainTextDecodesCharacterReferences() {
        assertEquals("Tom & Jerry <3 \"quoted\" é é €",
                OgValues.plainText("Tom &amp; Jerry &lt;3 &quot;quoted&quot; &#233; &#xE9; &#8364;"));
    }

    @Test
    void plainTextKeepsAnUnknownNamedReference() {
        assertEquals("a &unknown; b", OgValues.plainText("a &unknown; b"));
    }

    @Test
    void withoutElementsMatchesTheExpressionsItReplaces() {
        // The four expressions that plainText used until the scan replaced them.
        Pattern invisibleElement = Pattern.compile("<(script|style)\\b[^>]*>.*?</\\1\\s*>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Pattern comment = Pattern.compile("<!--.*?-->", Pattern.DOTALL);
        Pattern blockTag = Pattern.compile(
                "</?(p|div|br|hr|li|ul|ol|h[1-6]|tr|td|th|table|blockquote|pre|section|article|header|footer)\\b[^>]*>",
                Pattern.CASE_INSENSITIVE);
        Pattern tag = Pattern.compile("<[^>]*>");
        // Whole openers and closers as well as single characters, so that the samples reach each branch: a closer with
        // each kind of white space, a name that a letter or a combining mark extends, and a dotless i.
        String[] pieces = {"<", ">", "/", "!", "-", "<!--", "-->", "</", "<script>", "<SCRIPT a=\">\">", "</script>",
                "</Script \t>", "</script\u000b>", "</script x>", "<scripts>", "<style>", "</STYLE\n>", "</style >",
                "script", "style", "<p>", "</p>", "<p", "<pre>", "<h1 >", "<h7>", "<br/>", "</ p>", "<p_>",
                "<pé>", "<div́>", "<lı>", "a", "x", "1", " ", "\t", "\n", "\u000b", " ", "&amp;"};
        Random random = new Random(42);
        for (int sample = 0; sample < 50_000; sample++) {
            StringBuilder html = new StringBuilder();
            for (int piece = random.nextInt(30); piece > 0; piece--) {
                html.append(pieces[random.nextInt(pieces.length)]);
            }
            String expected = invisibleElement.matcher(html).replaceAll(" ");
            expected = comment.matcher(expected).replaceAll(" ");
            expected = blockTag.matcher(expected).replaceAll(" ");
            expected = tag.matcher(expected).replaceAll("");
            assertEquals(expected, OgValues.withoutElements(html.toString()), html.toString());
        }
    }

    @Test
    void plainTextReadsOpenersWithoutACloserInLinearTime() {
        // The expressions took about 27 s for 256 KB of <!--, and 3 s for 64 KB of <.
        for (String opener : new String[]{"<", "<!--", "<style>", "<SCRIPT>", "<p", "</div"}) {
            String html = opener.repeat(256 * 1024 / opener.length());
            assertTimeoutPreemptively(Duration.ofSeconds(1), () -> OgValues.plainText(html), opener);
        }
    }

    @Test
    void ogLocaleWritesLanguageAndTerritory() {
        assertEquals("fr_FR", OgValues.ogLocale(Locale.FRANCE));
        assertEquals("en_US", OgValues.ogLocale(new Locale("en", "US")));
        assertEquals("de", OgValues.ogLocale(Locale.GERMAN));
    }

    @Test
    void allowedValueReadsTheGendersOfTheVocabularyInLowerCase() {
        Set<String> genders = allowedValues(OgType.PROFILE, "profile:gender");
        assertEquals(2, genders.size());
        assertEquals("male", OgValues.allowedValue("MALE", genders));
        assertEquals("female", OgValues.allowedValue(" Female ", genders));
        assertNull(OgValues.allowedValue("other", genders));
        assertNull(OgValues.allowedValue("", genders));
    }

    @Test
    void allowedValueReadsTheDeterminersOfTheVocabulary() {
        Set<String> determiners = allowedValues(OgType.WEBSITE, "og:determiner");
        assertEquals(4, determiners.size());
        assertEquals("a", OgValues.allowedValue("A", determiners));
        assertEquals("an", OgValues.allowedValue(" an ", determiners));
        assertEquals("the", OgValues.allowedValue("The", determiners));
        assertEquals("auto", OgValues.allowedValue("AUTO", determiners));
        assertNull(OgValues.allowedValue("foo", determiners));
        assertNull(OgValues.allowedValue("  ", determiners));
    }

    @Test
    void positiveIntegerKeepsANumberOfOneOrMore() {
        assertEquals("215", OgValues.positiveInteger(215L));
        assertEquals("1", OgValues.positiveInteger(1L));
        assertNull(OgValues.positiveInteger(0L));
        assertNull(OgValues.positiveInteger(-3L));
        assertEquals("2147483647", OgValues.positiveInteger(2147483647L));
        assertNull(OgValues.positiveInteger(2147483648L));
    }

    @Test
    void positiveIntegerReadsTheDecimalDigitsOfAText() {
        assertEquals("215", OgValues.positiveInteger(" 215 "));
        assertEquals("7", OgValues.positiveInteger("007"));
        assertEquals("2147483647", OgValues.positiveInteger("2147483647"));
    }

    @Test
    void positiveIntegerRefusesAnotherText() {
        assertNull(OgValues.positiveInteger("abc"));
        assertNull(OgValues.positiveInteger("0"));
        assertNull(OgValues.positiveInteger("000"));
        assertNull(OgValues.positiveInteger("-5"));
        assertNull(OgValues.positiveInteger("+5"));
        assertNull(OgValues.positiveInteger("2.5"));
        assertNull(OgValues.positiveInteger("1e3"));
        assertNull(OgValues.positiveInteger(""));
        assertNull(OgValues.positiveInteger("\u0663"));
        assertNull(OgValues.positiveInteger("2147483648"));
        assertNull(OgValues.positiveInteger("9223372036854775808"));
    }

    private static Set<String> allowedValues(OgType ogType, String property) {
        return ogType.findProperty(property).map(OgProperty::getValues)
                .orElseThrow(() -> new AssertionError(property + " is not a property of " + ogType.getValue()));
    }
}

package org.jahia.pm.modules.veryopengraph.vocabulary;

import org.junit.jupiter.api.Test;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

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

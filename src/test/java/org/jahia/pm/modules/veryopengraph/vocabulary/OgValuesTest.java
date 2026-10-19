package org.jahia.pm.modules.veryopengraph.vocabulary;

import org.junit.jupiter.api.Test;

import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.Locale;
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
    void genderKeepsMaleAndFemaleOnly() {
        assertEquals("female", OgValues.gender(" Female "));
        assertEquals("male", OgValues.gender("MALE"));
        assertNull(OgValues.gender("other"));
    }
}

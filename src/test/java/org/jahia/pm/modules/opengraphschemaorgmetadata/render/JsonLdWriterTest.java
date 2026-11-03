package org.jahia.pm.modules.opengraphschemaorgmetadata.render;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JsonLdWriterTest {

    @Test
    void scriptWritesTheObjectInTheOrderOfItsKeys() {
        Map<String, Object> author = new LinkedHashMap<>();
        author.put("@type", "Person");
        author.put("name", "Ada");
        Map<String, Object> entity = new LinkedHashMap<>();
        entity.put("@context", "https://schema.org");
        entity.put("@type", "Article");
        entity.put("author", author);
        entity.put("keywords", Arrays.asList("a", "b"));
        assertEquals("<script type=\"application/ld+json\">{\"@context\":\"https://schema.org\",\"@type\":\"Article\","
                        + "\"author\":{\"@type\":\"Person\",\"name\":\"Ada\"},\"keywords\":[\"a\",\"b\"]}</script>\n",
                JsonLdWriter.script(entity));
    }

    @Test
    void jsonEscapesTheCharactersThatCanEndTheScriptElement() {
        assertEquals("\"\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e\"",
                JsonLdWriter.json("</script><script>alert(1)</script>"));
        assertEquals("\"\\u003c!-- \\u0026amp; --\\u003e\"", JsonLdWriter.json("<!-- &amp; -->"));
    }

    @Test
    void jsonEscapesQuotesBackslashesAndControlCharacters() {
        assertEquals("\"Tom \\\"Jerry\\\" \\\\ a\\nb\\tc\\u0001\"", JsonLdWriter.json("Tom \"Jerry\" \\ a\nb\tc\u0001"));
        assertEquals("\"a\\u2028b\\u2029c\"", JsonLdWriter.json("a\u2028b\u2029c"));
    }

    @Test
    void jsonWritesNumbersAsNumbers() {
        assertEquals("[42,19.99,1000]", JsonLdWriter.json(Arrays.asList(42L, 19.99, new BigDecimal("1E+3"))));
    }
}

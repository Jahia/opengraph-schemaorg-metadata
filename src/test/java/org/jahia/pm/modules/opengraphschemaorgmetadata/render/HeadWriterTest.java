package org.jahia.pm.modules.opengraphschemaorgmetadata.render;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HeadWriterTest {

    @Test
    void headEndFindsTheFirstClosingHeadInAnyCase() {
        String html = "<html><HEAD><title>t</title></Head >\n<body><pre></head></pre></body></html>";
        assertEquals(html.indexOf("</Head >"), HeadWriter.headEnd(html));
    }

    @Test
    void headEndIsMinusOneWithoutAHead() {
        assertEquals(-1, HeadWriter.headEnd("<div class=\"news\">fragment</div>"));
    }

    @Test
    void metaEncodesTheContentForAnAttribute() {
        assertEquals("<meta property=\"og:title\" content=\"Tom &#34;Jerry&#34; &lt;script>alert(1)&lt;/script> &amp; co\"/>\n",
                HeadWriter.meta("og:title", "Tom \"Jerry\" <script>alert(1)</script> & co"));
    }

    @Test
    void metaWritesATwitterTagWithTheAttributeName() {
        assertEquals("<meta name=\"twitter:card\" content=\"summary_large_image\"/>\n",
                HeadWriter.meta("twitter:card", "summary_large_image"));
    }
}

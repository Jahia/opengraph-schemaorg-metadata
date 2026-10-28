import {addNode} from '@jahia/cypress';
import {deleteMapping, expectNoError, saveMapping} from '../support/openGraphApi';
import {deleteEverywhere, getLivePage, metaContents, publish} from '../support/livePage';
import {SITE_PATH} from '../support/structuredDataMapper';

const NEWS_PATH = `${SITE_PATH}/contents/sdm-escape-news`;
const TITLE = 'Tom "Jerry" <script>alert(1)</script>';
// The rich text holds encoded markup, and the module decodes it to text: the attribute must encode it again.
const DESCRIPTION_HTML = '<p>&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;</p>';
const DESCRIPTION = '"><script>alert(2)</script>';

describe('Open Graph tags with markup in the values', () => {
    before(() => {
        deleteMapping('jnt:news');
        deleteEverywhere(NEWS_PATH);
        addNode({
            parentPathOrId: `${SITE_PATH}/contents`,
            name: 'sdm-escape-news',
            primaryNodeType: 'jnt:news',
            properties: [
                {name: 'jcr:title', value: TITLE, language: 'en'},
                {name: 'desc', value: DESCRIPTION_HTML, language: 'en'}
            ]
        });
        publish(SITE_PATH);
        saveMapping({
            nodeType: 'jnt:news',
            ogType: 'article',
            properties: [
                {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
                {ogProperty: 'og:description', sourceProperty: 'desc'}
            ]
        }).then(expectNoError);
    });

    after(() => {
        deleteMapping('jnt:news');
        deleteEverywhere(NEWS_PATH);
    });

    it('encodes the title in the content attribute of og:title', () => {
        getLivePage(NEWS_PATH).then(page => {
            expect(page.html).to.contain(
                '<meta property="og:title" content="Tom &#34;Jerry&#34; &lt;script>alert(1)&lt;/script>"/>'
            );
            expect(metaContents(page, 'og:title')).to.deep.equal([TITLE]);
        });
    });

    it('encodes the text of a rich text, which holds the characters that end an attribute', () => {
        getLivePage(NEWS_PATH).then(page => {
            expect(page.html).to.contain(
                '<meta property="og:description" content="&#34;>&lt;script>alert(2)&lt;/script>"/>'
            );
            expect(metaContents(page, 'og:description')).to.deep.equal([DESCRIPTION]);
        });
    });

    it('adds no script element to the page', () => {
        getLivePage(NEWS_PATH).then(page => {
            const injected = Array.from(page.doc.querySelectorAll('script')).filter(script =>
                /alert\([12]\)/.test(script.textContent)
            );
            expect(injected).to.be.empty;
            expect(page.doc.querySelectorAll('meta[property="og:title"]')).to.have.length(1);
        });
    });
});

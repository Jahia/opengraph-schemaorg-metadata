import {addNode, setNodeProperty, uploadFile} from '@jahia/cypress';
import {deleteMapping, expectNoError, saveMapping, TypeMapping} from '../support/openGraphApi';
import {
    deleteEverywhere,
    jsonLdOf,
    jsonLdScripts,
    LivePage,
    livePathsOf,
    metaContents,
    publish
} from '../support/livePage';
import {EDITOR, SERVER_NAME, SITE_PATH} from '../support/openGraphSchemaOrgMetadata';

const PAGE_PATH = `${SITE_PATH}/home/osm-preview-page`;
const NEWS_PATH = `${SITE_PATH}/contents/osm-preview-news`;
const IMAGE_NAME = 'osm-preview-image.png';
const IMAGE_PATH = `${SITE_PATH}/files/${IMAGE_NAME}`;
const NODE_PATHS = [PAGE_PATH, NEWS_PATH, IMAGE_PATH];

const PAGE_MAPPING: TypeMapping = {
    nodeType: 'jnt:page',
    ogType: 'website',
    properties: [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}]
};
const NEWS_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'article',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:image', sourceProperty: 'image'}
    ],
    schemaType: 'Article',
    schemaProperties: [
        {schemaProperty: 'headline', sourceProperty: 'jcr:title'},
        {schemaProperty: 'image', sourceProperty: 'image'}
    ]
};

// Requests the English preview page of a node as an editor, and parses its HTML.
const getPreviewPage = (path: string): Cypress.Chainable<LivePage> => {
    cy.clearCookies();
    cy.login(EDITOR.username, EDITOR.password);
    return cy.request({url: `/cms/render/default/en${path}.html`}).then(response => {
        expect(response.status).to.equal(200);
        const html = response.body as string;
        return {html, doc: new DOMParser().parseFromString(html, 'text/html')};
    });
};

const single = (page: LivePage, property: string): string => {
    const contents = metaContents(page, property);
    expect(contents, property).to.have.length(1);
    return contents[0];
};

// Checks that a URL is absolute on the server name of the site, that its path ends with one of the suffixes, and that
// a guest can open its path.
const expectLiveUrl = (url: string, pathSuffixes: string[]) => {
    const parsed = new URL(url);
    expect(parsed.hostname, `host of ${url}`).to.equal(SERVER_NAME);
    expect(
        pathSuffixes.some(pathSuffix => parsed.pathname.endsWith(pathSuffix)),
        `${parsed.pathname} ends with one of ${pathSuffixes.join(', ')}`
    ).to.equal(true);
    cy.clearCookies();
    cy.request({url: parsed.pathname}).its('status').should('equal', 200);
};

describe('Open Graph tags and JSON-LD in the head of preview pages', () => {
    before(() => {
        ['jnt:page', 'jnt:news'].forEach(nodeType => deleteMapping(nodeType));
        NODE_PATHS.forEach(deleteEverywhere);
        addNode({
            parentPathOrId: `${SITE_PATH}/home`,
            name: 'osm-preview-page',
            primaryNodeType: 'jnt:page',
            properties: [
                {name: 'jcr:title', value: 'Preview page', language: 'en'},
                {name: 'j:templateName', value: 'home'}
            ]
        });
        uploadFile(`images/osm-filter-image.png`, `${SITE_PATH}/files`, IMAGE_NAME, 'image/png').then(result => {
            addNode({
                parentPathOrId: `${SITE_PATH}/contents`,
                name: 'osm-preview-news',
                primaryNodeType: 'jnt:news',
                properties: [
                    {name: 'jcr:title', value: 'Preview news', language: 'en'},
                    {name: 'image', value: result.data.jcr.addNode.uuid}
                ]
            });
        });
        publish(SITE_PATH);
        // A change that is not published yet, which preview shows and live does not.
        setNodeProperty(PAGE_PATH, 'jcr:title', 'Preview page, not published', 'en');
        saveMapping(PAGE_MAPPING).then(expectNoError);
        saveMapping(NEWS_MAPPING).then(expectNoError);
    });

    after(() => {
        ['jnt:page', 'jnt:news'].forEach(nodeType => deleteMapping(nodeType));
        NODE_PATHS.forEach(deleteEverywhere);
    });

    it('writes the tags of the edit workspace on a preview page, with the live URL of the page', () => {
        getPreviewPage(PAGE_PATH).then(page => {
            expect(single(page, 'og:title')).to.equal('Preview page, not published');
            expect(single(page, 'og:type')).to.equal('website');
            expect(page.html.indexOf('property="og:title"')).to.be.lessThan(page.html.search(/<\/head>/i));
            expectLiveUrl(single(page, 'og:url'), ['/sites/osmSite/home/osm-preview-page.html']);
        });
    });

    it('writes the live URLs of a news item and of its image in the tags and the JSON-LD block of preview', () => {
        getPreviewPage(NEWS_PATH).then(page => {
            // The template writes the preview URL of the image in the body, and the module writes none.
            const written = [
                ...Array.from(page.doc.head.querySelectorAll('meta[property]')).map(meta =>
                    meta.getAttribute('content')
                ),
                ...jsonLdScripts(page).map(script => script.textContent)
            ];
            expect(
                written.filter(value => /\/cms\/render\/default\/|\/files\/default\//.test(value)),
                'the tags and the JSON-LD block that hold a preview URL'
            ).to.be.empty;
            expect(single(page, 'og:title')).to.equal('Preview news');
            expectLiveUrl(single(page, 'og:image'), [`/files/live${IMAGE_PATH}`]);
            livePathsOf(NEWS_PATH).then(livePaths => expectLiveUrl(single(page, 'og:url'), livePaths));
            const scripts = jsonLdScripts(page);
            expect(scripts, 'JSON-LD blocks').to.have.length(1);
            expect(scripts[0].parentElement.tagName, 'the parent of the JSON-LD block').to.equal('HEAD');
            const entity = jsonLdOf(scripts[0]);
            expect(entity).to.include({'@type': 'Article', headline: 'Preview news'});
            expectLiveUrl(entity.image as string, [`/files/live${IMAGE_PATH}`]);
            livePathsOf(NEWS_PATH).then(livePaths => expectLiveUrl(entity.url as string, livePaths));
        });
    });
});

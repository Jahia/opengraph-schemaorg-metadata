import {addNode, uploadFile} from '@jahia/cypress';
import {
    deleteMapping,
    expectError,
    expectNoError,
    getSchemaMappings,
    getStoredMapping,
    saveMapping,
    SchemaMapping,
    TypeMapping
} from '../support/openGraphApi';
import {
    deleteEverywhere,
    getLivePage,
    jsonLdOf,
    jsonLdScripts,
    LivePage,
    livePathsOf,
    metaContents,
    metaTags,
    publish,
    twitterCards
} from '../support/livePage';
import {
    choose,
    CONTENT_EDITOR,
    LOAD_TIMEOUT,
    save,
    SCHEMA_ORG,
    SCHEMA_TYPE_FIELD,
    schemaSourceField,
    switchFieldSet
} from '../support/mappingScreen';
import {SERVER_NAME, SITE_ADMIN, SITE_KEY, SITE_PATH} from '../support/structuredDataMapper';

const PAGE_PATH = `${SITE_PATH}/home/sdm-schema-page`;
const NEWS_PATH = `${SITE_PATH}/contents/sdm-schema-news`;
const ESCAPE_PATH = `${SITE_PATH}/contents/sdm-schema-escape`;
const IMAGE_NAME = 'sdm-schema-image.png';
const IMAGE_PATH = `${SITE_PATH}/files/${IMAGE_NAME}`;
const ESCAPE_TITLE = 'Tom "Jerry" </script><script>alert(3)</script>';
const NODE_PATHS = [PAGE_PATH, NEWS_PATH, ESCAPE_PATH, IMAGE_PATH];

const NEWS_TYPE = 'jnt:news';
const PAGE_TYPE = 'jnt:page';
const NEWS_OG = {
    nodeType: NEWS_TYPE,
    ogType: 'article',
    properties: [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}]
};
const ARTICLE_MAPPING: TypeMapping = {
    ...NEWS_OG,
    schemaType: 'Article',
    schemaProperties: [
        {schemaProperty: 'headline', sourceProperty: 'jcr:title'},
        {schemaProperty: 'description', sourceProperty: 'desc'},
        {schemaProperty: 'image', sourceProperty: 'image'},
        {schemaProperty: 'datePublished', sourceProperty: 'date'}
    ]
};
// No source for headline, so headline takes the title of the news item.
const NEWS_ARTICLE_MAPPING: TypeMapping = {
    ...NEWS_OG,
    schemaType: 'NewsArticle',
    schemaProperties: [{schemaProperty: 'author.name', sourceProperty: 'j:tagList'}]
};

// The one JSON-LD block of a page, which must be in its head.
const singleEntity = (page: LivePage): Record<string, unknown> => {
    const scripts = jsonLdScripts(page);
    expect(scripts, 'JSON-LD blocks').to.have.length(1);
    expect(scripts[0].parentElement.tagName, 'the parent of the JSON-LD block').to.equal('HEAD');
    return jsonLdOf(scripts[0]);
};

const expectOneSuffix = (path: string, suffixes: string[]) => {
    expect(
        suffixes.some(suffix => path.endsWith(suffix)),
        `${path} ends with one of ${suffixes.join(', ')}`
    ).to.equal(true);
};

const newsMapping = (): Cypress.Chainable<SchemaMapping> =>
    getSchemaMappings().then(result => {
        expectNoError(result);
        return result.data.jcr.nodeByPath.openGraphMappings.find(mapping => mapping.nodeType === NEWS_TYPE);
    });

describe('schema.org JSON-LD in the head of live pages', () => {
    before(() => {
        [NEWS_TYPE, PAGE_TYPE].forEach(nodeType => deleteMapping(nodeType));
        NODE_PATHS.forEach(deleteEverywhere);
        addNode({
            parentPathOrId: `${SITE_PATH}/home`,
            name: 'sdm-schema-page',
            primaryNodeType: PAGE_TYPE,
            properties: [
                {name: 'jcr:title', value: 'Schema page', language: 'en'},
                {name: 'j:templateName', value: 'home'}
            ]
        });
        uploadFile('images/sdm-filter-image.png', `${SITE_PATH}/files`, IMAGE_NAME, 'image/png').then(result => {
            addNode({
                parentPathOrId: `${SITE_PATH}/contents`,
                name: 'sdm-schema-news',
                primaryNodeType: NEWS_TYPE,
                mixins: ['jmix:tagged'],
                properties: [
                    {name: 'jcr:title', value: 'Schema news', language: 'en'},
                    {name: 'desc', value: '<p>First <strong>paragraph</strong> &amp; more</p>', language: 'en'},
                    {name: 'date', value: '2026-10-19T09:30:00.000Z'},
                    {name: 'image', value: result.data.jcr.addNode.uuid},
                    // Jahia stores a tag in lower case.
                    {name: 'j:tagList', values: ['ada lovelace', 'alan turing']}
                ]
            });
        });
        addNode({
            parentPathOrId: `${SITE_PATH}/contents`,
            name: 'sdm-schema-escape',
            primaryNodeType: NEWS_TYPE,
            properties: [{name: 'jcr:title', value: ESCAPE_TITLE, language: 'en'}]
        });
        publish(SITE_PATH);
    });

    after(() => {
        [NEWS_TYPE, PAGE_TYPE].forEach(nodeType => deleteMapping(nodeType));
        NODE_PATHS.forEach(deleteEverywhere);
    });

    it('writes no JSON-LD block on a page whose type has no mapping', () => {
        getLivePage(PAGE_PATH).then(page => expect(jsonLdScripts(page)).to.be.empty);
    });

    it('writes no JSON-LD block for a mapping without a schema.org type', () => {
        saveMapping({nodeType: PAGE_TYPE, ogType: 'website', properties: []}).then(expectNoError);
        getLivePage(PAGE_PATH).then(page => {
            expect(metaContents(page, 'og:type')).to.deep.equal(['website']);
            expect(jsonLdScripts(page)).to.be.empty;
        });
    });

    it('writes one Article block with the values of the mapped properties', () => {
        saveMapping(ARTICLE_MAPPING).then(expectNoError);
        getLivePage(NEWS_PATH).then(page => {
            const entity = singleEntity(page);
            expect(Object.keys(entity)).to.deep.equal([
                '@context',
                '@type',
                'url',
                'headline',
                'description',
                'image',
                'datePublished'
            ]);
            expect(entity).to.include({
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: 'Schema news',
                description: 'First paragraph & more',
                datePublished: '2026-10-19T09:30:00Z'
            });
            const image = new URL(entity.image as string);
            expect(image.hostname).to.equal(SERVER_NAME);
            expect(image.pathname.endsWith(`/files/live${IMAGE_PATH}`), image.pathname).to.equal(true);
            const url = new URL(entity.url as string);
            expect(url.hostname).to.equal(SERVER_NAME);
            livePathsOf(NEWS_PATH).then(livePaths => expectOneSuffix(url.pathname, livePaths));
        });
    });

    it('takes the title of the content for headline, and writes one Person for each value of author.name', () => {
        saveMapping(NEWS_ARTICLE_MAPPING).then(expectNoError);
        getLivePage(NEWS_PATH).then(page => {
            const entity = singleEntity(page);
            expect(entity['@type']).to.equal('NewsArticle');
            expect(entity.headline).to.equal('Schema news');
            expect(entity.author).to.deep.equal([
                {'@type': 'Person', name: 'ada lovelace'},
                {'@type': 'Person', name: 'alan turing'}
            ]);
        });
    });

    it('keeps a title that holds </script> inside the JSON-LD block', () => {
        getLivePage(ESCAPE_PATH).then(page => {
            expect(singleEntity(page).headline).to.equal(ESCAPE_TITLE);
            expect(page.html).to.contain('\\u003c/script\\u003e\\u003cscript\\u003ealert(3)');
            const injected = Array.from(page.doc.querySelectorAll('script')).filter(
                script => script.type !== 'application/ld+json' && /alert\(3\)/.test(script.textContent)
            );
            expect(injected).to.be.empty;
        });
    });

    it('returns the schema.org type and the schema.org properties of a mapping', () => {
        newsMapping().then(({nodeType, schemaType, schemaProperties}) =>
            expect({nodeType, schemaType, schemaProperties}).to.deep.equal({
                nodeType: NEWS_TYPE,
                schemaType: 'NewsArticle',
                schemaProperties: [{schemaProperty: 'author.name', sourceProperty: 'j:tagList'}]
            })
        );
    });

    it('refuses a schema.org type or a schema.org property that does not fit', () => {
        saveMapping({...NEWS_OG, schemaType: 'Thing'}).then(expectError("Unknown schema.org type 'Thing'"));
        saveMapping({
            ...NEWS_OG,
            schemaType: 'Article',
            schemaProperties: [{schemaProperty: 'startDate', sourceProperty: 'date'}]
        }).then(expectError("Unknown schema.org property 'startDate' for the schema.org type 'Article'"));
        saveMapping({...NEWS_OG, schemaProperties: [{schemaProperty: 'headline', sourceProperty: 'jcr:title'}]}).then(
            expectError('A schema.org property needs a schema.org type')
        );
        saveMapping({
            ...NEWS_OG,
            schemaType: 'Product',
            schemaProperties: [{schemaProperty: 'offers.price', sourceProperty: 'desc'}]
        }).then(expectError("cannot fill 'offers.price', which takes a NUMBER value"));
        newsMapping().then(mapping => expect(mapping.schemaType, 'the mapping is unchanged').to.equal('NewsArticle'));
    });

    it('writes the JSON-LD block, and no Open Graph tag and no twitter:card, for a mapping without og:type', () => {
        saveMapping({...ARTICLE_MAPPING, ogType: null, properties: []}).then(expectNoError);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaTags(page, 'og:'), 'the Open Graph tags').to.be.empty;
            expect(twitterCards(page), 'the twitter:card tags').to.be.empty;
            expect(singleEntity(page)['@type']).to.equal('Article');
        });
    });

    it('drops the JSON-LD block and the schema.org mixin when the mapping loses its schema.org type', () => {
        saveMapping(NEWS_OG).then(expectNoError);
        getStoredMapping(NEWS_TYPE).then(stored => {
            expect(stored.mixins.filter(mixin => mixin.startsWith('sdmmix:schema'))).to.be.empty;
            expect(stored.properties.filter(name => name.startsWith('sdm:schema'))).to.be.empty;
        });
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:type')).to.deep.equal(['article']);
            expect(jsonLdScripts(page)).to.be.empty;
        });
    });

    // The Content Editor of jContent opens the mapping, as the "Edit" button of the mapping screen does.
    it('sets the schema.org type and its sources in the Content Editor', () => {
        newsMapping().then(mapping => {
            cy.login(SITE_ADMIN.username, SITE_ADMIN.password);
            // JContent redirects /pages to /pages/home, and the redirect closes a Content Editor that opened before it.
            cy.visit(`/jahia/jcontent/${SITE_KEY}/en/pages/home`);
            cy.get('[role="treeitem"]', {timeout: LOAD_TIMEOUT}).should('be.visible');
            cy.window().its('CE_API').invoke('edit', {uuid: mapping.uuid, isFullscreen: false});
        });
        cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('be.visible');
        switchFieldSet(SCHEMA_ORG, true);
        choose(SCHEMA_TYPE_FIELD, 'BlogPosting');
        choose(schemaSourceField('headline'), 'jcr:title');
        choose(schemaSourceField('datePublished'), 'date');
        // The form renders again once the last choice is applied, and a click before that misses the button.
        cy.get(schemaSourceField('datePublished')).should('contain.text', '(date)');
        save();
        cy.logout();
        newsMapping().then(mapping =>
            expect(mapping.schemaProperties).to.deep.equal([
                {schemaProperty: 'headline', sourceProperty: 'jcr:title'},
                {schemaProperty: 'datePublished', sourceProperty: 'date'}
            ])
        );
        getLivePage(NEWS_PATH).then(page => {
            const entity = singleEntity(page);
            expect(entity['@type']).to.equal('BlogPosting');
            expect(entity.datePublished).to.equal('2026-10-19T09:30:00Z');
        });
    });
});

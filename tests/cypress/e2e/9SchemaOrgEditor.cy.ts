import {addNode, uploadFile} from '@jahia/cypress';
import {
    deleteMapping,
    expectNoError,
    getCustomSchemaValues,
    getJsonLd,
    saveMapping,
    setCustomSchemaValues,
    TypeMapping
} from '../support/openGraphApi';
import {deleteEverywhere, getLivePage, jsonLdOf, jsonLdScripts, LivePage, publish} from '../support/livePage';
import {
    customFieldSet,
    fieldSetsShouldNotExist,
    MODULE_FIELD_SETS,
    expectModuleFieldSets,
    OPEN_GRAPH_OFF,
    openContentEditor,
    openSchemaPreview,
    save,
    SCHEMA_PREVIEW,
    SCHEMA_SAVE_HINT
} from '../support/editorField';
import {CUSTOM_SCHEMA_MIXIN, CUSTOM_TAGS_MIXIN, customSchemaValues} from '../support/editorTags';
import {menuItem, OPEN_MENU} from '../support/mappingScreen';
import {EDITOR, SERVER_NAME, SITE_KEY, SITE_PATH} from '../support/structuredDataMapper';

const NEWS_PATH = `${SITE_PATH}/contents/sdm-schema-editor-news`;
const IMAGE_NAME = 'sdm-schema-editor-image.png';
const IMAGE_PATH = `${SITE_PATH}/files/${IMAGE_NAME}`;
const OTHER_IMAGE_NAME = 'sdm-schema-editor-other.png';
const OTHER_IMAGE_PATH = `${SITE_PATH}/files/${OTHER_IMAGE_NAME}`;
const NODE_PATHS = [NEWS_PATH, IMAGE_PATH, OTHER_IMAGE_PATH];
const TITLE = 'Schema editor news';
const TITLE_FIELD = 'jnt:news_jcr:title';

const OPEN_GRAPH = {
    nodeType: 'jnt:news',
    ogType: 'article',
    properties: [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}]
};
const ARTICLE_MAPPING: TypeMapping = {
    ...OPEN_GRAPH,
    schemaType: 'Article',
    schemaProperties: [
        {schemaProperty: 'headline', sourceProperty: 'jcr:title'},
        {schemaProperty: 'description', sourceProperty: 'desc'},
        {schemaProperty: 'image', sourceProperty: 'image'},
        {schemaProperty: 'datePublished', sourceProperty: 'date'}
    ]
};
const PRODUCT_MAPPING: TypeMapping = {
    ...OPEN_GRAPH,
    schemaType: 'Product',
    schemaProperties: [{schemaProperty: 'name', sourceProperty: 'jcr:title'}]
};

// The properties of Article, in the order of the vocabulary. The module writes url itself.
const ARTICLE_PROPERTIES = ['headline', 'description', 'image', 'datePublished', 'dateModified', 'author.name'];

const value = (property: string, content: string) => JSON.stringify({property, content});
const fileValue = (property: string, node: string) => JSON.stringify({property, node});

// The one JSON-LD block of the live page.
const liveEntity = (page: LivePage): Record<string, unknown> => {
    const scripts = jsonLdScripts(page);
    expect(scripts, 'JSON-LD blocks').to.have.length(1);
    return jsonLdOf(scripts[0]);
};

const expectLiveImage = (url: unknown, path: string) => {
    const parsed = new URL(url as string);
    expect(parsed.hostname, `host of ${url}`).to.equal(SERVER_NAME);
    expect(parsed.pathname.endsWith(`/files/live${path}`), `${parsed.pathname} is the live file`).to.equal(true);
};

describe('schema.org values of a content in the Content Editor', () => {
    let uuid: string;
    let otherImageUuid: string;

    before(() => {
        deleteMapping('jnt:news');
        NODE_PATHS.forEach(deleteEverywhere);
        uploadFile('images/sdm-filter-image.png', `${SITE_PATH}/files`, OTHER_IMAGE_NAME, 'image/png').then(result => {
            otherImageUuid = result.data.jcr.addNode.uuid;
        });
        uploadFile('images/sdm-filter-image.png', `${SITE_PATH}/files`, IMAGE_NAME, 'image/png').then(result =>
            addNode({
                parentPathOrId: `${SITE_PATH}/contents`,
                name: 'sdm-schema-editor-news',
                primaryNodeType: 'jnt:news',
                properties: [
                    {name: 'jcr:title', value: TITLE, language: 'en'},
                    {name: 'desc', value: '<p>Mapped description</p>', language: 'en'},
                    {name: 'date', value: '2026-10-19T09:30:00.000Z'},
                    {name: 'image', value: result.data.jcr.addNode.uuid}
                ]
            }).then(news => {
                uuid = news.data.jcr.addNode.uuid;
            })
        );
        saveMapping(ARTICLE_MAPPING).then(expectNoError);
    });

    after(() => {
        deleteMapping('jnt:news');
        NODE_PATHS.forEach(deleteEverywhere);
    });

    beforeEach(() => {
        cy.login();
    });

    afterEach(() => {
        cy.logout();
    });

    it('shows the four fieldsets in order, and the JSON-LD of the saved news item with the live URL of each node', () => {
        openContentEditor(SITE_KEY, uuid, TITLE_FIELD);
        openSchemaPreview().should('deep.equal', {
            '@context': 'https://schema.org',
            '@type': 'Article',
            url: `Live URL of ${NEWS_PATH}`,
            headline: TITLE,
            description: 'Mapped description',
            image: `Live URL of ${IMAGE_PATH}`,
            datePublished: '2026-10-19T09:30:00Z'
        });
        expectModuleFieldSets(MODULE_FIELD_SETS);
        cy.get(SCHEMA_SAVE_HINT).should('not.exist');
    });

    it('says that Open Graph is off, and hides its custom values, for a mapping with schema.org only', () => {
        saveMapping({...ARTICLE_MAPPING, ogType: null, properties: []}).then(expectNoError);
        openContentEditor(SITE_KEY, uuid, TITLE_FIELD);
        openSchemaPreview().its('@type').should('equal', 'Article');
        cy.get(OPEN_GRAPH_OFF).should(
            'have.text',
            'Open Graph is off in the mapping of this content type, so the live page has no Open Graph tag.'
        );
        cy.get(customFieldSet(CUSTOM_TAGS_MIXIN)).should('not.exist');
        cy.get(customFieldSet(CUSTOM_SCHEMA_MIXIN)).should('exist');
        saveMapping(ARTICLE_MAPPING).then(expectNoError);
    });

    it('writes the custom values in place of the mapped values, and adds a property that the mapping does not fill', () => {
        setCustomSchemaValues(NEWS_PATH, [
            value('author.name', 'Ada Lovelace'),
            value('headline', 'Custom headline'),
            'not JSON',
            // Product has sku, and Article has not.
            value('sku', 'SKU-1'),
            value('description', '   '),
            value('author.name', ' Alan Turing '),
            value('headline', 'Second headline'),
            fileValue('image', otherImageUuid)
        ]).then(expectNoError);
        const expected = {
            headline: 'Custom headline',
            description: 'Mapped description',
            datePublished: '2026-10-19T09:30:00Z',
            author: [
                {'@type': 'Person', name: 'Ada Lovelace'},
                {'@type': 'Person', name: 'Alan Turing'}
            ]
        };
        getJsonLd(NEWS_PATH).then(entity => {
            expect(entity.headline).to.equal(expected.headline);
            expect(entity.image).to.deep.equal({nodePath: OTHER_IMAGE_PATH});
            expect(entity).not.to.have.property('sku');
        });
        publish(NEWS_PATH);
        publish(OTHER_IMAGE_PATH);
        getLivePage(NEWS_PATH).then(page => {
            const entity = liveEntity(page);
            expect(Object.keys(entity)).to.deep.equal([
                '@context',
                '@type',
                'url',
                'headline',
                'description',
                'image',
                'datePublished',
                'author'
            ]);
            expect(entity).to.deep.include(expected);
            expectLiveImage(entity.image, OTHER_IMAGE_PATH);
        });
        cy.login();
        openContentEditor(SITE_KEY, uuid, TITLE_FIELD);
        openSchemaPreview().should('deep.include', {...expected, image: `Live URL of ${OTHER_IMAGE_PATH}`});
    });

    it('writes a decimal number for offers.price, and ignores a value that is not a number', () => {
        saveMapping(PRODUCT_MAPPING).then(expectNoError);
        setCustomSchemaValues(NEWS_PATH, [
            value('offers.price', '19,90 EUR'),
            value('offers.price', '19.90'),
            value('offers.priceCurrency', 'EUR')
        ]).then(expectNoError);
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(page.html).to.contain('"price":19.90');
            expect(liveEntity(page).offers).to.deep.equal({'@type': 'Offer', price: 19.9, priceCurrency: 'EUR'});
        });
        saveMapping(ARTICLE_MAPPING).then(expectNoError);
    });

    it('offers the properties of the schema.org type, and saves a value that the editor types', () => {
        setCustomSchemaValues(NEWS_PATH, []).then(expectNoError);
        openContentEditor(SITE_KEY, uuid, TITLE_FIELD);
        openSchemaPreview();
        cy.get(customSchemaValues.field).scrollIntoView();
        customSchemaValues.addValue();
        customSchemaValues.openPropertyMenu(0);
        cy.get(`${OPEN_MENU} .moonstone-menuItem`).then($items => {
            expect(Array.from($items).map(item => item.dataset.value)).to.deep.equal(ARTICLE_PROPERTIES);
        });
        cy.get(menuItem('author.name')).click();
        cy.get(customSchemaValues.content(0)).type('Grace Hopper');
        cy.get(SCHEMA_SAVE_HINT).should('have.text', 'Save to see the updated schema.org values');
        save();
        cy.get(SCHEMA_SAVE_HINT).should('not.exist');
        cy.get(SCHEMA_PREVIEW).should('contain.text', '"name": "Grace Hopper"');
        getCustomSchemaValues(NEWS_PATH).then(result => {
            expect(result.data.jcr.nodeByPath.property.values).to.deep.equal([value('author.name', 'Grace Hopper')]);
        });
        getJsonLd(NEWS_PATH, EDITOR).its('author').should('deep.equal', {'@type': 'Person', name: 'Grace Hopper'});
    });

    it('gives no JSON-LD and hides the four fieldsets when no mapping applies, even with custom values', () => {
        deleteMapping('jnt:news').then(expectNoError);
        getJsonLd(NEWS_PATH).should('equal', null);
        openContentEditor(SITE_KEY, uuid, TITLE_FIELD);
        fieldSetsShouldNotExist();
        saveMapping(ARTICLE_MAPPING).then(expectNoError);
    });
});

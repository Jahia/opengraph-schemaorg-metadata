import {addNode, getNodeByPath, uploadFile} from '@jahia/cypress';
import {
    addDate,
    addImage,
    addTag,
    addValue,
    CUSTOM_TAGS_MIXIN,
    customTagsSwitch,
    openEditForm,
    openPropertyMenu,
    switchCustomTags,
    tagContent,
    tagDate,
    tagImage,
    tagProperty
} from '../support/editorTags';
import {previewValue, save} from '../support/editorField';
import {deleteEverywhere, getLivePage, LivePage, metaContents, publish} from '../support/livePage';
import {cancelAndDiscard, close, menuItem, OPEN_MENU} from '../support/mappingScreen';
import {
    deleteMapping,
    expectNoError,
    getCustomTags,
    getTags,
    saveMapping,
    setCustomTags,
    TypeMapping
} from '../support/openGraphApi';
import {EDITOR, SERVER_NAME, SITE_PATH} from '../support/veryOpenGraph';

const NEWS_PATH = `${SITE_PATH}/contents/vog-tags-news`;
const IMAGE_NAME = 'vog-tags-image.png';
const IMAGE_PATH = `${SITE_PATH}/files/${IMAGE_NAME}`;

const NEWS_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'article',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:description', sourceProperty: 'desc'},
        {ogProperty: 'article:published_time', sourceProperty: 'date'}
    ]
};

// The Open Graph properties of the og:type article, in the order of the vocabulary. The module sets og:type and og:url.
const ARTICLE_PROPERTIES = [
    'og:title',
    'og:description',
    'og:image',
    'og:image:alt',
    'og:audio',
    'og:video',
    'article:published_time',
    'article:modified_time',
    'article:expiration_time',
    'article:author',
    'article:section',
    'article:tag'
];

const EDITOR_TITLE = 'Summer in Mykonos';
// 10/10/2026 reads the same in the formats MM/DD/YYYY and DD/MM/YYYY of the date picker.
const EDITOR_DATE_TEXT = '10/10/2026 09:30';
// The date picker reads the local time of the browser, and the tag holds it in UTC, to the second.
const EDITOR_DATE = new Date(2026, 9, 10, 9, 30).toISOString().replace(/\.\d{3}Z$/, 'Z');

const tag = (property: string, content: string) => JSON.stringify({property, content});
const fileTag = (property: string, node: string) => JSON.stringify({property, node});

// Checks that a URL is the absolute live URL of the image, on the server name of the site.
const expectImageUrl = (url: string) => {
    const parsed = new URL(url);
    expect(parsed.hostname, `host of ${url}`).to.equal(SERVER_NAME);
    expect(parsed.pathname.endsWith(`/files/live${IMAGE_PATH}`), `${parsed.pathname} is the live image`).to.equal(true);
};

// The width and the height of the image come from the image node, as for a mapped image.
const expectImageSize = (page: LivePage) =>
    getNodeByPath(IMAGE_PATH, ['j:width', 'j:height'], '', [], 'LIVE').then(result => {
        const properties = result.data.jcr.nodeByPath.properties as {name: string; value: string}[];
        ['width', 'height'].forEach(dimension => {
            const values = properties
                .filter(property => property.name === `j:${dimension}`)
                .map(property => property.value);
            expect(metaContents(page, `og:image:${dimension}`), dimension).to.deep.equal(values);
        });
    });

describe('Open Graph tags that an editor sets on one content', () => {
    let uuid: string;
    let imageUuid: string;

    before(() => {
        deleteMapping('jnt:news');
        [NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
        uploadFile(`images/vog-filter-image.png`, `${SITE_PATH}/files`, IMAGE_NAME, 'image/png').then(result => {
            imageUuid = result.data.jcr.addNode.uuid;
        });
        addNode({
            parentPathOrId: `${SITE_PATH}/contents`,
            name: 'vog-tags-news',
            primaryNodeType: 'jnt:news',
            properties: [
                {name: 'jcr:title', value: 'Tags news', language: 'en'},
                {name: 'desc', value: '<p>Mapped description</p>', language: 'en'},
                {name: 'date', value: '2026-10-19T09:30:00.000Z'}
            ]
        }).then(result => {
            uuid = result.data.jcr.addNode.uuid;
        });
        saveMapping(NEWS_MAPPING).then(expectNoError);
        [NEWS_PATH, IMAGE_PATH].forEach(publish);
    });

    after(() => {
        cy.logout();
        deleteMapping('jnt:news');
        [NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
    });

    it('offers the properties of the og:type of the mapping, without og:type and og:url', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        switchCustomTags(true);
        addValue();
        openPropertyMenu(0);
        cy.get(`${OPEN_MENU} .moonstone-menuItem`).should($items => {
            expect(Array.from($items).map(item => item.getAttribute('data-value'))).to.deep.equal(ARTICLE_PROPERTIES);
        });
        cy.get(menuItem('og:title')).click();
        cancelAndDiscard();
    });

    it('adds the mixin on save, and writes the tags of the editor in place of the mapped values', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        switchCustomTags(true);
        addTag(0, 'og:title', EDITOR_TITLE);
        addImage(1, 'og:image', IMAGE_NAME);
        addDate(2, 'article:published_time', EDITOR_DATE_TEXT);
        save();

        getCustomTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const node = result.data.jcr.nodeByPath;
            expect(node.mixinTypes.map(mixin => mixin.name)).to.include(CUSTOM_TAGS_MIXIN);
            expect(node.property.values).to.deep.equal([
                tag('og:title', EDITOR_TITLE),
                fileTag('og:image', imageUuid),
                tag('article:published_time', EDITOR_DATE)
            ]);
        });
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:title')).to.deep.equal([EDITOR_TITLE]);
            expect(metaContents(page, 'og:image')).to.have.length(1);
            expectImageUrl(metaContents(page, 'og:image')[0]);
            expect(metaContents(page, 'og:image:type')).to.deep.equal(['image/png']);
            expectImageSize(page);
            expect(metaContents(page, 'og:type')).to.deep.equal(['article']);
            expect(metaContents(page, 'og:description')).to.deep.equal(['Mapped description']);
            expect(metaContents(page, 'article:published_time')).to.deep.equal([EDITOR_DATE]);
        });
    });

    it('shows the saved tags of the editor in the field and in vog:ogPreview when the form opens again', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        previewValue('og:title').should('have.text', EDITOR_TITLE);
        previewValue('og:image').should('have.text', `Live URL of ${IMAGE_PATH}`);
        previewValue('og:image:type').should('have.text', 'image/png');
        previewValue('article:published_time').should('have.text', EDITOR_DATE);
        previewValue('og:description').should('have.text', 'Mapped description');
        customTagsSwitch().should('be.checked');
        cy.get(tagProperty(0)).should('contain', 'og:title');
        cy.get(tagContent(0)).should('have.value', EDITOR_TITLE);
        cy.get(tagProperty(1)).should('contain', 'og:image');
        cy.get(tagImage(1)).should('have.text', IMAGE_NAME);
        cy.get(tagProperty(2)).should('contain', 'article:published_time');
        cy.get(tagDate(2)).should('have.value', EDITOR_DATE_TEXT);
        close();
    });

    it('ignores a value that is not valid, and keeps the first value of a property that takes one value', () => {
        setCustomTags(NEWS_PATH, [
            'not json',
            tag('og:type', 'video.movie'),
            tag('og:url', 'https://www.example.com/other'),
            tag('og:title', 'First title'),
            tag('og:title', 'Second title'),
            tag('og:description', '   '),
            tag('article:tag', 'Greece'),
            tag('article:tag', 'Islands'),
            fileTag('og:image', 'not-an-identifier'),
            fileTag('og:image', uuid)
        ]).then(expectNoError);

        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            const contents = (property: string) =>
                tags.filter(ogTag => ogTag.property === property).map(ogTag => ogTag.content ?? ogTag.nodePath);
            expect(contents('og:title')).to.deep.equal(['First title']);
            expect(contents('og:type')).to.deep.equal(['article']);
            expect(contents('og:url')).to.deep.equal([NEWS_PATH]);
            expect(contents('og:description')).to.deep.equal(['Mapped description']);
            expect(contents('article:tag')).to.deep.equal(['Greece', 'Islands']);
            expect(contents('og:image'), 'an identifier that names no file').to.be.empty;
        });
    });

    it('removes the mixin and the tags when the editor switches the fieldset off', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        switchCustomTags(false);
        save();

        getCustomTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const node = result.data.jcr.nodeByPath;
            expect(node.mixinTypes.map(mixin => mixin.name)).not.to.include(CUSTOM_TAGS_MIXIN);
            expect(node.property).to.be.null;
        });
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:title')).to.deep.equal(['Tags news']);
            expect(metaContents(page, 'article:tag')).to.be.empty;
        });
    });
});

import {addNode} from '@jahia/cypress';
import {
    addTag,
    addValue,
    CUSTOM_TAGS_MIXIN,
    customTagsSwitch,
    openEditForm,
    openPropertyMenu,
    switchCustomTags,
    tagContent,
    tagProperty
} from '../support/editorTags';
import {previewValue, save} from '../support/editorField';
import {deleteEverywhere, getLivePage, metaContents, publish} from '../support/livePage';
import {cancelAndDiscard, menuItem, OPEN_MENU} from '../support/mappingScreen';
import {
    deleteMapping,
    expectNoError,
    getCustomTags,
    getTags,
    saveMapping,
    setCustomTags,
    TypeMapping
} from '../support/openGraphApi';
import {EDITOR, SITE_PATH} from '../support/veryOpenGraph';

const NEWS_PATH = `${SITE_PATH}/contents/vog-tags-news`;

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
const EDITOR_IMAGE = 'https://www.example.com/mykonos.png';

const tag = (property: string, content: string) => JSON.stringify({property, content});

describe('Open Graph tags that an editor sets on one content', () => {
    let uuid: string;

    before(() => {
        deleteMapping('jnt:news');
        deleteEverywhere(NEWS_PATH);
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
        publish(NEWS_PATH);
    });

    after(() => {
        cy.logout();
        deleteMapping('jnt:news');
        deleteEverywhere(NEWS_PATH);
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
        addTag(1, 'og:image', EDITOR_IMAGE);
        save();

        getCustomTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const node = result.data.jcr.nodeByPath;
            expect(node.mixinTypes.map(mixin => mixin.name)).to.include(CUSTOM_TAGS_MIXIN);
            expect(node.property.values).to.deep.equal([tag('og:title', EDITOR_TITLE), tag('og:image', EDITOR_IMAGE)]);
        });
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:title')).to.deep.equal([EDITOR_TITLE]);
            expect(metaContents(page, 'og:image')).to.deep.equal([EDITOR_IMAGE]);
            expect(metaContents(page, 'og:image:type'), 'details of a typed URL').to.be.empty;
            expect(metaContents(page, 'og:type')).to.deep.equal(['article']);
            expect(metaContents(page, 'og:description')).to.deep.equal(['Mapped description']);
            expect(metaContents(page, 'article:published_time')).to.deep.equal(['2026-10-19T09:30:00Z']);
        });
    });

    it('shows the saved tags of the editor in the field and in vog:ogPreview when the form opens again', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        previewValue('og:title').should('have.text', EDITOR_TITLE);
        previewValue('og:image').should('have.text', EDITOR_IMAGE);
        previewValue('og:description').should('have.text', 'Mapped description');
        customTagsSwitch().should('be.checked');
        cy.get(tagProperty(0)).should('contain', 'og:title');
        cy.get(tagContent(0)).should('have.value', EDITOR_TITLE);
        cy.get(tagProperty(1)).should('contain', 'og:image');
        cy.get(tagContent(1)).should('have.value', EDITOR_IMAGE);
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
            tag('article:tag', 'Islands')
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

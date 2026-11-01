import {
    deleteMapping,
    expectNoError,
    getMappings,
    getStoredMapping,
    PropertyMapping,
    StoredMapping,
    TypeMapping
} from '../support/openGraphApi';
import {
    ADD_MAPPING,
    cancelAndDiscard,
    choose,
    chooseSources,
    close,
    CONFIRM_DELETE,
    CONTENT_EDITOR,
    create,
    DELETE,
    EDIT,
    EMPTY,
    fieldNamesIn,
    fieldSetSwitch,
    LOAD_TIMEOUT,
    mappingRow,
    menuItem,
    NODE_TYPE_FIELD,
    OG_TYPE_FIELD,
    OPEN_GRAPH,
    openDropdown,
    openScreen,
    propertiesText,
    save,
    SCHEMA_ORG,
    SCHEMA_TYPE_FIELD,
    shouldOfferOnly,
    sourceField,
    sourceFieldIn,
    switchFieldSet,
    TEMPLATE_FIELD
} from '../support/mappingScreen';
import {EDITOR_IN_CHIEF, SITE_ADMIN} from '../support/structuredDataMapper';

const NEWS_TYPE = 'jnt:news';
const PAGE_TYPE = 'jnt:page';
const PAGE_MIXIN = 'jmix:canBeUseAsTemplateModel';
const TEMPLATE = 'home';
const ALL_TEMPLATES = '*';
const TITLE: PropertyMapping = {ogProperty: 'og:title', sourceProperty: 'jcr:title'};
const DESCRIPTION: PropertyMapping = {ogProperty: 'og:description', sourceProperty: 'desc'};
const PUBLISHED: PropertyMapping = {ogProperty: 'article:published_time', sourceProperty: 'date'};
const VIDEO_TAG: PropertyMapping = {ogProperty: 'video:tag', sourceProperty: 'j:tagList'};
// The Open Graph fields of an article mapping, in the order of the form: the properties of every og:type, the
// og:type, then the properties of article, which the Content Editor moves after the og:type.
const ARTICLE_FIELD_ORDER = [
    `${OPEN_GRAPH}_sdm:og_title`,
    `${OPEN_GRAPH}_sdm:og_video_alt`,
    `${OPEN_GRAPH}_sdm:ogType`,
    'sdmmix:article_sdm:article_published_time'
];

// The properties of a mapping node that hold the source of a video property, such as sdm:video_tag.
const videoProperties = (stored: StoredMapping) => stored.properties.filter(name => name.startsWith('sdm:video_'));

// The properties of a mapping node that hold the og:type or the source of an Open Graph property of music.song.
const songProperties = (stored: StoredMapping) =>
    stored.properties.filter(name => name.startsWith('sdm:og') || name.startsWith('sdm:music_'));

const expectArticleFieldOrder = (names: string[]) => {
    const positions = ARTICLE_FIELD_ORDER.map(name => names.indexOf(name));
    expect(positions, 'every field is in the Open Graph fieldset').not.to.include(-1);
    expect(positions, 'the order of the fields').to.deep.equal([...positions].sort((a, b) => a - b));
};

describe('Open Graph mapping screen', () => {
    before(() => {
        deleteMapping(NEWS_TYPE);
        deleteMapping(PAGE_TYPE, {templateName: TEMPLATE});
    });

    after(() => {
        deleteMapping(NEWS_TYPE);
        deleteMapping(PAGE_TYPE, {templateName: TEMPLATE});
    });

    afterEach(() => {
        cy.logout();
    });

    describe('as the site administrator', () => {
        beforeEach(() => {
            openScreen(SITE_ADMIN);
        });

        it('shows "No mapping yet." when the site has no mapping', () => {
            cy.get(EMPTY).should('contain.text', 'No mapping yet.');
        });

        it('shows both switches off, then the og:type between the properties of every og:type and its own', () => {
            cy.get(ADD_MAPPING).click();
            choose(NODE_TYPE_FIELD, NEWS_TYPE);
            fieldSetSwitch(OPEN_GRAPH).should('not.be.checked');
            fieldSetSwitch(SCHEMA_ORG).should('not.be.checked');
            cy.get(OG_TYPE_FIELD).should('not.exist');
            cy.get(SCHEMA_TYPE_FIELD).should('not.exist');
            switchFieldSet(OPEN_GRAPH, true);
            cy.get(OG_TYPE_FIELD).should('contain.text', 'website');
            choose(OG_TYPE_FIELD, 'article');
            cy.get(sourceFieldIn(OPEN_GRAPH, TITLE.ogProperty)).should('exist');
            cy.get(sourceFieldIn(OPEN_GRAPH, PUBLISHED.ogProperty)).should('exist');
            fieldNamesIn(OPEN_GRAPH).then(expectArticleFieldOrder);

            openDropdown(sourceField(TITLE.ogProperty));
            cy.get(menuItem('jcr:title')).should('exist');
            ['j:tagList', 'j:defaultCategory', 'image', 'date'].forEach(name =>
                cy.get(menuItem(name)).should('not.exist')
            );
            cy.get(menuItem('jcr:title')).click();

            openDropdown(sourceField('article:tag'));
            cy.get(menuItem('j:tagList')).should('exist');
            cy.get(menuItem('j:defaultCategory')).should('not.exist');
            cy.get(menuItem('j:tagList')).click();
            cancelAndDiscard();
        });

        it('creates the mapping of jnt:news to article in the Content Editor', () => {
            cy.get(ADD_MAPPING).click();
            cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('be.visible');
            choose(NODE_TYPE_FIELD, NEWS_TYPE);
            switchFieldSet(OPEN_GRAPH, true);
            chooseSources([TITLE]);
            cy.get(sourceField(PUBLISHED.ogProperty)).should('not.exist');
            choose(OG_TYPE_FIELD, 'article');
            chooseSources([PUBLISHED]);
            create();
            mappingRow(NEWS_TYPE)
                .should('contain.text', 'article')
                .and('contain.text', propertiesText([TITLE, PUBLISHED]));
        });

        it('edits the mapping to add og:description from desc', () => {
            mappingRow(NEWS_TYPE).find(EDIT).click();
            shouldOfferOnly(NODE_TYPE_FIELD, NEWS_TYPE);
            chooseSources([DESCRIPTION]);
            save();
            mappingRow(NEWS_TYPE).should('contain.text', propertiesText([TITLE, DESCRIPTION, PUBLISHED]));
        });

        it('returns the same mapping from openGraphMappings', () => {
            getMappings({user: SITE_ADMIN}).then(result => {
                expectNoError(result);
                expect(result.data.jcr.nodeByPath.openGraphMappings).to.deep.equal([
                    {nodeType: NEWS_TYPE, ogType: 'article', properties: [TITLE, DESCRIPTION, PUBLISHED]}
                ]);
            });
        });

        it('drops the article properties when the og:type becomes website', () => {
            mappingRow(NEWS_TYPE).find(EDIT).click();
            cy.get(sourceField(PUBLISHED.ogProperty), {timeout: LOAD_TIMEOUT}).should('exist');
            choose(OG_TYPE_FIELD, 'website');
            cy.get(sourceField(PUBLISHED.ogProperty)).should('not.exist');
            save();
            mappingRow(NEWS_TYPE)
                .should('contain.text', 'website')
                .and('contain.text', propertiesText([TITLE, DESCRIPTION]))
                .and('not.contain.text', PUBLISHED.ogProperty);
        });

        it('drops the video properties when the og:type changes from video.movie to music.song', () => {
            mappingRow(NEWS_TYPE).find(EDIT).click();
            cy.get(sourceField(TITLE.ogProperty), {timeout: LOAD_TIMEOUT}).should('exist');
            choose(OG_TYPE_FIELD, 'video.movie');
            chooseSources([VIDEO_TAG]);
            save();
            mappingRow(NEWS_TYPE)
                .should('contain.text', 'video.movie')
                .and('contain.text', propertiesText([TITLE, DESCRIPTION, VIDEO_TAG]));
            getStoredMapping(NEWS_TYPE).then(stored => {
                expect(stored.mixins).to.include('sdmmix:videoMovie');
                expect(stored.properties).to.include('sdm:video_tag');
            });

            mappingRow(NEWS_TYPE).find(EDIT).click();
            cy.get(sourceField(VIDEO_TAG.ogProperty), {timeout: LOAD_TIMEOUT}).should('exist');
            choose(OG_TYPE_FIELD, 'music.song');
            cy.get(sourceField(VIDEO_TAG.ogProperty)).should('not.exist');
            save();
            mappingRow(NEWS_TYPE)
                .should('contain.text', 'music.song')
                .and('contain.text', propertiesText([TITLE, DESCRIPTION]))
                .and('not.contain.text', VIDEO_TAG.ogProperty);
            getStoredMapping(NEWS_TYPE).then(stored => {
                expect(stored.mixins).not.to.include('sdmmix:videoMovie');
                expect(videoProperties(stored)).to.be.empty;
            });
            getMappings({user: SITE_ADMIN}).then(result => {
                expectNoError(result);
                expect(result.data.jcr.nodeByPath.openGraphMappings).to.deep.equal([
                    {nodeType: NEWS_TYPE, ogType: 'music.song', properties: [TITLE, DESCRIPTION]}
                ]);
            });
        });

        it('switches Open Graph off and schema.org on, for a mapping that writes JSON-LD only', () => {
            mappingRow(NEWS_TYPE).find(EDIT).click();
            fieldSetSwitch(OPEN_GRAPH).should('be.checked');
            switchFieldSet(OPEN_GRAPH, false);
            cy.get(OG_TYPE_FIELD).should('not.exist');
            cy.get(sourceField(TITLE.ogProperty)).should('not.exist');
            switchFieldSet(SCHEMA_ORG, true);
            choose(SCHEMA_TYPE_FIELD, 'NewsArticle');
            save();
            mappingRow(NEWS_TYPE).find('[data-sel-role="sdm-og-type"]').should('have.text', 'None');
            mappingRow(NEWS_TYPE).find('[data-sel-role="sdm-schema-type"]').should('have.text', 'NewsArticle');
            getStoredMapping(NEWS_TYPE).then(stored => {
                expect(stored.mixins).to.include('sdmmix:schemaOrg').and.include('sdmmix:schemaNewsArticle');
                expect(stored.mixins).not.to.include(OPEN_GRAPH).and.not.include('sdmmix:musicSong');
                expect(songProperties(stored)).to.be.empty;
            });
            getMappings({user: SITE_ADMIN}).then(result => {
                expectNoError(result);
                expect(result.data.jcr.nodeByPath.openGraphMappings).to.deep.equal([
                    {nodeType: NEWS_TYPE, ogType: null, properties: []}
                ]);
            });

            mappingRow(NEWS_TYPE).find(EDIT).click();
            fieldSetSwitch(OPEN_GRAPH).should('not.be.checked');
            fieldSetSwitch(SCHEMA_ORG).should('be.checked');
            cy.get(OG_TYPE_FIELD).should('not.exist');
            cy.get(sourceField(TITLE.ogProperty)).should('not.exist');
            close();
        });

        it('leaves a mapped content type out of a new mapping', () => {
            cy.get(ADD_MAPPING).click();
            cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('be.visible');
            openDropdown(NODE_TYPE_FIELD);
            cy.get(menuItem('jnt:page')).should('exist');
            cy.get(menuItem(NEWS_TYPE)).should('not.exist');
        });

        it('deletes the mapping with "Delete", then "Confirm deletion"', () => {
            mappingRow(NEWS_TYPE).find(DELETE).click();
            mappingRow(NEWS_TYPE).find(CONFIRM_DELETE).click();
            cy.get(EMPTY, {timeout: LOAD_TIMEOUT}).should('contain.text', 'No mapping yet.');
            mappingRow(NEWS_TYPE).should('not.exist');
        });

        it('offers a mixin that extends jnt:page to a new mapping', () => {
            cy.get(ADD_MAPPING).click();
            cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('be.visible');
            openDropdown(NODE_TYPE_FIELD);
            cy.get(menuItem(PAGE_MIXIN)).should('exist');
            cy.get(menuItem('sdmmix:customTags')).should('not.exist');
        });

        it('creates a template mapping of jnt:page for the template home in the Content Editor', () => {
            cy.get(ADD_MAPPING).click();
            cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('be.visible');
            choose(NODE_TYPE_FIELD, PAGE_TYPE);
            openDropdown(TEMPLATE_FIELD);
            cy.get(menuItem(ALL_TEMPLATES)).should('exist');
            cy.get(menuItem(TEMPLATE)).click();
            switchFieldSet(OPEN_GRAPH, true);
            chooseSources([TITLE]);
            choose(OG_TYPE_FIELD, 'website');
            create();
            mappingRow(PAGE_TYPE, TEMPLATE)
                .should('contain.text', TEMPLATE)
                .and('contain.text', 'website')
                .and('contain.text', propertiesText([TITLE]));
        });

        it('still offers jnt:page for every template, and no longer for the template home', () => {
            cy.get(ADD_MAPPING).click();
            cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('be.visible');
            choose(NODE_TYPE_FIELD, PAGE_TYPE);
            openDropdown(TEMPLATE_FIELD);
            cy.get(menuItem(ALL_TEMPLATES)).should('exist');
            cy.get(menuItem(TEMPLATE)).should('not.exist');
        });

        it('deletes the template mapping', () => {
            mappingRow(PAGE_TYPE, TEMPLATE).find(DELETE).click();
            mappingRow(PAGE_TYPE, TEMPLATE).find(CONFIRM_DELETE).click();
            cy.get(EMPTY, {timeout: LOAD_TIMEOUT}).should('contain.text', 'No mapping yet.');
        });
    });

    describe('as the editor in chief', () => {
        it('creates a mapping with the default og:type website', () => {
            const mapping: TypeMapping = {nodeType: NEWS_TYPE, ogType: 'website', properties: [TITLE]};
            openScreen(EDITOR_IN_CHIEF);
            cy.get(ADD_MAPPING).click();
            choose(NODE_TYPE_FIELD, NEWS_TYPE);
            switchFieldSet(OPEN_GRAPH, true);
            chooseSources([TITLE]);
            create();
            mappingRow(NEWS_TYPE)
                .should('contain.text', 'website')
                .and('contain.text', propertiesText([TITLE]));
            getMappings({user: EDITOR_IN_CHIEF}).then(result => {
                expectNoError(result);
                expect(result.data.jcr.nodeByPath.openGraphMappings).to.deep.equal([mapping]);
            });
        });
    });
});

import {deleteMapping, expectNoError, getMappings, PropertyMapping, TypeMapping} from '../support/openGraphApi';
import {
    ADD_MAPPING,
    cancelAndDiscard,
    choose,
    chooseSources,
    CONFIRM_DELETE,
    CONTENT_EDITOR,
    create,
    DELETE,
    EDIT,
    EMPTY,
    LOAD_TIMEOUT,
    mappingRow,
    menuItem,
    NODE_TYPE_FIELD,
    OG_TYPE_FIELD,
    openDropdown,
    openScreen,
    propertiesText,
    save,
    shouldOfferOnly,
    sourceField,
    sourceFieldIn
} from '../support/mappingScreen';
import {EDITOR_IN_CHIEF, SITE_ADMIN} from '../support/veryOpenGraph';

const NEWS_TYPE = 'jnt:news';
const TITLE: PropertyMapping = {ogProperty: 'og:title', sourceProperty: 'jcr:title'};
const DESCRIPTION: PropertyMapping = {ogProperty: 'og:description', sourceProperty: 'desc'};
const PUBLISHED: PropertyMapping = {ogProperty: 'article:published_time', sourceProperty: 'date'};
const BASIC_METADATA = 'vogBasicMetadata';
const TYPE_METADATA = 'vogTypeMetadata';

describe('Open Graph mapping screen', () => {
    before(() => {
        deleteMapping(NEWS_TYPE);
    });

    after(() => {
        deleteMapping(NEWS_TYPE);
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

        it('groups the fields in the basic and the type metadata, with the source properties of each kind', () => {
            cy.get(ADD_MAPPING).click();
            choose(NODE_TYPE_FIELD, NEWS_TYPE);
            choose(OG_TYPE_FIELD, 'article');
            cy.get(sourceFieldIn(BASIC_METADATA, TITLE.ogProperty)).should('exist');
            cy.get(OG_TYPE_FIELD).closest('article').find(`label[for="${TYPE_METADATA}"]`).should('exist');
            cy.get(sourceFieldIn(TYPE_METADATA, PUBLISHED.ogProperty)).should('exist');

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
    });

    describe('as the editor in chief', () => {
        it('creates a mapping', () => {
            const mapping: TypeMapping = {nodeType: NEWS_TYPE, ogType: 'website', properties: [TITLE]};
            openScreen(EDITOR_IN_CHIEF);
            cy.get(ADD_MAPPING).click();
            choose(NODE_TYPE_FIELD, NEWS_TYPE);
            chooseSources([TITLE]);
            choose(OG_TYPE_FIELD, 'website');
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

import {deleteMapping, expectNoError, getMappings, PropertyMapping, TypeMapping} from '../support/openGraphApi';
import {
    addProperty,
    CONFIRM_DELETE,
    CONTENT_TYPE,
    createMapping,
    DELETE,
    EDIT,
    EMPTY,
    LOAD_TIMEOUT,
    mappingRow,
    openScreen,
    propertiesText,
    save
} from '../support/mappingScreen';
import {EDITOR_IN_CHIEF, SITE_ADMIN} from '../support/veryOpenGraph';

const NEWS_TYPE = 'jnt:news';
const TITLE: PropertyMapping = {ogProperty: 'og:title', sourceProperty: 'jcr:title'};
const DESCRIPTION: PropertyMapping = {ogProperty: 'og:description', sourceProperty: 'desc'};

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

        it('creates the mapping of jnt:news to article with og:title from jcr:title', () => {
            createMapping({nodeType: NEWS_TYPE, ogType: 'article', properties: [TITLE]});
            mappingRow(NEWS_TYPE)
                .should('contain.text', 'article')
                .and('contain.text', propertiesText([TITLE]));
        });

        it('edits the mapping to add og:description from desc', () => {
            mappingRow(NEWS_TYPE).find(EDIT).click();
            cy.get(`${CONTENT_TYPE} [role="listbox"]`).should('have.attr', 'aria-disabled', 'true');
            addProperty(1, DESCRIPTION);
            save();
            mappingRow(NEWS_TYPE).should('contain.text', propertiesText([TITLE, DESCRIPTION]));
        });

        it('returns the same mapping from openGraphMappings', () => {
            getMappings({user: SITE_ADMIN}).then(result => {
                expectNoError(result);
                expect(result.data.jcr.nodeByPath.openGraphMappings).to.deep.equal([
                    {nodeType: NEWS_TYPE, ogType: 'article', properties: [TITLE, DESCRIPTION]}
                ]);
            });
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
            createMapping(mapping);
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

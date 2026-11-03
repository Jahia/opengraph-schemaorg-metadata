import {Accordion, getComponent} from '@jahia/cypress';
import {
    EDITOR,
    EDITOR_IN_CHIEF,
    PERMISSION,
    SITE_ADMIN,
    SITE_KEY,
    SITE_PATH,
    USERS
} from '../support/openGraphSchemaOrgMetadata';

const ROUTE_URL = `/jahia/jcontent/${SITE_KEY}/en/apps/openGraphSchemaOrgMetadata`;
const VANITY_URLS_URL = `/jahia/jcontent/${SITE_KEY}/en/apps/siteSettingsSeo/VanityUrls`;
const ENTRY = '[role="treeitem"][data-sel-role="openGraphSchemaOrgMetadata"]';
const SEO_GROUP = '[role="treeitem"][data-sel-role="siteSettingsSeo"]';
// The attribute data-registry-target of each item of the Additional tree of jContent is "<target>:<priority>".
const SEO_ITEMS = '[role="treeitem"][data-registry-target^="jcontent-siteSettingsSeo:"]';
const SCREEN = '[data-sel-role="opengraph-schemaorg-metadata"]';
const LOAD_TIMEOUT = 30000;

// The ids of the items of the accordion of jContent, once jContent has loaded. The Accordion page object of
// @jahia/cypress holds the selectors of the accordion.
const accordionItems = () => {
    cy.get(Accordion.defaultSelector, {timeout: LOAD_TIMEOUT}).should('exist');
    return getComponent(Accordion).listItems();
};

describe('Open Graph & schema.org entry in jContent', () => {
    afterEach(() => {
        cy.logout();
    });

    it('grants openGraphSchemaOrgMetadataManage on osmSite to the site administrator and the editor in chief only', () => {
        USERS.forEach(user => {
            cy.apolloClient({username: user.username, password: user.password})
                .apollo({
                    queryFile: 'graphql/openGraphSchemaOrgMetadata/hasPermission.graphql',
                    variables: {path: SITE_PATH, permission: PERMISSION}
                })
                .then(result => {
                    expect(result.data?.jcr?.nodeByPath?.hasPermission, `${PERMISSION} for ${user.role}`).to.equal(
                        user.canManage
                    );
                });
        });
        cy.apolloClient();
    });

    [SITE_ADMIN, EDITOR_IN_CHIEF].forEach(user => {
        it(`shows the Open Graph & schema.org entry and screen to the ${user.role}`, () => {
            cy.login(user.username, user.password);
            cy.visit(ROUTE_URL);
            cy.get(ENTRY, {timeout: LOAD_TIMEOUT}).should('be.visible').and('contain.text', 'Open Graph & schema.org');
            accordionItems().should('include', 'apps');
            cy.contains(SCREEN, 'Open Graph & schema.org', {timeout: LOAD_TIMEOUT}).should('be.visible');
            cy.contains(SCREEN, 'No mapping yet.').should('be.visible');
        });
    });

    it('lists the Open Graph & schema.org entry last in the SEO group, and a click on it opens the screen', () => {
        cy.login(SITE_ADMIN.username, SITE_ADMIN.password);
        cy.visit(VANITY_URLS_URL);
        cy.get(SEO_GROUP, {timeout: LOAD_TIMEOUT}).should('have.attr', 'aria-expanded', 'true');
        cy.get(SEO_ITEMS)
            .should('have.length.at.least', 2)
            .last()
            .should('have.attr', 'data-sel-role', 'openGraphSchemaOrgMetadata')
            .and('contain.text', 'Open Graph & schema.org');
        cy.get(SCREEN).should('not.exist');
        cy.get(ENTRY).click();
        cy.location('pathname').should('eq', ROUTE_URL);
        cy.contains(SCREEN, 'No mapping yet.', {timeout: LOAD_TIMEOUT}).should('be.visible');
    });

    it('hides the Open Graph & schema.org entry from the editor', () => {
        cy.login(EDITOR.username, EDITOR.password);
        cy.visit(ROUTE_URL);
        accordionItems().should('not.be.empty');
        cy.get(ENTRY).should('not.exist');
        cy.get(SCREEN).should('not.exist');
    });
});

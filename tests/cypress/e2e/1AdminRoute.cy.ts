import {
    EDITOR,
    EDITOR_IN_CHIEF,
    PERMISSION,
    SITE_ADMIN,
    SITE_KEY,
    SITE_PATH,
    USERS
} from '../support/structuredDataMapper';

const ROUTE_URL = `/jahia/jcontent/${SITE_KEY}/en/apps/structuredDataMapper`;
const VANITY_URLS_URL = `/jahia/jcontent/${SITE_KEY}/en/apps/siteSettingsSeo/VanityUrls`;
const ACCORDION_HEADERS = '.moonstone-accordion section.moonstone-accordionItem header';
const APPS_ACCORDION = `${ACCORDION_HEADERS}[aria-controls="apps"]`;
const ENTRY = '[role="treeitem"][data-sel-role="structuredDataMapper"]';
const SEO_GROUP = '[role="treeitem"][data-sel-role="siteSettingsSeo"]';
// The attribute data-registry-target of each item of the Additional tree of jContent is "<target>:<priority>".
const SEO_ITEMS = '[role="treeitem"][data-registry-target^="jcontent-siteSettingsSeo:"]';
const SCREEN = '[data-sel-role="structured-data-mapper"]';
const LOAD_TIMEOUT = 30000;

describe('Structured data entry in jContent', () => {
    afterEach(() => {
        cy.logout();
    });

    it('grants structuredDataMapperManage on sdmSite to the site administrator and the editor in chief only', () => {
        USERS.forEach(user => {
            cy.apolloClient({username: user.username, password: user.password})
                .apollo({
                    queryFile: 'graphql/structuredDataMapper/hasPermission.graphql',
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
        it(`shows the Structured data entry and screen to the ${user.role}`, () => {
            cy.login(user.username, user.password);
            cy.visit(ROUTE_URL);
            cy.get(APPS_ACCORDION, {timeout: LOAD_TIMEOUT}).should('be.visible');
            cy.get(ENTRY, {timeout: LOAD_TIMEOUT}).should('be.visible').and('contain.text', 'Structured data');
            cy.contains(SCREEN, 'Structured data', {timeout: LOAD_TIMEOUT}).should('be.visible');
            cy.contains(SCREEN, 'No mapping yet.').should('be.visible');
        });
    });

    it('lists the Structured data entry last in the SEO group, and a click on it opens the screen', () => {
        cy.login(SITE_ADMIN.username, SITE_ADMIN.password);
        cy.visit(VANITY_URLS_URL);
        cy.get(SEO_GROUP, {timeout: LOAD_TIMEOUT}).should('have.attr', 'aria-expanded', 'true');
        cy.get(SEO_ITEMS)
            .should('have.length.at.least', 2)
            .last()
            .should('have.attr', 'data-sel-role', 'structuredDataMapper')
            .and('contain.text', 'Structured data');
        cy.get(SCREEN).should('not.exist');
        cy.get(ENTRY).click();
        cy.location('pathname').should('eq', ROUTE_URL);
        cy.contains(SCREEN, 'No mapping yet.', {timeout: LOAD_TIMEOUT}).should('be.visible');
    });

    it('hides the Structured data entry from the editor', () => {
        cy.login(EDITOR.username, EDITOR.password);
        cy.visit(ROUTE_URL);
        cy.get(ACCORDION_HEADERS, {timeout: LOAD_TIMEOUT}).should('have.length.at.least', 1);
        cy.get(ENTRY).should('not.exist');
        cy.get(SCREEN).should('not.exist');
    });
});

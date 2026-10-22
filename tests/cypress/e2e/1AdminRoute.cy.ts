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
const ACCORDION_HEADERS = '.moonstone-accordion section.moonstone-accordionItem header';
const APPS_ACCORDION = `${ACCORDION_HEADERS}[aria-controls="apps"]`;
const ENTRY = '[role="treeitem"][data-sel-role="structuredDataMapper"]';
const SCREEN = '[data-sel-role="structured-data-mapper"]';
const LOAD_TIMEOUT = 30000;

describe('Open Graph entry in jContent', () => {
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
        it(`shows the Open Graph entry and screen to the ${user.role}`, () => {
            cy.login(user.username, user.password);
            cy.visit(ROUTE_URL);
            cy.get(APPS_ACCORDION, {timeout: LOAD_TIMEOUT}).should('be.visible');
            cy.get(ENTRY, {timeout: LOAD_TIMEOUT}).should('be.visible').and('contain.text', 'Open Graph');
            cy.contains(SCREEN, 'Open Graph', {timeout: LOAD_TIMEOUT}).should('be.visible');
            cy.contains(SCREEN, 'No mapping yet.').should('be.visible');
        });
    });

    it('hides the Open Graph entry from the editor', () => {
        cy.login(EDITOR.username, EDITOR.password);
        cy.visit(ROUTE_URL);
        cy.get(ACCORDION_HEADERS, {timeout: LOAD_TIMEOUT}).should('have.length.at.least', 1);
        cy.get(ENTRY).should('not.exist');
        cy.get(SCREEN).should('not.exist');
    });
});

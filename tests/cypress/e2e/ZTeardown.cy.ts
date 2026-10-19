import {deleteSite, deleteUser} from '@jahia/cypress';
import {SITE_KEY, USERS} from '../support/veryOpenGraph';

describe('Very Open Graph test suite teardown', () => {
    it('deletes the site vogSite and the users', () => {
        if (Cypress.env('VERY_OPEN_GRAPH_KEEP_SITE') === true) {
            cy.log('Skipping the site deletion because VERY_OPEN_GRAPH_KEEP_SITE=true');
            return;
        }

        deleteSite(SITE_KEY);
        USERS.forEach(user => deleteUser(user.username));
    });
});

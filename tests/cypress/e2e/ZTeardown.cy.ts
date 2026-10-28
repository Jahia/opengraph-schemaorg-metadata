import {deleteSite, deleteUser} from '@jahia/cypress';
import {SITE_KEY, USERS} from '../support/structuredDataMapper';

describe('Structured Data Mapper test suite teardown', () => {
    it('deletes the site sdmSite and the users', () => {
        if (Cypress.env('STRUCTURED_DATA_MAPPER_KEEP_SITE') === true) {
            cy.log('Skipping the site deletion because STRUCTURED_DATA_MAPPER_KEEP_SITE=true');
            return;
        }

        deleteSite(SITE_KEY);
        USERS.forEach(user => deleteUser(user.username));
    });
});

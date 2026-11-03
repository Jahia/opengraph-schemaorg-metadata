import {deleteSite, deleteUser} from '@jahia/cypress';
import {SITE_KEY, USERS} from '../support/openGraphSchemaOrgMetadata';

describe('Open Graph & Schema.org Metadata test suite teardown', () => {
    it('deletes the site osmSite and the users', () => {
        if (Cypress.env('OPENGRAPH_SCHEMAORG_METADATA_KEEP_SITE') === true) {
            cy.log('Skipping the site deletion because OPENGRAPH_SCHEMAORG_METADATA_KEEP_SITE=true');
            return;
        }

        deleteSite(SITE_KEY);
        USERS.forEach(user => deleteUser(user.username));
    });
});

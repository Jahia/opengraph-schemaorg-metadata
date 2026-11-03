import {createSite, createUser, deleteSite, deleteUser, enableModule, grantRoles} from '@jahia/cypress';
import {
    SERVER_NAME,
    SITE_KEY,
    SITE_MODULES,
    SITE_PATH,
    TEMPLATE_SET,
    USERS
} from '../support/openGraphSchemaOrgMetadata';

describe('Open Graph & Schema.org Metadata test suite setup', () => {
    before(() => {
        deleteSite(SITE_KEY);
        USERS.forEach(user => deleteUser(user.username));
    });

    it('creates the site osmSite with the modules opengraph-schemaorg-metadata and news', () => {
        createSite(SITE_KEY, {templateSet: TEMPLATE_SET, serverName: SERVER_NAME, locale: 'en'});
        SITE_MODULES.forEach(moduleName => enableModule(moduleName, SITE_KEY));
    });

    it('creates the users and grants each one a role on osmSite', () => {
        USERS.forEach(user => {
            createUser(user.username, user.password);
            grantRoles(SITE_PATH, [user.role], user.username, 'USER');
        });
    });
});

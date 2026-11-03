export const SITE_KEY = 'osmSite';
export const SITE_PATH = `/sites/${SITE_KEY}`;
// The node of the site that holds its mappings.
export const SETTINGS_PATH = `${SITE_PATH}/opengraph-schemaorg-metadata`;
export const SERVER_NAME = 'osmsite';
export const TEMPLATE_SET = 'templates-system';
export const SITE_MODULES = ['opengraph-schemaorg-metadata', 'news'];

export const PERMISSION = 'openGraphSchemaOrgMetadataManage';

export type TestUser = {username: string; password: string; role: string; canManage: boolean};

export const SITE_ADMIN: TestUser = {
    username: 'osm-site-admin',
    password: 'password123',
    role: 'site-administrator',
    canManage: true
};
export const EDITOR_IN_CHIEF: TestUser = {
    username: 'osm-editor-in-chief',
    password: 'password123',
    role: 'editor-in-chief',
    canManage: true
};
export const EDITOR: TestUser = {username: 'osm-editor', password: 'password123', role: 'editor', canManage: false};
export const USERS = [SITE_ADMIN, EDITOR_IN_CHIEF, EDITOR];

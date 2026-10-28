export const SITE_KEY = 'sdmSite';
export const SITE_PATH = `/sites/${SITE_KEY}`;
// The node of the site that holds its mappings.
export const SETTINGS_PATH = `${SITE_PATH}/structured-data-mapper`;
export const SERVER_NAME = 'sdmsite';
export const TEMPLATE_SET = 'templates-system';
export const SITE_MODULES = ['structured-data-mapper', 'news'];

export const PERMISSION = 'structuredDataMapperManage';

export type TestUser = {username: string; password: string; role: string; canManage: boolean};

export const SITE_ADMIN: TestUser = {
    username: 'sdm-site-admin',
    password: 'password123',
    role: 'site-administrator',
    canManage: true
};
export const EDITOR_IN_CHIEF: TestUser = {
    username: 'sdm-editor-in-chief',
    password: 'password123',
    role: 'editor-in-chief',
    canManage: true
};
export const EDITOR: TestUser = {username: 'sdm-editor', password: 'password123', role: 'editor', canManage: false};
export const USERS = [SITE_ADMIN, EDITOR_IN_CHIEF, EDITOR];

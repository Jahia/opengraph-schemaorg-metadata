export const SITE_KEY = 'vogSite';
export const SITE_PATH = `/sites/${SITE_KEY}`;
export const SERVER_NAME = 'vogsite';
export const TEMPLATE_SET = 'templates-system';
export const SITE_MODULES = ['very-open-graph', 'news'];

export const PERMISSION = 'veryOpenGraphManage';

export type TestUser = {username: string; password: string; role: string; canManage: boolean};

export const SITE_ADMIN: TestUser = {
    username: 'vog-site-admin',
    password: 'password123',
    role: 'site-administrator',
    canManage: true
};
export const EDITOR_IN_CHIEF: TestUser = {
    username: 'vog-editor-in-chief',
    password: 'password123',
    role: 'editor-in-chief',
    canManage: true
};
export const EDITOR: TestUser = {username: 'vog-editor', password: 'password123', role: 'editor', canManage: false};
export const USERS = [SITE_ADMIN, EDITOR_IN_CHIEF, EDITOR];

import {PropertyMapping} from './openGraphApi';
import {SITE_KEY, TestUser} from './veryOpenGraph';

export const LOAD_TIMEOUT = 30000;
export const SCREEN_URL = `/jahia/jcontent/${SITE_KEY}/en/apps/veryOpenGraph`;

const role = (name: string) => `[data-sel-role="${name}"]`;

export const EMPTY = role('very-open-graph-empty');
export const ADD_MAPPING = role('vog-add-mapping');
export const EDIT = role('vog-edit');
export const DELETE = role('vog-delete');
export const CONFIRM_DELETE = role('vog-confirm-delete');

export const CONTENT_EDITOR = '[aria-labelledby="dialog-content-editor"]';
const CREATE = role('createButton');
const SAVE = role('submitSave');
const CANCEL = role('backButton');
const DISCARD = role('close-dialog-discard');

const field = (name: string) => `${CONTENT_EDITOR} [data-sel-content-editor-field="${name}"]`;

export const NODE_TYPE_FIELD = field('vognt:typeMapping_vog:nodeType');
export const OG_TYPE_FIELD = field('vogTypeMetadata_vog:ogType');

// The Content Editor names a field after its fieldset and its property, such as vogBasicMetadata_vog:og_title, and
// the mapping stores article:tag in vog:article_tag.
const sourceFieldSelector = (ogProperty: string) =>
    `[data-sel-content-editor-field$="_vog:${ogProperty.replace(/:/g, '_')}"]`;

export const sourceField = (ogProperty: string) => `${CONTENT_EDITOR} ${sourceFieldSelector(ogProperty)}`;

// A fieldset of the Content Editor is an article, and its title is a label for the name of the fieldset.
export const sourceFieldIn = (fieldSetName: string, ogProperty: string) =>
    `${CONTENT_EDITOR} article:has(label[for="${fieldSetName}"]) ${sourceFieldSelector(ogProperty)}`;

// The "Add a mapping" button is enabled once the screen has loaded its data.
export const openScreen = (user: TestUser) => {
    cy.login(user.username, user.password);
    cy.visit(SCREEN_URL);
    cy.get(ADD_MAPPING, {timeout: LOAD_TIMEOUT}).should('not.be.disabled');
};

export const mappingRow = (nodeType: string) =>
    cy.get(`${role('vog-mapping-row')}[data-sel-node-type="${nodeType}"]`, {timeout: LOAD_TIMEOUT});

export const propertiesText = (properties: PropertyMapping[]) =>
    properties.map(property => `${property.ogProperty} ← ${property.sourceProperty}`).join(', ');

// A choicelist of the Content Editor is read-only until its values have loaded.
const dropdownOf = (fieldSelector: string) =>
    cy.get(`${fieldSelector} [data-sel-content-editor-select-readonly="false"]`, {timeout: LOAD_TIMEOUT});

export const OPEN_MENU = '.moonstone-menu:not(.moonstone-hidden)';

export const menuItem = (value: string) => `${OPEN_MENU} .moonstone-menuItem[data-value="${value}"]`;

export const openDropdown = (fieldSelector: string) => dropdownOf(fieldSelector).click();

export const choose = (fieldSelector: string, value: string) => {
    openDropdown(fieldSelector);
    cy.get(menuItem(value)).scrollIntoView();
    cy.get(menuItem(value)).click();
};

// Opens the choicelist, checks that it offers the selected value only, then selects it again to close the menu.
export const shouldOfferOnly = (fieldSelector: string, value: string) => {
    openDropdown(fieldSelector);
    cy.get(`${OPEN_MENU} .moonstone-menuItem`).should('have.length', 1);
    cy.get(menuItem(value)).click();
    cy.get(OPEN_MENU).should('not.exist');
};

export const chooseSources = (properties: PropertyMapping[]) => {
    properties.forEach(({ogProperty, sourceProperty}) => choose(sourceField(ogProperty), sourceProperty));
};

export const create = () => {
    cy.get(CREATE).click();
    cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('not.exist');
};

// Closes a form with no change. The Content Editor then releases the lock that it holds on the node.
export const close = () => {
    cy.get(CANCEL).click();
    cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('not.exist');
};

export const cancelAndDiscard = () => {
    cy.get(CANCEL).click();
    cy.get(DISCARD).click();
    cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('not.exist');
};

export const save = () => {
    cy.get(SAVE).click();
    cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('not.exist');
};

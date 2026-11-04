import {Menu} from '@jahia/cypress';
import {PropertyMapping} from './openGraphApi';
import {SITE_KEY, TestUser} from './openGraphSchemaOrgMetadata';

export const LOAD_TIMEOUT = 30000;
export const SCREEN_URL = `/jahia/jcontent/${SITE_KEY}/en/apps/openGraphSchemaOrgMetadata`;

const role = (name: string) => `[data-sel-role="${name}"]`;

export const EMPTY = role('opengraph-schemaorg-metadata-empty');
export const ADD_MAPPING = role('osm-add-mapping');
export const EDIT = role('osm-edit');
export const DELETE = role('osm-delete');
export const CONFIRM_DELETE = role('osm-confirm-delete');

export const CONTENT_EDITOR = '[aria-labelledby="dialog-content-editor"]';
const CREATE = role('createButton');
const SAVE = role('submitSave');
const CANCEL = role('backButton');
const DISCARD = role('close-dialog-discard');

const field = (name: string) => `${CONTENT_EDITOR} [data-sel-content-editor-field="${name}"]`;

export const NODE_TYPE_FIELD = field('osmnt:typeMapping_osm:nodeType');
export const TEMPLATE_FIELD = field('osmnt:typeMapping_osm:templateName');
// The mixin of each switch of the form, which is also the name of its fieldset.
export const OPEN_GRAPH = 'osmmix:openGraph';
export const SCHEMA_ORG = 'osmmix:schemaOrg';

export const OG_TYPE_FIELD = field(`${OPEN_GRAPH}_osm:ogType`);
export const SCHEMA_TYPE_FIELD = field(`${SCHEMA_ORG}_osm:schemaType`);

// The Content Editor names a field after its fieldset and its property, such as osmmix:openGraph_osm:og_title, and
// the mapping stores article:tag in osm:article_tag.
const sourceFieldSelector = (ogProperty: string) =>
    `[data-sel-content-editor-field$="_osm:${ogProperty.replace(/:/g, '_')}"]`;

export const sourceField = (ogProperty: string) => `${CONTENT_EDITOR} ${sourceFieldSelector(ogProperty)}`;

// The mapping stores the source of author.name in osm:schema_author_name.
export const schemaSourceField = (schemaProperty: string) =>
    sourceField(`schema_${schemaProperty.replace(/\./g, '_')}`);

// A fieldset of the Content Editor is an article, and its title is a label for the name of the fieldset.
export const sourceFieldIn = (fieldSetName: string, ogProperty: string) =>
    `${CONTENT_EDITOR} article:has(label[for="${fieldSetName}"]) ${sourceFieldSelector(ogProperty)}`;

// The names of the fields of a fieldset, in the order of the form.
export const fieldNamesIn = (fieldSetName: string) =>
    cy
        .get(`${CONTENT_EDITOR} article:has(label[for="${fieldSetName}"]) [data-sel-content-editor-field]`)
        .then(fields => Cypress._.map(fields, item => item.getAttribute('data-sel-content-editor-field')));

export const fieldSetSwitch = (fieldSetName: string) =>
    cy
        .get(`${CONTENT_EDITOR} [data-sel-role-dynamic-fieldset="${fieldSetName}"]`, {timeout: LOAD_TIMEOUT})
        .find('input[type="checkbox"]');

// The switch of a fieldset adds its mixin on save, and shows its fields.
export const switchFieldSet = (fieldSetName: string, on: boolean) => {
    fieldSetSwitch(fieldSetName).click({force: true});
    fieldSetSwitch(fieldSetName).should(on ? 'be.checked' : 'not.be.checked');
};

// The "Add a mapping" button is enabled once the screen has loaded its data.
export const openScreen = (user: TestUser) => {
    cy.login(user.username, user.password);
    cy.visit(SCREEN_URL);
    cy.get(ADD_MAPPING, {timeout: LOAD_TIMEOUT}).should('not.be.disabled');
};

// The row of the mapping of every template, or of the template mapping of templateName.
export const mappingRow = (nodeType: string, templateName = '') =>
    cy.get(`${role('osm-mapping-row')}[data-sel-node-type="${nodeType}"][data-sel-template="${templateName}"]`, {
        timeout: LOAD_TIMEOUT
    });

export const propertiesText = (properties: PropertyMapping[]) =>
    properties.map(property => `${property.ogProperty} ← ${property.sourceProperty}`).join(', ');

// A choicelist of the Content Editor is read-only until its values have loaded.
const dropdownOf = (fieldSelector: string) =>
    cy.get(`${fieldSelector} [data-sel-content-editor-select-readonly="false"]`, {timeout: LOAD_TIMEOUT});

// A read-only choicelist shows its value and opens no menu.
export const readOnlyDropdown = (fieldSelector: string) =>
    cy.get(`${fieldSelector} [data-sel-content-editor-select-readonly="true"]`, {timeout: LOAD_TIMEOUT});

// The Menu page object of @jahia/cypress holds the selector of the open menu. The choicelist of the Content Editor and
// the property dropdown of the module set data-value on each item.
export const OPEN_MENU = Menu.defaultSelector;

export const MENU_ITEMS = `${OPEN_MENU} [data-value]`;

export const menuItem = (value: string) => `${OPEN_MENU} [data-value="${value}"]`;

// The values of the items of the open menu, in their order.
export const menuValues = () =>
    cy.get(MENU_ITEMS).then(items => Cypress._.map(items, item => item.getAttribute('data-value')));

export const openDropdown = (fieldSelector: string) => dropdownOf(fieldSelector).click();

export const choose = (fieldSelector: string, value: string) => {
    openDropdown(fieldSelector);
    cy.get(menuItem(value)).scrollIntoView();
    cy.get(menuItem(value)).click();
};

// Opens the choicelist, checks that it offers the selected value only, then selects it again to close the menu.
export const shouldOfferOnly = (fieldSelector: string, value: string) => {
    openDropdown(fieldSelector);
    cy.get(MENU_ITEMS).should('have.length', 1);
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

// The Content Editor enables Save once the publication info of the node has loaded. In the form of a mapping, that query
// comes after one fieldConstraints query for each source field, which a slow server answers in more than 10 s.
export const save = () => {
    cy.get(SAVE, {timeout: LOAD_TIMEOUT}).should('be.enabled').click({timeout: LOAD_TIMEOUT});
    cy.get(CONTENT_EDITOR, {timeout: LOAD_TIMEOUT}).should('not.exist');
};

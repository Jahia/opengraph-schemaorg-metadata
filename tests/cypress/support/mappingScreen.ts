import {PropertyMapping, TypeMapping} from './openGraphApi';
import {SITE_KEY, TestUser} from './veryOpenGraph';

export const LOAD_TIMEOUT = 30000;
export const SCREEN_URL = `/jahia/jcontent/${SITE_KEY}/en/apps/veryOpenGraph`;

const role = (name: string) => `[data-sel-role="${name}"]`;

export const EMPTY = role('very-open-graph-empty');
export const ADD_MAPPING = role('vog-add-mapping');
export const EDITOR = role('vog-editor');
export const CONTENT_TYPE = role('vog-content-type');
export const OG_TYPE = role('vog-og-type');
export const ADD_PROPERTY = role('vog-add-property');
export const SAVE = role('vog-save');
export const EDIT = role('vog-edit');
export const DELETE = role('vog-delete');
export const CONFIRM_DELETE = role('vog-confirm-delete');

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

// Opens the Moonstone dropdown at the selector, then clicks the option that holds the value.
export const choose = (dropdown: string, value: string) => {
    cy.get(`${dropdown} [role="listbox"]`, {timeout: LOAD_TIMEOUT})
        .should('have.attr', 'aria-disabled', 'false')
        .and('not.have.attr', 'aria-busy');
    cy.get(`${dropdown} [role="listbox"]`).click();
    cy.get(`${dropdown} menu [data-sel-value="${value}"]`).click();
};

const propertyRow = (index: number) => `${role('vog-property-row')}:nth-child(${index + 1})`;

export const addProperty = (index: number, {ogProperty, sourceProperty}: PropertyMapping) => {
    cy.get(ADD_PROPERTY).click();
    choose(`${propertyRow(index)} ${role('vog-og-property')}`, ogProperty);
    choose(`${propertyRow(index)} ${role('vog-source-property')}`, sourceProperty);
};

export const save = () => {
    cy.get(SAVE).click();
    cy.get(EDITOR, {timeout: LOAD_TIMEOUT}).should('not.exist');
};

export const createMapping = ({nodeType, ogType, properties}: TypeMapping) => {
    cy.get(ADD_MAPPING).click();
    choose(CONTENT_TYPE, nodeType);
    choose(OG_TYPE, ogType);
    properties.forEach((property, index) => addProperty(index, property));
    save();
};

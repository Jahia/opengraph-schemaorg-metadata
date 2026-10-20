import {Collapsible, getComponentBySelector} from '@jahia/cypress';
import {LOAD_TIMEOUT} from './mappingScreen';

const FIXTURES = 'graphql/veryOpenGraph';

export const SECTION = 'veryOpenGraph';
// The Content Editor names a field after its fieldset and its property.
const PREVIEW_FIELD = 'vogOpenGraphValues_vog:ogPreview';

export type FormField = {name: string; selectorType: string; readOnly: boolean};
export type NodeProperty = {name: string; value: string};
export type FormSection = {name: string; fieldSets?: {name: string; fields: FormField[]}[]};

const CONTENT_EDITOR = '[aria-labelledby="dialog-content-editor"]';
const sectionSelector = (name: string) => `${CONTENT_EDITOR} [data-sel-content-editor-fields-group="${name}"]`;
const SECTION_SELECTOR = sectionSelector(SECTION);
const PREVIEW_SELECTOR = `${SECTION_SELECTOR} [data-sel-content-editor-field="${PREVIEW_FIELD}"]`;
const role = (name: string) => `[data-sel-role="${name}"]`;

export const PREVIEW_ROW = role('vog-preview-row');
export const SAVE_HINT = role('vog-preview-save-hint');

// The sections of the edit form of a node, as the jContent GraphQL API gives them to the Content Editor.
export const editFormSections = (uuidOrPath: string): Cypress.Chainable<FormSection[]> =>
    cy
        .apollo({queryFile: `${FIXTURES}/editForm.graphql`, variables: {uuidOrPath}})
        .then(result => result.data.forms.editForm.sections as FormSection[]);

export const createFormSections = (primaryNodeType: string, parentPath: string): Cypress.Chainable<FormSection[]> =>
    cy
        .apollo({queryFile: `${FIXTURES}/createForm.graphql`, variables: {primaryNodeType, uuidOrPath: parentPath}})
        .then(result => result.data.forms.createForm.sections as FormSection[]);

// Every property of a node in English, with no filter on the names.
export const nodeProperties = (path: string): Cypress.Chainable<NodeProperty[]> =>
    cy
        .apollo({queryFile: `${FIXTURES}/nodeProperties.graphql`, variables: {path}})
        .then(result => result.data.jcr.nodeByPath.properties as NodeProperty[]);

export const sectionNames = (sections: FormSection[]) => sections.map(section => section.name);

// Opens the full-screen Content Editor of a node with the URL hash of jContent, and waits for a field of its form.
export const openContentEditor = (siteKey: string, uuid: string, fieldName: string) => {
    const editor = `(contentEditor:!((formKey:modal_0,isFullscreen:!t,lang:en,mode:edit,site:${siteKey},uilang:en,uuid:'${uuid}')))`;
    cy.visit(`/jahia/jcontent/${siteKey}/en/content-folders/contents#${editor}`);
    cy.get(`${CONTENT_EDITOR} [data-sel-content-editor-field="${fieldName}"]`, {timeout: LOAD_TIMEOUT}).should(
        'be.visible'
    );
};

export const sectionShouldNotExist = () => cy.get(SECTION_SELECTOR).should('not.exist');

export const expandSection = (name: string) => getComponentBySelector(Collapsible, sectionSelector(name)).expand();

// Expands the section "Open Graph", and waits for its values.
export const openSection = () => {
    expandSection(SECTION);
    cy.get(`${PREVIEW_SELECTOR} ${PREVIEW_ROW}`, {timeout: LOAD_TIMEOUT}).should('have.length.at.least', 1);
};

export const previewValue = (property: string) =>
    cy.get(`${PREVIEW_SELECTOR} ${PREVIEW_ROW}[data-sel-property="${property}"] ${role('vog-preview-value')}`, {
        timeout: LOAD_TIMEOUT
    });

export const fieldNamed = (name: string) => `[data-sel-content-editor-field="${name}"]`;

// The Content Editor names the system name field after the fieldset that holds it.
export const SYSTEM_NAME_FIELD = '[data-sel-content-editor-field$="_ce:systemName"]';

// The sticky header of a section covers a field that Cypress scrolls to the top, so the field scrolls to the center.
export const typeInField = (field: string, text: string) => {
    const input = `${CONTENT_EDITOR} ${field} input`;
    cy.get(input).clear({scrollBehavior: 'center'});
    cy.get(input).type(text, {scrollBehavior: 'center'});
};

export const save = () => {
    cy.get(`${CONTENT_EDITOR} ${role('submitSave')}`).click();
    cy.get('[role="alertdialog"]', {timeout: LOAD_TIMEOUT}).should('contain', 'Content successfully saved');
};

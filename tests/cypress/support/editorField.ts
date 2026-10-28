import {LOAD_TIMEOUT} from './mappingScreen';

const FIXTURES = 'graphql/structuredDataMapper';

// The module adds its fieldsets to the section seo, which also holds the fieldsets of other modules.
export const SECTION = 'seo';
// The Content Editor names a field after its fieldset and its property.
const PREVIEW_FIELD = 'sdmOpenGraphValues_sdm:ogPreview';
const CUSTOM_TAGS_FIELD_SET = 'sdmmix:customTags';

export type FormField = {name: string; selectorType: string; readOnly: boolean};
export type NodeProperty = {name: string; value: string};
export type FormSection = {name: string; fieldSets?: {name: string; fields: FormField[]}[]};

const CONTENT_EDITOR = '[aria-labelledby="dialog-content-editor"]';
const sectionSelector = (name: string) => `${CONTENT_EDITOR} [data-sel-content-editor-fields-group="${name}"]`;
const SECTION_SELECTOR = sectionSelector(SECTION);
const PREVIEW_SELECTOR = `${SECTION_SELECTOR} [data-sel-content-editor-field="${PREVIEW_FIELD}"]`;
const role = (name: string) => `[data-sel-role="${name}"]`;

export const PREVIEW_ROW = role('sdm-preview-row');
export const SAVE_HINT = role('sdm-preview-save-hint');

// The sections of the edit form of a node, as the jContent GraphQL API gives them to the Content Editor.
export const editFormSections = (uuidOrPath: string): Cypress.Chainable<FormSection[]> =>
    cy
        .apollo({queryFile: `${FIXTURES}/editForm.graphql`, variables: {uuidOrPath}})
        .then(result => result.data.forms.editForm.sections as FormSection[]);

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

// Opens the create form of a content type under a parent node, with the Content Editor API of jContent.
export const openCreateForm = (siteKey: string, parentPath: string, nodeType: string, fieldName: string) => {
    cy.visit(`/jahia/jcontent/${siteKey}/en/content-folders/contents`);
    cy.window()
        .its('CE_API', {timeout: LOAD_TIMEOUT})
        .then((api: {create: (config: Record<string, unknown>) => void}) =>
            api.create({path: parentPath, nodeTypes: [nodeType], includeSubTypes: false, isFullscreen: true})
        );
    cy.get(`${CONTENT_EDITOR} [data-sel-content-editor-field="${fieldName}"]`, {timeout: LOAD_TIMEOUT}).should(
        'be.visible'
    );
};

// The section re-renders when it opens, so the button is found again for each step.
export const expandSection = (name: string) => {
    const button = `${sectionSelector(name)} .moonstone-collapsible_button`;
    cy.get(button, {timeout: LOAD_TIMEOUT}).then($button => {
        if ($button.attr('aria-expanded') !== 'true') {
            cy.get(button).click();
        }
    });
    cy.get(button).should('have.attr', 'aria-expanded', 'true');
};

// Expands the section seo, then checks that it holds no fieldset of the module. The fieldsets show until the
// preview knows that the type has no mapping, so the check waits for them to go.
export const fieldSetsShouldNotExist = () => {
    expandSection(SECTION);
    cy.get(`${CONTENT_EDITOR} [data-sel-content-editor-field="${PREVIEW_FIELD}"]`).should('not.exist');
    cy.get(`${CONTENT_EDITOR} [data-sel-role-dynamic-fieldset="${CUSTOM_TAGS_FIELD_SET}"]`).should('not.exist');
};

// Expands the section seo, and waits for the Open Graph values.
export const openSection = () => {
    expandSection(SECTION);
    cy.get(`${PREVIEW_SELECTOR} ${PREVIEW_ROW}`, {timeout: LOAD_TIMEOUT}).should('have.length.at.least', 1);
};

export const previewValue = (property: string) =>
    cy.get(`${PREVIEW_SELECTOR} ${PREVIEW_ROW}[data-sel-property="${property}"] ${role('sdm-preview-value')}`, {
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

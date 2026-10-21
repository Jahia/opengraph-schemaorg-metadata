import {openContentEditor, openSection} from './editorField';
import {CONTENT_EDITOR, LOAD_TIMEOUT, menuItem} from './mappingScreen';
import {SITE_KEY} from './veryOpenGraph';

export const CUSTOM_TAGS_MIXIN = 'vogmix:customTags';

// The Content Editor names the field after its fieldset, which is the mixin.
const FIELD = `${CONTENT_EDITOR} [data-sel-content-editor-field="${CUSTOM_TAGS_MIXIN}_vog:customTags"]`;
const SWITCH = `${CONTENT_EDITOR} [data-sel-role-dynamic-fieldset="${CUSTOM_TAGS_MIXIN}"]`;

export const tagValue = (index: number) =>
    `${CONTENT_EDITOR} [data-sel-content-editor-multiple-generic-field="${CUSTOM_TAGS_MIXIN}_vog:customTags[${index}]"]`;

export const tagProperty = (index: number) => `${tagValue(index)} [data-sel-role="vog-tag-property"]`;
// The text field of the Content Editor renders one text input.
export const tagContent = (index: number) => `${tagValue(index)} input[type="text"]`;

// Opens the edit form of a news item, then expands the section "Open Graph".
export const openEditForm = (uuid: string) => {
    openContentEditor(SITE_KEY, uuid, 'jnt:news_jcr:title');
    openSection();
};

export const customTagsSwitch = () => cy.get(SWITCH, {timeout: LOAD_TIMEOUT}).find('input[type="checkbox"]');

// The switch of the fieldset adds the mixin on save, and shows the field.
export const switchCustomTags = (on: boolean) => {
    customTagsSwitch().click({force: true});
    customTagsSwitch().should(on ? 'be.checked' : 'not.be.checked');
    if (on) {
        cy.get(FIELD).scrollIntoView();
        cy.get(FIELD).should('be.visible');
    } else {
        cy.get(FIELD).should('not.exist');
    }
};

// The dropdown of a value is disabled until the Open Graph properties of the mapping have loaded.
export const openPropertyMenu = (index: number) => {
    cy.get(`${tagProperty(index)} [role="listbox"][aria-disabled="false"]`, {timeout: LOAD_TIMEOUT}).click();
};

export const addValue = () => cy.get(`${FIELD} button[data-sel-action="addField"]`).click();

const PICKER_DIALOG = '[data-sel-role="picker-dialog"]';

export const tagImage = (index: number) => `${tagValue(index)} [data-testid="cardSelector-displayName"]`;
export const tagDate = (index: number) => `${tagValue(index)} input[type="text"]`;

const chooseProperty = (index: number, property: string) => {
    addValue();
    openPropertyMenu(index);
    cy.get(menuItem(property)).click();
};

export const addTag = (index: number, property: string, content: string) => {
    chooseProperty(index, property);
    cy.get(tagContent(index)).type(content);
};

// The image picker opens on the files of the site.
export const addImage = (index: number, property: string, fileName: string) => {
    chooseProperty(index, property);
    cy.get(`${tagValue(index)} [data-sel-field-picker-action="openPicker"]`).click();
    cy.get(`${PICKER_DIALOG} [data-sel-role-card="${fileName}"]`, {timeout: LOAD_TIMEOUT}).click();
    cy.get(`${PICKER_DIALOG} [data-sel-picker-dialog-action="done"]`).click();
    cy.get(PICKER_DIALOG).should('not.exist');
};

// The date picker reads the date in the format of the browser locale, and in its time zone.
export const addDate = (index: number, property: string, text: string) => {
    chooseProperty(index, property);
    cy.get(tagDate(index)).type(text);
    cy.get(tagDate(index)).blur();
};

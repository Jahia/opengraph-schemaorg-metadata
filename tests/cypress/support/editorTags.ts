import {openContentEditor, openSection} from './editorField';
import {CONTENT_EDITOR, LOAD_TIMEOUT, menuItem} from './mappingScreen';
import {SITE_KEY} from './openGraphSchemaOrgMetadata';

export const CUSTOM_TAGS_MIXIN = 'osmmix:customTags';
export const CUSTOM_SCHEMA_MIXIN = 'osmmix:customSchemaOrg';

const PICKER_DIALOG = '[data-sel-role="picker-dialog"]';

// Opens the edit form of a news item, then expands the section "Open Graph".
export const openEditForm = (uuid: string) => {
    openContentEditor(SITE_KEY, uuid, 'jnt:news_jcr:title');
    openSection();
};

// The helpers of a field of custom values: osm:customTags, or osm:customSchemaOrg. The Content Editor names the field
// after its fieldset, which is the mixin.
const customValueField = (mixin: string, property: string) => {
    const field = `${CONTENT_EDITOR} [data-sel-content-editor-field="${mixin}_${property}"]`;
    const switchSelector = `${CONTENT_EDITOR} [data-sel-role-dynamic-fieldset="${mixin}"]`;

    const value = (index: number) =>
        `${CONTENT_EDITOR} [data-sel-content-editor-multiple-generic-field="${mixin}_${property}[${index}]"]`;
    const propertyOf = (index: number) => `${value(index)} [data-sel-role="osm-tag-property"]`;
    // The text field and the number field of the Content Editor render one text input.
    const content = (index: number) => `${value(index)} input[type="text"]`;
    const fieldSetSwitch = () => cy.get(switchSelector, {timeout: LOAD_TIMEOUT}).find('input[type="checkbox"]');

    // The switch of the fieldset adds the mixin on save, and shows the field.
    const switchOn = (on: boolean) => {
        fieldSetSwitch().click({force: true});
        fieldSetSwitch().should(on ? 'be.checked' : 'not.be.checked');
        if (on) {
            cy.get(field).scrollIntoView();
            cy.get(field).should('be.visible');
        } else {
            cy.get(field).should('not.exist');
        }
    };

    // The dropdown of a value is disabled until the properties of the mapping have loaded.
    const openPropertyMenu = (index: number) => {
        cy.get(`${propertyOf(index)} [role="listbox"][aria-disabled="false"]`, {timeout: LOAD_TIMEOUT}).click();
    };

    const addValue = () => cy.get(`${field} button[data-sel-action="addField"]`).click();

    const chooseProperty = (index: number, name: string) => {
        addValue();
        openPropertyMenu(index);
        cy.get(menuItem(name)).scrollIntoView();
        cy.get(menuItem(name)).click();
    };

    return {
        field,
        value,
        propertyOf,
        content,
        image: (index: number) => `${value(index)} [data-testid="cardSelector-displayName"]`,
        date: (index: number) => `${value(index)} input[type="text"]`,
        fieldSetSwitch,
        switchOn,
        openPropertyMenu,
        addValue,
        addText: (index: number, name: string, text: string) => {
            chooseProperty(index, name);
            cy.get(content(index)).type(text);
        },
        // The image picker opens on the files of the site.
        addImage: (index: number, name: string, fileName: string) => {
            chooseProperty(index, name);
            cy.get(`${value(index)} [data-sel-field-picker-action="openPicker"]`).click();
            cy.get(`${PICKER_DIALOG} [data-sel-role-card="${fileName}"]`, {timeout: LOAD_TIMEOUT}).click();
            cy.get(`${PICKER_DIALOG} [data-sel-picker-dialog-action="done"]`).click();
            cy.get(PICKER_DIALOG).should('not.exist');
        },
        // The date picker reads the date in the format of the browser locale, and in its time zone.
        addDate: (index: number, name: string, text: string) => {
            chooseProperty(index, name);
            cy.get(content(index)).type(text);
            cy.get(content(index)).blur();
        }
    };
};

const customTags = customValueField(CUSTOM_TAGS_MIXIN, 'osm:customTags');

export const tagValue = customTags.value;
export const tagProperty = customTags.propertyOf;
export const tagContent = customTags.content;
export const tagImage = customTags.image;
export const tagDate = customTags.date;
export const customTagsSwitch = customTags.fieldSetSwitch;
export const switchCustomTags = customTags.switchOn;
export const openPropertyMenu = customTags.openPropertyMenu;
export const addValue = customTags.addValue;
export const addTag = customTags.addText;
export const addImage = customTags.addImage;
export const addDate = customTags.addDate;

export const customSchemaValues = customValueField(CUSTOM_SCHEMA_MIXIN, 'osm:customSchemaOrg');

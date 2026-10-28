import {addNode, createSite, deleteSite, enableModule, getNodeByPath} from '@jahia/cypress';
import {deleteMapping, expectNoError, saveMapping, TypeMapping} from '../support/openGraphApi';
import {deleteEverywhere} from '../support/livePage';
import {
    editFormSections,
    fieldNamed,
    fieldSetsShouldNotExist,
    FormSection,
    nodeProperties,
    NodeProperty,
    openContentEditor,
    openCreateForm,
    openSection,
    previewValue,
    save,
    SAVE_HINT,
    SECTION,
    SYSTEM_NAME_FIELD,
    sectionNames,
    typeInField
} from '../support/editorField';
import {LOAD_TIMEOUT} from '../support/mappingScreen';
import {SITE_KEY, SITE_MODULES, SITE_PATH, TEMPLATE_SET} from '../support/structuredDataMapper';

const NEWS_NAME = 'sdm-editor-news';
const NEWS_PATH = `${SITE_PATH}/contents/${NEWS_NAME}`;
const PAGE_PATH = `${SITE_PATH}/home`;
const OTHER_SITE_KEY = 'sdmSiteOther';
const OTHER_SITE_PATH = `/sites/${OTHER_SITE_KEY}`;
const OTHER_NEWS_PATH = `${OTHER_SITE_PATH}/contents/${NEWS_NAME}`;
const TITLE = 'Editor news';
const NEW_TITLE = 'Editor news, saved';
const TITLE_FIELD = 'jnt:news_jcr:title';
const PAGE_TITLE_FIELD = 'jnt:page_jcr:title';

const NEWS_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'article',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:description', sourceProperty: 'desc'}
    ]
};
const PAGE_MAPPING: TypeMapping = {nodeType: 'jnt:page', ogType: 'website', properties: []};

const addNews = (sitePath: string) =>
    addNode({
        parentPathOrId: `${sitePath}/contents`,
        name: NEWS_NAME,
        primaryNodeType: 'jnt:news',
        properties: [
            {name: 'jcr:title', value: TITLE, language: 'en'},
            {name: 'desc', value: '<p>A news item for the editor field test</p>', language: 'en'},
            {name: 'date', value: '2026-10-20T09:30:00.000Z'}
        ]
    });

const uuidOf = (path: string): Cypress.Chainable<string> =>
    getNodeByPath(path).then(result => result.data.jcr.nodeByPath.uuid as string);

const expectSection = (sections: FormSection[]) => {
    const section = sections.find(candidate => candidate.name === SECTION);
    expect(section, `section ${SECTION}`).to.exist;
    const fields = section.fieldSets
        .flatMap(fieldSet => fieldSet.fields)
        .map(({name, selectorType, readOnly}) => ({name, selectorType, readOnly}));
    expect(fields).to.deep.include({name: 'sdm:ogPreview', selectorType: 'SdmPreview', readOnly: true});
};

// The save request carries the new title, and no request carries the field sdm:ogPreview.
const expectNoPreviewSent = (bodies: string[]) => {
    expect(
        bodies.some(body => body.includes(NEW_TITLE)),
        'a request saves the title'
    ).to.equal(true);
    expect(
        bodies.filter(body => body.includes('sdm:ogPreview')),
        'requests with sdm:ogPreview'
    ).to.be.empty;
};

const expectSavedNews = (properties: NodeProperty[]) => {
    expect(properties.find(property => property.name === 'jcr:title')?.value).to.equal(NEW_TITLE);
    expect(properties.map(property => property.name).filter(name => name.startsWith('sdm:'))).to.be.empty;
};

describe('Open Graph values in the Content Editor', () => {
    before(() => {
        ['jnt:news', 'jnt:page'].forEach(nodeType => deleteMapping(nodeType));
        deleteEverywhere(NEWS_PATH);
        deleteSite(OTHER_SITE_KEY);
        createSite(OTHER_SITE_KEY, {templateSet: TEMPLATE_SET, serverName: 'sdmsiteother', locale: 'en'});
        SITE_MODULES.forEach(moduleName => enableModule(moduleName, OTHER_SITE_KEY));
        addNews(SITE_PATH);
        addNews(OTHER_SITE_PATH);
        saveMapping(NEWS_MAPPING).then(expectNoError);
    });

    after(() => {
        ['jnt:news', 'jnt:page'].forEach(nodeType => deleteMapping(nodeType));
        deleteEverywhere(NEWS_PATH);
        deleteSite(OTHER_SITE_KEY);
    });

    describe('the forms', () => {
        it('give the section seo of the edit form the read-only field sdm:ogPreview', () => {
            editFormSections(NEWS_PATH).then(expectSection);
        });

        it('have no section "Open Graph" of their own', () => {
            editFormSections(NEWS_PATH).then(sections =>
                expect(sectionNames(sections)).not.to.include('structuredDataMapper')
            );
        });
    });

    describe('the Content Editor', () => {
        beforeEach(() => {
            cy.login();
        });

        afterEach(() => {
            cy.logout();
        });

        it('shows the Open Graph values of a mapped news item', () => {
            uuidOf(NEWS_PATH).then(uuid => openContentEditor(SITE_KEY, uuid, TITLE_FIELD));
            openSection();
            previewValue('og:title').should('have.text', TITLE);
            previewValue('og:type').should('have.text', 'article');
            previewValue('og:description').should('have.text', 'A news item for the editor field test');
            previewValue('og:url').should('have.text', `Live URL of ${NEWS_PATH}`);
            previewValue('og:site_name').should('have.text', SITE_KEY);
            previewValue('og:locale').should('have.text', 'en');
            previewValue('twitter:card').should('have.text', 'summary');
            cy.get(SAVE_HINT).should('not.exist');
        });

        it('keeps the inactive tab of the full-screen editor hidden once the Open Graph values are shown', () => {
            uuidOf(NEWS_PATH).then(uuid => openContentEditor(SITE_KEY, uuid, TITLE_FIELD));
            openSection();
            previewValue('og:title').should('have.text', TITLE);
            // A CSS module class of jContent hides the inactive tab, and its name ends with a hash.
            cy.get('[class*="EditPanel__hideTab"]').should('have.css', 'display', 'none');
        });

        it('hides the fieldsets on a page with no mapping, and shows them once jnt:page has a mapping', () => {
            uuidOf(PAGE_PATH).then(uuid => openContentEditor(SITE_KEY, uuid, PAGE_TITLE_FIELD));
            fieldSetsShouldNotExist();
            saveMapping(PAGE_MAPPING).then(expectNoError);
            // The same URL again changes the hash only, so a reload loads the form again.
            cy.reload();
            cy.get(`[data-sel-content-editor-field="${PAGE_TITLE_FIELD}"]`, {timeout: LOAD_TIMEOUT}).should(
                'be.visible'
            );
            openSection();
            previewValue('og:type').should('have.text', 'website');
            deleteMapping(PAGE_MAPPING.nodeType).then(expectNoError);
        });

        it('hides the fieldsets on a news item of a site with no mapping', () => {
            uuidOf(OTHER_NEWS_PATH).then(uuid => openContentEditor(OTHER_SITE_KEY, uuid, TITLE_FIELD));
            fieldSetsShouldNotExist();
        });

        it('hides the fieldsets in the create form of a mapped type', () => {
            openCreateForm(SITE_KEY, `${SITE_PATH}/contents`, 'jnt:news', TITLE_FIELD);
            fieldSetsShouldNotExist();
        });

        it('shows a typed title at once, asks to save for another change, and saves no sdm:ogPreview', () => {
            const requests: string[] = [];
            cy.intercept('POST', '**/modules/graphql', request => {
                requests.push(JSON.stringify(request.body));
            });
            uuidOf(NEWS_PATH).then(uuid => openContentEditor(SITE_KEY, uuid, TITLE_FIELD));
            typeInField(fieldNamed(TITLE_FIELD), NEW_TITLE);
            openSection();
            previewValue('og:title').should('have.text', NEW_TITLE);
            cy.get(SAVE_HINT).should('not.exist');

            typeInField(SYSTEM_NAME_FIELD, `${NEWS_NAME}-renamed`);
            cy.get(SAVE_HINT).should('contain.text', 'Save to see the updated Open Graph values');
            typeInField(SYSTEM_NAME_FIELD, NEWS_NAME);
            cy.get(SAVE_HINT).should('not.exist');

            save();
            previewValue('og:title').should('have.text', NEW_TITLE);
            cy.wrap(requests).should(expectNoPreviewSent);
            nodeProperties(NEWS_PATH).then(expectSavedNews);
        });
    });
});

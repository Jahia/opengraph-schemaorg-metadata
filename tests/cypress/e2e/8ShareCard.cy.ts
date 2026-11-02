import {addNode, getNodeByPath, uploadFile} from '@jahia/cypress';
import {deleteMapping, expectNoError, saveMapping, TypeMapping} from '../support/openGraphApi';
import {deleteEverywhere} from '../support/livePage';
import {
    fieldNamed,
    openContentEditor,
    openSection,
    SHARE_CARD,
    selectShareTab,
    shareCardPart,
    shareCardRoles,
    typeInField
} from '../support/editorField';
import {SERVER_NAME, SITE_KEY, SITE_PATH} from '../support/structuredDataMapper';

const IMAGE_NEWS_PATH = `${SITE_PATH}/contents/sdm-share-image-news`;
const TEXT_NEWS_PATH = `${SITE_PATH}/contents/sdm-share-text-news`;
const IMAGE_NAME = 'sdm-share-image.png';
const IMAGE_PATH = `${SITE_PATH}/files/${IMAGE_NAME}`;
const TITLE = 'Share news';
const DESCRIPTION = 'A news item for the share card test';
const TITLE_FIELD = 'jnt:news_jcr:title';

const NEWS_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'article',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:description', sourceProperty: 'desc'},
        {ogProperty: 'og:image', sourceProperty: 'image'}
    ]
};

const IMAGE = 'sdm-share-card-image';
const THUMBNAIL = 'sdm-share-card-thumbnail';
const DOMAIN = 'sdm-share-card-domain';
const TITLE_ROLE = 'sdm-share-card-title';
const DESCRIPTION_ROLE = 'sdm-share-card-description';

// The ratio of the image, the order of the card with an image and without one, and the domain line of each network,
// as the issue Jahia/structured-data-mapper#24 lists them. X writes its summary card, with a square beside the text, for a
// content with no image, and shows the domain below a large image card.
const NETWORKS = [
    {
        name: 'facebook',
        ratio: 1200 / 630,
        roles: [IMAGE, DOMAIN, TITLE_ROLE, DESCRIPTION_ROLE],
        textRoles: [DOMAIN, TITLE_ROLE, DESCRIPTION_ROLE],
        domain: SERVER_NAME
    },
    {
        name: 'linkedin',
        ratio: 1200 / 627,
        roles: [IMAGE, TITLE_ROLE, DOMAIN],
        textRoles: [TITLE_ROLE, DOMAIN],
        domain: SERVER_NAME
    },
    {
        name: 'x',
        ratio: 1200 / 600,
        roles: [IMAGE, TITLE_ROLE, DOMAIN],
        textRoles: [THUMBNAIL, DOMAIN, TITLE_ROLE, DESCRIPTION_ROLE],
        domain: `From ${SERVER_NAME}`
    }
];

const addNews = (path: string, imageUuid?: string) =>
    addNode({
        parentPathOrId: `${SITE_PATH}/contents`,
        name: path.substring(path.lastIndexOf('/') + 1),
        primaryNodeType: 'jnt:news',
        properties: [
            {name: 'jcr:title', value: TITLE, language: 'en'},
            {name: 'desc', value: `<p>${DESCRIPTION}</p>`, language: 'en'},
            ...(imageUuid ? [{name: 'image', value: imageUuid}] : [])
        ]
    });

const openNews = (path: string) => {
    getNodeByPath(path).then(result => openContentEditor(SITE_KEY, result.data.jcr.nodeByPath.uuid, TITLE_FIELD));
    openSection();
    // The card is below the fold of the form, and Cypress takes an element out of view for a hidden one.
    cy.get(SHARE_CARD).scrollIntoView({offset: {top: -200, left: 0}});
    cy.get(SHARE_CARD).should('be.visible');
};

describe('Share card of a content in the Content Editor', () => {
    before(() => {
        deleteMapping('jnt:news');
        [IMAGE_NEWS_PATH, TEXT_NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
        uploadFile('images/sdm-filter-image.png', `${SITE_PATH}/files`, IMAGE_NAME, 'image/png').then(result =>
            addNews(IMAGE_NEWS_PATH, result.data.jcr.addNode.uuid)
        );
        addNews(TEXT_NEWS_PATH);
        saveMapping(NEWS_MAPPING).then(expectNoError);
    });

    after(() => {
        deleteMapping('jnt:news');
        [IMAGE_NEWS_PATH, TEXT_NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
    });

    beforeEach(() => {
        cy.login();
    });

    afterEach(() => {
        cy.logout();
    });

    it('shows the image, the title and the domain of the tags in the layout of each network', () => {
        openNews(IMAGE_NEWS_PATH);
        cy.get(SHARE_CARD).should('have.attr', 'data-sel-network', 'facebook');
        NETWORKS.forEach(network => {
            selectShareTab(network.name);
            shareCardRoles().should('deep.equal', network.roles);
            shareCardPart('title').should('have.text', TITLE);
            shareCardPart('domain').should('have.text', network.domain);
            shareCardPart('image').should($image => {
                const image = $image[0] as HTMLImageElement;
                expect(new URL(image.src).pathname, 'the file of og:image').to.equal(`/files/default${IMAGE_PATH}`);
                expect(image.naturalWidth, 'the image loads').to.be.greaterThan(0);
                const box = image.getBoundingClientRect();
                expect(box.width / box.height, `the ratio of ${network.name}`).to.be.closeTo(network.ratio, 0.02);
            });
        });
        selectShareTab('facebook');
        shareCardPart('description').should('have.text', DESCRIPTION);
        cy.get('[role="alertdialog"]', {timeout: 1000}).should('not.exist');
    });

    it('shows the card with no image for a content with no og:image', () => {
        openNews(TEXT_NEWS_PATH);
        NETWORKS.forEach(network => {
            selectShareTab(network.name);
            shareCardRoles().should('deep.equal', network.textRoles);
            shareCardPart('title').should('have.text', TITLE);
            shareCardPart('domain').should('have.text', SERVER_NAME);
        });
    });

    it('shows a typed title at once', () => {
        openNews(IMAGE_NEWS_PATH);
        typeInField(fieldNamed(TITLE_FIELD), 'Share news, typed');
        shareCardPart('title').should('have.text', 'Share news, typed');
    });
});

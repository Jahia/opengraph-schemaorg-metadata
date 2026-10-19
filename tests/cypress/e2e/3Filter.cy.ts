import {addNode, uploadFile} from '@jahia/cypress';
import {deleteMapping, expectNoError, saveMapping, TypeMapping} from '../support/openGraphApi';
import {deleteEverywhere, getLivePage, LivePage, metaContents, ogProperties, publish} from '../support/livePage';
import {SERVER_NAME, SITE_KEY, SITE_PATH} from '../support/veryOpenGraph';

const PAGE_PATH = `${SITE_PATH}/home/vog-filter-page`;
const NEWS_PATH = `${SITE_PATH}/contents/vog-filter-news`;
const IMAGE_NAME = 'vog-filter-image.png';
const IMAGE_PATH = `${SITE_PATH}/files/${IMAGE_NAME}`;

const PAGE_MAPPING: TypeMapping = {
    nodeType: 'jnt:page',
    ogType: 'website',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:description', sourceProperty: 'jcr:description'}
    ]
};
const NEWS_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'article',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:description', sourceProperty: 'desc'},
        {ogProperty: 'og:image', sourceProperty: 'image'},
        {ogProperty: 'article:published_time', sourceProperty: 'date'}
    ]
};

const single = (page: LivePage, property: string): string => {
    const contents = metaContents(page, property);
    expect(contents, property).to.have.length(1);
    return contents[0];
};

// Checks that a URL is absolute on the server name of the site, and that a guest can open its path.
const expectLiveUrl = (url: string, pathSuffix: string) => {
    const parsed = new URL(url);
    expect(parsed.hostname, `host of ${url}`).to.equal(SERVER_NAME);
    expect(parsed.pathname.endsWith(pathSuffix), `${parsed.pathname} ends with ${pathSuffix}`).to.equal(true);
    cy.clearCookies();
    cy.request({url: parsed.pathname}).its('status').should('equal', 200);
};

describe('Open Graph tags in the head of live pages', () => {
    before(() => {
        ['jnt:page', 'jnt:news'].forEach(nodeType => deleteMapping(nodeType));
        [PAGE_PATH, NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
        addNode({
            parentPathOrId: `${SITE_PATH}/home`,
            name: 'vog-filter-page',
            primaryNodeType: 'jnt:page',
            properties: [
                {name: 'jcr:title', value: 'Filter page', language: 'en'},
                {name: 'jcr:description', value: 'A page for the filter test', language: 'en'},
                {name: 'j:templateName', value: 'home'}
            ]
        });
        uploadFile(`images/${IMAGE_NAME}`, `${SITE_PATH}/files`, IMAGE_NAME, 'image/png').then(result => {
            addNode({
                parentPathOrId: `${SITE_PATH}/contents`,
                name: 'vog-filter-news',
                primaryNodeType: 'jnt:news',
                properties: [
                    {name: 'jcr:title', value: 'Filter news', language: 'en'},
                    {name: 'desc', value: '<p>First <strong>paragraph</strong> &amp; more</p>', language: 'en'},
                    {name: 'date', value: '2026-10-19T09:30:00.000Z'},
                    {name: 'image', value: result.data.jcr.addNode.uuid}
                ]
            });
        });
        publish(SITE_PATH);
    });

    after(() => {
        ['jnt:page', 'jnt:news'].forEach(nodeType => deleteMapping(nodeType));
        [PAGE_PATH, NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
    });

    it('writes no Open Graph tag on a page whose type has no mapping', () => {
        getLivePage(PAGE_PATH).then(page => {
            expect(page.doc.title).to.equal('Filter page');
            expect(ogProperties(page)).to.be.empty;
        });
    });

    it('writes the website tags of a page once a mapping on jnt:page exists, with no publication', () => {
        saveMapping(PAGE_MAPPING).then(expectNoError);
        getLivePage(PAGE_PATH).then(page => {
            expect(single(page, 'og:title')).to.equal('Filter page');
            expect(single(page, 'og:type')).to.equal('website');
            expect(single(page, 'og:description')).to.equal('A page for the filter test');
            expect(single(page, 'og:site_name')).to.equal(SITE_KEY);
            expect(single(page, 'og:locale')).to.equal('en');
            expectLiveUrl(single(page, 'og:url'), '/sites/vogSite/home/vog-filter-page.html');
            expect(page.html.indexOf('property="og:title"')).to.be.lessThan(page.html.search(/<\/head>/i));
        });
    });

    it('writes the article tags of a news item, with the absolute live URL of its image', () => {
        saveMapping(NEWS_MAPPING).then(expectNoError);
        getLivePage(NEWS_PATH).then(page => {
            expect(single(page, 'og:title')).to.equal('Filter news');
            expect(single(page, 'og:type')).to.equal('article');
            expect(single(page, 'og:description')).to.equal('First paragraph & more');
            expect(single(page, 'article:published_time')).to.equal('2026-10-19T09:30:00Z');
            expect(single(page, 'og:image:type')).to.equal('image/png');
            expectLiveUrl(single(page, 'og:url'), '/sites/vogSite/contents/vog-filter-news.html');
            expectLiveUrl(single(page, 'og:image'), `/files/live${IMAGE_PATH}`);
        });
    });

    it('stops writing the tags of a type as soon as its mapping is deleted', () => {
        deleteMapping('jnt:page').then(expectNoError);
        getLivePage(PAGE_PATH).then(page => expect(ogProperties(page)).to.be.empty);
        getLivePage(NEWS_PATH).then(page => expect(single(page, 'og:type')).to.equal('article'));
    });
});

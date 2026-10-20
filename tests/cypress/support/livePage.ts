import {deleteNode, publishAndWaitJobEnding} from '@jahia/cypress';

export type LivePage = {html: string; doc: Document};

// Requests the live English page of a node as a guest, and parses its HTML.
export const getLivePage = (path: string): Cypress.Chainable<LivePage> => {
    cy.clearCookies();
    return cy.request({url: `/cms/render/live/en${path}.html`}).then(response => {
        expect(response.status).to.equal(200);
        const html = response.body as string;
        return {html, doc: new DOMParser().parseFromString(html, 'text/html')};
    });
};

// The content attribute of each meta tag of the head with this property, in the order of the page.
export const metaContents = (page: LivePage, property: string): string[] =>
    Array.from(page.doc.head.querySelectorAll(`meta[property="${property}"]`)).map(meta =>
        meta.getAttribute('content')
    );

// The property of each Open Graph meta tag of the page, wherever it is.
export const ogProperties = (page: LivePage): string[] =>
    Array.from(page.doc.querySelectorAll('meta[property]'))
        .map(meta => meta.getAttribute('property'))
        .filter(property => /^(og|article|book|profile):/.test(property));

export const publish = (path: string) => publishAndWaitJobEnding(path, ['en']);

// Deletes a node in both workspaces, so that the next run starts from nothing.
export const deleteEverywhere = (path: string) => {
    deleteNode(path);
    deleteNode(path, 'LIVE');
};

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

// The content attribute of each twitter:card meta tag of the head. X names its tags with the attribute name, and not
// with property.
export const twitterCards = (page: LivePage): string[] =>
    Array.from(page.doc.head.querySelectorAll('meta[name="twitter:card"]')).map(meta => meta.getAttribute('content'));

// The property and the content of each meta tag of the head whose property starts with the prefix, in the order of
// the page.
export const metaTags = (page: LivePage, prefix: string): {property: string; content: string}[] =>
    Array.from(page.doc.head.querySelectorAll(`meta[property^="${prefix}"]`)).map(meta => ({
        property: meta.getAttribute('property'),
        content: meta.getAttribute('content')
    }));

// Each JSON-LD script element of the page, wherever it is, in the order of the page.
export const jsonLdScripts = (page: LivePage): HTMLScriptElement[] =>
    Array.from(page.doc.querySelectorAll('script[type="application/ld+json"]'));

// The parsed JSON of a JSON-LD script element.
export const jsonLdOf = (script: HTMLScriptElement): Record<string, unknown> => JSON.parse(script.textContent);

// The property of each Open Graph meta tag of the page, wherever it is.
export const ogProperties = (page: LivePage): string[] =>
    Array.from(page.doc.querySelectorAll('meta[property]'))
        .map(meta => meta.getAttribute('property'))
        .filter(property => /^(og|article|book|profile|music|video):/.test(property));

export const publish = (path: string) => publishAndWaitJobEnding(path, ['en']);

type VanityUrl = {url: {value: string}; language: {value: string}};

// The paths that the English live URL of a node can end with: its path with .html, and each English vanity URL.
// The module news adds the vanity URL /news/<title> to a news item when the module seo is installed, and the URL
// rewriting of Jahia uses it on some images only, such as jahia-ee-dev:8-SNAPSHOT.
export const livePathsOf = (path: string): Cypress.Chainable<string[]> =>
    cy.apollo({queryFile: 'graphql/structuredDataMapper/liveVanityUrls.graphql', variables: {path}}).then(result => {
        const vanityUrls = result.data.jcr.nodeByPath.descendants.nodes as VanityUrl[];
        return [
            `${path}.html`,
            ...vanityUrls.filter(vanityUrl => vanityUrl.language.value === 'en').map(vanityUrl => vanityUrl.url.value)
        ];
    });

// Deletes a node in both workspaces, so that the next run starts from nothing.
export const deleteEverywhere = (path: string) => {
    deleteNode(path);
    deleteNode(path, 'LIVE');
};

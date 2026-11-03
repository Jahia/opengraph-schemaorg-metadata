import {addNode, getNodeByPath, uploadFile} from '@jahia/cypress';
import {
    addDate,
    addImage,
    addTag,
    addValue,
    CUSTOM_TAGS_MIXIN,
    customTagsSwitch,
    openEditForm,
    openPropertyMenu,
    switchCustomTags,
    tagContent,
    tagDate,
    tagImage,
    tagProperty
} from '../support/editorTags';
import {previewValue, save} from '../support/editorField';
import {deleteEverywhere, getLivePage, LivePage, metaContents, metaTags, publish} from '../support/livePage';
import {cancelAndDiscard, close, MENU_ITEMS, menuItem} from '../support/mappingScreen';
import {
    deleteMapping,
    expectNoError,
    getCustomTags,
    getTags,
    OgTag,
    saveMapping,
    setCustomTags,
    TypeMapping
} from '../support/openGraphApi';
import {EDITOR, SERVER_NAME, SITE_PATH} from '../support/openGraphSchemaOrgMetadata';

const NEWS_PATH = `${SITE_PATH}/contents/osm-tags-news`;
const IMAGE_NAME = 'osm-tags-image.png';
const IMAGE_PATH = `${SITE_PATH}/files/${IMAGE_NAME}`;

const NEWS_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'article',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:description', sourceProperty: 'desc'},
        {ogProperty: 'article:published_time', sourceProperty: 'date'}
    ]
};

const SONG_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'music.song',
    properties: [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}]
};

const MOVIE_MAPPING: TypeMapping = {
    nodeType: 'jnt:news',
    ogType: 'video.movie',
    properties: [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}]
};

// The Open Graph properties of the og:type article, in the order of the vocabulary. The module sets og:type and og:url.
const ARTICLE_PROPERTIES = [
    'og:title',
    'og:description',
    'og:determiner',
    'og:image',
    'og:image:secure_url',
    'og:image:alt',
    'og:audio',
    'og:audio:secure_url',
    'og:audio:type',
    'og:video',
    'og:video:secure_url',
    'og:video:type',
    'og:video:width',
    'og:video:height',
    'og:video:alt',
    'article:published_time',
    'article:modified_time',
    'article:expiration_time',
    'article:author',
    'article:section',
    'article:tag'
];

const EDITOR_TITLE = 'Summer in Mykonos';
// 10/10/2026 reads the same in the formats MM/DD/YYYY and DD/MM/YYYY of the date picker.
const EDITOR_DATE_TEXT = '10/10/2026 09:30';
// The date picker reads the local time of the browser, and the tag holds it in UTC, to the second.
const EDITOR_DATE = new Date(2026, 9, 10, 9, 30).toISOString().replace(/\.\d{3}Z$/, 'Z');

const tag = (property: string, content: string) => JSON.stringify({property, content});
const fileTag = (property: string, node: string) => JSON.stringify({property, node});

const contentsOf = (tags: OgTag[], property: string) =>
    tags.filter(ogTag => ogTag.property === property).map(ogTag => ogTag.content);

// The property and the content of each tag whose property starts with the prefix, in their order.
const tagsWithPrefix = (tags: OgTag[], prefix: string) =>
    tags
        .filter(ogTag => ogTag.property.startsWith(prefix))
        .map(ogTag => ({property: ogTag.property, content: ogTag.content}));

// Checks that a URL is the absolute live URL of the image, on the server name of the site.
const expectImageUrl = (url: string) => {
    const parsed = new URL(url);
    expect(parsed.hostname, `host of ${url}`).to.equal(SERVER_NAME);
    expect(parsed.pathname.endsWith(`/files/live${IMAGE_PATH}`), `${parsed.pathname} is the live image`).to.equal(true);
};

// The width and the height of the image come from the image node, as for a mapped image.
const expectImageSize = (page: LivePage) =>
    getNodeByPath(IMAGE_PATH, ['j:width', 'j:height'], '', [], 'LIVE').then(result => {
        const properties = result.data.jcr.nodeByPath.properties as {name: string; value: string}[];
        ['width', 'height'].forEach(dimension => {
            const values = properties
                .filter(property => property.name === `j:${dimension}`)
                .map(property => property.value);
            expect(metaContents(page, `og:image:${dimension}`), dimension).to.deep.equal(values);
        });
    });

describe('Open Graph tags that an editor sets on one content', () => {
    let uuid: string;
    let imageUuid: string;

    before(() => {
        deleteMapping('jnt:news');
        [NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
        uploadFile(`images/osm-filter-image.png`, `${SITE_PATH}/files`, IMAGE_NAME, 'image/png').then(result => {
            imageUuid = result.data.jcr.addNode.uuid;
        });
        addNode({
            parentPathOrId: `${SITE_PATH}/contents`,
            name: 'osm-tags-news',
            primaryNodeType: 'jnt:news',
            properties: [
                {name: 'jcr:title', value: 'Tags news', language: 'en'},
                {name: 'desc', value: '<p>Mapped description</p>', language: 'en'},
                {name: 'date', value: '2026-10-19T09:30:00.000Z'}
            ]
        }).then(result => {
            uuid = result.data.jcr.addNode.uuid;
        });
        saveMapping(NEWS_MAPPING).then(expectNoError);
        [NEWS_PATH, IMAGE_PATH].forEach(publish);
    });

    after(() => {
        cy.logout();
        deleteMapping('jnt:news');
        [NEWS_PATH, IMAGE_PATH].forEach(deleteEverywhere);
    });

    it('offers the properties of the og:type of the mapping, without og:type and og:url', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        switchCustomTags(true);
        addValue();
        openPropertyMenu(0);
        cy.get(MENU_ITEMS).should($items => {
            expect(Array.from($items).map(item => item.getAttribute('data-value'))).to.deep.equal(ARTICLE_PROPERTIES);
        });
        cy.get(menuItem('og:title')).click();
        cancelAndDiscard();
    });

    it('adds the mixin on save, and writes the tags of the editor in place of the mapped values', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        switchCustomTags(true);
        addTag(0, 'og:title', EDITOR_TITLE);
        addImage(1, 'og:image', IMAGE_NAME);
        addDate(2, 'article:published_time', EDITOR_DATE_TEXT);
        save();

        getCustomTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const node = result.data.jcr.nodeByPath;
            expect(node.mixinTypes.map(mixin => mixin.name)).to.include(CUSTOM_TAGS_MIXIN);
            expect(node.property.values).to.deep.equal([
                tag('og:title', EDITOR_TITLE),
                fileTag('og:image', imageUuid),
                tag('article:published_time', EDITOR_DATE)
            ]);
        });
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:title')).to.deep.equal([EDITOR_TITLE]);
            expect(metaContents(page, 'og:image')).to.have.length(1);
            expectImageUrl(metaContents(page, 'og:image')[0]);
            expect(metaContents(page, 'og:image:type')).to.deep.equal(['image/png']);
            expectImageSize(page);
            expect(metaContents(page, 'og:type')).to.deep.equal(['article']);
            expect(metaContents(page, 'og:description')).to.deep.equal(['Mapped description']);
            expect(metaContents(page, 'article:published_time')).to.deep.equal([EDITOR_DATE]);
        });
    });

    it('shows the saved tags of the editor in the field and in osm:ogPreview when the form opens again', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        previewValue('og:title').should('have.text', EDITOR_TITLE);
        previewValue('og:image').should('have.text', `Live URL of ${IMAGE_PATH}`);
        previewValue('og:image:type').should('have.text', 'image/png');
        previewValue('article:published_time').should('have.text', EDITOR_DATE);
        previewValue('og:description').should('have.text', 'Mapped description');
        customTagsSwitch().should('be.checked');
        cy.get(tagProperty(0)).should('contain', 'og:title');
        cy.get(tagContent(0)).should('have.value', EDITOR_TITLE);
        cy.get(tagProperty(1)).should('contain', 'og:image');
        cy.get(tagImage(1)).should('have.text', IMAGE_NAME);
        cy.get(tagProperty(2)).should('contain', 'article:published_time');
        cy.get(tagDate(2)).should('have.value', EDITOR_DATE_TEXT);
        close();
    });

    it('ignores a value that is not valid, and keeps the first value of a property that takes one value', () => {
        setCustomTags(NEWS_PATH, [
            'not json',
            tag('og:type', 'video.movie'),
            tag('og:url', 'https://www.example.com/other'),
            tag('og:title', 'First title'),
            tag('og:title', 'Second title'),
            tag('og:description', '   '),
            tag('article:tag', 'Greece'),
            tag('article:tag', 'Islands'),
            fileTag('og:image', 'not-an-identifier'),
            fileTag('og:image', uuid)
        ]).then(expectNoError);

        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            const contents = (property: string) =>
                tags.filter(ogTag => ogTag.property === property).map(ogTag => ogTag.content ?? ogTag.nodePath);
            expect(contents('og:title')).to.deep.equal(['First title']);
            expect(contents('og:type')).to.deep.equal(['article']);
            expect(contents('og:url')).to.deep.equal([NEWS_PATH]);
            expect(contents('og:description')).to.deep.equal(['Mapped description']);
            expect(contents('article:tag')).to.deep.equal(['Greece', 'Islands']);
            expect(contents('og:image'), 'an identifier that names no file').to.be.empty;
        });
    });

    it('removes the mixin and the tags when the editor switches the fieldset off', () => {
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        switchCustomTags(false);
        save();

        getCustomTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const node = result.data.jcr.nodeByPath;
            expect(node.mixinTypes.map(mixin => mixin.name)).not.to.include(CUSTOM_TAGS_MIXIN);
            expect(node.property).to.be.null;
        });
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:title')).to.deep.equal(['Tags news']);
            expect(metaContents(page, 'article:tag')).to.be.empty;
        });
    });

    it('edits music:duration with a number field, and writes the whole number', () => {
        saveMapping(SONG_MAPPING).then(expectNoError);
        cy.login(EDITOR.username, EDITOR.password);
        openEditForm(uuid);
        switchCustomTags(true);
        // The number field drops the letter. A text field would keep it, and the module would then write no tag.
        addTag(0, 'music:duration', 'x215');
        cy.get(tagContent(0)).should('have.value', '215');
        save();
        close();

        getCustomTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(result.data.jcr.nodeByPath.property.values).to.deep.equal([tag('music:duration', '215')]);
        });
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'og:type')).to.deep.equal(['music.song']);
            expect(contentsOf(tags, 'music:duration')).to.deep.equal(['215']);
        });
    });

    it('writes a music:duration of the editor only when it is a whole number of 1 or more', () => {
        saveMapping(SONG_MAPPING).then(expectNoError);
        setCustomTags(NEWS_PATH, [
            tag('music:duration', 'abc'),
            tag('music:duration', '0'),
            tag('music:duration', '-5')
        ]).then(expectNoError);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(contentsOf(result.data.jcr.nodeByPath.openGraphTags, 'music:duration')).to.be.empty;
        });

        setCustomTags(NEWS_PATH, [tag('music:duration', '215')]).then(expectNoError);
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:type')).to.deep.equal(['music.song']);
            expect(metaContents(page, 'music:duration')).to.deep.equal(['215']);
        });
    });

    it('writes each video:actor of the editor followed by its video:actor:role', () => {
        const actors = ['https://www.example.com/actors/ada', 'https://www.example.com/actors/bob'];
        saveMapping(MOVIE_MAPPING).then(expectNoError);
        // The field lists the actors, then the roles. A role with no actor at the same position has no tag.
        setCustomTags(NEWS_PATH, [
            tag('video:actor', actors[0]),
            tag('video:actor', actors[1]),
            tag('video:actor:role', 'Captain'),
            tag('video:actor:role', 'Pilot'),
            tag('video:actor:role', 'Extra')
        ]).then(expectNoError);
        const interleaved = [
            {property: 'video:actor', content: actors[0]},
            {property: 'video:actor:role', content: 'Captain'},
            {property: 'video:actor', content: actors[1]},
            {property: 'video:actor:role', content: 'Pilot'}
        ];

        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'og:type')).to.deep.equal(['video.movie']);
            expect(tagsWithPrefix(tags, 'video:actor')).to.deep.equal(interleaved);
        });
        publish(NEWS_PATH);
        getLivePage(NEWS_PATH).then(page => {
            expect(metaContents(page, 'og:type')).to.deep.equal(['video.movie']);
            expect(metaTags(page, 'video:actor')).to.deep.equal(interleaved);
        });
    });

    it('keeps the position of a video:actor:role of the editor that sets nothing', () => {
        const actors = [
            'https://www.example.com/actors/ada',
            'https://www.example.com/actors/bob',
            'https://www.example.com/actors/cy'
        ];
        saveMapping(MOVIE_MAPPING).then(expectNoError);
        // The blank role of the second actor writes no tag, and the role Pilot stays with the third actor.
        setCustomTags(NEWS_PATH, [
            ...actors.map(actor => tag('video:actor', actor)),
            tag('video:actor:role', 'Captain'),
            tag('video:actor:role', ' '),
            tag('video:actor:role', 'Pilot')
        ]).then(expectNoError);

        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(tagsWithPrefix(result.data.jcr.nodeByPath.openGraphTags, 'video:actor')).to.deep.equal([
                {property: 'video:actor', content: actors[0]},
                {property: 'video:actor:role', content: 'Captain'},
                {property: 'video:actor', content: actors[1]},
                {property: 'video:actor', content: actors[2]},
                {property: 'video:actor:role', content: 'Pilot'}
            ]);
        });
    });

    it('writes og:determiner in lower case when the protocol allows the value, and no tag for another value', () => {
        saveMapping(NEWS_MAPPING).then(expectNoError);
        setCustomTags(NEWS_PATH, [tag('og:determiner', 'The')]).then(expectNoError);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(contentsOf(result.data.jcr.nodeByPath.openGraphTags, 'og:determiner')).to.deep.equal(['the']);
        });

        setCustomTags(NEWS_PATH, [tag('og:determiner', 'foo')]).then(expectNoError);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(contentsOf(result.data.jcr.nodeByPath.openGraphTags, 'og:determiner')).to.be.empty;
        });
    });

    it('writes og:video:width of the editor only after an og:video', () => {
        saveMapping(NEWS_MAPPING).then(expectNoError);
        setCustomTags(NEWS_PATH, [tag('og:video:width', '640')]).then(expectNoError);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(tagsWithPrefix(result.data.jcr.nodeByPath.openGraphTags, 'og:video')).to.be.empty;
        });

        const video = 'https://www.example.com/videos/mykonos.mp4';
        setCustomTags(NEWS_PATH, [tag('og:video', video), tag('og:video:width', '640')]).then(expectNoError);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(tagsWithPrefix(result.data.jcr.nodeByPath.openGraphTags, 'og:video')).to.deep.equal([
                {property: 'og:video', content: video},
                {property: 'og:video:width', content: '640'}
            ]);
        });
    });
});

import {addNode, createSite, deleteNode, deleteSite} from '@jahia/cypress';
import {
    deleteMapping,
    expectError,
    expectNoError,
    getMappings,
    getSourceProperties,
    getStoredMapping,
    getTags,
    getVocabulary,
    OgTag,
    PropertyMapping,
    saveMapping,
    SourceProperty,
    TypeMapping
} from '../support/openGraphApi';
import {
    EDITOR,
    EDITOR_IN_CHIEF,
    PERMISSION,
    SITE_ADMIN,
    SITE_PATH,
    TEMPLATE_SET
} from '../support/structuredDataMapper';

const NEWS_TYPE = 'jnt:news';
const NEWS_NAME = 'sdm-api-news';
const NEWS_PATH = `${SITE_PATH}/contents/${NEWS_NAME}`;
const HOME_PATH = `${SITE_PATH}/home`;
const SITE_WITHOUT_NEWS = 'sdmSiteNoNews';

const ARTICLE_PROPERTIES: PropertyMapping[] = [
    {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
    {ogProperty: 'og:description', sourceProperty: 'desc'},
    {ogProperty: 'og:image', sourceProperty: 'image'},
    {ogProperty: 'article:published_time', sourceProperty: 'date'},
    {ogProperty: 'article:tag', sourceProperty: 'j:tagList'}
];
const ARTICLE_MAPPING: TypeMapping = {nodeType: NEWS_TYPE, ogType: 'article', properties: ARTICLE_PROPERTIES};

const VIDEO_PROPERTIES: PropertyMapping[] = [
    {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
    {ogProperty: 'og:determiner', sourceProperty: 'jcr:title'},
    {ogProperty: 'video:actor', sourceProperty: 'jcr:title'},
    {ogProperty: 'video:release_date', sourceProperty: 'date'},
    {ogProperty: 'video:tag', sourceProperty: 'j:tagList'}
];
const VIDEO_MAPPING: TypeMapping = {nodeType: NEWS_TYPE, ogType: 'video.movie', properties: VIDEO_PROPERTIES};

// The og:type values of the Open Graph protocol, in the order of the vocabulary.
const OG_TYPES = [
    'website',
    'article',
    'book',
    'profile',
    'music.song',
    'music.album',
    'music.playlist',
    'music.radio_station',
    'video.movie',
    'video.episode',
    'video.tv_show',
    'video.other'
];

// The properties of every og:type, in the order of the vocabulary: a structured property follows its root.
const COMMON_PROPERTIES = [
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
    'og:video:alt'
];

// The own properties of video.movie, which video.episode, video.tv_show and video.other share.
const VIDEO_OWN_PROPERTIES = [
    'video:actor',
    'video:actor:role',
    'video:director',
    'video:writer',
    'video:duration',
    'video:release_date',
    'video:tag'
];

const contentsOf = (tags: OgTag[], property: string) =>
    tags.filter(tag => tag.property === property).map(tag => tag.content);

const sourcesOf = (tags: OgTag[], property: string) =>
    tags.filter(tag => tag.property === property).map(tag => tag.sourceProperty);

const namesWithPrefix = (properties: {name: string}[], prefix: string) =>
    properties.map(property => property.name).filter(name => name.startsWith(prefix));

const hasProperty = (properties: {name: string}[], name: string) => properties.some(property => property.name === name);

const expectMappings = (expected: unknown[]) => {
    getMappings().then(result => {
        expectNoError(result);
        expect(result.data.jcr.nodeByPath.openGraphMappings).to.deep.equal(expected);
    });
};

describe('Open Graph mapping API', () => {
    before(() => {
        deleteNode(NEWS_PATH);
        deleteSite(SITE_WITHOUT_NEWS);
        [NEWS_TYPE, 'jnt:page'].forEach(nodeType => deleteMapping(nodeType));
        addNode({
            parentPathOrId: `${SITE_PATH}/contents`,
            name: NEWS_NAME,
            primaryNodeType: NEWS_TYPE,
            // The mixin jmix:cache of Jahia adds j:expiration, the LONG property that jnt:news offers as a source.
            mixins: ['jmix:tagged', 'jmix:cache'],
            properties: [
                {name: 'jcr:title', value: 'Open Graph news', language: 'en'},
                {name: 'desc', value: '<p>First <strong>paragraph</strong> &amp; more</p>', language: 'en'},
                {name: 'date', value: '2026-10-19T09:30:00.000Z'},
                {name: 'j:tagList', values: ['alpha', 'beta']},
                {name: 'j:expiration', value: '215'}
            ]
        });
        createSite(SITE_WITHOUT_NEWS, {templateSet: TEMPLATE_SET, serverName: 'sdmsitenonews', locale: 'en'});
    });

    after(() => {
        [NEWS_TYPE, 'jnt:page'].forEach(nodeType => deleteMapping(nodeType));
        deleteNode(NEWS_PATH);
        deleteSite(SITE_WITHOUT_NEWS);
    });

    it('lists the og:type values and the kind of each property to any user', () => {
        getVocabulary(EDITOR).then(result => {
            expectNoError(result);
            const ogTypes = result.data.openGraphVocabulary.ogTypes;
            expect(ogTypes.map(ogType => ogType.name)).to.deep.equal(OG_TYPES);
            const website = ogTypes.find(ogType => ogType.name === 'website').properties;
            expect(website.map(property => property.name)).to.deep.equal(COMMON_PROPERTIES);
            const article = ogTypes.find(ogType => ogType.name === 'article').properties;
            expect(article).to.deep.include({name: 'og:image', kind: 'IMAGE', multiple: false});
            expect(article).to.deep.include({name: 'og:video:width', kind: 'INTEGER', multiple: false});
            expect(article).to.deep.include({name: 'article:published_time', kind: 'DATE', multiple: false});
            expect(article).to.deep.include({name: 'article:tag', kind: 'TEXT', multiple: true});
            expect(article.map(property => property.name)).not.to.include('og:url');
        });
    });

    it('lists the own properties of music.song and video.episode, and video:series on video.episode only', () => {
        getVocabulary(EDITOR).then(result => {
            expectNoError(result);
            const ogTypes = result.data.openGraphVocabulary.ogTypes;
            const song = ogTypes.find(ogType => ogType.name === 'music.song').properties;
            expect(namesWithPrefix(song, 'music:')).to.deep.equal([
                'music:duration',
                'music:album',
                'music:album:disc',
                'music:album:track',
                'music:musician'
            ]);
            expect(song).to.deep.include({name: 'music:duration', kind: 'INTEGER', multiple: false});
            expect(song).to.deep.include({name: 'music:album', kind: 'URL', multiple: true});
            expect(song).to.deep.include({name: 'music:album:disc', kind: 'INTEGER', multiple: true});

            const episode = ogTypes.find(ogType => ogType.name === 'video.episode').properties;
            expect(namesWithPrefix(episode, 'video:')).to.deep.equal([...VIDEO_OWN_PROPERTIES, 'video:series']);
            expect(episode).to.deep.include({name: 'video:actor', kind: 'URL', multiple: true});
            expect(episode).to.deep.include({name: 'video:actor:role', kind: 'TEXT', multiple: true});
            expect(episode).to.deep.include({name: 'video:duration', kind: 'INTEGER', multiple: false});
            expect(episode).to.deep.include({name: 'video:series', kind: 'URL', multiple: false});

            const withSeries = ogTypes.filter(ogType => hasProperty(ogType.properties, 'video:series'));
            expect(withSeries.map(ogType => ogType.name)).to.deep.equal(['video.episode']);
        });
    });

    it('lists the properties of jnt:news, with the mixins that extend it', () => {
        getSourceProperties(NEWS_TYPE).then(result => {
            expectNoError(result);
            const properties = result.data.jcr.nodeByPath.openGraphSourceProperties;
            const byName: Record<string, SourceProperty> = {};
            properties.forEach(property => {
                byName[property.name] = property;
            });
            expect(byName['jcr:title']).to.include({requiredType: 'STRING', internationalized: true});
            expect(byName['jcr:title'].compatibleOgKinds).to.deep.equal(['TEXT', 'URL']);
            expect(byName.desc.compatibleOgKinds, 'a rich text fills a text only').to.deep.equal(['TEXT']);
            expect(byName.image.compatibleOgKinds).to.deep.equal(['URL', 'IMAGE']);
            expect(byName.date.compatibleOgKinds).to.deep.equal(['DATE']);
            expect(byName['j:tagList']).to.include({declaringType: 'jmix:tagged', multiple: true});
            expect(byName['j:defaultCategory'], 'a reference to a node that is not a file fills nothing').to.be
                .undefined;
            expect(byName.openGraphImage).to.include({declaringType: 'jmix:seoHtmlHead'});
            expect(byName.openGraphImage.compatibleOgKinds).to.deep.equal(['URL', 'IMAGE']);
            expect(byName['jcr:primaryType'], 'a NAME property fills nothing').to.be.undefined;
            expect(byName['j:expiration']).to.include({requiredType: 'LONG', declaringType: 'jmix:cache'});
            expect(byName['j:expiration'].compatibleOgKinds, 'a LONG fills an integer or a number').to.deep.equal([
                'INTEGER',
                'NUMBER'
            ]);
            properties
                .filter(property => property.requiredType !== 'LONG')
                .forEach(property => {
                    expect(property.compatibleOgKinds, `${property.name} (${property.requiredType})`).not.to.include(
                        'INTEGER'
                    );
                });
        });
    });

    it('saves an article mapping on jnt:news and reads it back', () => {
        saveMapping(ARTICLE_MAPPING).then(result => {
            expectNoError(result);
            expect(result.data.jcr.mutateNode.saveOpenGraphMapping).to.equal(true);
        });
        expectMappings([ARTICLE_MAPPING]);
    });

    it('resolves the Open Graph tags of a news item with the article mapping', () => {
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(tags[0]).to.deep.equal({
                property: 'og:title',
                content: 'Open Graph news',
                nodePath: null,
                sourceProperty: 'jcr:title'
            });
            expect(tags[1]).to.deep.equal({
                property: 'og:type',
                content: 'article',
                nodePath: null,
                sourceProperty: null
            });
            expect(tags[2]).to.deep.equal({
                property: 'og:url',
                content: null,
                nodePath: NEWS_PATH,
                sourceProperty: null
            });
            expect(contentsOf(tags, 'og:description')).to.deep.equal(['First paragraph & more']);
            expect(contentsOf(tags, 'article:published_time')).to.deep.equal(['2026-10-19T09:30:00Z']);
            expect(contentsOf(tags, 'article:tag')).to.deep.equal(['alpha', 'beta']);
            expect(contentsOf(tags, 'og:locale')).to.deep.equal(['en']);
            expect(contentsOf(tags, 'og:site_name')).to.have.length(1);
            expect(contentsOf(tags, 'og:image'), 'the news item has no image').to.be.empty;
            expect(tags[tags.length - 1]).to.deep.equal({
                property: 'twitter:card',
                content: 'summary',
                nodePath: null,
                sourceProperty: null
            });
        });
    });

    it('names the source property of a tag whose value is the text of one property', () => {
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(sourcesOf(tags, 'og:description'), 'a rich text').to.deep.equal(['desc']);
            expect(sourcesOf(tags, 'article:published_time'), 'a date').to.deep.equal([null]);
            expect(sourcesOf(tags, 'article:tag'), 'a property with several values').to.deep.equal([null, null]);
            expect(sourcesOf(tags, 'og:locale'), 'a value of the server').to.deep.equal([null]);
        });
    });

    it('updates the mapping of jnt:news to a website with the title only', () => {
        const properties = [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}];
        saveMapping({nodeType: NEWS_TYPE, ogType: 'website', properties}).then(expectNoError);
        expectMappings([{nodeType: NEWS_TYPE, ogType: 'website', properties}]);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'og:type')).to.deep.equal(['website']);
            expect(contentsOf(tags, 'og:description')).to.be.empty;
            expect(contentsOf(tags, 'article:tag')).to.be.empty;
        });
    });

    it('saves a video.movie mapping on jnt:news, and resolves its tags', () => {
        saveMapping(VIDEO_MAPPING).then(expectNoError);
        expectMappings([VIDEO_MAPPING]);
        getStoredMapping(NEWS_TYPE).then(stored => {
            expect(stored.mixins).to.include('sdmmix:videoMovie');
            expect(stored.properties).to.include.members(['sdm:video_release_date', 'sdm:video_tag']);
        });
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'og:type')).to.deep.equal(['video.movie']);
            expect(contentsOf(tags, 'video:release_date')).to.deep.equal(['2026-10-19T09:30:00Z']);
            expect(contentsOf(tags, 'video:tag')).to.deep.equal(['alpha', 'beta']);
            expect(contentsOf(tags, 'og:determiner'), 'the title is not a determiner').to.be.empty;
            expect(contentsOf(tags, 'video:actor')).to.deep.equal(['Open Graph news']);
            expect(sourcesOf(tags, 'video:actor'), 'the root of a structured array').to.deep.equal([null]);
        });
    });

    it('drops the video properties and the video mixin when the og:type becomes music.song', () => {
        const properties = [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}];
        saveMapping({nodeType: NEWS_TYPE, ogType: 'music.song', properties}).then(expectNoError);
        expectMappings([{nodeType: NEWS_TYPE, ogType: 'music.song', properties}]);
        getStoredMapping(NEWS_TYPE).then(stored => {
            expect(stored.mixins)
                .to.include('sdmmix:musicSong')
                .and.include('sdmmix:openGraph')
                .and.not.include('sdmmix:videoMovie');
            expect(stored.properties.filter(name => name.startsWith('sdm:video_'))).to.be.empty;
        });
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'og:type')).to.deep.equal(['music.song']);
            expect(tags.map(tag => tag.property).filter(property => property.startsWith('video:'))).to.be.empty;
        });
    });

    it('drops the Open Graph properties and mixins without an og:type, and the news item then has no tag', () => {
        saveMapping({nodeType: NEWS_TYPE, ogType: null, properties: []}).then(expectNoError);
        expectMappings([{nodeType: NEWS_TYPE, ogType: null, properties: []}]);
        getStoredMapping(NEWS_TYPE).then(stored => {
            expect(stored.mixins).not.to.include('sdmmix:openGraph').and.not.include('sdmmix:musicSong');
            expect(stored.properties.filter(name => name.startsWith('sdm:og') || name.startsWith('sdm:music_'))).to.be
                .empty;
        });
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(result.data.jcr.nodeByPath.openGraphTags).to.be.empty;
        });
    });

    it('fills music:duration from a LONG property, and names no source property', () => {
        const properties = [
            {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
            {ogProperty: 'music:duration', sourceProperty: 'j:expiration'}
        ];
        saveMapping({nodeType: NEWS_TYPE, ogType: 'music.song', properties}).then(expectNoError);
        expectMappings([{nodeType: NEWS_TYPE, ogType: 'music.song', properties}]);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'music:duration')).to.deep.equal(['215']);
            expect(sourcesOf(tags, 'music:duration'), 'a number').to.deep.equal([null]);
        });
    });

    it('names no source property for og:video when og:video:width follows it', () => {
        const video = {ogProperty: 'og:video', sourceProperty: 'jcr:title'};
        saveMapping({nodeType: NEWS_TYPE, ogType: 'website', properties: [video]}).then(expectNoError);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(sourcesOf(result.data.jcr.nodeByPath.openGraphTags, 'og:video'), 'a root alone').to.deep.equal([
                'jcr:title'
            ]);
        });

        const width = {ogProperty: 'og:video:width', sourceProperty: 'j:expiration'};
        saveMapping({nodeType: NEWS_TYPE, ogType: 'website', properties: [video, width]}).then(expectNoError);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'og:video')).to.deep.equal(['Open Graph news']);
            expect(sourcesOf(tags, 'og:video'), 'a root with a structured property').to.deep.equal([null]);
            expect(contentsOf(tags, 'og:video:width')).to.deep.equal(['215']);
        });
    });

    it('applies a mapping on jnt:page to a page, with og:title from jcr:title by default', () => {
        saveMapping({nodeType: 'jnt:page', ogType: 'website', properties: []}).then(expectNoError);
        getTags(HOME_PATH).then(result => {
            expectNoError(result);
            const tags = result.data.jcr.nodeByPath.openGraphTags;
            expect(contentsOf(tags, 'og:title')).to.have.length(1);
            expect(contentsOf(tags, 'og:type')).to.deep.equal(['website']);
            expect(tags.find(tag => tag.property === 'og:url').nodePath).to.equal(HOME_PATH);
        });
        deleteMapping('jnt:page').then(expectNoError);
    });

    it('deletes the mapping of jnt:news, and the news item then has no Open Graph tag', () => {
        deleteMapping(NEWS_TYPE).then(result => {
            expectNoError(result);
            expect(result.data.jcr.mutateNode.deleteOpenGraphMapping).to.equal(true);
        });
        expectMappings([]);
        getTags(NEWS_PATH).then(result => {
            expectNoError(result);
            expect(result.data.jcr.nodeByPath.openGraphTags).to.be.empty;
        });
    });

    describe('refuses an invalid mapping', () => {
        const title = [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}];
        const refusals = [
            {
                reason: 'a content type that is not jnt:page and does not inherit jmix:mainResource',
                nodeType: 'jnt:text',
                ogType: 'website',
                properties: title,
                message: 'does not inherit jmix:mainResource'
            },
            {
                reason: 'an unknown content type',
                nodeType: 'sdmnt:doesNotExist',
                ogType: 'website',
                properties: title,
                message: "Unknown content type 'sdmnt:doesNotExist'"
            },
            {
                reason: 'a content type of a module that is not active on the site',
                nodeType: NEWS_TYPE,
                ogType: 'website',
                properties: title,
                path: `/sites/${SITE_WITHOUT_NEWS}`,
                message: "belongs to the module 'news', which is not active on the site"
            },
            {
                reason: 'an unknown og:type',
                nodeType: NEWS_TYPE,
                ogType: 'restaurant.menu',
                properties: title,
                message: "Unknown og:type 'restaurant.menu'"
            },
            {
                reason: 'an Open Graph property without an og:type',
                nodeType: NEWS_TYPE,
                ogType: null,
                properties: title,
                message: 'An Open Graph property needs an og:type'
            },
            {
                reason: 'an Open Graph property that the module computes',
                nodeType: NEWS_TYPE,
                ogType: 'article',
                properties: [{ogProperty: 'og:url', sourceProperty: 'jcr:title'}],
                message: "Unknown Open Graph property 'og:url'"
            },
            {
                reason: 'an Open Graph property of another og:type',
                nodeType: NEWS_TYPE,
                ogType: 'article',
                properties: [{ogProperty: 'book:isbn', sourceProperty: 'jcr:title'}],
                message: "Unknown Open Graph property 'book:isbn' for the og:type 'article'"
            },
            {
                reason: 'a property of video.episode on video.movie',
                nodeType: NEWS_TYPE,
                ogType: 'video.movie',
                properties: [{ogProperty: 'video:series', sourceProperty: 'jcr:title'}],
                message: "Unknown Open Graph property 'video:series' for the og:type 'video.movie'"
            },
            {
                reason: 'a source property that the content type does not have',
                nodeType: NEWS_TYPE,
                ogType: 'article',
                properties: [{ogProperty: 'og:title', sourceProperty: 'doesNotExist'}],
                message: "has no property 'doesNotExist'"
            },
            {
                reason: 'a source property whose value cannot fill the Open Graph property',
                nodeType: NEWS_TYPE,
                ogType: 'article',
                properties: [{ogProperty: 'og:image', sourceProperty: 'date'}],
                message: "The property 'date' (DATE) cannot fill 'og:image'"
            },
            {
                reason: 'a text source property for a whole number Open Graph property',
                nodeType: NEWS_TYPE,
                ogType: 'music.song',
                properties: [{ogProperty: 'music:duration', sourceProperty: 'jcr:title'}],
                message: "The property 'jcr:title' (STRING) cannot fill 'music:duration'"
            },
            {
                reason: 'a source property with several values for a text Open Graph property with one value',
                nodeType: NEWS_TYPE,
                ogType: 'article',
                properties: [{ogProperty: 'og:title', sourceProperty: 'j:tagList'}],
                message: "The property 'j:tagList' holds several values and cannot fill 'og:title'"
            },
            {
                reason: 'an Open Graph property mapped twice',
                nodeType: NEWS_TYPE,
                ogType: 'article',
                properties: [...title, {ogProperty: 'og:title', sourceProperty: 'desc'}],
                message: "The Open Graph property 'og:title' is mapped twice"
            },
            {
                reason: 'a node that is not a site node',
                nodeType: NEWS_TYPE,
                ogType: 'article',
                properties: title,
                path: NEWS_PATH,
                message: 'is not a site node'
            }
        ];

        refusals.forEach(refusal => {
            it(`refuses ${refusal.reason}`, () => {
                saveMapping(refusal, {path: refusal.path}).then(expectError(refusal.message));
                expectMappings([]);
            });
        });
    });

    describe('checks the permission structuredDataMapperManage on the site', () => {
        it('denies every mapping field to the editor', () => {
            getMappings({user: EDITOR}).then(expectError(PERMISSION));
            getSourceProperties(NEWS_TYPE, {user: EDITOR}).then(expectError(PERMISSION));
            saveMapping(ARTICLE_MAPPING, {user: EDITOR}).then(expectError(PERMISSION));
            deleteMapping(NEWS_TYPE, {user: EDITOR}).then(expectError(PERMISSION));
            expectMappings([]);
        });

        [SITE_ADMIN, EDITOR_IN_CHIEF].forEach(user => {
            it(`lets the ${user.role} save, read and delete a mapping`, () => {
                saveMapping(ARTICLE_MAPPING, {user}).then(expectNoError);
                getMappings({user}).its('data.jcr.nodeByPath.openGraphMappings').should('have.length', 1);
                deleteMapping(NEWS_TYPE, {user}).then(expectNoError);
                expectMappings([]);
            });
        });

        it('lets the editor read the Open Graph tags of a content node', () => {
            saveMapping(ARTICLE_MAPPING).then(expectNoError);
            getTags(NEWS_PATH, EDITOR).then(result => {
                expectNoError(result);
                expect(contentsOf(result.data.jcr.nodeByPath.openGraphTags, 'og:title')).to.deep.equal([
                    'Open Graph news'
                ]);
            });
            deleteMapping(NEWS_TYPE).then(expectNoError);
        });
    });
});

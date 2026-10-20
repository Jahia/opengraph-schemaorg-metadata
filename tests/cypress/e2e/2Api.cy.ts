import {addNode, createSite, deleteNode, deleteSite} from '@jahia/cypress';
import {
    deleteMapping,
    expectError,
    expectNoError,
    getMappings,
    getSourceProperties,
    getTags,
    getVocabulary,
    OgTag,
    PropertyMapping,
    saveMapping,
    SourceProperty,
    TypeMapping
} from '../support/openGraphApi';
import {EDITOR, EDITOR_IN_CHIEF, PERMISSION, SITE_ADMIN, SITE_PATH, TEMPLATE_SET} from '../support/veryOpenGraph';

const NEWS_TYPE = 'jnt:news';
const NEWS_NAME = 'vog-api-news';
const NEWS_PATH = `${SITE_PATH}/contents/${NEWS_NAME}`;
const HOME_PATH = `${SITE_PATH}/home`;
const SITE_WITHOUT_NEWS = 'vogSiteNoNews';

const ARTICLE_PROPERTIES: PropertyMapping[] = [
    {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
    {ogProperty: 'og:description', sourceProperty: 'desc'},
    {ogProperty: 'og:image', sourceProperty: 'image'},
    {ogProperty: 'article:published_time', sourceProperty: 'date'},
    {ogProperty: 'article:tag', sourceProperty: 'j:tagList'}
];
const ARTICLE_MAPPING: TypeMapping = {nodeType: NEWS_TYPE, ogType: 'article', properties: ARTICLE_PROPERTIES};

const contentsOf = (tags: OgTag[], property: string) =>
    tags.filter(tag => tag.property === property).map(tag => tag.content);

const sourcesOf = (tags: OgTag[], property: string) =>
    tags.filter(tag => tag.property === property).map(tag => tag.sourceProperty);

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
            mixins: ['jmix:tagged'],
            properties: [
                {name: 'jcr:title', value: 'Open Graph news', language: 'en'},
                {name: 'desc', value: '<p>First <strong>paragraph</strong> &amp; more</p>', language: 'en'},
                {name: 'date', value: '2026-10-19T09:30:00.000Z'},
                {name: 'j:tagList', values: ['alpha', 'beta']}
            ]
        });
        createSite(SITE_WITHOUT_NEWS, {templateSet: TEMPLATE_SET, serverName: 'vogsitenonews', locale: 'en'});
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
            expect(ogTypes.map(ogType => ogType.name)).to.deep.equal(['website', 'article', 'book', 'profile']);
            const article = ogTypes.find(ogType => ogType.name === 'article').properties;
            expect(article).to.deep.include({name: 'og:image', kind: 'IMAGE', multiple: false});
            expect(article).to.deep.include({name: 'article:published_time', kind: 'DATE', multiple: false});
            expect(article).to.deep.include({name: 'article:tag', kind: 'TEXT', multiple: true});
            expect(article.map(property => property.name)).not.to.include('og:url');
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
                nodeType: 'vognt:doesNotExist',
                ogType: 'website',
                properties: title,
                message: "Unknown content type 'vognt:doesNotExist'"
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
                ogType: 'video.movie',
                properties: title,
                message: "Unknown og:type 'video.movie'"
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

    describe('checks the permission veryOpenGraphManage on the site', () => {
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

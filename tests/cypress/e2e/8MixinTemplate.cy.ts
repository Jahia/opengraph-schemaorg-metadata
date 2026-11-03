import {addNode} from '@jahia/cypress';
import {
    deleteMapping,
    expectError,
    expectNoError,
    getMappingTargets,
    getSourceProperties,
    getTags,
    saveMapping,
    TypeMapping
} from '../support/openGraphApi';
import {deleteEverywhere, getLivePage, metaContents, publish} from '../support/livePage';
import {SITE_PATH} from '../support/openGraphSchemaOrgMetadata';

// A mixin of Jahia core that extends jnt:page, with the property j:pageTemplateTitle.
const MIXIN = 'jmix:canBeUseAsTemplateModel';
// The one page template of templates-system, the template set of osmSite.
const TEMPLATE = 'home';
const PAGE_PATH = `${SITE_PATH}/home/osm-plain-page`;
const MIXIN_PAGE_PATH = `${SITE_PATH}/home/osm-mixin-page`;
const OTHER_TEMPLATE_PAGE_PATH = `${SITE_PATH}/home/osm-other-template-page`;

const PAGE_MAPPING: TypeMapping = {
    nodeType: 'jnt:page',
    ogType: 'website',
    properties: [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}]
};
const MIXIN_MAPPING: TypeMapping = {
    nodeType: MIXIN,
    ogType: 'article',
    properties: [
        {ogProperty: 'og:title', sourceProperty: 'jcr:title'},
        {ogProperty: 'og:description', sourceProperty: 'j:pageTemplateTitle'}
    ]
};
const TEMPLATE_MAPPING: TypeMapping = {
    nodeType: 'jnt:page',
    templateName: TEMPLATE,
    ogType: 'profile',
    properties: [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}]
};

const addPage = (path: string, title: string, templateName: string, mixins: string[] = []) => {
    const name = path.substring(path.lastIndexOf('/') + 1);
    addNode({
        parentPathOrId: `${SITE_PATH}/home`,
        name,
        primaryNodeType: 'jnt:page',
        mixins,
        properties: [
            {name: 'jcr:title', value: title, language: 'en'},
            {name: 'j:templateName', value: templateName},
            ...(mixins.includes(MIXIN) ? [{name: 'j:pageTemplateTitle', value: 'A page model', language: 'en'}] : [])
        ]
    });
};

// The og:type that openGraphTags resolves for a node in the default workspace.
const expectOgType = (path: string, ogType: string) => {
    getTags(path).then(result => {
        expectNoError(result);
        const types = result.data.jcr.nodeByPath.openGraphTags.filter(tag => tag.property === 'og:type');
        expect(
            types.map(tag => tag.content),
            `og:type of ${path}`
        ).to.deep.equal([ogType]);
    });
};

const expectLiveOgType = (path: string, ogType: string) => {
    getLivePage(path).then(page =>
        expect(metaContents(page, 'og:type'), `live og:type of ${path}`).to.deep.equal([ogType])
    );
};

const deleteAllMappings = () => {
    deleteMapping('jnt:page');
    deleteMapping('jnt:page', {templateName: TEMPLATE});
    deleteMapping(MIXIN);
};

describe('Open Graph mappings of a mixin and of a template', () => {
    before(() => {
        deleteAllMappings();
        [PAGE_PATH, MIXIN_PAGE_PATH, OTHER_TEMPLATE_PAGE_PATH].forEach(deleteEverywhere);
        addPage(PAGE_PATH, 'Plain page', TEMPLATE);
        addPage(MIXIN_PAGE_PATH, 'Mixin page', TEMPLATE, [MIXIN]);
        // No template of the site has this name, so the page is checked through the API only.
        addPage(OTHER_TEMPLATE_PAGE_PATH, 'Other template page', 'osm-other');
        publish(SITE_PATH);
    });

    after(() => {
        deleteAllMappings();
        [PAGE_PATH, MIXIN_PAGE_PATH, OTHER_TEMPLATE_PAGE_PATH].forEach(deleteEverywhere);
    });

    it('offers the properties of a mixin and of the page type that the mixin extends', () => {
        getSourceProperties(MIXIN).then(result => {
            expectNoError(result);
            const names = result.data.jcr.nodeByPath.openGraphSourceProperties.map(property => property.name);
            expect(names).to.include.members(['j:pageTemplateTitle', 'jcr:title']);
        });
    });

    it('applies the mapping of a mixin to the pages that carry it, before the mapping of jnt:page', () => {
        saveMapping(PAGE_MAPPING).then(expectNoError);
        saveMapping(MIXIN_MAPPING).then(expectNoError);
        expectOgType(MIXIN_PAGE_PATH, 'article');
        expectOgType(PAGE_PATH, 'website');
        getLivePage(MIXIN_PAGE_PATH).then(page => {
            expect(metaContents(page, 'og:type')).to.deep.equal(['article']);
            expect(metaContents(page, 'og:description')).to.deep.equal(['A page model']);
        });
        expectLiveOgType(PAGE_PATH, 'website');
    });

    it('applies a template mapping before the mapping of a mixin, to the pages of its template only', () => {
        saveMapping(TEMPLATE_MAPPING).then(expectNoError);
        expectOgType(MIXIN_PAGE_PATH, 'profile');
        expectOgType(PAGE_PATH, 'profile');
        expectOgType(OTHER_TEMPLATE_PAGE_PATH, 'website');
        expectLiveOgType(MIXIN_PAGE_PATH, 'profile');
    });

    it('lists each mapping with its label and its template', () => {
        getMappingTargets().then(result => {
            expectNoError(result);
            const targets = result.data.jcr.nodeByPath.openGraphMappings.map(({nodeType, templateName, ogType}) => ({
                nodeType,
                templateName,
                ogType
            }));
            expect(targets).to.deep.equal([
                {nodeType: 'jnt:page', templateName: null, ogType: 'website'},
                {nodeType: MIXIN, templateName: null, ogType: 'article'},
                {nodeType: 'jnt:page', templateName: TEMPLATE, ogType: 'profile'}
            ]);
            result.data.jcr.nodeByPath.openGraphMappings.forEach(
                mapping =>
                    expect(mapping.nodeTypeDisplayName, `label of ${mapping.nodeType}`).to.be.a('string').and.not.be
                        .empty
            );
        });
    });

    it('deletes the template mapping alone, and the mixin mapping applies again', () => {
        deleteMapping('jnt:page', {templateName: TEMPLATE}).then(expectNoError);
        expectOgType(MIXIN_PAGE_PATH, 'article');
        expectOgType(PAGE_PATH, 'website');
        getMappingTargets().then(result => {
            expectNoError(result);
            expect(result.data.jcr.nodeByPath.openGraphMappings.map(mapping => mapping.templateName)).to.deep.equal([
                null,
                null
            ]);
        });
    });

    describe('refuses an invalid template mapping', () => {
        const title = [{ogProperty: 'og:title', sourceProperty: 'jcr:title'}];
        const refusals = [
            {
                reason: 'a template that the site does not have',
                mapping: {nodeType: 'jnt:page', templateName: 'osm-other', ogType: 'website', properties: title},
                message: "has no template 'osm-other'"
            },
            {
                reason: 'a template on a mixin',
                mapping: {nodeType: MIXIN, templateName: TEMPLATE, ogType: 'website', properties: title},
                message: 'so a template mapping cannot use it'
            },
            {
                reason: 'a template on a content type that has no template',
                mapping: {nodeType: 'jnt:news', templateName: TEMPLATE, ogType: 'website', properties: title},
                message: 'so a template mapping cannot use it'
            }
        ];

        refusals.forEach(refusal => {
            it(`refuses ${refusal.reason}`, () => {
                saveMapping(refusal.mapping).then(expectError(refusal.message));
            });
        });
    });
});

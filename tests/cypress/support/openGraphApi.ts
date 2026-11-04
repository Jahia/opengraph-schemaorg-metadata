import {SETTINGS_PATH, SITE_PATH, TestUser} from './openGraphSchemaOrgMetadata';

const FIXTURES = 'graphql/openGraphSchemaOrgMetadata';

export type PropertyMapping = {ogProperty: string; sourceProperty: string};
export type SchemaPropertyMapping = {schemaProperty: string; sourceProperty: string};
// A template mapping names its template. openGraphMappings does not read it, so a deep comparison ignores it. A mapping
// with a null ogType writes no Open Graph tag, and a mapping without schemaType writes no JSON-LD. The query of
// mappings.graphql does not read the schema.org fields.
export type TypeMapping = {
    nodeType: string;
    templateName?: string;
    ogType: string | null;
    properties: PropertyMapping[];
    schemaType?: string;
    schemaProperties?: SchemaPropertyMapping[];
};
export type SchemaMapping = {
    uuid: string;
    nodeType: string;
    schemaType: string | null;
    schemaProperties: SchemaPropertyMapping[];
};
export type MappingTarget = {
    nodeType: string;
    nodeTypeDisplayName: string | null;
    templateName: string | null;
    ogType: string | null;
};
export type OgTag = {property: string; content: string | null; nodePath: string | null; sourceProperty: string | null};
export type SourceProperty = {
    name: string;
    displayName: string;
    requiredType: string;
    multiple: boolean;
    internationalized: boolean;
    declaringType: string;
    compatibleOgKinds: string[];
};
export type SourceChoices = {property: string; choices: {value: string; label: string}[]};
export type OgVocabulary = {
    ogTypes: {name: string; properties: {name: string; kind: string; multiple: boolean}[]}[];
};
export type GqlResult<T> = {data?: T; errors?: {message: string}[]};

type NodeData<T> = {jcr: {nodeByPath: T | null}};
type MutationData<T> = {jcr: {mutateNode: T | null}};
type ApolloRequest = {queryFile?: string; mutationFile?: string; variables?: Record<string, unknown>};

// Apollo adds __typename to every object, and a deep comparison must not see it.
const withoutTypename = <T>(result: GqlResult<T>): GqlResult<T> => ({
    errors: result.errors,
    data:
        result.data &&
        JSON.parse(JSON.stringify(result.data, (key, value) => (key === '__typename' ? undefined : value)))
});

// Runs a request as root, or as the given user, and keeps the GraphQL errors in the result.
const run = <T>(request: ApolloRequest, user?: TestUser): Cypress.Chainable<GqlResult<T>> => {
    const options = {...request, errorPolicy: 'all' as const};
    if (!user) {
        return cy.apollo(options).then(result => withoutTypename(result as unknown as GqlResult<T>));
    }

    return cy
        .apolloClient({username: user.username, password: user.password})
        .apollo(options)
        .then(result => {
            cy.apolloClient();
            return cy.wrap(withoutTypename(result as unknown as GqlResult<T>), {log: false});
        });
};

export const getVocabulary = (user?: TestUser) =>
    run<{openGraphVocabulary: OgVocabulary}>({queryFile: `${FIXTURES}/vocabulary.graphql`}, user);

// The user runs the request, root when absent, on the site node at path, osmSite when absent.
export type Scope = {user?: TestUser; path?: string};

export const getMappings = ({user, path = SITE_PATH}: Scope = {}) =>
    run<NodeData<{openGraphMappings: TypeMapping[] | null}>>(
        {queryFile: `${FIXTURES}/mappings.graphql`, variables: {path}},
        user
    );

// The content type or the mixin of each mapping, with its schema.org type and properties.
export const getSchemaMappings = ({user, path = SITE_PATH}: Scope = {}) =>
    run<NodeData<{openGraphMappings: SchemaMapping[] | null}>>(
        {queryFile: `${FIXTURES}/schemaMappings.graphql`, variables: {path}},
        user
    );

// The target of each mapping: its content type or mixin, with its label, and its template.
export const getMappingTargets = ({user, path = SITE_PATH}: Scope = {}) =>
    run<NodeData<{openGraphMappings: MappingTarget[] | null}>>(
        {queryFile: `${FIXTURES}/mappingTargets.graphql`, variables: {path, language: 'en'}},
        user
    );

export const getSourceProperties = (nodeType: string, {user, path = SITE_PATH}: Scope = {}) =>
    run<NodeData<{openGraphSourceProperties: SourceProperty[] | null}>>(
        {queryFile: `${FIXTURES}/sourceProperties.graphql`, variables: {path, nodeType, language: 'en'}},
        user
    );

// The choices of every source field of a mapping, as the form of a mapping lists them.
export const getSourceChoices = (nodeType: string, {user, path = SITE_PATH}: Scope = {}) =>
    run<NodeData<{openGraphSourceChoices: SourceChoices[] | null}>>(
        {queryFile: `${FIXTURES}/sourceChoices.graphql`, variables: {path, nodeType, language: 'en'}},
        user
    );

// The values of the field osm:templateName once the form of a new mapping has the content type nodeType.
export const getTemplateChoices = (nodeType: string): Cypress.Chainable<string[]> =>
    run<{forms: {fieldConstraints: {value: {string: string}}[]}}>({
        queryFile: `${FIXTURES}/templateChoices.graphql`,
        variables: {
            path: SITE_PATH,
            context: [
                {key: 'dependentProperties', value: 'osm:nodeType'},
                {key: 'osm:nodeType', value: [nodeType]}
            ]
        }
    }).then(result => {
        expectNoError(result);
        return result.data.forms.fieldConstraints.map(constraint => constraint.value.string);
    });

// The templates folder of the module news, which holds its content template news-template.
export const getNewsTemplatesFolder = (): Cypress.Chainable<string> =>
    run<{jcr: {nodesByQuery: {nodes: {parent: {path: string}}[]}}}>({
        queryFile: `${FIXTURES}/newsTemplatesFolder.graphql`
    }).then(result => {
        expectNoError(result);
        return result.data.jcr.nodesByQuery.nodes[0].parent.path;
    });

export const getTags = (path: string, user?: TestUser) =>
    run<NodeData<{openGraphTags: OgTag[] | null}>>(
        {queryFile: `${FIXTURES}/tags.graphql`, variables: {path, language: 'en'}},
        user
    );

export const saveMapping = (
    {nodeType, templateName, ogType, properties, schemaType, schemaProperties}: TypeMapping,
    {user, path = SITE_PATH}: Scope = {}
) =>
    run<MutationData<{saveOpenGraphMapping: boolean | null}>>(
        {
            mutationFile: `${FIXTURES}/saveMapping.graphql`,
            variables: {path, nodeType, templateName, ogType, properties, schemaType, schemaProperties}
        },
        user
    );

// Deletes the mapping of every template, or the template mapping of templateName.
export const deleteMapping = (
    nodeType: string,
    {user, path = SITE_PATH, templateName}: Scope & {templateName?: string} = {}
) =>
    run<MutationData<{deleteOpenGraphMapping: boolean | null}>>(
        {mutationFile: `${FIXTURES}/deleteMapping.graphql`, variables: {path, nodeType, templateName}},
        user
    );

export type CustomTagsNode = {uuid: string; mixinTypes: {name: string}[]; property: {values: string[]} | null};

// The mixin types of a node, and the English values of osm:customTags.
export const getCustomTags = (path: string) =>
    run<NodeData<CustomTagsNode>>({queryFile: `${FIXTURES}/customTags.graphql`, variables: {path}});

// Adds the mixin osmmix:customTags to a node, and sets the English values of osm:customTags.
export const setCustomTags = (path: string, values: string[]) =>
    run<MutationData<unknown>>({mutationFile: `${FIXTURES}/setCustomTags.graphql`, variables: {path, values}});

// The mixin types of a node, and the English values of osm:customSchemaOrg.
export const getCustomSchemaValues = (path: string) =>
    run<NodeData<CustomTagsNode>>({queryFile: `${FIXTURES}/customSchemaValues.graphql`, variables: {path}});

// Adds the mixin osmmix:customSchemaOrg to a node, and sets the English values of osm:customSchemaOrg.
export const setCustomSchemaValues = (path: string, values: string[]) =>
    run<MutationData<unknown>>({mutationFile: `${FIXTURES}/setCustomSchemaValues.graphql`, variables: {path, values}});

// The English JSON-LD of a node as the field schemaOrgJsonLd gives it, parsed, or null when the node has none.
export const getJsonLd = (path: string, user?: TestUser): Cypress.Chainable<Record<string, unknown> | null> =>
    run<NodeData<{schemaOrgJsonLd: string | null}>>(
        {queryFile: `${FIXTURES}/schemaOrgJsonLd.graphql`, variables: {path, language: 'en'}},
        user
    ).then(result => {
        expectNoError(result);
        const jsonLd = result.data.jcr.nodeByPath.schemaOrgJsonLd;
        return jsonLd === null ? null : (JSON.parse(jsonLd) as Record<string, unknown>);
    });

export const expectNoError = <T>(result: GqlResult<T>) => {
    expect(result.errors, `GraphQL errors: ${JSON.stringify(result.errors?.map(error => error.message))}`).to.be
        .undefined;
};

export const expectError =
    (message: string) =>
    <T>(result: GqlResult<T>) => {
        expect(result.errors, 'GraphQL errors').to.have.length.at.least(1);
        expect(result.errors[0].message).to.contain(message);
    };

type MappingNode = {
    path: string;
    nodeType: {value: string} | null;
    mixinTypes: {name: string}[];
    properties: {name: string}[];
};
export type StoredMapping = {path: string; mixins: string[]; properties: string[]};

// Sets one property of a node through the generic node mutation of GraphQL, the way the Content Editor saves a field.
export const setNodeProperty = (path: string, name: string, value: string, user?: TestUser) =>
    run<MutationData<unknown>>(
        {mutationFile: `${FIXTURES}/setNodeProperty.graphql`, variables: {path, name, value}},
        user
    );

// Adds a mapping node of a content type under the settings node through the generic node mutation of GraphQL.
export const addMappingNode = (name: string, nodeType: string, user?: TestUser) =>
    run<MutationData<unknown>>(
        {mutationFile: `${FIXTURES}/addMappingNode.graphql`, variables: {path: SETTINGS_PATH, name, nodeType}},
        user
    );

// The path, the mixins and the property names of the mapping node of a content type, as root reads them in the
// repository. openGraphMappings reads the properties of the og:type of the mapping only, so it does not show a property
// that stays.
export const getStoredMapping = (nodeType: string): Cypress.Chainable<StoredMapping> =>
    run<NodeData<{children: {nodes: MappingNode[]}}>>({
        queryFile: `${FIXTURES}/mappingNodes.graphql`,
        variables: {path: SETTINGS_PATH}
    }).then(result => {
        expectNoError(result);
        const node = result.data.jcr.nodeByPath.children.nodes.find(
            candidate => candidate.nodeType?.value === nodeType
        );
        expect(node, `the mapping node of ${nodeType}`).to.exist;
        return {
            path: node.path,
            mixins: node.mixinTypes.map(mixin => mixin.name),
            properties: node.properties.map(property => property.name)
        };
    });

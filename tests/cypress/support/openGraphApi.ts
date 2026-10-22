import {SETTINGS_PATH, SITE_PATH, TestUser} from './structuredDataMapper';

const FIXTURES = 'graphql/structuredDataMapper';

export type PropertyMapping = {ogProperty: string; sourceProperty: string};
export type TypeMapping = {nodeType: string; ogType: string; properties: PropertyMapping[]};
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

// The user runs the request, root when absent, on the site node at path, sdmSite when absent.
export type Scope = {user?: TestUser; path?: string};

export const getMappings = ({user, path = SITE_PATH}: Scope = {}) =>
    run<NodeData<{openGraphMappings: TypeMapping[] | null}>>(
        {queryFile: `${FIXTURES}/mappings.graphql`, variables: {path}},
        user
    );

export const getSourceProperties = (nodeType: string, {user, path = SITE_PATH}: Scope = {}) =>
    run<NodeData<{openGraphSourceProperties: SourceProperty[] | null}>>(
        {queryFile: `${FIXTURES}/sourceProperties.graphql`, variables: {path, nodeType, language: 'en'}},
        user
    );

export const getTags = (path: string, user?: TestUser) =>
    run<NodeData<{openGraphTags: OgTag[] | null}>>(
        {queryFile: `${FIXTURES}/tags.graphql`, variables: {path, language: 'en'}},
        user
    );

export const saveMapping = ({nodeType, ogType, properties}: TypeMapping, {user, path = SITE_PATH}: Scope = {}) =>
    run<MutationData<{saveOpenGraphMapping: boolean | null}>>(
        {mutationFile: `${FIXTURES}/saveMapping.graphql`, variables: {path, nodeType, ogType, properties}},
        user
    );

export const deleteMapping = (nodeType: string, {user, path = SITE_PATH}: Scope = {}) =>
    run<MutationData<{deleteOpenGraphMapping: boolean | null}>>(
        {mutationFile: `${FIXTURES}/deleteMapping.graphql`, variables: {path, nodeType}},
        user
    );

export type CustomTagsNode = {uuid: string; mixinTypes: {name: string}[]; property: {values: string[]} | null};

// The mixin types of a node, and the English values of sdm:customTags.
export const getCustomTags = (path: string) =>
    run<NodeData<CustomTagsNode>>({queryFile: `${FIXTURES}/customTags.graphql`, variables: {path}});

// Adds the mixin sdmmix:customTags to a node, and sets the English values of sdm:customTags.
export const setCustomTags = (path: string, values: string[]) =>
    run<MutationData<unknown>>({mutationFile: `${FIXTURES}/setCustomTags.graphql`, variables: {path, values}});

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

type MappingNode = {nodeType: {value: string} | null; mixinTypes: {name: string}[]; properties: {name: string}[]};
export type StoredMapping = {mixins: string[]; properties: string[]};

// The mixins and the property names of the mapping node of a content type, as root reads them in the repository.
// openGraphMappings reads the properties of the og:type of the mapping only, so it does not show a property that stays.
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
            mixins: node.mixinTypes.map(mixin => mixin.name),
            properties: node.properties.map(property => property.name)
        };
    });

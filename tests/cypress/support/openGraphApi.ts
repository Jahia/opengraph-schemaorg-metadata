import {SITE_PATH, TestUser} from './veryOpenGraph';

const FIXTURES = 'graphql/veryOpenGraph';

export type PropertyMapping = {ogProperty: string; sourceProperty: string};
export type TypeMapping = {nodeType: string; ogType: string; properties: PropertyMapping[]};
export type OgTag = {property: string; content: string | null; nodePath: string | null};
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

// The user runs the request, root when absent, on the site node at path, vogSite when absent.
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

export const expectNoError = <T>(result: GqlResult<T>) => {
    expect(result.errors, 'GraphQL errors').to.be.undefined;
};

export const expectError =
    (message: string) =>
    <T>(result: GqlResult<T>) => {
        expect(result.errors, 'GraphQL errors').to.have.length.at.least(1);
        expect(result.errors[0].message).to.contain(message);
    };

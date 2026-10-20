import { gql } from "@apollo/client";

export type OgKind = "TEXT" | "DATE" | "URL" | "IMAGE";

export type OgProperty = { name: string; kind: OgKind };

export type OgType = { name: string; properties: OgProperty[] };

export type PropertyMapping = { ogProperty: string; sourceProperty: string };

export type TypeMapping = { nodeType: string; ogType: string; properties: PropertyMapping[] };

export type ContentType = { name: string; displayName: string | null };

export type SourceProperty = { name: string; displayName: string | null; compatibleOgKinds: OgKind[] };

export type ScreenData = {
  openGraphVocabulary: { ogTypes: OgType[] } | null;
  jcr: {
    nodeByPath: { openGraphMappings: TypeMapping[] | null } | null;
    nodeTypes: { nodes: ContentType[] } | null;
  } | null;
};

export type ScreenVariables = { path: string; siteKey: string; language: string };

export const SCREEN_QUERY = gql`
  query veryOpenGraphScreen($path: String!, $siteKey: String!, $language: String!) {
    openGraphVocabulary {
      ogTypes {
        name
        properties {
          name
          kind
        }
      }
    }
    jcr {
      nodeByPath(path: $path) {
        openGraphMappings {
          nodeType
          ogType
          properties {
            ogProperty
            sourceProperty
          }
        }
      }
      nodeTypes(
        filter: {
          siteKey: $siteKey
          includeTypes: ["jnt:page", "jmix:mainResource"]
          considerSubTypes: true
          includeMixins: false
          includeAbstract: false
        }
      ) {
        nodes {
          name
          displayName(language: $language)
        }
      }
    }
  }
`;

export type SourcePropertiesData = {
  jcr: { nodeByPath: { openGraphSourceProperties: SourceProperty[] | null } | null } | null;
};

export type SourcePropertiesVariables = { path: string; nodeType: string; language: string };

export const SOURCE_PROPERTIES_QUERY = gql`
  query veryOpenGraphSourceProperties($path: String!, $nodeType: String!, $language: String!) {
    jcr {
      nodeByPath(path: $path) {
        openGraphSourceProperties(nodeType: $nodeType, language: $language) {
          name
          displayName
          compatibleOgKinds
        }
      }
    }
  }
`;

export type SaveMappingData = { jcr: { mutateNode: { saveOpenGraphMapping: boolean } | null } | null };

export type SaveMappingVariables = { path: string; nodeType: string; ogType: string; properties: PropertyMapping[] };

// The Java input type OpenGraphPropertyMapping is named InputOpenGraphPropertyMapping in the schema.
export const SAVE_MAPPING = gql`
  mutation veryOpenGraphSaveMapping(
    $path: String!
    $nodeType: String!
    $ogType: String!
    $properties: [InputOpenGraphPropertyMapping]!
  ) {
    jcr {
      mutateNode(pathOrId: $path) {
        saveOpenGraphMapping(nodeType: $nodeType, ogType: $ogType, properties: $properties)
      }
    }
  }
`;

export type DeleteMappingData = { jcr: { mutateNode: { deleteOpenGraphMapping: boolean } | null } | null };

export type DeleteMappingVariables = { path: string; nodeType: string };

export const DELETE_MAPPING = gql`
  mutation veryOpenGraphDeleteMapping($path: String!, $nodeType: String!) {
    jcr {
      mutateNode(pathOrId: $path) {
        deleteOpenGraphMapping(nodeType: $nodeType)
      }
    }
  }
`;

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

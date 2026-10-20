import { gql } from "@apollo/client";

export type PropertyMapping = { ogProperty: string; sourceProperty: string };

export type TypeMapping = { uuid: string; nodeType: string; ogType: string; properties: PropertyMapping[] };

export type ContentType = { name: string; displayName: string | null };

export type ScreenData = {
  jcr: {
    nodeByPath: { openGraphMappings: TypeMapping[] | null } | null;
    nodeTypes: { nodes: ContentType[] } | null;
  } | null;
};

export type ScreenVariables = { path: string; siteKey: string; language: string };

export const SCREEN_QUERY = gql`
  query veryOpenGraphScreen($path: String!, $siteKey: String!, $language: String!) {
    jcr {
      nodeByPath(path: $path) {
        openGraphMappings {
          uuid
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

export type CreateSettingsData = { jcr: { mutateNode: { createOpenGraphSettings: string } | null } | null };

export type CreateSettingsVariables = { path: string };

export const CREATE_SETTINGS = gql`
  mutation veryOpenGraphCreateSettings($path: String!) {
    jcr {
      mutateNode(pathOrId: $path) {
        createOpenGraphSettings
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

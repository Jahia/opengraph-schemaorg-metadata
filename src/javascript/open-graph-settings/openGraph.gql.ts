import { gql } from "@apollo/client";

export type PropertyMapping = { ogProperty: string; sourceProperty: string };

export type SchemaPropertyMapping = { schemaProperty: string; sourceProperty: string };

export type TypeMapping = {
  uuid: string;
  nodeType: string;
  nodeTypeDisplayName: string | null;
  templateName: string | null;
  ogType: string | null;
  properties: PropertyMapping[];
  schemaType: string | null;
  schemaProperties: SchemaPropertyMapping[];
};

export type ScreenData = {
  jcr: {
    nodeByPath: { openGraphMappings: TypeMapping[] | null } | null;
  } | null;
};

export type ScreenVariables = { path: string; language: string };

export const SCREEN_QUERY = gql`
  query structuredDataMapperScreen($path: String!, $language: String!) {
    jcr {
      nodeByPath(path: $path) {
        openGraphMappings {
          uuid
          nodeType
          nodeTypeDisplayName(language: $language)
          templateName
          ogType
          properties {
            ogProperty
            sourceProperty
          }
          schemaType
          schemaProperties {
            schemaProperty
            sourceProperty
          }
        }
      }
    }
  }
`;

export type CreateSettingsData = { jcr: { mutateNode: { createOpenGraphSettings: string } | null } | null };

export type CreateSettingsVariables = { path: string };

export const CREATE_SETTINGS = gql`
  mutation structuredDataMapperCreateSettings($path: String!) {
    jcr {
      mutateNode(pathOrId: $path) {
        createOpenGraphSettings
      }
    }
  }
`;

export type DeleteMappingData = { jcr: { mutateNode: { deleteOpenGraphMapping: boolean } | null } | null };

export type DeleteMappingVariables = { path: string; nodeType: string; templateName: string | null };

export const DELETE_MAPPING = gql`
  mutation structuredDataMapperDeleteMapping($path: String!, $nodeType: String!, $templateName: String) {
    jcr {
      mutateNode(pathOrId: $path) {
        deleteOpenGraphMapping(nodeType: $nodeType, templateName: $templateName)
      }
    }
  }
`;

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

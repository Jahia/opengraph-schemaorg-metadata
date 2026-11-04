import { gql } from "@apollo/client";

export type SourceChoicesData = {
  jcr: {
    nodeByPath: {
      openGraphSourceChoices: { property: string; choices: { value: string; label: string }[] }[] | null;
    } | null;
  } | null;
};

export type SourceChoicesVariables = { path: string; nodeType: string; language: string };

export const SOURCE_CHOICES_QUERY = gql`
  query openGraphSchemaOrgMetadataSourceChoices($path: String!, $nodeType: String!, $language: String!) {
    jcr {
      nodeByPath(path: $path) {
        openGraphSourceChoices(nodeType: $nodeType, language: $language) {
          property
          choices {
            value
            label
          }
        }
      }
    }
  }
`;

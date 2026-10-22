import { gql } from "@apollo/client";

export type OgKind = "TEXT" | "DATE" | "URL" | "IMAGE" | "INTEGER";

export type OgProperty = { name: string; kind: OgKind };

export type TagPropertiesData = {
  jcr: { nodeById: { openGraphTags: { property: string; content: string | null }[] | null } | null } | null;
  openGraphVocabulary: { ogTypes: { name: string; properties: OgProperty[] }[] };
};

export type TagPropertiesVariables = { uuid: string; language: string };

// The og:type tag of the node names the og:type of its mapping, and the vocabulary lists the properties of each og:type.
export const TAG_PROPERTIES_QUERY = gql`
  query veryOpenGraphTagProperties($uuid: String!, $language: String!) {
    jcr {
      nodeById(uuid: $uuid) {
        openGraphTags(language: $language) {
          property
          content
        }
      }
    }
    openGraphVocabulary {
      ogTypes {
        name
        properties {
          name
          kind
        }
      }
    }
  }
`;

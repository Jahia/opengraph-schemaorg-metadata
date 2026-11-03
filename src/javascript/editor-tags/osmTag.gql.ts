import { gql } from "@apollo/client";

export type OgKind = "TEXT" | "DATE" | "URL" | "IMAGE" | "INTEGER" | "NUMBER";

export type VocabularyProperty = { name: string; kind: OgKind };

export type TagPropertiesData = {
  jcr: { nodeById: { openGraphTags: { property: string; content: string | null }[] | null } | null } | null;
  openGraphVocabulary: { ogTypes: { name: string; properties: VocabularyProperty[] }[] };
};

export type TagPropertiesVariables = { uuid: string; language: string };

// The og:type tag of the node names the og:type of its mapping, and the vocabulary lists the properties of each og:type.
export const TAG_PROPERTIES_QUERY = gql`
  query openGraphSchemaOrgMetadataTagProperties($uuid: String!, $language: String!) {
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

export type SchemaPropertiesData = {
  jcr: { nodeById: { schemaOrgJsonLd: string | null } | null } | null;
  openGraphVocabulary: { schemaTypes: { name: string; properties: VocabularyProperty[] }[] };
};

// The @type of the JSON-LD of the node names the schema.org type of its mapping, and the vocabulary lists the
// properties of each schema.org type.
export const SCHEMA_PROPERTIES_QUERY = gql`
  query openGraphSchemaOrgMetadataSchemaProperties($uuid: String!, $language: String!) {
    jcr {
      nodeById(uuid: $uuid) {
        schemaOrgJsonLd(language: $language)
      }
    }
    openGraphVocabulary {
      schemaTypes {
        name
        properties {
          name
          kind
        }
      }
    }
  }
`;

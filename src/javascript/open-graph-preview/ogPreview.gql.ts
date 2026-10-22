import { gql } from "@apollo/client";

export type OgTag = { property: string; content: string | null; nodePath: string | null; sourceProperty: string | null };

export type PreviewData = {
  jcr: { nodeById: { openGraphTags: OgTag[] | null; site: { serverName: string | null } | null } | null } | null;
};

export type PreviewVariables = { uuid: string; language: string };

export const PREVIEW_QUERY = gql`
  query veryOpenGraphPreview($uuid: String!, $language: String!) {
    jcr {
      nodeById(uuid: $uuid) {
        openGraphTags(language: $language) {
          property
          content
          nodePath
          sourceProperty
        }
        site {
          serverName
        }
      }
    }
  }
`;

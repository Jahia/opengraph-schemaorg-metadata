import { gql, useQuery } from "@apollo/client";
import { useEffect, useRef } from "react";

export type OgTag = { property: string; content: string | null; nodePath: string | null; sourceProperty: string | null };

export type PreviewData = {
  jcr: {
    nodeById: {
      openGraphTags: OgTag[] | null;
      schemaOrgJsonLd: string | null;
      site: { serverName: string | null } | null;
    } | null;
  } | null;
};

export type PreviewVariables = { uuid: string; language: string };

export const PREVIEW_QUERY = gql`
  query structuredDataMapperPreview($uuid: String!, $language: String!) {
    jcr {
      nodeById(uuid: $uuid) {
        openGraphTags(language: $language) {
          property
          content
          nodePath
          sourceProperty
        }
        schemaOrgJsonLd(language: $language)
        site {
          serverName
        }
      }
    }
  }
`;

// The values of the saved node, for the read-only fields of both vocabularies. Each field knows whether the other
// vocabulary has values, so it can tell a vocabulary that is off from a type with no mapping. The values come from the
// saved node, so a field never calls onChange and the save sends nothing for it. The form turns clean again when it
// saves, and the field then reads the saved node again.
export const usePreview = (uuid: string, language: string, isDirty: boolean) => {
  const result = useQuery<PreviewData, PreviewVariables>(PREVIEW_QUERY, {
    variables: { uuid, language },
    fetchPolicy: "no-cache",
    client: globalThis.jahia?.apolloClient,
    skip: uuid === "",
  });
  const { refetch } = result;
  const wasDirty = useRef(isDirty);

  useEffect(() => {
    if (wasDirty.current && !isDirty && uuid !== "") {
      refetch();
    }
    wasDirty.current = isDirty;
  }, [isDirty, refetch, uuid]);

  const node = result.data?.jcr?.nodeById;
  const tags = node?.openGraphTags ?? [];
  const jsonLd = node?.schemaOrgJsonLd ?? null;
  // A type with no mapping, or a mapping with both vocabularies off, has no value. The module then adds nothing to the
  // form, and a failed request or a create form hides its fieldsets too.
  const hasNoValue =
    uuid === "" || (!result.loading && (result.error !== undefined || (tags.length === 0 && jsonLd === null)));
  return { ...result, tags, jsonLd, domain: node?.site?.serverName ?? "", hasNoValue };
};

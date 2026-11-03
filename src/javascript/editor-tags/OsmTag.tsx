import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import PropertyValue, { type CustomValueProps } from "./PropertyValue.tsx";
import { TAG_PROPERTIES_QUERY, type TagPropertiesData, type TagPropertiesVariables } from "./osmTag.gql.ts";

export type OsmTagProps = CustomValueProps;

// One value of osm:customTags: an Open Graph property of the og:type of the mapping, then its value.
const OsmTag = (props: OsmTagProps) => {
  const { editorContext } = props;
  const { t } = useTranslation(NAMESPACE);
  const uuid = editorContext.nodeData?.uuid ?? "";

  // The query bypasses the Apollo cache, so it never replaces the jcr data of the Content Editor.
  const { data, loading } = useQuery<TagPropertiesData, TagPropertiesVariables>(TAG_PROPERTIES_QUERY, {
    variables: { uuid, language: editorContext.lang },
    fetchPolicy: "no-cache",
    client: globalThis.jahia?.apolloClient,
    skip: uuid === "",
  });

  const ogType = data?.jcr?.nodeById?.openGraphTags?.find(ogTag => ogTag.property === "og:type")?.content;
  const properties = data?.openGraphVocabulary.ogTypes.find(type => type.name === ogType)?.properties ?? [];

  return <PropertyValue {...props} properties={properties} isLoading={loading} placeholder={t("customTags.property")}/>;
};

export default OsmTag;

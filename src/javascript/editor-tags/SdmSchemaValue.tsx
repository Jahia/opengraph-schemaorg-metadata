import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import PropertyValue, { type CustomValueProps } from "./PropertyValue.tsx";
import {
  SCHEMA_PROPERTIES_QUERY,
  type SchemaPropertiesData,
  type SchemaPropertiesVariables,
} from "./sdmTag.gql.ts";

export type SdmSchemaValueProps = CustomValueProps;

// The @type of the JSON-LD of the node, or undefined when the node has no JSON-LD.
const typeOf = (jsonLd: string | null | undefined): string | undefined => {
  if (!jsonLd) {
    return undefined;
  }
  const type = (JSON.parse(jsonLd) as Record<string, unknown>)["@type"];
  return typeof type === "string" ? type : undefined;
};

// One value of sdm:customSchemaOrg: a schema.org property of the schema.org type of the mapping, then its value.
const SdmSchemaValue = (props: SdmSchemaValueProps) => {
  const { editorContext } = props;
  const { t } = useTranslation(NAMESPACE);
  const uuid = editorContext.nodeData?.uuid ?? "";

  // The query bypasses the Apollo cache, so it never replaces the jcr data of the Content Editor.
  const { data, loading } = useQuery<SchemaPropertiesData, SchemaPropertiesVariables>(SCHEMA_PROPERTIES_QUERY, {
    variables: { uuid, language: editorContext.lang },
    fetchPolicy: "no-cache",
    client: globalThis.jahia?.apolloClient,
    skip: uuid === "",
  });

  const schemaType = typeOf(data?.jcr?.nodeById?.schemaOrgJsonLd);
  const properties = data?.openGraphVocabulary.schemaTypes.find(type => type.name === schemaType)?.properties ?? [];

  return (
      <PropertyValue
          {...props}
          properties={properties}
          isLoading={loading}
          placeholder={t("customSchemaValues.property")}
      />
  );
};

export default SdmSchemaValue;

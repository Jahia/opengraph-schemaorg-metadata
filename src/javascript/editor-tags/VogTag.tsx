import { useQuery } from "@apollo/client";
import { Dropdown, Input } from "@jahia/moonstone";
import type { HTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import styles from "./VogTag.module.css";
import { TAG_PROPERTIES_QUERY, type TagPropertiesData, type TagPropertiesVariables } from "./vogTag.gql.ts";

type Tag = { property: string; content: string };

// A value of vog:customTags is a JSON object, such as {"property":"og:title","content":"Summer in Mykonos"}.
const parseTag = (value: unknown): Tag => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Partial<Record<keyof Tag, unknown>>;
      return { property: String(parsed.property ?? ""), content: String(parsed.content ?? "") };
    } catch {
      // The field shows a value that is not JSON as an empty tag, and the next change replaces it.
    }
  }

  return { property: "", content: "" };
};

export type VogTagProps = Readonly<{
  id: string;
  value?: string;
  field: { readOnly?: boolean };
  editorContext: { lang: string; nodeData?: { uuid?: string } };
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
}>;

// One value of vog:customTags: an Open Graph property of the og:type of the mapping, then its value.
const VogTag = ({ id, value, field, editorContext, onChange, onBlur }: VogTagProps) => {
  const { t } = useTranslation(NAMESPACE);
  const uuid = editorContext.nodeData?.uuid ?? "";
  const tag = parseTag(value);

  // The query bypasses the Apollo cache, so it never replaces the jcr data of the Content Editor.
  const { data, loading } = useQuery<TagPropertiesData, TagPropertiesVariables>(TAG_PROPERTIES_QUERY, {
    variables: { uuid, language: editorContext.lang },
    fetchPolicy: "no-cache",
    client: globalThis.jahia?.apolloClient,
    skip: uuid === "",
  });

  const ogType = data?.jcr?.nodeById?.openGraphTags?.find(ogTag => ogTag.property === "og:type")?.content;
  const properties = data?.openGraphVocabulary.ogTypes.find(type => type.name === ogType)?.properties ?? [];
  const kind = properties.find(property => property.name === tag.property)?.kind ?? "TEXT";

  const update = (next: Tag) => {
    onChange(next.property === "" && next.content === "" ? undefined : JSON.stringify(next));
  };

  return (
      <>
          <Dropdown
              data-sel-role="vog-tag-property"
              className={styles.property}
              data={properties.map(property => ({
                label: property.name,
                value: property.name,
                attributes: { "data-value": property.name } as HTMLAttributes<HTMLElement>,
              }))}
              value={tag.property}
              label={tag.property}
              placeholder={t("customTags.property")}
              isDisabled={field.readOnly || loading}
              isLoading={loading}
              onChange={(_event, item) => {
                update({ ...tag, property: item.value ?? "" });
                onBlur();
              }}
          />
          <Input
              id={id}
              data-sel-role="vog-tag-content"
              value={tag.content}
              placeholder={t(`customTags.placeholder.${kind}`)}
              isReadOnly={field.readOnly}
              onChange={event => update({ ...tag, content: event.target.value })}
              onBlur={onBlur}
          />
      </>
  );
};

export default VogTag;

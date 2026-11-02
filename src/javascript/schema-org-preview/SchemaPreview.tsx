import { Loader, Typography } from "@jahia/moonstone";
import { useFormikContext, type FormikContextType } from "formik";
import { I18nextProvider, useTranslation } from "react-i18next";
import { CUSTOM_SCHEMA_VALUES, SCHEMA_ORG_VALUES, useHiddenFieldSets } from "../fieldSets.ts";
import { i18n, NAMESPACE, RAW } from "../i18n.ts";
import { usePreview } from "../open-graph-preview/ogPreview.gql.ts";
import styles from "./SchemaPreview.module.css";

export type SchemaPreviewProps = Readonly<{
  id?: string;
  editorContext?: { nodeData?: { uuid?: string }; lang?: string };
}>;

const INDENT = 2;

// The field schemaOrgJsonLd writes a content or a file as {"nodePath": "<path>"}, in place of its live URL.
const nodePathOf = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const keys = Object.keys(value);
  const path = (value as { nodePath?: unknown }).nodePath;
  return keys.length === 1 && typeof path === "string" ? path : null;
};

// The JSON-LD in the layout of a code editor, with the text of the Open Graph values for the live URL of a node.
const formatted = (jsonLd: string, urlOf: (path: string) => string) =>
  JSON.stringify(
    JSON.parse(jsonLd),
    (_key, value: unknown) => {
      const path = nodePathOf(value);
      return path === null ? value : urlOf(path);
    },
    INDENT
  );

// The read-only field sdm:schemaPreview: the JSON-LD block that the live page gets from the saved node.
const SchemaPreview = ({ id, editorContext }: SchemaPreviewProps) => {
  const { t } = useTranslation(NAMESPACE);
  const formik = useFormikContext() as FormikContextType<unknown> | undefined;
  const isDirty = formik?.dirty ?? false;
  const uuid = editorContext?.nodeData?.uuid ?? "";
  const { loading, jsonLd, hasNoValue } = usePreview(uuid, editorContext?.lang ?? "en", isDirty);
  // With schema.org off in the mapping, this field says so, and the custom values for schema.org would do nothing.
  const isOff = !loading && !hasNoValue && jsonLd === null;
  useHiddenFieldSets(hasNoValue ? [SCHEMA_ORG_VALUES, CUSTOM_SCHEMA_VALUES] : isOff ? [CUSTOM_SCHEMA_VALUES] : []);

  if (loading) {
    return <Loader size="small"/>;
  }

  if (hasNoValue || jsonLd === null) {
    return isOff ? (
        <Typography id={id} data-sel-role="sdm-schema-off">
            {t("schemaPreview.off")}
        </Typography>
    ) : null;
  }

  return (
      <>
          {isDirty && (
          <Typography data-sel-role="sdm-schema-save-hint" variant="caption">
              {t("schemaPreview.saveHint")}
          </Typography>
          )}
          <Typography id={id} component="pre" data-sel-role="sdm-schema-preview" className={styles.json}>
              {formatted(jsonLd, path => t("preview.urlOf", { path, ...RAW }))}
          </Typography>
      </>
  );
};

const SchemaPreviewApp = (props: SchemaPreviewProps) => (
    <I18nextProvider i18n={i18n} defaultNS={NAMESPACE}>
        <SchemaPreview {...props}/>
    </I18nextProvider>
);

export default SchemaPreviewApp;

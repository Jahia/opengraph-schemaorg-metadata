import { useQuery } from "@apollo/client";
import {
  useContentEditorSectionContext,
  type ContentEditorField,
  type ContentEditorSection,
} from "@jahia/jcontent";
import {
  Loader,
  Table,
  TableBody,
  TableBodyCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Typography,
} from "@jahia/moonstone";
import { useFormikContext, type FormikContextType } from "formik";
import { useEffect, useRef } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, NAMESPACE } from "../i18n.ts";
import { PREVIEW_QUERY, type OgTag, type PreviewData, type PreviewVariables } from "./ogPreview.gql.ts";
import { plainText } from "./plainText.ts";

const SECTION = "seo";
// The fieldsets of the module in the section seo: this field, and the field vog:customTags of very-open-graph#12.
const FIELD_SETS = ["vogOpenGraphValues", "vogmix:customTags"];

// The types of jContent give a fieldset its fields only.
type FieldSet = { name: string; visible?: boolean };
const RICH_TEXT = "RichText";
const PROPERTY_WIDTH = "240px";
// The paths are plain text, and React escapes them.
const RAW = { interpolation: { escapeValue: false } };

type FormValues = Record<string, unknown>;

export type OgPreviewProps = Readonly<{
  id?: string;
  editorContext?: { nodeData?: { uuid?: string }; lang?: string };
}>;

// The field of each property in the form, by property name.
const fieldsByProperty = (sections: ContentEditorSection[]) => {
  const fields = new Map<string, ContentEditorField>();
  sections
    .flatMap(section => section.fieldSets ?? [])
    .flatMap(fieldSet => fieldSet.fields ?? [])
    .forEach(field => {
      if (field.propertyName && !fields.has(field.propertyName)) {
        fields.set(field.propertyName, field);
      }
    });
  return fields;
};

// The text that the live page gets from the value of a field, or null when the value is not a text.
const liveText = (field: ContentEditorField, value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  return field.selectorType === RICH_TEXT ? plainText(value) : value.trim();
};

const changedFields = (values: FormValues, initialValues: FormValues) =>
  Object.keys(values).filter(name => JSON.stringify(values[name]) !== JSON.stringify(initialValues[name]));

const OgPreview = ({ id, editorContext }: OgPreviewProps) => {
  const { t } = useTranslation(NAMESPACE);
  const { sections = [], onSectionsUpdate } = useContentEditorSectionContext() ?? {};
  const formik = useFormikContext<FormValues>() as FormikContextType<FormValues> | undefined;
  const values = formik?.values ?? {};
  const isDirty = formik?.dirty ?? false;
  const wasDirty = useRef(isDirty);
  const uuid = editorContext?.nodeData?.uuid ?? "";
  const language = editorContext?.lang ?? "en";

  // The tags come from the saved node, so the field never calls onChange and the save sends nothing for it.
  const { data, loading, error, refetch } = useQuery<PreviewData, PreviewVariables>(PREVIEW_QUERY, {
    variables: { uuid, language },
    fetchPolicy: "no-cache",
    client: globalThis.jahia?.apolloClient,
    skip: uuid === "",
  });
  const tags = data?.jcr?.nodeById?.openGraphTags ?? [];
  // A type with no mapping on the site has no tag. The fieldsets of the module then hide, and a failed request or a
  // create form hides them too. The section seo keeps its other fieldsets, and hides when none is left.
  const isHidden = uuid === "" || (!loading && (error !== undefined || tags.length === 0));

  useEffect(() => {
    const fieldSets = ((sections.find(candidate => candidate.name === SECTION)?.fieldSets ?? []) as FieldSet[]).filter(
      fieldSet => FIELD_SETS.includes(fieldSet.name) && fieldSet.visible !== false
    );
    if (isHidden && fieldSets.length > 0) {
      fieldSets.forEach(fieldSet => {
        fieldSet.visible = false;
      });
      onSectionsUpdate?.();
    }
  }, [isHidden, sections, onSectionsUpdate]);

  useEffect(() => {
    if (wasDirty.current && !isDirty && uuid !== "") {
      refetch();
    }
    wasDirty.current = isDirty;
  }, [isDirty, refetch, uuid]);

  if (loading) {
    return <Loader size="small"/>;
  }

  if (isHidden) {
    return null;
  }

  // A tag with a source property shows the text of its field as the editor types.
  const fields = fieldsByProperty(sections);
  const liveFieldOf = (tag: OgTag) => {
    const field = tag.sourceProperty ? fields.get(tag.sourceProperty) : undefined;
    return field && liveText(field, values[field.name]) !== null ? field : undefined;
  };
  const rows = tags.flatMap(tag => {
    const field = liveFieldOf(tag);
    const text = field ? liveText(field, values[field.name]) : null;
    if (text === null) {
      return [tag];
    }
    return text === "" ? [] : [{ ...tag, content: text }];
  });
  const liveFieldNames = new Set(tags.map(liveFieldOf).map(field => field?.name));
  const hasOtherChange = changedFields(values, formik?.initialValues ?? {}).some(name => !liveFieldNames.has(name));

  const valueOf = (tag: OgTag) =>
    tag.nodePath === null ? (tag.content ?? "") : t("preview.urlOf", { path: tag.nodePath, ...RAW });

  return (
      <>
          {hasOtherChange && (
          <Typography data-sel-role="vog-preview-save-hint" variant="caption">
              {t("preview.saveHint")}
          </Typography>
          )}
          <Table id={id} data-sel-role="vog-preview">
              <TableHead>
                  <TableRow>
                      <TableHeadCell width={PROPERTY_WIDTH}>{t("preview.property")}</TableHeadCell>
                      <TableHeadCell>{t("preview.value")}</TableHeadCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {rows.map((tag, index) => (
                      // A property such as og:locale:alternate can repeat, so the key needs the index.
                      // eslint-disable-next-line react/no-array-index-key
                      <TableRow key={`${tag.property}-${index}`} data-sel-role="vog-preview-row" data-sel-property={tag.property}>
                          <TableBodyCell width={PROPERTY_WIDTH}>{tag.property}</TableBodyCell>
                          <TableBodyCell data-sel-role="vog-preview-value">{valueOf(tag)}</TableBodyCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </>
  );
};

const OgPreviewApp = (props: OgPreviewProps) => (
    <I18nextProvider i18n={i18n} defaultNS={NAMESPACE}>
        <OgPreview {...props}/>
    </I18nextProvider>
);

export default OgPreviewApp;

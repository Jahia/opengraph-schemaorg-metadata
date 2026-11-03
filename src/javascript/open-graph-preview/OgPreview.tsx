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
import { I18nextProvider, useTranslation } from "react-i18next";
import { CUSTOM_TAGS, fieldSetsToHide, OPEN_GRAPH_VALUES, useHiddenFieldSets } from "../fieldSets.ts";
import { i18n, NAMESPACE, RAW } from "../i18n.ts";
import { usePreview, type OgTag } from "./ogPreview.gql.ts";
import { plainText } from "./plainText.ts";
import ShareCard from "./ShareCard.tsx";

const RICH_TEXT = "RichText";
const PROPERTY_WIDTH = "240px";

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
  const { sections = [] } = useContentEditorSectionContext() ?? {};
  const formik = useFormikContext<FormValues>() as FormikContextType<FormValues> | undefined;
  const values = formik?.values ?? {};
  const uuid = editorContext?.nodeData?.uuid ?? "";
  const language = editorContext?.lang ?? "en";

  // The live URL of og:url has the server name of the site as its host.
  const { loading, tags, domain, hasNoValue } = usePreview(uuid, language, formik?.dirty ?? false);
  // With Open Graph off in the mapping, this field says so.
  const isOff = !loading && !hasNoValue && tags.length === 0;
  useHiddenFieldSets(fieldSetsToHide(hasNoValue, isOff, OPEN_GRAPH_VALUES, CUSTOM_TAGS));

  if (loading) {
    return <Loader size="small"/>;
  }

  if (hasNoValue) {
    return null;
  }

  if (isOff) {
    return (
        <Typography id={id} data-sel-role="osm-preview-off">
            {t("preview.off")}
        </Typography>
    );
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
          <Typography data-sel-role="osm-preview-save-hint" variant="caption">
              {t("preview.saveHint")}
          </Typography>
          )}
          <Table id={id} data-sel-role="osm-preview">
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
                      <TableRow key={`${tag.property}-${index}`} data-sel-role="osm-preview-row" data-sel-property={tag.property}>
                          <TableBodyCell width={PROPERTY_WIDTH}>{tag.property}</TableBodyCell>
                          <TableBodyCell data-sel-role="osm-preview-value">{valueOf(tag)}</TableBodyCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
          <ShareCard tags={rows} domain={domain}/>
      </>
  );
};

const OgPreviewApp = (props: OgPreviewProps) => (
    <I18nextProvider i18n={i18n} defaultNS={NAMESPACE}>
        <OgPreview {...props}/>
    </I18nextProvider>
);

export default OgPreviewApp;

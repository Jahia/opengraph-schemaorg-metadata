import { useQuery } from "@apollo/client";
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
import { useFormikContext } from "formik";
import { useEffect, useRef } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, NAMESPACE } from "../i18n.ts";
import { PREVIEW_QUERY, type OgTag, type PreviewData, type PreviewVariables } from "./ogPreview.gql.ts";

const PROPERTY_WIDTH = "240px";
// The paths and the error messages are plain text, and React escapes them.
const RAW = { interpolation: { escapeValue: false } };

export type OgPreviewProps = Readonly<{
  id?: string;
  editorContext?: { nodeData?: { uuid?: string }; lang?: string };
}>;

// The Content Editor form is dirty from the first change to the last save.
const useIsDirty = () => {
  const formik = useFormikContext<unknown>() as ReturnType<typeof useFormikContext> | undefined;
  return formik?.dirty ?? false;
};

const OgPreview = ({ id, editorContext }: OgPreviewProps) => {
  const { t } = useTranslation(NAMESPACE);
  const uuid = editorContext?.nodeData?.uuid ?? "";
  const language = editorContext?.lang ?? "en";
  const isDirty = useIsDirty();
  const wasDirty = useRef(isDirty);

  // The values come from the saved node, so the field never calls onChange and the save sends nothing for it.
  const { data, loading, error, refetch } = useQuery<PreviewData, PreviewVariables>(PREVIEW_QUERY, {
    variables: { uuid, language },
    fetchPolicy: "no-cache",
    client: globalThis.jahia?.apolloClient,
    skip: uuid === "",
  });

  useEffect(() => {
    if (wasDirty.current && !isDirty && uuid !== "") {
      refetch();
    }
    wasDirty.current = isDirty;
  }, [isDirty, refetch, uuid]);

  const valueOf = (tag: OgTag) =>
    tag.nodePath === null ? (tag.content ?? "") : t("preview.urlOf", { path: tag.nodePath, ...RAW });

  if (loading) {
    return <Loader size="small"/>;
  }

  if (error) {
    return (
        <Typography data-sel-role="vog-preview-error" variant="caption">
            {t("preview.error", { message: error.message, ...RAW })}
        </Typography>
    );
  }

  const tags = data?.jcr?.nodeById?.openGraphTags ?? [];
  return (
      <>
          {isDirty && (
          <Typography data-sel-role="vog-preview-save-hint" variant="caption">
              {t("preview.saveHint")}
          </Typography>
          )}
          {tags.length === 0 ? (
              <Typography data-sel-role="vog-preview-empty" variant="caption">
                  {t("preview.empty")}
              </Typography>
          ) : (
              <Table id={id} data-sel-role="vog-preview">
                  <TableHead>
                      <TableRow>
                          <TableHeadCell width={PROPERTY_WIDTH}>{t("preview.property")}</TableHeadCell>
                          <TableHeadCell>{t("preview.value")}</TableHeadCell>
                      </TableRow>
                  </TableHead>
                  <TableBody>
                      {tags.map((tag, index) => (
                          // A property such as og:locale:alternate can repeat, so the key needs the index.
                          // eslint-disable-next-line react/no-array-index-key
                          <TableRow key={`${tag.property}-${index}`} data-sel-role="vog-preview-row" data-sel-property={tag.property}>
                              <TableBodyCell width={PROPERTY_WIDTH}>{tag.property}</TableBodyCell>
                              <TableBodyCell data-sel-role="vog-preview-value">{valueOf(tag)}</TableBodyCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          )}
      </>
  );
};

const OgPreviewApp = (props: OgPreviewProps) => (
    <I18nextProvider i18n={i18n} defaultNS={NAMESPACE}>
        <OgPreview {...props}/>
    </I18nextProvider>
);

export default OgPreviewApp;

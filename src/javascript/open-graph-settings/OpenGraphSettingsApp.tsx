import { useMutation, useQuery } from "@apollo/client";
import { Button, Header, LayoutContent, Paper, Typography } from "@jahia/moonstone";
import { Add } from "@jahia/moonstone/dist/icons";
import { useState, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, NAMESPACE } from "../i18n.ts";
import { MappingEditor } from "./MappingEditor.tsx";
import { MappingTable } from "./MappingTable.tsx";
import {
  DELETE_MAPPING,
  errorMessage,
  SCREEN_QUERY,
  type ContentType,
  type DeleteMappingData,
  type DeleteMappingVariables,
  type ScreenData,
  type ScreenVariables,
  type TypeMapping,
} from "./openGraph.gql.ts";

type OpenGraphSettingsProps = Readonly<{ siteKey: string }>;

// The editor shows a new mapping when the mapping is null.
type EditorState = Readonly<{ mapping: TypeMapping | null }>;

const labelOf = (type: ContentType) => type.displayName || type.name;

const OpenGraphSettings = ({ siteKey }: OpenGraphSettingsProps) => {
  const { t } = useTranslation(NAMESPACE);
  const language = globalThis.contextJsParameters?.uilang ?? "en";
  const sitePath = `/sites/${siteKey}`;
  const client = globalThis.jahia?.apolloClient;
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The queries bypass the Apollo cache, so they never replace the jcr data of jContent.
  const { data, loading, error, refetch } = useQuery<ScreenData, ScreenVariables>(SCREEN_QUERY, {
    variables: { path: sitePath, siteKey, language },
    fetchPolicy: "no-cache",
    client,
    skip: siteKey === "",
  });
  const [deleteMapping] = useMutation<DeleteMappingData, DeleteMappingVariables>(DELETE_MAPPING, {
    fetchPolicy: "no-cache",
    client,
  });

  const mappings = data?.jcr?.nodeByPath?.openGraphMappings ?? [];
  const ogTypes = data?.openGraphVocabulary?.ogTypes ?? [];
  const contentTypes = [...(data?.jcr?.nodeTypes?.nodes ?? [])].sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
  const displayNameOf = (nodeType: string) => contentTypes.find(type => type.name === nodeType)?.displayName ?? null;

  // A content type that already has a mapping is left out of a new mapping.
  const editorContentTypes = (mapping: TypeMapping | null): ContentType[] => {
    if (mapping) {
      return [{ name: mapping.nodeType, displayName: displayNameOf(mapping.nodeType) }];
    }

    const mapped = new Set(mappings.map(existing => existing.nodeType));
    return contentTypes.filter(type => !mapped.has(type.name));
  };

  const closeEditorAndRefresh = async () => {
    setEditor(null);
    await refetch();
  };

  const deleteAndRefresh = async (nodeType: string) => {
    setDeleteError(null);
    try {
      await deleteMapping({ variables: { path: sitePath, nodeType } });
      await refetch();
    } catch (failure) {
      setDeleteError(errorMessage(failure));
    }
  };

  const addButton = (
      <Button data-sel-role="vog-add-mapping"
              color="accent"
              icon={<Add/>}
              label={t("openGraph.addMapping")}
              isDisabled={editor !== null || data === undefined}
              onClick={() => setEditor({ mapping: null })}
      />
  );

  let errorText: ReactNode = null;
  const shownError = error?.message ?? deleteError;
  if (shownError) {
    errorText = <Typography data-sel-role="vog-error" weight="bold">{shownError}</Typography>;
  }

  let editorPanel: ReactNode = null;
  if (editor) {
    editorPanel = (
        <MappingEditor key={editor.mapping?.nodeType ?? "new"}
                       sitePath={sitePath}
                       language={language}
                       mapping={editor.mapping}
                       contentTypes={editorContentTypes(editor.mapping)}
                       ogTypes={ogTypes}
                       onSaved={closeEditorAndRefresh}
                       onCancel={() => setEditor(null)}
        />
    );
  }

  let list: ReactNode = null;
  if (mappings.length > 0) {
    list = (
        <MappingTable mappings={mappings}
                      displayNameOf={displayNameOf}
                      isDisabled={editor !== null}
                      onEdit={mapping => setEditor({ mapping })}
                      onDelete={deleteAndRefresh}
        />
    );
  } else if (data) {
    list = (
        <Paper hasPadding>
            <Typography data-sel-role="very-open-graph-empty">{t("openGraph.empty")}</Typography>
        </Paper>
    );
  }

  return (
      <LayoutContent hasPadding
                     data-sel-role="very-open-graph"
                     isLoading={loading && data === undefined}
                     header={<Header title={t("openGraph.title")} mainActions={addButton}/>}
      >
          {errorText}
          {editorPanel}
          {list}
      </LayoutContent>
  );
};

const OpenGraphSettingsApp = ({ siteKey }: OpenGraphSettingsProps) => (
    <I18nextProvider i18n={i18n} defaultNS={NAMESPACE}>
        <OpenGraphSettings siteKey={siteKey}/>
    </I18nextProvider>
);

export default OpenGraphSettingsApp;

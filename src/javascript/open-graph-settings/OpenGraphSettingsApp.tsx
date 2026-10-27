import { useMutation, useQuery } from "@apollo/client";
import { Button, Header, LayoutContent, Paper, Typography } from "@jahia/moonstone";
import { Add } from "@jahia/moonstone/dist/icons";
import { useState, type ReactNode } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, NAMESPACE } from "../i18n.ts";
import { MappingTable } from "./MappingTable.tsx";
import {
  CREATE_SETTINGS,
  DELETE_MAPPING,
  errorMessage,
  SCREEN_QUERY,
  type CreateSettingsData,
  type CreateSettingsVariables,
  type DeleteMappingData,
  type DeleteMappingVariables,
  type ScreenData,
  type ScreenVariables,
  type TypeMapping,
} from "./openGraph.gql.ts";

const MAPPING_TYPE = "sdmnt:typeMapping";
const TEMPLATE_MAPPING_TYPE = "sdmnt:templateMapping";

type OpenGraphSettingsProps = Readonly<{ siteKey: string }>;

const OpenGraphSettings = ({ siteKey }: OpenGraphSettingsProps) => {
  const { t } = useTranslation(NAMESPACE);
  const language = globalThis.contextJsParameters?.uilang ?? "en";
  const sitePath = `/sites/${siteKey}`;
  const client = globalThis.jahia?.apolloClient;
  const [isOpening, setIsOpening] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // The queries bypass the Apollo cache, so they never replace the jcr data of jContent.
  const { data, loading, error, refetch } = useQuery<ScreenData, ScreenVariables>(SCREEN_QUERY, {
    variables: { path: sitePath, language },
    fetchPolicy: "no-cache",
    client,
    skip: siteKey === "",
  });
  const [createSettings] = useMutation<CreateSettingsData, CreateSettingsVariables>(CREATE_SETTINGS, {
    fetchPolicy: "no-cache",
    client,
  });
  const [deleteMapping] = useMutation<DeleteMappingData, DeleteMappingVariables>(DELETE_MAPPING, {
    fetchPolicy: "no-cache",
    client,
  });

  const mappings = data?.jcr?.nodeByPath?.openGraphMappings ?? [];

  const refreshAfterSave = (_config: unknown, needRefresh: boolean) => {
    if (needRefresh) {
      refetch();
    }
  };

  // The Content Editor creates the mapping under the settings node, so the node must exist first.
  const openCreateForm = async (nodeType: string) => {
    setActionError(null);
    setIsOpening(true);
    try {
      const result = await createSettings({ variables: { path: sitePath } });
      const path = result.data?.jcr?.mutateNode?.createOpenGraphSettings;
      if (path) {
        globalThis.CE_API?.create({
          path,
          nodeTypes: [nodeType],
          includeSubTypes: false,
          isFullscreen: false,
          onClosedCallback: refreshAfterSave,
        });
      }
    } catch (failure) {
      setActionError(errorMessage(failure));
    } finally {
      setIsOpening(false);
    }
  };

  const openEditForm = (mapping: TypeMapping) => {
    setActionError(null);
    globalThis.CE_API?.edit({ uuid: mapping.uuid, isFullscreen: false, onClosedCallback: refreshAfterSave });
  };

  const deleteAndRefresh = async ({ nodeType, templateName }: TypeMapping) => {
    setActionError(null);
    try {
      await deleteMapping({ variables: { path: sitePath, nodeType, templateName } });
      await refetch();
    } catch (failure) {
      setActionError(errorMessage(failure));
    }
  };

  const addButtons = (
      <>
          <Button data-sel-role="sdm-add-template-mapping"
                  variant="outlined"
                  icon={<Add/>}
                  label={t("openGraph.addTemplateMapping")}
                  isDisabled={isOpening || data === undefined}
                  onClick={() => openCreateForm(TEMPLATE_MAPPING_TYPE)}
          />
          {" "}
          <Button data-sel-role="sdm-add-mapping"
                  color="accent"
                  icon={<Add/>}
                  label={t("openGraph.addMapping")}
                  isDisabled={isOpening || data === undefined}
                  onClick={() => openCreateForm(MAPPING_TYPE)}
          />
      </>
  );

  let errorText: ReactNode = null;
  const shownError = error?.message ?? actionError;
  if (shownError) {
    errorText = <Typography data-sel-role="sdm-error" weight="bold">{shownError}</Typography>;
  }

  let list: ReactNode = null;
  if (mappings.length > 0) {
    list = (
        <MappingTable mappings={mappings}
                      onEdit={openEditForm}
                      onDelete={deleteAndRefresh}
        />
    );
  } else if (data) {
    list = (
        <Paper hasPadding>
            <Typography data-sel-role="structured-data-mapper-empty">{t("openGraph.empty")}</Typography>
        </Paper>
    );
  }

  return (
      <LayoutContent hasPadding
                     data-sel-role="structured-data-mapper"
                     isLoading={loading && data === undefined}
                     header={<Header title={t("openGraph.title")} mainActions={addButtons}/>}
      >
          {errorText}
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

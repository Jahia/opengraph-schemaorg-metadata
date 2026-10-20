import { useMutation, useQuery } from "@apollo/client";
import {
  Button,
  Dropdown,
  Field,
  Fieldset,
  Paper,
  Table,
  TableBody,
  TableBodyCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Typography,
} from "@jahia/moonstone";
import { Add, Close } from "@jahia/moonstone/dist/icons";
import { useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import {
  errorMessage,
  SAVE_MAPPING,
  SOURCE_PROPERTIES_QUERY,
  type ContentType,
  type OgType,
  type SaveMappingData,
  type SaveMappingVariables,
  type SourcePropertiesData,
  type SourcePropertiesVariables,
  type TypeMapping,
} from "./openGraph.gql.ts";

const REMOVE_WIDTH = "64px";

type Row = { key: number; ogProperty: string; sourceProperty: string };

type Option = {
  value: string;
  label: string;
  description?: string;
  attributes: HTMLAttributes<HTMLElement>;
};

// Moonstone copies the attributes to the menu item, so a Cypress test can pick the option by data-sel-value.
const option = (value: string, label: string, description?: string): Option => {
  const attributes = { title: label, "data-sel-value": value };
  return { value, label, description, attributes };
};

const labelOf = (name: string, displayName: string | null) => displayName || name;

const descriptionOf = (name: string, displayName: string | null) =>
  displayName && displayName !== name ? name : undefined;

type MappingEditorProps = Readonly<{
  sitePath: string;
  language: string;
  mapping: TypeMapping | null;
  contentTypes: ContentType[];
  ogTypes: OgType[];
  onSaved: () => Promise<void>;
  onCancel: () => void;
}>;

export const MappingEditor = ({ sitePath, language, mapping, contentTypes, ogTypes, onSaved, onCancel }: MappingEditorProps) => {
  const { t } = useTranslation(NAMESPACE);
  const client = globalThis.jahia?.apolloClient;
  const isNew = mapping === null;
  const nextKey = useRef(mapping?.properties.length ?? 0);
  const [nodeType, setNodeType] = useState(mapping?.nodeType ?? "");
  const [ogType, setOgType] = useState(mapping?.ogType ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    (mapping?.properties ?? []).map((property, index) => ({
      key: index,
      ogProperty: property.ogProperty,
      sourceProperty: property.sourceProperty,
    })),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sourceQuery = useQuery<SourcePropertiesData, SourcePropertiesVariables>(SOURCE_PROPERTIES_QUERY, {
    variables: { path: sitePath, nodeType, language },
    fetchPolicy: "no-cache",
    client,
    skip: nodeType === "",
  });
  const [saveMapping] = useMutation<SaveMappingData, SaveMappingVariables>(SAVE_MAPPING, {
    fetchPolicy: "no-cache",
    client,
  });

  const sourceProperties = sourceQuery.data?.jcr?.nodeByPath?.openGraphSourceProperties ?? [];
  const ogProperties = ogTypes.find(type => type.name === ogType)?.properties ?? [];
  const isComplete =
    nodeType !== "" && ogType !== "" && rows.every(row => row.ogProperty !== "" && row.sourceProperty !== "");
  const canAddRow = ogType !== "" && rows.length < ogProperties.length;

  const changeNodeType = (value: string) => {
    setNodeType(value);
    setRows(current => current.map(row => ({ ...row, sourceProperty: "" })));
  };

  const changeOgType = (value: string) => {
    const names = ogTypes.find(type => type.name === value)?.properties.map(property => property.name) ?? [];
    setOgType(value);
    setRows(current => current.filter(row => row.ogProperty === "" || names.includes(row.ogProperty)));
  };

  const updateRow = (key: number, change: Partial<Row>) => {
    setRows(current => current.map(row => (row.key === key ? { ...row, ...change } : row)));
  };

  const addRow = () => {
    const key = nextKey.current;
    nextKey.current = key + 1;
    setRows(current => [...current, { key, ogProperty: "", sourceProperty: "" }]);
  };

  const removeRow = (key: number) => {
    setRows(current => current.filter(row => row.key !== key));
  };

  const save = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveMapping({
        variables: {
          path: sitePath,
          nodeType,
          ogType,
          properties: rows.map(row => ({ ogProperty: row.ogProperty, sourceProperty: row.sourceProperty })),
        },
      });
      await onSaved();
    } catch (failure) {
      setSaveError(errorMessage(failure));
      setIsSaving(false);
    }
  };

  // An Open Graph property appears in one row at most.
  const ogPropertyOptions = (row: Row) => {
    const used = new Set(rows.filter(other => other.key !== row.key).map(other => other.ogProperty));
    return ogProperties
      .filter(property => !used.has(property.name))
      .map(property => option(property.name, property.name));
  };

  const sourcePropertyOptions = (row: Row) => {
    const kind = ogProperties.find(property => property.name === row.ogProperty)?.kind;
    return sourceProperties
      .filter(property => kind !== undefined && property.compatibleOgKinds.includes(kind))
      .map(property =>
        option(property.name, labelOf(property.name, property.displayName), descriptionOf(property.name, property.displayName)),
      );
  };

  const contentTypeOptions = contentTypes.map(type =>
    option(type.name, labelOf(type.name, type.displayName), descriptionOf(type.name, type.displayName)),
  );
  const ogTypeOptions = ogTypes.map(type => option(type.name, type.name));

  let errorText: ReactNode = null;
  const shownError = saveError ?? sourceQuery.error?.message ?? null;
  if (shownError) {
    errorText = <Typography data-sel-role="vog-editor-error" weight="bold">{shownError}</Typography>;
  }

  let propertyList = <Typography data-sel-role="vog-no-property">{t("openGraph.editor.noProperty")}</Typography>;
  if (rows.length > 0) {
    propertyList = (
        <Table data-sel-role="vog-property-rows">
            <TableHead>
                <TableRow>
                    <TableHeadCell>{t("openGraph.editor.ogProperty")}</TableHeadCell>
                    <TableHeadCell>{t("openGraph.editor.sourceProperty")}</TableHeadCell>
                    <TableHeadCell width={REMOVE_WIDTH}/>
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map(row => (
                    <TableRow key={row.key} data-sel-role="vog-property-row">
                        <TableBodyCell>
                            <Dropdown data-sel-role="vog-og-property"
                                      variant="outlined"
                                      placeholder={t("openGraph.editor.ogPropertyPlaceholder")}
                                      searchEmptyText={t("openGraph.editor.searchEmpty")}
                                      data={ogPropertyOptions(row)}
                                      value={row.ogProperty}
                                      onChange={(_event, item) => updateRow(row.key, { ogProperty: item.value ?? "", sourceProperty: "" })}
                            />
                        </TableBodyCell>
                        <TableBodyCell>
                            <Dropdown data-sel-role="vog-source-property"
                                      variant="outlined"
                                      placeholder={t("openGraph.editor.sourcePropertyPlaceholder")}
                                      searchEmptyText={t("openGraph.editor.searchEmpty")}
                                      data={sourcePropertyOptions(row)}
                                      value={row.sourceProperty}
                                      isLoading={sourceQuery.loading}
                                      onChange={(_event, item) => updateRow(row.key, { sourceProperty: item.value ?? "" })}
                            />
                        </TableBodyCell>
                        <TableBodyCell width={REMOVE_WIDTH}>
                            <Button data-sel-role="vog-remove-property"
                                    variant="ghost"
                                    icon={<Close/>}
                                    title={t("openGraph.editor.removeProperty")}
                                    aria-label={t("openGraph.editor.removeProperty")}
                                    onClick={() => removeRow(row.key)}
                            />
                        </TableBodyCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
  }

  const addPropertyButton = (
      <Button data-sel-role="vog-add-property"
              variant="outlined"
              icon={<Add/>}
              label={t("openGraph.editor.addProperty")}
              isDisabled={!canAddRow}
              onClick={addRow}
      />
  );

  return (
      <Paper hasPadding data-sel-role="vog-editor">
          <Fieldset id="vog-editor" label={isNew ? t("openGraph.editor.newTitle") : t("openGraph.editor.editTitle")}>
              <Field id="vog-content-type-field" label={t("openGraph.editor.contentType")}>
                  <Dropdown hasSearch
                            data-sel-role="vog-content-type"
                            variant="outlined"
                            placeholder={t("openGraph.editor.contentTypePlaceholder")}
                            searchEmptyText={t("openGraph.editor.searchEmpty")}
                            data={contentTypeOptions}
                            value={nodeType}
                            isDisabled={!isNew}
                            onChange={(_event, item) => changeNodeType(item.value ?? "")}
                  />
              </Field>
              <Field id="vog-og-type-field" label={t("openGraph.editor.ogType")}>
                  <Dropdown data-sel-role="vog-og-type"
                            variant="outlined"
                            placeholder={t("openGraph.editor.ogTypePlaceholder")}
                            data={ogTypeOptions}
                            value={ogType}
                            onChange={(_event, item) => changeOgType(item.value ?? "")}
                  />
              </Field>
              <Field id="vog-properties-field" label={t("openGraph.editor.properties")} buttons={addPropertyButton}>
                  {propertyList}
              </Field>
              {errorText}
              <div>
                  <Button data-sel-role="vog-save"
                          color="accent"
                          label={t("openGraph.editor.save")}
                          isDisabled={!isComplete || isSaving}
                          onClick={save}
                  />
                  {" "}
                  <Button data-sel-role="vog-cancel"
                          variant="ghost"
                          label={t("openGraph.editor.cancel")}
                          isDisabled={isSaving}
                          onClick={onCancel}
                  />
              </div>
          </Fieldset>
      </Paper>
  );
};

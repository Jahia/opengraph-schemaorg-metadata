import {
  Button,
  Paper,
  Table,
  TableBody,
  TableBodyCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Typography,
} from "@jahia/moonstone";
import { Delete, Edit } from "@jahia/moonstone/dist/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import type { TypeMapping } from "./openGraph.gql.ts";

const OG_TYPE_WIDTH = "140px";
const SCHEMA_TYPE_WIDTH = "140px";
const TEMPLATE_WIDTH = "140px";
const ACTIONS_WIDTH = "300px";

const propertiesOf = (mapping: TypeMapping) =>
  mapping.properties.map(property => `${property.ogProperty} ← ${property.sourceProperty}`).join(", ");

const schemaPropertiesOf = (mapping: TypeMapping) =>
  mapping.schemaProperties.map(property => `${property.schemaProperty} ← ${property.sourceProperty}`).join(", ");

type MappingTableProps = Readonly<{
  mappings: TypeMapping[];
  onEdit: (mapping: TypeMapping) => void;
  onDelete: (mapping: TypeMapping) => Promise<void>;
}>;

export const MappingTable = ({ mappings, onEdit, onDelete }: MappingTableProps) => {
  const { t } = useTranslation(NAMESPACE);
  // The uuid of the mapping whose row shows "Confirm deletion".
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeletion = async (mapping: TypeMapping) => {
    setIsDeleting(true);
    await onDelete(mapping);
    setIsDeleting(false);
    setConfirming(null);
  };

  const contentTypeOf = ({ nodeType, nodeTypeDisplayName }: TypeMapping) => {
    if (!nodeTypeDisplayName || nodeTypeDisplayName === nodeType) {
      return nodeType;
    }

    return (
        <>
            {nodeTypeDisplayName}
            {" "}
            <Typography component="span" variant="caption">({nodeType})</Typography>
        </>
    );
  };

  const actionsOf = (mapping: TypeMapping) => {
    if (confirming === mapping.uuid) {
      return (
          <>
              <Button data-sel-role="sdm-confirm-delete"
                      color="danger"
                      label={t("openGraph.list.confirmDelete")}
                      isDisabled={isDeleting}
                      onClick={() => confirmDeletion(mapping)}
              />
              {" "}
              <Button data-sel-role="sdm-cancel-delete"
                      variant="ghost"
                      label={t("openGraph.list.cancel")}
                      isDisabled={isDeleting}
                      onClick={() => setConfirming(null)}
              />
          </>
      );
    }

    return (
        <>
            <Button data-sel-role="sdm-edit"
                    variant="ghost"
                    icon={<Edit/>}
                    label={t("openGraph.list.edit")}
                    onClick={() => onEdit(mapping)}
            />
            {" "}
            <Button data-sel-role="sdm-delete"
                    variant="ghost"
                    icon={<Delete/>}
                    label={t("openGraph.list.delete")}
                    onClick={() => setConfirming(mapping.uuid)}
            />
        </>
    );
  };

  return (
      <Paper hasPadding={false} data-sel-role="sdm-mappings">
          <Table>
              <TableHead>
                  <TableRow>
                      <TableHeadCell>{t("openGraph.list.contentType")}</TableHeadCell>
                      <TableHeadCell width={TEMPLATE_WIDTH}>{t("openGraph.list.template")}</TableHeadCell>
                      <TableHeadCell width={OG_TYPE_WIDTH}>{t("openGraph.list.ogType")}</TableHeadCell>
                      <TableHeadCell width={SCHEMA_TYPE_WIDTH}>{t("openGraph.list.schemaType")}</TableHeadCell>
                      <TableHeadCell>{t("openGraph.list.properties")}</TableHeadCell>
                      <TableHeadCell width={ACTIONS_WIDTH}>{t("openGraph.list.actions")}</TableHeadCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {mappings.map(mapping => (
                      <TableRow key={mapping.uuid}
                                data-sel-role="sdm-mapping-row"
                                data-sel-node-type={mapping.nodeType}
                                data-sel-template={mapping.templateName ?? ""}
                      >
                          <TableBodyCell>{contentTypeOf(mapping)}</TableBodyCell>
                          <TableBodyCell width={TEMPLATE_WIDTH}>{mapping.templateName ?? t("openGraph.list.anyTemplate")}</TableBodyCell>
                          <TableBodyCell width={OG_TYPE_WIDTH}>{mapping.ogType}</TableBodyCell>
                          <TableBodyCell width={SCHEMA_TYPE_WIDTH}
                                         data-sel-role="sdm-schema-type"
                                         title={schemaPropertiesOf(mapping)}
                          >
                              {mapping.schemaType ?? t("openGraph.list.noSchemaType")}
                          </TableBodyCell>
                          <TableBodyCell title={propertiesOf(mapping)}>{propertiesOf(mapping)}</TableBodyCell>
                          <TableBodyCell width={ACTIONS_WIDTH}>{actionsOf(mapping)}</TableBodyCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </Paper>
  );
};

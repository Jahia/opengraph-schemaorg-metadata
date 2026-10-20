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
const ACTIONS_WIDTH = "300px";

const propertiesOf = (mapping: TypeMapping) =>
  mapping.properties.map(property => `${property.ogProperty} ← ${property.sourceProperty}`).join(", ");

type MappingTableProps = Readonly<{
  mappings: TypeMapping[];
  displayNameOf: (nodeType: string) => string | null;
  isDisabled: boolean;
  onEdit: (mapping: TypeMapping) => void;
  onDelete: (nodeType: string) => Promise<void>;
}>;

export const MappingTable = ({ mappings, displayNameOf, isDisabled, onEdit, onDelete }: MappingTableProps) => {
  const { t } = useTranslation(NAMESPACE);
  // The content type of the row that shows "Confirm deletion".
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeletion = async (nodeType: string) => {
    setIsDeleting(true);
    await onDelete(nodeType);
    setIsDeleting(false);
    setConfirming(null);
  };

  const contentTypeOf = (nodeType: string) => {
    const displayName = displayNameOf(nodeType);
    if (!displayName || displayName === nodeType) {
      return nodeType;
    }

    return (
        <>
            {displayName}
            {" "}
            <Typography component="span" variant="caption">({nodeType})</Typography>
        </>
    );
  };

  const actionsOf = (mapping: TypeMapping) => {
    if (confirming === mapping.nodeType) {
      return (
          <>
              <Button data-sel-role="vog-confirm-delete"
                      color="danger"
                      label={t("openGraph.list.confirmDelete")}
                      isDisabled={isDeleting}
                      onClick={() => confirmDeletion(mapping.nodeType)}
              />
              {" "}
              <Button data-sel-role="vog-cancel-delete"
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
            <Button data-sel-role="vog-edit"
                    variant="ghost"
                    icon={<Edit/>}
                    label={t("openGraph.list.edit")}
                    isDisabled={isDisabled}
                    onClick={() => onEdit(mapping)}
            />
            {" "}
            <Button data-sel-role="vog-delete"
                    variant="ghost"
                    icon={<Delete/>}
                    label={t("openGraph.list.delete")}
                    isDisabled={isDisabled}
                    onClick={() => setConfirming(mapping.nodeType)}
            />
        </>
    );
  };

  return (
      <Paper hasPadding={false} data-sel-role="vog-mappings">
          <Table>
              <TableHead>
                  <TableRow>
                      <TableHeadCell>{t("openGraph.list.contentType")}</TableHeadCell>
                      <TableHeadCell width={OG_TYPE_WIDTH}>{t("openGraph.list.ogType")}</TableHeadCell>
                      <TableHeadCell>{t("openGraph.list.properties")}</TableHeadCell>
                      <TableHeadCell width={ACTIONS_WIDTH}>{t("openGraph.list.actions")}</TableHeadCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                  {mappings.map(mapping => (
                      <TableRow key={mapping.nodeType} data-sel-role="vog-mapping-row" data-sel-node-type={mapping.nodeType}>
                          <TableBodyCell>{contentTypeOf(mapping.nodeType)}</TableBodyCell>
                          <TableBodyCell width={OG_TYPE_WIDTH}>{mapping.ogType}</TableBodyCell>
                          <TableBodyCell title={propertiesOf(mapping)}>{propertiesOf(mapping)}</TableBodyCell>
                          <TableBodyCell width={ACTIONS_WIDTH}>{actionsOf(mapping)}</TableBodyCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      </Paper>
  );
};

import { useContentEditorSectionContext } from "@jahia/jcontent";
import { useEffect } from "react";

// The fieldsets of the module in the section seo, in their order: the forms files give them the ranks 10 to 13.
export const CUSTOM_TAGS = "sdmmix:customTags";
export const OPEN_GRAPH_VALUES = "sdmOpenGraphValues";
export const CUSTOM_SCHEMA_VALUES = "sdmmix:customSchemaOrg";
export const SCHEMA_ORG_VALUES = "sdmSchemaOrgValues";

const SECTION = "seo";

// The types of jContent give a fieldset its fields only.
type FieldSet = { name: string; visible?: boolean };

// Hides fieldsets of the module. The section seo keeps its other fieldsets, and hides when none is left.
export const useHiddenFieldSets = (names: readonly string[]) => {
  const { sections = [], onSectionsUpdate } = useContentEditorSectionContext() ?? {};
  const key = names.join(" ");

  useEffect(() => {
    const hidden = new Set(key.split(" "));
    const fieldSets = ((sections.find(candidate => candidate.name === SECTION)?.fieldSets ?? []) as FieldSet[]).filter(
      fieldSet => hidden.has(fieldSet.name) && fieldSet.visible !== false
    );
    if (fieldSets.length > 0) {
      fieldSets.forEach(fieldSet => {
        fieldSet.visible = false;
      });
      onSectionsUpdate?.();
    }
  }, [key, sections, onSectionsUpdate]);
};

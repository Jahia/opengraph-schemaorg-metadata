import { useContentEditorSectionContext } from "@jahia/jcontent";
import { useEffect } from "react";

// The fieldsets of the module in the section seo, in their order: the forms files give them the ranks 10 to 13.
export const OPEN_GRAPH_VALUES = "osmOpenGraphValues";
export const CUSTOM_TAGS = "osmmix:customTags";
export const SCHEMA_ORG_VALUES = "osmSchemaOrgValues";
export const CUSTOM_SCHEMA_VALUES = "osmmix:customSchemaOrg";

const SECTION = "seo";

// The types of jContent give a fieldset its fields only.
type FieldSet = { name: string; visible?: boolean };

// The fieldsets of a vocabulary to hide: both when the content has no value in either vocabulary, and the custom values
// alone when the vocabulary is off in the mapping, because they would do nothing.
export const fieldSetsToHide = (hasNoValue: boolean, isOff: boolean, values: string, custom: string): string[] => {
  if (hasNoValue) {
    return [values, custom];
  }
  return isOff ? [custom] : [];
};

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

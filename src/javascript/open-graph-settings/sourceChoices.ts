import type { ApolloClient } from "@apollo/client";
import { SOURCE_CHOICES_QUERY, type SourceChoicesData, type SourceChoicesVariables } from "./sourceChoices.gql.ts";

/** A choice of a field, in the shape of the query fieldConstraints of jContent. */
type ValueConstraint = {
  value: { type: string; string: string };
  displayValue: string;
  displayValueKey: string | null;
  properties: { name: string; value: string }[];
};

/** The part of a field of the Content Editor that the handler reads and writes. */
export type EditorField = {
  name: string;
  propertyName: string;
  selectorOptions?: { name: string; value?: string }[];
  valueConstraints: ValueConstraint[];
};

type EditorSection = { fieldSets: { fields: EditorField[] }[] };

/** The part of the context of a handler of selectorType.onChange that the handler uses. */
export type OnChangeContext = {
  sections: EditorSection[];
  onSectionsUpdate: () => void;
  client: ApolloClient<unknown>;
  formik: { initialValues: Record<string, unknown> };
  site: string;
  lang: string;
  uilang?: string;
};

const SOURCE_INITIALIZER = "osmSourceProperties";

// For each form, the content type of the source properties that the lists hold, and the number of its last request.
const forms = new WeakMap<EditorSection[], { nodeType: string | null; request: number }>();

const asNodeType = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);

const isSourceField = (field: EditorField) => field.selectorOptions?.some(option => option.name === SOURCE_INITIALIZER) ?? false;

const sameChoices = (a: ValueConstraint[], b: ValueConstraint[]) =>
  a.length === b.length &&
  a.every((choice, index) => choice.value.string === b[index].value.string && choice.displayValue === b[index].displayValue);

const fetchChoices = async (context: OnChangeContext, nodeType: string) => {
  const { data } = await context.client.query<SourceChoicesData, SourceChoicesVariables>({
    query: SOURCE_CHOICES_QUERY,
    variables: { path: `/sites/${context.site}`, nodeType, language: context.uilang ?? context.lang },
  });
  const choices = new Map<string, ValueConstraint[]>();
  for (const field of data.jcr?.nodeByPath?.openGraphSourceChoices ?? []) {
    choices.set(field.property, field.choices.map(({ value, label }) => ({
      value: { type: "String", string: value },
      displayValue: label,
      displayValueKey: null,
      properties: [],
    })));
  }
  return choices;
};

/**
 * Writes the choices into each source field of the form, as jContent writes the choices of a dependent field: in the
 * field itself, then in new fieldSets and fields, so that each field renders again.
 *
 * @returns true when a list changed
 */
const writeChoices = (sections: EditorSection[], choices: Map<string, ValueConstraint[]>) => {
  let changed = false;
  for (const section of sections) {
    for (const fieldSet of section.fieldSets) {
      for (const field of fieldSet.fields.filter(isSourceField)) {
        const constraints = choices.get(field.propertyName) ?? [];
        if (!sameChoices(field.valueConstraints, constraints)) {
          field.valueConstraints = constraints;
          changed = true;
        }
      }
    }
  }
  if (changed) {
    for (const section of sections) {
      section.fieldSets = section.fieldSets.map(fieldSet => ({ ...fieldSet, fields: fieldSet.fields.map(field => ({ ...field })) }));
    }
  }
  return changed;
};

/**
 * Fills the lists of the source fields of a mapping form with the source properties of the content type that
 * osm:nodeType holds. The lists of a form that opens already hold the source properties of its stored content type, so
 * the handler sends a query only when the content type changes from the one that the lists hold.
 */
export const followNodeType = (value: unknown, field: EditorField, context: OnChangeContext) => {
  const { sections } = context;
  const nodeType = asNodeType(value);
  let form = forms.get(sections);
  if (!form) {
    form = { nodeType: asNodeType(context.formik.initialValues[field.name]), request: 0 };
    forms.set(sections, form);
  }

  if (form.nodeType === nodeType) {
    return;
  }

  const current = form;
  current.nodeType = nodeType;
  const request = ++current.request;
  const choices = nodeType === null ? Promise.resolve(new Map<string, ValueConstraint[]>()) : fetchChoices(context, nodeType);
  choices
    .catch((error: unknown) => {
      console.error(error);
      if (current.request === request) {
        current.nodeType = null;
      }
      return new Map<string, ValueConstraint[]>();
    })
    .then(byField => {
      if (current.request === request && writeChoices(sections, byField)) {
        context.onSectionsUpdate();
      }
    });
};

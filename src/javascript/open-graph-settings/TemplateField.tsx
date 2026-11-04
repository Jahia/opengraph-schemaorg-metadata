import { useContentEditorSectionContext } from "@jahia/jcontent";
import { useEffect } from "react";
import ChoiceList from "./ChoiceList.tsx";

type ValueConstraint = { value: { string: string } };

export type TemplateFieldProps = Readonly<{
  field: { readOnly?: boolean; valueConstraints: ValueConstraint[] } & Record<string, unknown>;
  value?: string | null;
  onChange: (value: string | null) => void;
}> & Record<string, unknown>;

// The field osm:templateName of a mapping: the choice list of the Content Editor, read-only while it offers one value or
// none. The choice list offers the templates of the content type of the form, so it offers "All templates" alone before
// the form has a content type, and for a mixin. It offers the template of an existing mapping alone.
const TemplateField = (props: TemplateFieldProps) => {
  // A change of osm:nodeType writes the new values into the field object, then renders the consumers of this context.
  useContentEditorSectionContext();
  const { field, value, onChange } = props;
  const choices = field.valueConstraints.map(constraint => constraint.value.string);
  const onlyChoice = choices.length === 1 ? choices[0] : undefined;
  const readOnly = Boolean(field.readOnly) || choices.length <= 1;

  // The choice list empties a value that it no longer offers, and a read-only field cannot take a value again.
  useEffect(() => {
    if (!field.readOnly && onlyChoice !== undefined && value !== onlyChoice) {
      onChange(onlyChoice);
    }
  }, [field.readOnly, onlyChoice, value, onChange]);

  // The choice list memoizes its menu on the field object, and the Content Editor keeps that object, so each render
  // gives the choice list a new one.
  return <ChoiceList {...props} field={{ ...field, readOnly }}/>;
};

export default TemplateField;

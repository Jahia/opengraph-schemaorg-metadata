import { Dropdown } from "@jahia/moonstone";
import { registry } from "@jahia/ui-extender";
import { useMemo, type ComponentType, type HTMLAttributes } from "react";
import styles from "./SdmTag.module.css";
import type { OgKind, VocabularyProperty } from "./sdmTag.gql.ts";

// A value of sdm:customTags or sdm:customSchemaOrg is a JSON object. An image holds the identifier of its file in node,
// such as {"property":"og:image","node":"<uuid>"}, and another property holds its text in content, such as
// {"property":"og:title","content":"Summer in Mykonos"}.
type Tag = { property: string; content?: string; node?: string };

const parseTag = (value: unknown): Tag => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Partial<Record<keyof Tag, unknown>>;
      return {
        property: typeof parsed.property === "string" ? parsed.property : "",
        content: typeof parsed.content === "string" ? parsed.content : undefined,
        node: typeof parsed.node === "string" ? parsed.node : undefined,
      };
    } catch {
      // The field shows a value that is not JSON as an empty tag, and the next change replaces it.
    }
  }

  return { property: "" };
};

// The date picker gives a local date and time, such as 2026-10-20T09:30:00.000. The tag holds it in UTC, to the
// second, as the module writes a mapped date: 2026-10-20T07:30:00Z.
const isoDate = (localDate: string | null | undefined) =>
  localDate ? new Date(localDate).toISOString().replace(/\.\d{3}Z$/, "Z") : "";

type SelectorType = {
  cmp: ComponentType<Record<string, unknown>>;
  resolver?: (options: unknown, field: unknown) => SelectorType;
};

// The Content Editor registers each selector type in the registry of the app shell.
const selectorType = (key: string) => registry.get("selectorType", key) as unknown as SelectorType;

type EditorField = { name: string; readOnly?: boolean } & Record<string, unknown>;

export type CustomValueProps = Readonly<{
  id: string;
  value?: string;
  field: EditorField;
  editorContext: { lang: string; nodeData?: { uuid?: string } } & Record<string, unknown>;
  inputContext: Record<string, unknown>;
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
}>;

type ValueEditorProps = CustomValueProps & Readonly<{ tag: Tag; kind: OgKind; update: (next: Tag) => void }>;

// The image picker of the Content Editor, on a field of its own that holds one file.
const ImageValue = ({ id, field, editorContext, inputContext, onBlur, tag, update }: ValueEditorProps) => {
  const imageField = useMemo(
    () => ({
      ...field,
      name: id,
      multiple: false,
      requiredType: "WEAKREFERENCE",
      selectorType: "Picker",
      selectorOptions: [{ name: "type", value: "image" }],
      valueConstraints: [],
    }),
    [field, id],
  );
  const picker = useMemo(() => {
    const pickerType = selectorType("Picker");
    return pickerType.resolver ? pickerType.resolver(imageField.selectorOptions, imageField) : pickerType;
  }, [imageField]);
  // The picker writes its actions into the input context, so the context belongs to this value only.
  const pickerContext = useMemo(
    () => ({ ...inputContext, selectorType: picker, displayActions: false }),
    [inputContext, picker],
  );
  const Picker = picker.cmp;

  return (
      <Picker
          id={id}
          field={imageField}
          value={tag.node}
          editorContext={editorContext}
          inputContext={pickerContext}
          onChange={(node: unknown) => update({ property: tag.property, node: typeof node === "string" ? node : undefined })}
          onBlur={onBlur}
      />
  );
};

// The date and time picker of the Content Editor.
const DateValue = ({ id, field, editorContext, onBlur, tag, update }: ValueEditorProps) => {
  const dateField = useMemo(
    () => ({ ...field, name: id, requiredType: "DATE", selectorType: "DateTimePicker", valueConstraints: [] }),
    [field, id],
  );
  const DateTimePicker = selectorType("DateTimePicker").cmp;

  return (
      <DateTimePicker
          id={id}
          field={dateField}
          value={tag.content ?? ""}
          editorContext={editorContext}
          onChange={(localDate: string | null) => update({ property: tag.property, content: isoDate(localDate) })}
          onBlur={onBlur}
      />
  );
};

// The text field of the Content Editor for a property type: STRING for a text, as a multiple text field shows it, LONG
// for a whole number and DOUBLE for a decimal number. The tag holds a number as text, such as 215 or 19.90.
const textValue = (requiredType: "STRING" | "LONG" | "DOUBLE") => {
  const TextValue = ({ id, field, editorContext, onBlur, tag, update }: ValueEditorProps) => {
    const textField = useMemo(
      () => ({ ...field, name: id, requiredType, selectorType: "Text", selectorOptions: [], multiple: false }),
      [field, id],
    );
    const Text = selectorType("Text").cmp;

    return (
        <Text
            id={id}
            field={textField}
            value={tag.content ?? ""}
            editorContext={editorContext}
            onChange={(content: string | undefined) => update({ property: tag.property, content: content ?? "" })}
            onBlur={onBlur}
        />
    );
  };
  return TextValue;
};

const TextValue = textValue("STRING");

const VALUE_EDITORS: Partial<Record<OgKind, ComponentType<ValueEditorProps>>> = {
  IMAGE: ImageValue,
  DATE: DateValue,
  INTEGER: textValue("LONG"),
  NUMBER: textValue("DOUBLE"),
};

type PropertyValueProps = CustomValueProps &
  Readonly<{ properties: VocabularyProperty[]; isLoading: boolean; placeholder: string }>;

// One custom value: a property of the vocabulary of the mapping, then its value, with the editor of its kind.
const PropertyValue = (props: PropertyValueProps) => {
  const { value, field, onChange, onBlur, properties, isLoading, placeholder } = props;
  const tag = parseTag(value);
  const kind = properties.find(property => property.name === tag.property)?.kind ?? "TEXT";
  const ValueEditor = VALUE_EDITORS[kind] ?? TextValue;

  const update = (next: Tag) => {
    const isEmpty = next.property === "" && !next.content && !next.node;
    onChange(isEmpty ? undefined : JSON.stringify(next));
  };

  return (
      <>
          {/* The props of the single choice list of the Content Editor, so both dropdowns look the same. */}
          <Dropdown
              data-sel-role="sdm-tag-property"
              className={styles.property}
              variant="outlined"
              size="medium"
              hasSearch={properties.length >= 5}
              data={properties.map(property => ({
                label: property.name,
                value: property.name,
                attributes: { "data-value": property.name } as HTMLAttributes<HTMLElement>,
              }))}
              value={tag.property}
              label={tag.property}
              placeholder={placeholder}
              isDisabled={field.readOnly || isLoading}
              isLoading={isLoading}
              onChange={(_event, item) => {
                // A new property starts with no value, because each kind of value has its own editor.
                update({ property: item.value ?? "" });
                onBlur();
              }}
          />
          <ValueEditor key={kind} {...props} tag={tag} kind={kind} update={update}/>
      </>
  );
};

export default PropertyValue;

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE, RAW } from "../i18n.ts";
import { parseTag, type CustomValueProps } from "./PropertyValue.tsx";
import type { OgKind, VocabularyProperty } from "./osmTag.gql.ts";

// The checks of OgValues.isIsoDate and OgValues.isAbsoluteUrl, which the module applies to a value of the editor
// before it writes its tag. A check here refuses at least every text that the module refuses.

// A date in the extended format of ISO 8601: a date, then an optional time, then an optional offset, such as 2026-10-19,
// 2026-10-19T09:30 or 2026-10-19T09:30:00.250+02:00. Java reads the letters T and Z in any case.
const DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME = /^T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?/i;
const OFFSET = /^(?:Z|[+-](\d{2}):(\d{2}))$/i;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Java reads an offset of 18 hours at most.
const MAX_OFFSET_MINUTES = 18 * 60;

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const isDay = (year: number, month: number, day: number) =>
  month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]);

const isOffset = (text: string) => {
  const offset = OFFSET.exec(text);
  if (!offset) {
    return false;
  }

  const [hours, minutes] = [Number(offset[1] ?? 0), Number(offset[2] ?? 0)];
  return minutes <= 59 && hours * 60 + minutes <= MAX_OFFSET_MINUTES;
};

export const isIsoDate = (text: string) => {
  const date = DATE.exec(text);
  if (!date || !isDay(Number(date[1]), Number(date[2]), Number(date[3]))) {
    return false;
  }

  const afterDate = text.slice(date[0].length);
  if (afterDate === "") {
    return true;
  }

  const time = TIME.exec(afterDate);
  if (!time || Number(time[1]) > 23 || Number(time[2]) > 59 || Number(time[3] ?? 0) > 59) {
    return false;
  }

  const afterTime = afterDate.slice(time[0].length);
  return afterTime === "" || isOffset(afterTime);
};

// An absolute URL starts with http:// or https:// in any case, names a host, and holds no white space and no control
// character.
const URL_START = /^https?:\/\/([^/?#]*)/i;
const URL_FORBIDDEN = /[\p{Cc}\p{Z}]/u;
// A host name, or an IPv6 address in brackets, then an optional port.
const HOST_AND_PORT = /^(?:\[[0-9A-Fa-f:.]+\]|[^[\]:]+)(?::\d*)?$/;

export const isAbsoluteUrl = (text: string) => {
  const start = URL_START.exec(text);
  if (!start || URL_FORBIDDEN.test(text)) {
    return false;
  }

  // The user information ends at the last @ of the authority.
  const authority = start[1];
  return HOST_AND_PORT.test(authority.slice(authority.lastIndexOf("@") + 1));
};

// String.trim of Java removes the characters up to U+0020 at both ends, and the module checks the text that it keeps.
const javaTrim = (text: string) => {
  let start = 0;
  let end = text.length;
  while (start < end && text.charCodeAt(start) <= 0x20) {
    start++;
  }

  while (end > start && text.charCodeAt(end - 1) <= 0x20) {
    end--;
  }

  return text.slice(start, end);
};

type InvalidTag = { property: string; text: string; kind: OgKind };

const isValidText = (kind: OgKind, text: string) => {
  switch (kind) {
    case "DATE":
      return isIsoDate(text);
    case "URL":
    case "IMAGE":
      return isAbsoluteUrl(text);
    default:
      return true;
  }
};

// The values of the field that write no tag: a date property that holds no date in ISO 8601, and a URL or an image
// property that holds no absolute URL. The check skips a value that holds a file, that holds no text, or whose property
// the og:type does not have.
const invalidTags = (values: unknown, kinds: ReadonlyMap<string, OgKind>): InvalidTag[] =>
  (Array.isArray(values) ? values : [values]).flatMap(value => {
    const tag = parseTag(value);
    const kind = kinds.get(tag.property);
    const text = javaTrim(tag.content ?? "");
    if (tag.node || text === "" || kind === undefined || isValidText(kind, text)) {
      return [];
    }

    return [{ property: tag.property, text, kind }];
  });

// The Content Editor checks the form before a save, and refuses the save when a field has an error. Formik adds the
// check that a field registers to the checks of the Content Editor. The first value registers the check of every value
// of the field, and the next value takes it over when the first one goes.
export const useTagCheck = ({ id, field, form }: CustomValueProps, properties: VocabularyProperty[]) => {
  const { t } = useTranslation(NAMESPACE);
  const isFirstValue = id === field.name || id === `${field.name}[0]`;
  const registerField = form?.registerField;
  const unregisterField = form?.unregisterField;

  useEffect(() => {
    if (!isFirstValue || !registerField || !unregisterField) {
      return undefined;
    }

    const kinds = new Map(properties.map(property => [property.name, property.kind]));
    registerField(field.name, {
      validate: values => {
        const messages = invalidTags(values, kinds).map(tag =>
          t(tag.kind === "DATE" ? "customTags.invalidDate" : "customTags.invalidUrl", {
            property: tag.property,
            value: tag.text,
            ...RAW,
          })
        );
        // The Content Editor shows the text after constraintViolation_ as the error of the field.
        return messages.length > 0 ? `constraintViolation_${messages.join(" ")}` : undefined;
      },
    });
    return () => unregisterField(field.name);
  }, [isFirstValue, registerField, unregisterField, field.name, properties, t]);
};

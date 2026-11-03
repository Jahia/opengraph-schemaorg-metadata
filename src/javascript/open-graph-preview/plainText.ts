// The same conversion as OgValues.plainText on the server, so the live value of a rich text matches the live page.
// The first four steps replace what these expressions matched, in this order: /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
// /<!--[\s\S]*?-->/g and /<\/?(p|div|...)\b[^>]*>/gi with a space, then /<[^>]*>/g with nothing. Each step reads the
// text once. The expressions read to the end of the text again from each opener without a closer, so a long rich text
// of "<" froze the Content Editor.
const INVISIBLE_ELEMENTS = ["script", "style"];
const BLOCK_ELEMENTS = [
  "p",
  "div",
  "br",
  "hr",
  "li",
  "ul",
  "ol",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "tr",
  "td",
  "th",
  "table",
  "blockquote",
  "pre",
  "section",
  "article",
  "header",
  "footer",
];
const COMMENT_START = "<!--";
const COMMENT_END = "-->";
const NO_MATCH = -1;
const NO_MORE_MATCHES = -2;
const WORD_CHARACTER = /[A-Za-z0-9_]/;
const SPACE = /\s/;
const ENTITY = /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]+);/g;
const WHITE_SPACE = /[\s\u00A0]+/g;
const MAX_CODE_POINT = 0x10ffff;
const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00A0" };

const decodeEntity = (reference: string, body: string): string => {
  if (!body.startsWith("#")) {
    return NAMED_ENTITIES[body] ?? reference;
  }
  const isHexadecimal = body[1] === "x" || body[1] === "X";
  const codePoint = Number.parseInt(body.substring(isHexadecimal ? 2 : 1), isHexadecimal ? 16 : 10);
  return codePoint <= MAX_CODE_POINT ? String.fromCodePoint(codePoint) : reference;
};

// The index after the element that starts at a "<", NO_MATCH when none starts there, or NO_MORE_MATCHES when none
// starts there or at any later index.
type ElementEnd = (text: string, start: number) => number;

// Without the u flag, a case insensitive expression folds no other letter to an ASCII letter.
const startsWithName = (text: string, index: number, name: string): boolean => {
  if (index + name.length > text.length) {
    return false;
  }
  for (let offset = 0; offset < name.length; offset++) {
    const character = text[index + offset];
    const folded = character >= "A" && character <= "Z" ? character.toLowerCase() : character;
    if (folded !== name[offset]) {
      return false;
    }
  }
  return true;
};

// The name that starts at the index and ends at a word boundary.
const elementName = (text: string, index: number, names: string[]): string | undefined =>
  names.find(name => {
    const end = index + name.length;
    return startsWithName(text, index, name) && (end === text.length || !WORD_CHARACTER.test(text[end]));
  });

// The index after the first </name\s*> at or after from, or -1.
const closerEnd = (text: string, from: number, name: string): number => {
  for (let index = text.indexOf("</", from); index >= 0; index = text.indexOf("</", index + 1)) {
    if (startsWithName(text, index + 2, name)) {
      let end = index + 2 + name.length;
      while (end < text.length && SPACE.test(text[end])) {
        end++;
      }
      if (text[end] === ">") {
        return end + 1;
      }
    }
  }
  return -1;
};

// An element without a closer leaves no closer for a later element of the same name either, so the matcher
// remembers the name and reads the text once per name.
const invisibleElements = (): ElementEnd => {
  const withoutCloser = new Set<string>();
  return (text, start) => {
    const name = elementName(text, start + 1, INVISIBLE_ELEMENTS);
    if (name === undefined || withoutCloser.has(name)) {
      return NO_MATCH;
    }
    const openerEnd = text.indexOf(">", start + 1 + name.length);
    if (openerEnd < 0) {
      return NO_MORE_MATCHES;
    }
    const end = closerEnd(text, openerEnd + 1, name);
    if (end < 0) {
      withoutCloser.add(name);
      return NO_MATCH;
    }
    return end;
  };
};

const commentEnd: ElementEnd = (text, start) => {
  if (!text.startsWith(COMMENT_START, start)) {
    return NO_MATCH;
  }
  const end = text.indexOf(COMMENT_END, start + COMMENT_START.length);
  return end < 0 ? NO_MORE_MATCHES : end + COMMENT_END.length;
};

const blockTagEnd: ElementEnd = (text, start) => {
  const nameStart = text[start + 1] === "/" ? start + 2 : start + 1;
  const name = elementName(text, nameStart, BLOCK_ELEMENTS);
  if (name === undefined) {
    return NO_MATCH;
  }
  const end = text.indexOf(">", nameStart + name.length);
  return end < 0 ? NO_MORE_MATCHES : end + 1;
};

const tagEnd: ElementEnd = (text, start) => {
  const end = text.indexOf(">", start + 1);
  return end < 0 ? NO_MORE_MATCHES : end + 1;
};

// The text where the replacement takes the place of each element, from left to right and without overlap, as
// String.replace does with a global expression.
const replaceElements = (text: string, replacement: string, elementEnd: ElementEnd): string => {
  let result = "";
  let copied = 0;
  let start = text.indexOf("<");
  while (start >= 0) {
    const end = elementEnd(text, start);
    if (end === NO_MORE_MATCHES) {
      break;
    }
    if (end === NO_MATCH) {
      start = text.indexOf("<", start + 1);
    } else {
      result += text.slice(copied, start) + replacement;
      copied = end;
      start = text.indexOf("<", end);
    }
  }
  return result + text.slice(copied);
};

const withoutElements = (html: string): string => {
  const text = replaceElements(html, " ", invisibleElements());
  const withoutComments = replaceElements(text, " ", commentEnd);
  return replaceElements(replaceElements(withoutComments, " ", blockTagEnd), "", tagEnd);
};

export const plainText = (html: string): string =>
  withoutElements(html).replace(ENTITY, decodeEntity).replace(WHITE_SPACE, " ").trim();

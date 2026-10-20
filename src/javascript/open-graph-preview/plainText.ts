// The same conversion as OgValues.plainText on the server, so the live value of a rich text matches the live page.
const INVISIBLE_ELEMENT = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const BLOCK_TAG =
  /<\/?(p|div|br|hr|li|ul|ol|h[1-6]|tr|td|th|table|blockquote|pre|section|article|header|footer)\b[^>]*>/gi;
const TAG = /<[^>]*>/g;
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

export const plainText = (html: string): string =>
  html
    .replace(INVISIBLE_ELEMENT, " ")
    .replace(COMMENT, " ")
    .replace(BLOCK_TAG, " ")
    .replace(TAG, "")
    .replace(ENTITY, decodeEntity)
    .replace(WHITE_SPACE, " ")
    .trim();

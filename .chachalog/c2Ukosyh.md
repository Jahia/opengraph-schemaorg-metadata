---
# Allowed version bumps: patch, minor, major
opengraph-schemaorg-metadata: patch
---

Fixed two security issues. A user without the permission openGraphSchemaOrgMetadataManage, such as an editor, can no longer create a mapping or change its values through the Content Editor or the generic node mutations of GraphQL. The text of a tag taken from a rich text is now computed in one pass, so a rich text with many unclosed tags or comments no longer slows down each view of its live page.

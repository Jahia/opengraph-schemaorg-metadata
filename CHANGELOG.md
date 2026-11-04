# opengraph-schemaorg-metadata Changelog

## 0.1.0

* Added the Open Graph tags and a `twitter:card` tag of each mapped content to the head of its live page.

* Added the Open Graph & schema.org screen in jContent, which maps a content type, a mixin or a template to both vocabularies.

* Added a switch for each vocabulary in a mapping, so a mapping writes Open Graph tags, the JSON-LD block, both or neither.

* Added the tags and the JSON-LD block to the preview of a page, with the URLs of the live page.

* Added the permission `openGraphSchemaOrgMetadataManage`, granted to editors in chief, to manage the mappings of a site.

* Added custom Open Graph and schema.org values for one content, which replace the mapped values. An invalid date or a relative URL is refused.

* Added a schema.org JSON-LD block of the mapped type to the head of the live page of each mapped content.

* Added the Open Graph values, the share cards and the JSON-LD of a content to the SEO section of the Content Editor.

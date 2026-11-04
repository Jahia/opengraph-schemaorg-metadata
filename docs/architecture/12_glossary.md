# Glossary

| Term | Definition |
|---|---|
| Mapping | A node of type `osmnt:typeMapping` that maps a content type or a mixin to an og:type, to a schema.org type, or to both. |
| Template mapping | A mapping whose `osm:templateName` names one template. It applies only to the contents that use that template: the pages and the contents whose `j:templateName` names it, and the main resources that this content template renders. |
| Settings node | The node `/sites/<siteKey>/opengraph-schemaorg-metadata` of type `osmnt:settings`, which holds the mappings of a site. |
| Source property | A property of a content type whose value fills a property of a vocabulary, such as `jcr:title` for `og:title`. |
| Storage name | The name of the property of a mapping node that holds the source of one target property, such as `osm:og_image_alt`. |
| Vocabulary | Open Graph or schema.org. The enums `OgType` and `SchemaType` list the types and the properties of each one. |
| og:type | The type of an Open Graph object, such as `website` or `article`. It decides which Open Graph properties apply. |
| Kind | The kind of value that a property takes, as `OgKind` names it: `TEXT`, `DATE`, `URL`, `IMAGE`, `INTEGER` or `NUMBER`. |
| Root, structured property | A root is a property such as `og:video`. A structured property, such as `og:video:width`, describes its root and follows it. |
| Custom tag | One value of `osm:customTags`, which replaces the mapped values of one Open Graph property for one content. |
| Custom value | One value of `osm:customSchemaOrg`, which replaces or adds one schema.org property for one content. |
| Share card | The preview of a link on Facebook, LinkedIn and X that the Content Editor draws from the Open Graph tags. |
| JSON-LD block | The `<script type="application/ld+json">` element that holds the schema.org entity of a content. |
| Main resource | The content that a live page renders: a page, or a content of a type that inherits `jmix:mainResource`. |

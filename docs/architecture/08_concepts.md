# Cross-cutting Concepts

## Storage names of the vocabulary

A mapping node holds the source of each mapped property in a property whose name derives from the name of the target
property:

| Vocabulary | Rule | Example |
|---|---|---|
| Open Graph | `osm:` followed by the name, with `_` in place of each `:` | `og:image:alt` is stored in `osm:og_image_alt`. |
| schema.org | `osm:schema_` followed by the name, with `_` in place of each `.` | `author.name` is stored in `osm:schema_author_name`. |

`OpenGraphService.storageName` and `OpenGraphService.schemaStorageName` apply these rules, and `findOgProperty` and
`findSchemaProperty` reverse them. Two og:types that share a property, such as `music.album` and `music.playlist` for
`music:song`, declare the same storage name in their mixins. A change of the og:type therefore removes every
`osm:og_*` property, then sets the properties of the new og:type.

## Kinds of values

`OgKind` names the kind of value that a property takes: `TEXT`, `DATE`, `URL`, `IMAGE`, `INTEGER` or `NUMBER`. Only a
schema.org property takes `NUMBER`. `OpenGraphService.compatibleKinds` gives the kinds that a source property can fill:

| JCR type of the source property | Kinds |
|---|---|
| `STRING`, rich text | `TEXT` |
| `STRING`, other selector | `TEXT`, `URL` |
| `URI` | `URL` |
| `LONG` | `INTEGER`, `NUMBER` |
| `DOUBLE`, `DECIMAL` | `NUMBER` |
| `DATE` | `DATE` |
| `REFERENCE`, `WEAKREFERENCE` to a file | `IMAGE`, `URL` |

A reference points to a file when its picker type is `image` or `file`. It also points to a file when a value
constraint names `jmix:image` or a subtype of `jnt:file`. A date becomes ISO 8601 in UTC, to the second. The text of a rich text
loses its markup through `OgValues.plainText`.

## Structured properties

The Open Graph protocol writes a structured property, such as `og:video:width`, after its root, `og:video`.
`OpenGraphService.addProperties` writes a structured property only when its root wrote a tag. `og:image:alt` is the
exception, and takes the title of the image file when no source fills it. A root with several values, such as
`video:actor`, writes a structured array. Each value of the root comes first, then the value of each structured
property at the same index.

## Values computed by the module

The vocabulary lists no property that the module computes:

- `og:type`, `og:url`, `og:site_name`, `og:locale` and `og:locale:alternate`.
- `og:image:type`, `og:image:width` and `og:image:height` of an image file.
- `twitter:card`, which is `summary_large_image` when the tags hold `og:image`, and `summary` otherwise.
- The schema.org `url`, `@context` and `@type`, and the `@type` of a nested entity, such as `Person` for `author`.

When no source fills `og:title`, the tag takes the `jcr:title` of the content. The first property of a schema.org type,
such as `headline`, takes the `jcr:title` in the same case.

## Custom values of an editor

`osm:customTags` and `osm:customSchemaOrg` are internationalized properties with several values. Each value is a JSON
object:

- A text: `{"property": "og:title", "content": "Summer in Mykonos"}`.
- A file: `{"property": "og:image", "node": "<uuid>"}`.

A custom value replaces every mapped value of its property. A custom schema.org value can also add a property that the
mapping does not fill. The service ignores a value that is not valid JSON, whose property the type of the mapping does
not have, or that sets nothing. A property that takes one value keeps the first valid value of the editor. For a custom
Open Graph tag, a value of a closed list, such as `og:determiner`, must be an allowed value. An integer must be 1 or
more. A date must be in the extended format of ISO 8601, such as `2026-10-19` or `2026-10-19T09:30:00Z`, and a URL, or
an image that holds a text, must be an absolute `http` or `https` URL. `OgValues.isIsoDate` and `OgValues.isAbsoluteUrl`
make these two checks, and `OsmTag` makes them again before the Content Editor saves the field.

## Output encoding

`HeadWriter.meta` encodes the property and the content of a meta tag with `Encode.forHtmlAttribute` of the OWASP
encoder. A `twitter:*` tag uses the attribute `name`, and an Open Graph tag uses `property`. `JsonLdWriter` writes
`<`, `>`, `&`, U+2028 and U+2029 as Unicode escapes, so a value cannot close the script element.

## Permission

`openGraphSchemaOrgMetadataManage` protects the mappings at three points:

| Point | Check |
|---|---|
| Admin route in `init.tsx` | `requiredPermission` hides the entry of jContent from a user without the permission. |
| `Resolvers.managedSite` | Each field and mutation that reads or writes a mapping checks the permission on the site node. |
| `MappingWriteGuard` | Each set or removal of an `osm:*` property of an `osmnt:typeMapping` node checks the permission on the site. A system session passes. |

`OpenGraphService` writes with a system session that carries the current user, after the resolver made the check.

## Locale

`OpenGraphService.resolve` and `resolveSchemaOrg` read the node again in the requested locale when its session has
another locale. `og:locale` is the locale of the request, and `og:locale:alternate` lists the other active live
languages of the site. The UI has its labels in English, French and German, in
[`src/main/resources/javascript/locales/`](../../src/main/resources/javascript/locales/) and in the resource bundles of
[`src/main/resources/resources/`](../../src/main/resources/resources/).

## Tests

The Cypress suite under [`tests/cypress/e2e/`](../../tests/cypress/e2e/) carries the coverage, and runs its specs in the
order of `specPattern` in [`tests/cypress.config.ts`](../../tests/cypress.config.ts):

| Spec | Scope |
|---|---|
| `0Setup.cy.ts`, `ZTeardown.cy.ts` | Create and delete the site `osmSite` and three users. |
| `1AdminRoute.cy.ts` | The permission, and the entry of the mapping screen in jContent. |
| `2Api.cy.ts` | The GraphQL API, the validation and the permission checks. |
| `3Filter.cy.ts`, `4FilterEscape.cy.ts` | The Open Graph tags in the head of a live page, and their encoding. |
| `3FilterPreview.cy.ts` | The Open Graph tags and the JSON-LD block in the head of a preview page, with the live URLs. |
| `5AdminScreen.cy.ts` | The mapping screen, as a site administrator and as an editor in chief. |
| `6EditorField.cy.ts`, `7EditorTags.cy.ts`, `8ShareCard.cy.ts` | The Open Graph values, the custom tags and the share card in the Content Editor. |
| `8MixinTemplate.cy.ts` | The mappings of a mixin and of a template. |
| `9SchemaOrg.cy.ts`, `9SchemaOrgEditor.cy.ts` | The JSON-LD block in the head, and the schema.org fieldsets of the Content Editor. |

The helpers of [`tests/cypress/support/`](../../tests/cypress/support/) wrap the GraphQL calls, the mapping screen, the
Content Editor and the live page. The unit tests under [`src/test/java/`](../../src/test/java/) cover the pure conversions
only: `HeadWriter`, `JsonLdWriter` and `OgValues`.

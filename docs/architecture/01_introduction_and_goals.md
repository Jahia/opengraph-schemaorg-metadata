# Introduction and Goals

Open Graph & Schema.org Metadata is a Jahia module. It writes Open Graph meta tags and a schema.org JSON-LD block in the
head of a live page and of a preview page. A site administrator maps a content type to an og:type and to a schema.org
type. The mapping also names the property of the content type that fills each property of a vocabulary. An editor sees
the resulting values in the Content Editor, and can replace them for one content.

The module is not meant for a site whose templates already write Open Graph tags or schema.org values. The render
filter adds its tags before the first `</head>`, and it does not read the tags that the template wrote. A page of such
a template then holds both. A template mapping with both vocabularies off stops the module on a template that writes
its own values.

## Requirements Overview

| Requirement | Building block |
|---|---|
| A user who holds `openGraphSchemaOrgMetadataManage` on a site lists, creates, edits and deletes the mappings of that site. | Mapping screen, GraphQL API, choice lists |
| A mapping applies to `jnt:page`, to a type that inherits `jmix:mainResource`, or to a mixin that extends one of them. | Mapping service |
| A template mapping applies only to the contents of its type that use its template. | Mapping service |
| A mapping switches each vocabulary on or off: Open Graph and schema.org. | Content model |
| The head of a page holds the `og:*` meta tags, a `twitter:card` tag and one JSON-LD block of the mapped content. A preview page gets the tags of the live page, with the live URLs. | Render filter |
| The SEO section of the Content Editor shows the Open Graph values, a share card and the JSON-LD block. An editor can set custom values for one content there. | Content Editor extensions |
| A change of a mapping applies to the live pages at once, with no publication. | Content model, render filter |

## Quality Goals

| Priority | Quality goal | Scenario |
|---|---|---|
| 1 | Security | A value that holds markup, such as `"` or `</script>`, reaches the head of the page encoded and adds no element. A user without `openGraphSchemaOrgMetadataManage` cannot create a mapping or change its values through any API. |
| 2 | Time behaviour of the live page | The render filter reads the mappings of a site from memory. The service reads them from the repository again only after a change of the mappings of that site. |
| 3 | Conformity to the protocols | A tag holds a value of the kind that its Open Graph property takes, and a structured property, such as `og:video:width`, follows its root. |
| 4 | Feedback to the editor | The Content Editor shows the values of the edit workspace, and a tag that a text field fills changes while the editor types. |

## Stakeholders

| Role/Name | Contact | Expectations |
|---|---|---|
| Site administrator, editor in chief | Users of jContent | The [README](../../README.md) tells them how to set a mapping. This document does not address them. |
| Editor | Users of the Content Editor | The [README](../../README.md) tells them what the SEO section shows. This document does not address them. |
| Developer or agent | Maintainers of `Jahia/opengraph-schemaorg-metadata` | This document gives the building blocks, the runtime scenarios and the concepts that a change must respect. |
| Reviewer | Reviewers of a pull request | The quality scenarios and the risks show what a change can break. |

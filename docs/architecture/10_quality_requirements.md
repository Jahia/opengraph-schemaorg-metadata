# Quality Requirements

## Quality Requirements Overview

| Category | Requirement |
|---|---|
| Security | The module encodes every value it writes in a page, and the permission binds the mapping nodes. |
| Time behaviour | The render filter reads the mappings from memory, and reads the repository after a change only. |
| Functional correctness | The tags obey the Open Graph protocol, and the JSON-LD block obeys the schema.org types. |
| Usability | The Content Editor shows the values of a content, and hides the fieldsets that do not apply. |

## Quality Scenarios

| Scenario | Response | Spec |
|---|---|---|
| A mapping on `jnt:page` is created, and a live page is requested with no publication. | The page holds the website tags. | `3Filter.cy.ts` |
| A mapping is deleted, and its live page is requested. | The page holds no Open Graph tag. | `3Filter.cy.ts` |
| An editor requests a mapped page in preview mode, with a change that is not published. | The page holds the tags of the change, with the URLs of the live page. | `3FilterPreview.cy.ts` |
| A title holds markup, or a rich text holds the characters that end an attribute. | The values are encoded, and the page has no new script element. | `4FilterEscape.cy.ts` |
| A title holds `</script>`. | The JSON-LD block keeps the title inside the script element. | `9SchemaOrg.cy.ts` |
| An editor opens the Content Editor. | The entry of the mapping screen is hidden, and the API refuses the mappings to the editor. | `1AdminRoute.cy.ts`, `2Api.cy.ts` |
| An editor types a title. | The share card shows the new title at once. | `8ShareCard.cy.ts` |
| A content has no mapping. | The Content Editor shows none of the four fieldsets of the module. | `9SchemaOrgEditor.cy.ts` |

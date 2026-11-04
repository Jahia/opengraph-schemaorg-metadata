# Runtime View

## Tags in the head of a live page

```mermaid
sequenceDiagram
    participant Crawler
    participant Chain as Render chain
    participant Filter as OpenGraphFilter
    participant Service as OpenGraphService
    participant JCR
    Crawler->>Chain: GET a live page
    Chain->>Filter: HTML of the page, after AggregateCacheFilter
    Filter->>Filter: find the first </head>
    Filter->>Service: resolve(main resource, locale)
    Service->>JCR: read the mappings on a cache miss
    Service-->>Filter: Open Graph tags, with a node for each URL
    Filter->>Service: resolveSchemaOrg(main resource, locale)
    Service-->>Filter: schema.org entity, with a node for each URL
    Filter->>Filter: build each absolute URL, encode each value
    Filter-->>Chain: HTML with the meta tags and the JSON-LD block before </head>
    Chain-->>Crawler: page
```

The filter applies to the `page` configuration, in live mode and in preview mode, for the `html` template type, and not
to an Ajax request. Its condition `ModuleOnSiteCondition` requires the module on the site of the request. When the HTML has no `</head>`,
or when no mapping applies, the filter returns the HTML unchanged. A `RepositoryException` writes a warning to the log
and leaves the page unchanged.

`OpenGraphFilter.absoluteUrl` builds the absolute URL of a node in the live workspace, in both modes, so a preview page
gives the URLs of the live page:

- A file gives the HTTP path of its provider, `/live`, then its escaped path, the form of `JCRNodeWrapper.getUrl`.
- A page or a main resource gives its URL under `/cms/render/live/<language>`, after the outbound rules of
  `UrlRewriteService`, so the URL holds a vanity URL.
- A relative URL takes the server of the render context as its prefix.

## Creation of a mapping

```mermaid
sequenceDiagram
    actor Admin as Site administrator
    participant Screen as Mapping screen
    participant API as GraphQL API
    participant CE as Content Editor
    participant Lists as Choice lists
    participant Guard as MappingWriteGuard
    participant Listener as MappingCacheListener
    participant Service as OpenGraphService
    Admin->>Screen: Add a mapping
    Screen->>API: createOpenGraphSettings
    API-->>Screen: path of the settings node
    Screen->>CE: CE_API.create(path, osmnt:typeMapping)
    CE->>Lists: values of osm:nodeType, osm:templateName, osm:og_*, osm:schema_*
    Lists-->>CE: choices, with addMixin for an og:type or a schema.org type
    Admin->>CE: Save
    CE->>API: generic node mutations of graphql-dxm-provider
    API->>Guard: the JCR session calls beforeSetValue on each osm:* property
    Guard-->>API: no exception when the user holds the permission
    API-->>CE: saved node
    Listener->>Service: clearMappings(site path), on the JCR event of the settings node
    CE-->>Screen: onClosedCallback
    Screen->>API: openGraphMappings
```

The Content Editor saves the mapping through the generic mutations, so this scenario does not call
`saveOpenGraphMapping` and its validation. The choice lists call the same methods of the service as that validation, so
each list offers only the values that the validation accepts. `ContentTypesInitializer` and `TemplatesInitializer`
leave out a content type and a template that a mapping of the site already uses. In the form of an existing mapping,
they list its own value only.

## Values of a content in the Content Editor

```mermaid
sequenceDiagram
    actor Editor
    participant CE as Content Editor
    participant Preview as OgPreview and SchemaPreview
    participant API as GraphQL API
    participant Service as OpenGraphService
    Editor->>CE: open a content
    CE->>Preview: render osm:ogPreview and osm:schemaPreview
    Preview->>API: openGraphTags, schemaOrgJsonLd, site.serverName
    API->>Service: resolve and resolveSchemaOrg in the edit workspace
    Service-->>API: tags and entity
    API-->>Preview: values
    Preview->>CE: hide the fieldsets that do not apply
    Editor->>CE: type in a mapped text field
    Preview->>Preview: copy the text of the field into its tag
    Editor->>CE: Save
    Preview->>API: same query, when the form turns clean
```

A tag whose `sourceProperty` names a single-valued text field shows the text of that field as the editor types.
`plainText.ts` removes the markup of a rich text with the same steps as `OgValues.plainText` on the server. Another
change shows the hint "Save to see the updated Open Graph values", and the values change after the save.

## Selection of the mapping of a content

`OpenGraphService.findMapping` selects one mapping for a node:

1. The template mappings whose template is the `j:templateName` of the node, then the mappings of every template.
2. In each group, a mapping of a mixin of the node or of a supertype of that mixin, in the order of the list.
3. Then the mapping of the primary type of the node.
4. Then the mapping of the closest supertype of the primary type.

The first match wins. When the mapping has no og:type, `resolve` returns no tag. When it has no schema.org type,
`resolveSchemaOrg` returns an empty entity.

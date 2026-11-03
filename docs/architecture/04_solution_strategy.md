# Solution Strategy

| Goal | Approach |
|---|---|
| A change of a mapping applies at once | The mappings live under `/sites/<siteKey>/opengraph-schemaorg-metadata` in the default workspace. The node type `osmnt:settings` has the mixin `jmix:nolive`, so a publication never copies it to live. |
| A change of a mapping applies at once to a cached page | The render filter runs at priority 14, before `AggregateCacheFilter` at 16, so it adds the tags to the output of the cache on each request. |
| The live page stays fast | `OpenGraphService` keeps the mappings of each site in memory. `MappingCacheListener` removes the entry of a site when its settings node changes, on every node of a cluster. |
| One source for the vocabularies | The enums `OgType` and `SchemaType` list the properties of each og:type and of each schema.org type. The validation, the GraphQL field `openGraphVocabulary` and the UI read these lists. |
| The mapping form reuses the Content Editor | A mapping is a node of type `osmnt:typeMapping`. The mapping screen opens the Content Editor on it, and choice list initializers fill its fields. |
| The values of a content show in the Content Editor | Forms files add fieldsets to the SEO section, and the module registers four selector types in the registry of `@jahia/ui-extender`. |
| The permission binds the data, not only the screen | `MappingWriteGuard` checks `openGraphSchemaOrgMetadataManage` on each change of a property of a mapping node, whatever API the session uses. |

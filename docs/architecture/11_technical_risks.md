# Risks and Technical Debts

1. A user who can write a site can remove or move a mapping without `openGraphSchemaOrgMetadataManage`, because Jahia
   calls no property interceptor for these operations.
2. The render filter applies in live mode only, so a page in preview mode has no tag
   ([opengraph-schemaorg-metadata#38](https://github.com/Jahia/opengraph-schemaorg-metadata/issues/38)).
3. The service checks a custom Open Graph tag of a closed list or of an integer. It writes a custom date or URL with
   no check of its kind
   ([opengraph-schemaorg-metadata#17](https://github.com/Jahia/opengraph-schemaorg-metadata/issues/17)).
4. The UI depends on the runtime plugin `appShellRemotes.ts`. A version change of `vite`,
   `@jahia/vite-federation-plugin` or `@module-federation/vite` needs the Cypress suite on app-shell 4, and
   `package.json` pins the three together.
5. `OpenGraphService` holds the storage, the validation, the selection and the Open Graph resolution in one class of
   about 1,350 lines.

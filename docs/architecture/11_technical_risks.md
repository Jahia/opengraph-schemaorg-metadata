# Risks and Technical Debts

1. A user who can write a site can remove or move a mapping without `openGraphSchemaOrgMetadataManage`, because Jahia
   calls no property interceptor for these operations.
2. The service checks a custom Open Graph tag of a closed list or of an integer. It writes a custom date or URL with
   no check of its kind
   ([opengraph-schemaorg-metadata#17](https://github.com/Jahia/opengraph-schemaorg-metadata/issues/17)).
3. The UI depends on the runtime plugin `appShellRemotes.ts`. A version change of `vite`,
   `@jahia/vite-federation-plugin` or `@module-federation/vite` needs the Cypress suite on app-shell 4, and
   `package.json` pins the three together.
4. `OpenGraphService` holds the storage, the validation, the selection and the Open Graph resolution in one class of
   about 1,350 lines.

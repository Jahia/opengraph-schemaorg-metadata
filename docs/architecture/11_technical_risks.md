# Risks and Technical Debts

1. A user who can write a site can remove or move a mapping without `openGraphSchemaOrgMetadataManage`, because Jahia
   calls no property interceptor for these operations.
2. The UI depends on the runtime plugin `appShellRemotes.ts`. A version change of `vite`,
   `@jahia/vite-federation-plugin` or `@module-federation/vite` needs the Cypress suite on app-shell 4, and
   `package.json` pins the three together.
3. `OsmTag` registers the check of its field through the `form` prop that the `FastField` of the Content Editor gives
   each selector. jContent does not document this prop, so a change of jContent can remove the check before the save.
   The check of the service stays.
4. `OpenGraphService` holds the storage, the validation, the selection and the Open Graph resolution in one class of
   about 1,350 lines.

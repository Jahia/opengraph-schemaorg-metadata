# Risks and Technical Debts

1. A user who can write a site can remove or move a mapping without `openGraphSchemaOrgMetadataManage`, because Jahia
   calls no property interceptor for these operations.
2. The UI depends on the runtime plugin `appShellRemotes.ts`. A version change of `vite`,
   `@jahia/vite-federation-plugin` or `@module-federation/vite` needs the Cypress suite on app-shell 4, and
   `package.json` pins the three together.
3. `OsmTag` registers the check of its field through the `form` prop that the `FastField` of the Content Editor gives
   each selector. jContent does not document this prop, so a change of jContent can remove the check before the save.
   The check of the service stays.
4. The handler `osmSourceChoices` fills the source fields of a mapping through the registry type
   `selectorType.onChange`, and writes the `valueConstraints` of the fields of its context. jContent does not document
   this registry type, nor the `sections`, `onSectionsUpdate`, `formik` and `client` of the context. A change of jContent
   can stop the handler: the source fields of a new mapping then stay empty, and the form of an existing mapping keeps
   the choices of `SourcePropertiesInitializer`.
5. `OpenGraphService` holds the storage, the validation, the selection and the Open Graph resolution in one class of
   about 1,350 lines.
5. When the form of an existing mapping opens, the Content Editor sends one `fieldConstraints` query for each of the
   138 properties whose choice list depends on `osm:nodeType`, also for the fields of the dynamic fieldsets that are
   off. Its query of the publication info comes after them, and Save stays disabled until that query returns. On a slow
   server, Save stays disabled for several seconds after the form opens, so the `save()` helper of the Cypress suite
   waits up to `LOAD_TIMEOUT`.

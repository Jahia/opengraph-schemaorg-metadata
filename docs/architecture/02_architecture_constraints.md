# Architecture Constraints

| Constraint | Effect on the module |
|---|---|
| The parent POM is `org.jahia.modules:jahia-modules:8.2.2.0`, and `mise.toml` pins Java `temurin-17`, Node `22` and Yarn `4.13.0`. | The module is an OSGi bundle for Jahia 8.2. |
| `jahia-depends` in `pom.xml` names `default`, `graphql-dxm-provider`, `jcontent=3.8.1` and `app-shell=4.0`. | The UI runs in jContent 3.8.1 on app-shell 4. |
| `CLAUDE.md` forbids Spring. | Every Java service is an OSGi Declarative Services component, and gets its dependencies through `@Reference`. |
| `CLAUDE.md` allows Moonstone components only in the UI. | `vite.config.ts` shares `@jahia/moonstone` with `import: false`, so the bundle holds no copy of Moonstone and of its global CSS. |
| A CND accepts only the selector types of Jahia. | The forms files under `src/main/resources/META-INF/jahia-content-editor-forms/forms/` set the selector types of the module. |
| The JCR refuses two declarations of one property name on one node. | A mapping node carries one mixin of an og:type and one mixin of a schema.org type at a time. |
| Jahia calls a property interceptor when a session sets or removes a property, and not when it removes or moves a node. | The permission check of `MappingWriteGuard` covers the values of a mapping, and not its removal. |
| `@jahia/vite-federation-plugin` 0.2.0 initializes each `window:appShell.remotes.*` container a second time. | `vite.config.ts` adds the runtime plugin `src/javascript/appShellRemotes.ts`, which hands each container to the runtime without its `init`. |
| The `LICENSE` file is the MIT license of the module. | A source file has no license header. |

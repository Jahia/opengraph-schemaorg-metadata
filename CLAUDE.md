# CLAUDE.md

## Build

```bash
yarn install                  # Frontend dependencies
yarn lint                     # ESLint
yarn tsc --noEmit             # Type check of src/javascript
mvn -s .github/maven.settings.xml clean install   # Vite build, target/structured-data-mapper-*.jar
```

The Maven settings file reads the Nexus credentials from the variables `NEXUS_USERNAME` and `NEXUS_PASSWORD` in the environment. The file `mise.toml` pins the version of each build tool: Java `temurin-17`, Node `22`, Yarn `4.13.0` and Maven `3`.

## Deploy

The script `deploy.sh` reads the URL and the credentials of the Jahia server from the file `.env` at the repository root. The file `.env` sets the variables `JAHIA_URL`, `JAHIA_USER` and `JAHIA_PASS`.

```bash
./deploy.sh prod deploy       # Build, then install the bundle through the provisioning API
./deploy.sh dev deploy        # Same, with the Maven profile dev
./deploy.sh prod test         # Deploy, then run the Cypress suite
```

## Test

```bash
cd tests && yarn install
cd tests && yarn lint && yarn typecheck
cd tests && JAHIA_URL=http://localhost:8080 SUPER_USER_PASSWORD=<root password> yarn e2e:ci
cd tests && yarn e2e:debug    # Interactive Cypress runner
```

The suite runs its specs in the order of `specPattern` in `tests/cypress.config.ts`. `0Setup.cy.ts` creates the site `sdmSite` with the modules `structured-data-mapper` and `news`, and three users with the roles `site-administrator`, `editor-in-chief` and `editor` on the site. `ZTeardown.cy.ts` deletes the site and the users. Run a single spec together with these two specs.

The provisioning manifests install `news` 3.4.0, because the specs use its content type `jnt:news`.

## Rules

- Use Moonstone components only in the UI, and do not style a raw `div` or `span`. Moonstone is a dependency, and `vite.config.ts` shares it with `import: false`, so the module bundles no Moonstone and loads no global Moonstone CSS of its own.
- Do not use Spring. Write each Java service as an OSGi Declarative Services component, and get its dependencies through `@Reference`.
- Write few unit tests, because Cypress carries the coverage. A unit test covers a pure value conversion only.
- A GraphQL resolver checks the permission `structuredDataMapperManage` on the site node, `/sites/<siteKey>`, before it reads or writes a mapping.
- Do not add a license header to a source file. The `LICENSE` file at the repository root is the license of the module.
- Keep the package name `structureddatamapper` in `package.json`. A hyphen in the package name blocks the rendering of the UI.
- Pin `vite`, `@jahia/vite-federation-plugin` and the `@module-federation/vite` resolution together.
- Put a library that app-shell 4 provides as a singleton in `peerDependencies`, and a copy at the version of app-shell 4.0.0 in `devDependencies`. The build of `@jahia/vite-federation-plugin` fails on a library in the wrong section.

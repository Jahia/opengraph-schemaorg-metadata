import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import jahia from "@jahia/vite-federation-plugin";

export default defineConfig({
  build: {
    outDir: "./src/main/resources/javascript/apps/",
  },
  plugins: [
    jahia({
      exposes: {
        "./init": "./src/javascript/init.tsx",
      },
      dts: false,
      // The runtime plugins of the jahia plugin come first, so this one decides how the runtime gets a container of the app shell.
      runtimePlugins: [fileURLToPath(new URL("./src/javascript/appShellRemotes.ts", import.meta.url))],
      // The plugin shares each peerDependency as a singleton of the app shell. The app shell shares these two pooled,
      // and version 0.0.0 makes this remote lose every election against it.
      shared: {
        // The queries of the module read the ApolloProvider of the app shell, so they need its @apollo/client.
        "@apollo/client": { singleton: true, version: "0.0.0" },
        // A bundled Moonstone brings its global CSS, which can load after the CSS of jContent and break the Content
        // Editor layout, so the module takes the Moonstone of the app shell and bundles none.
        "@jahia/moonstone": { singleton: true, import: false },
      },
    }),
  ],
});

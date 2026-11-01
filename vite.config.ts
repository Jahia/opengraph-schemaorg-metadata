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
      // The plugin shares each peerDependency as a singleton of the app shell. The app shell shares these two pooled.
      shared: {
        // The queries of the module read the ApolloProvider of the app shell, so they need its @apollo/client.
        // Version 0.0.0 makes this remote lose every election against it.
        "@apollo/client": { singleton: true, version: "0.0.0" },
        // A bundled Moonstone brings its global CSS, which can load after the CSS of jContent and break the Content
        // Editor layout, so the module takes the Moonstone of the app shell and bundles none.
        "@jahia/moonstone": { singleton: true, import: false },
      },
    }),
  ],
});

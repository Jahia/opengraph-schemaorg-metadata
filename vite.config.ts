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
      // The plugin shares each peerDependency as a singleton of the app shell. The app shell shares these two pooled,
      // and version 0.0.0 makes this remote lose every election against it.
      shared: {
        // The queries of the module read the ApolloProvider of the app shell, so they need its @apollo/client.
        "@apollo/client": { singleton: true, version: "0.0.0" },
        // A private Moonstone loads its global CSS after the CSS of jContent, and breaks the Content Editor layout.
        "@jahia/moonstone": { singleton: true, version: "0.0.0" },
      },
    }),
  ],
});

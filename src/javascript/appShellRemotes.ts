type Container = { get: (module: string) => unknown };

// A remote "window:appShell.remotes.<name>" is a webpack container that the app shell has initialized with its share scope.
// The federation runtime of the module would initialize it again with a copy of that scope, and the container refuses it
// (RUNTIME-015, opengraph-schemaorg-metadata#40). The runtime plugin hands the runtime the container without its init.
export default function appShellRemotes() {
  return {
    name: "app-shell-remotes",
    loadEntry({ remoteInfo }: { remoteInfo: { type: string; entry: string } }) {
      const { protocol, pathname } = new URL(remoteInfo.entry);
      if (remoteInfo.type !== "var" || protocol !== "window:") {
        return undefined;
      }
      const container = pathname
        .split(".")
        .reduce<unknown>((parent, key) => (parent as Record<string, unknown> | undefined)?.[key], globalThis) as
        | Container
        | undefined;
      return container && { init: () => undefined, get: (module: string) => container.get(module) };
    },
  };
}

import { Share } from "@jahia/moonstone/dist/icons";
import { registry } from "@jahia/ui-extender";
import { lazy, Suspense } from "react";
import { i18n, NAMESPACE } from "./i18n.ts";

const OpenGraphSettingsApp = lazy(() => import("./open-graph-settings/OpenGraphSettingsApp.tsx"));

export default function registerVeryOpenGraph() {
  registry.add("callback", "very-open-graph", {
    targets: ["jahiaApp-init:50"],
    callback: () => {
      i18n.loadNamespaces(NAMESPACE);

      registry.add("adminRoute", "veryOpenGraph", {
        targets: ["jcontent:60"],
        icon: <Share/>,
        label: "very-open-graph:openGraph.nav",
        isSelectable: true,
        requiredPermission: "veryOpenGraphManage",
        requireModuleInstalledOnSite: "very-open-graph",
        render: () => (
            <Suspense fallback={null}>
                <OpenGraphSettingsApp/>
            </Suspense>
        ),
      });
    },
  });
}

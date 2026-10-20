import { Share } from "@jahia/moonstone/dist/icons";
import { registry } from "@jahia/ui-extender";
import { lazy, Suspense } from "react";
import { i18n, NAMESPACE } from "./i18n.ts";
import type { OgPreviewProps } from "./open-graph-preview/OgPreview.tsx";

const OpenGraphSettingsApp = lazy(() => import("./open-graph-settings/OpenGraphSettingsApp.tsx"));
const OgPreviewApp = lazy(() => import("./open-graph-preview/OgPreview.tsx"));

const OgPreviewSelector = (props: OgPreviewProps) => (
    <Suspense fallback={null}>
        <OgPreviewApp {...props}/>
    </Suspense>
);

type RouteProps = { match?: { params?: { siteKey?: string } } };

const siteKeyOf = (props: RouteProps): string =>
  props?.match?.params?.siteKey ?? globalThis.jahia?.reduxStore?.getState().site ?? "";

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
        render: (props: RouteProps) => {
          const siteKey = siteKeyOf(props);
          return (
              <Suspense fallback={null}>
                  <OpenGraphSettingsApp key={siteKey} siteKey={siteKey}/>
              </Suspense>
          );
        },
      });

      // The read-only field vog:ogPreview of the section "Open Graph" in the Content Editor.
      registry.add("selectorType", "VogPreview", { cmp: OgPreviewSelector, supportMultiple: false });
    },
  });
}

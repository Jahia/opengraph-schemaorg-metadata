import { Share } from "@jahia/moonstone/dist/icons";
import { registry } from "@jahia/ui-extender";
import { lazy, Suspense, type ComponentType } from "react";
import type { VogTagProps } from "./editor-tags/VogTag.tsx";
import { i18n, NAMESPACE } from "./i18n.ts";
import type { OgPreviewProps } from "./open-graph-preview/OgPreview.tsx";

const OpenGraphSettingsApp = lazy(() => import("./open-graph-settings/OpenGraphSettingsApp.tsx"));
// The preview needs the federated module of jContent. If it does not load, the Content Editor shows an empty field.
const OgPreviewApp = lazy<ComponentType<OgPreviewProps>>(() =>
  import("./open-graph-preview/OgPreview.tsx").catch(() => ({ default: () => null }))
);
const VogTagApp = lazy(() => import("./editor-tags/VogTag.tsx"));

const OgPreviewSelector = (props: OgPreviewProps) => (
    <Suspense fallback={null}>
        <OgPreviewApp {...props}/>
    </Suspense>
);

const VogTagSelector = (props: VogTagProps) => (
    <Suspense fallback={null}>
        <VogTagApp {...props}/>
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

      // One value of vog:customTags, below vog:ogPreview. The forms file of vogmix:customTags sets this selector type.
      registry.add("selectorType", "VogTag", { cmp: VogTagSelector, supportMultiple: false });
    },
  });
}

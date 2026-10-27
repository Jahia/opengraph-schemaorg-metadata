import { Share } from "@jahia/moonstone/dist/icons";
import { registry } from "@jahia/ui-extender";
import { lazy, Suspense, type ComponentType } from "react";
import type { SdmTagProps } from "./editor-tags/SdmTag.tsx";
import { i18n, NAMESPACE } from "./i18n.ts";
import type { OgPreviewProps } from "./open-graph-preview/OgPreview.tsx";

const OpenGraphSettingsApp = lazy(() => import("./open-graph-settings/OpenGraphSettingsApp.tsx"));
// The preview needs the federated module of jContent. If it does not load, the Content Editor shows an empty field.
const OgPreviewApp = lazy<ComponentType<OgPreviewProps>>(() =>
  import("./open-graph-preview/OgPreview.tsx").catch(() => ({ default: () => null }))
);
const SdmTagApp = lazy(() => import("./editor-tags/SdmTag.tsx"));

const OgPreviewSelector = (props: OgPreviewProps) => (
    <Suspense fallback={null}>
        <OgPreviewApp {...props}/>
    </Suspense>
);

const SdmTagSelector = (props: SdmTagProps) => (
    <Suspense fallback={null}>
        <SdmTagApp {...props}/>
    </Suspense>
);

type RouteProps = { match?: { params?: { siteKey?: string } } };

const siteKeyOf = (props: RouteProps): string =>
  props?.match?.params?.siteKey ?? globalThis.jahia?.reduxStore?.getState().site ?? "";

export default function registerStructuredDataMapper() {
  registry.add("callback", "structured-data-mapper", {
    targets: ["jahiaApp-init:50"],
    callback: () => {
      i18n.loadNamespaces(NAMESPACE);

      registry.add("adminRoute", "structuredDataMapper", {
        targets: ["jcontent-siteSettingsSeo:90"],
        icon: <Share/>,
        label: "structured-data-mapper:openGraph.nav",
        isSelectable: true,
        requiredPermission: "structuredDataMapperManage",
        requireModuleInstalledOnSite: "structured-data-mapper",
        render: (props: RouteProps) => {
          const siteKey = siteKeyOf(props);
          return (
              <Suspense fallback={null}>
                  <OpenGraphSettingsApp key={siteKey} siteKey={siteKey}/>
              </Suspense>
          );
        },
      });

      // The read-only field sdm:ogPreview of the section "Open Graph" in the Content Editor.
      registry.add("selectorType", "SdmPreview", { cmp: OgPreviewSelector, supportMultiple: false });

      // One value of sdm:customTags, below sdm:ogPreview. The forms file of sdmmix:customTags sets this selector type.
      registry.add("selectorType", "SdmTag", { cmp: SdmTagSelector, supportMultiple: false });
    },
  });
}

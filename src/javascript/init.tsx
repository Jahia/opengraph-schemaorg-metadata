import { Code } from "@jahia/moonstone/dist/icons";
import { registry } from "@jahia/ui-extender";
import { lazy, Suspense, type ComponentType } from "react";
import type { SdmSchemaValueProps } from "./editor-tags/SdmSchemaValue.tsx";
import type { SdmTagProps } from "./editor-tags/SdmTag.tsx";
import { i18n, NAMESPACE } from "./i18n.ts";
import type { OgPreviewProps } from "./open-graph-preview/OgPreview.tsx";
import type { SchemaPreviewProps } from "./schema-org-preview/SchemaPreview.tsx";

const OpenGraphSettingsApp = lazy(() => import("./open-graph-settings/OpenGraphSettingsApp.tsx"));
// The preview needs the federated module of jContent. If it does not load, the Content Editor shows an empty field.
const OgPreviewApp = lazy<ComponentType<OgPreviewProps>>(() =>
  import("./open-graph-preview/OgPreview.tsx").catch(() => ({ default: () => null }))
);
const SchemaPreviewApp = lazy<ComponentType<SchemaPreviewProps>>(() =>
  import("./schema-org-preview/SchemaPreview.tsx").catch(() => ({ default: () => null }))
);
const SdmTagApp = lazy(() => import("./editor-tags/SdmTag.tsx"));
const SdmSchemaValueApp = lazy(() => import("./editor-tags/SdmSchemaValue.tsx"));

const OgPreviewSelector = (props: OgPreviewProps) => (
    <Suspense fallback={null}>
        <OgPreviewApp {...props}/>
    </Suspense>
);

const SchemaPreviewSelector = (props: SchemaPreviewProps) => (
    <Suspense fallback={null}>
        <SchemaPreviewApp {...props}/>
    </Suspense>
);

const SdmTagSelector = (props: SdmTagProps) => (
    <Suspense fallback={null}>
        <SdmTagApp {...props}/>
    </Suspense>
);

const SdmSchemaValueSelector = (props: SdmSchemaValueProps) => (
    <Suspense fallback={null}>
        <SdmSchemaValueApp {...props}/>
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
        icon: <Code/>,
        label: "structured-data-mapper:mappings.nav",
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

      // The read-only fields sdm:ogPreview and sdm:schemaPreview of the section SEO in the Content Editor.
      registry.add("selectorType", "SdmPreview", { cmp: OgPreviewSelector, supportMultiple: false });
      registry.add("selectorType", "SdmSchemaPreview", { cmp: SchemaPreviewSelector, supportMultiple: false });

      // One value of sdm:customTags, below sdm:ogPreview, and one value of sdm:customSchemaOrg, below
      // sdm:schemaPreview. The forms files of sdmmix:customTags and sdmmix:customSchemaOrg set these selector types.
      registry.add("selectorType", "SdmTag", { cmp: SdmTagSelector, supportMultiple: false });
      registry.add("selectorType", "SdmSchemaValue", { cmp: SdmSchemaValueSelector, supportMultiple: false });
    },
  });
}

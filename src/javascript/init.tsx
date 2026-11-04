import { toIconComponent } from "@jahia/moonstone";
import { registry } from "@jahia/ui-extender";
import { lazy, Suspense, type ComponentType } from "react";
import { BRACED_SHARE } from "./bracedShare.tsx";
import type { OsmSchemaValueProps } from "./editor-tags/OsmSchemaValue.tsx";
import type { OsmTagProps } from "./editor-tags/OsmTag.tsx";
import { i18n, NAMESPACE } from "./i18n.ts";
import ChoiceList from "./open-graph-settings/ChoiceList.tsx";
import type { TemplateFieldProps } from "./open-graph-settings/TemplateField.tsx";
import type { OgPreviewProps } from "./open-graph-preview/OgPreview.tsx";
import type { EditorField, OnChangeContext } from "./open-graph-settings/sourceChoices.ts";
import type { SchemaPreviewProps } from "./schema-org-preview/SchemaPreview.tsx";

const NODE_TYPE_PROPERTY = "osm:nodeType";

const OpenGraphSettingsApp = lazy(() => import("./open-graph-settings/OpenGraphSettingsApp.tsx"));
// The preview needs the federated module of jContent. If it does not load, the Content Editor shows an empty field.
const OgPreviewApp = lazy<ComponentType<OgPreviewProps>>(() =>
  import("./open-graph-preview/OgPreview.tsx").catch(() => ({ default: () => null }))
);
const SchemaPreviewApp = lazy<ComponentType<SchemaPreviewProps>>(() =>
  import("./schema-org-preview/SchemaPreview.tsx").catch(() => ({ default: () => null }))
);
const OsmTagApp = lazy(() => import("./editor-tags/OsmTag.tsx"));
// The template field needs the federated module of jContent. If it does not load, the field is a plain choice list.
const TemplateFieldApp = lazy<ComponentType<TemplateFieldProps>>(() =>
  import("./open-graph-settings/TemplateField.tsx").catch(() => ({ default: ChoiceList }))
);
const OsmSchemaValueApp = lazy(() => import("./editor-tags/OsmSchemaValue.tsx"));

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

const OsmTagSelector = (props: OsmTagProps) => (
    <Suspense fallback={null}>
        <OsmTagApp {...props}/>
    </Suspense>
);

const TemplateFieldSelector = (props: TemplateFieldProps) => (
    <Suspense fallback={null}>
        <TemplateFieldApp {...props}/>
    </Suspense>
);

const OsmSchemaValueSelector = (props: OsmSchemaValueProps) => (
    <Suspense fallback={null}>
        <OsmSchemaValueApp {...props}/>
    </Suspense>
);

type RouteProps = { match?: { params?: { siteKey?: string } } };

const siteKeyOf = (props: RouteProps): string =>
  props?.match?.params?.siteKey ?? globalThis.jahia?.reduxStore?.getState().site ?? "";

export default function registerOpenGraphSchemaOrgMetadata() {
  registry.add("callback", "opengraph-schemaorg-metadata", {
    targets: ["jahiaApp-init:50"],
    callback: () => {
      i18n.loadNamespaces(NAMESPACE);

      registry.add("adminRoute", "openGraphSchemaOrgMetadata", {
        targets: ["jcontent-siteSettingsSeo:90"],
        icon: toIconComponent(BRACED_SHARE),
        label: "opengraph-schemaorg-metadata:mappings.nav",
        isSelectable: true,
        requiredPermission: "openGraphSchemaOrgMetadataManage",
        requireModuleInstalledOnSite: "opengraph-schemaorg-metadata",
        render: (props: RouteProps) => {
          const siteKey = siteKeyOf(props);
          return (
              <Suspense fallback={null}>
                  <OpenGraphSettingsApp key={siteKey} siteKey={siteKey}/>
              </Suspense>
          );
        },
      });

      // The read-only fields osm:ogPreview and osm:schemaPreview of the section SEO in the Content Editor.
      registry.add("selectorType", "OsmPreview", { cmp: OgPreviewSelector, supportMultiple: false });
      registry.add("selectorType", "OsmSchemaPreview", { cmp: SchemaPreviewSelector, supportMultiple: false });

      // One value of osm:customTags, below osm:ogPreview, and one value of osm:customSchemaOrg, below
      // osm:schemaPreview. The forms files of osmmix:customTags and osmmix:customSchemaOrg set these selector types.
      registry.add("selectorType", "OsmTag", { cmp: OsmTagSelector, supportMultiple: false });
      registry.add("selectorType", "OsmSchemaValue", { cmp: OsmSchemaValueSelector, supportMultiple: false });

      // The field osm:templateName of the mapping form, which the forms file of osmnt:typeMapping sets. The Content Editor
      // checks the value of a selector type whose name holds "choicelist" against its values, and not as a pattern.
      registry.add("selectorType", "OsmTemplateChoicelist", { cmp: TemplateFieldSelector, supportMultiple: false });

      // The source fields of a mapping declare no dependentProperties, so this handler fills their lists when the
      // content type of the mapping changes. jContent calls it with undefined when the field unmounts.
      registry.add("selectorType.onChange", "osmSourceChoices", {
        targets: ["Choicelist"],
        onChange: (_previousValue: unknown, currentValue: unknown, field: EditorField, context: OnChangeContext) => {
          if (field.propertyName === NODE_TYPE_PROPERTY && currentValue !== undefined) {
            import("./open-graph-settings/sourceChoices.ts")
              .then(({ followNodeType }) => followNodeType(currentValue, field, context))
              .catch(console.error);
          }
        },
      });
    },
  });
}

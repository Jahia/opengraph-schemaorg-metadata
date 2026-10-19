import { Header, LayoutContent, Typography } from "@jahia/moonstone";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n, NAMESPACE } from "../i18n.ts";

const OpenGraphSettings = () => {
  const { t } = useTranslation(NAMESPACE);

  return (
      <LayoutContent
      hasPadding
      data-sel-role="very-open-graph"
      header={<Header title={t("openGraph.title")}/>}
      >
          <Typography data-sel-role="very-open-graph-empty">{t("openGraph.empty")}</Typography>
      </LayoutContent>
  );
};

const OpenGraphSettingsApp = () => (
    <I18nextProvider i18n={i18n} defaultNS={NAMESPACE}>
        <OpenGraphSettings/>
    </I18nextProvider>
);

export default OpenGraphSettingsApp;

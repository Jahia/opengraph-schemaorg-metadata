import { Paper, Tab, TabItem, Typography } from "@jahia/moonstone";
import { File } from "@jahia/moonstone/dist/icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import type { OgTag } from "./ogPreview.gql.ts";
import styles from "./ShareCard.module.css";

// On X, summary_large_image shows the image of the card, and summary shows a small square beside the text.
const LARGE_IMAGE_CARD = "summary_large_image";

type Network = "facebook" | "linkedin" | "x";
// The name of a network is a brand, so it has no translation.
const NETWORKS: { name: Network; label: string }[] = [
  { name: "facebook", label: "Facebook" },
  { name: "linkedin", label: "LinkedIn" },
  { name: "x", label: "X" },
];

export type ShareCardProps = Readonly<{
  tags: OgTag[];
  domain: string;
}>;

// The file of og:image in the default workspace, so the editor sees an image that is not published yet. An og:image
// that an editor typed as a URL has no file.
const imageUrl = (image: OgTag | undefined): string | null => {
  if (image === undefined) {
    return null;
  }
  if (image.nodePath === null) {
    return image.content;
  }
  const path = image.nodePath.split("/").map(encodeURIComponent).join("/");
  return `${globalThis.contextJsParameters?.contextPath ?? ""}/files/default${path}`;
};

const classes = (...names: (string | undefined)[]) => names.filter(Boolean).join(" ");

const ShareCard = ({ tags, domain }: ShareCardProps) => {
  const { t } = useTranslation(NAMESPACE);
  const [network, setNetwork] = useState<Network>("facebook");
  const textOf = (property: string) => tags.find(tag => tag.property === property)?.content ?? "";
  const src = imageUrl(tags.find(tag => tag.property === "og:image"));
  const title = textOf("og:title");
  const description = textOf("og:description");

  // A line of the card, or nothing when its text is empty, as the network leaves it out.
  const line = (role: string, text: string, className?: string) =>
    text === "" ? null : (
        <Typography data-sel-role={`osm-share-card-${role}`} className={classes(styles.text, className)}>
            {text}
        </Typography>
    );
  const image =
    src === null ? null : (
        <img data-sel-role="osm-share-card-image" className={styles.image} src={src} alt={textOf("og:image:alt")}/>
    );

  const cards: Record<Network, () => JSX.Element[]> = {
    // The image, then a grey band with the domain in capitals, the title and one line of the description.
    facebook: () => [
        <Paper key="body" className={styles.body} hasPadding={false}>
            {line("domain", domain, styles.domain)}
            {line("title", title, styles.title)}
            {line("description", description, styles.description)}
        </Paper>,
    ],
    // The image, then the title and the domain.
    linkedin: () => [
        <Paper key="body" className={styles.body} hasPadding={false}>
            {line("title", title, styles.title)}
            {line("domain", domain, styles.domain)}
        </Paper>,
    ],
    // A large image card shows the title over the image and the domain below the card. A summary card shows a square
    // beside the domain, the title and the description.
    x: () =>
      src !== null && textOf("twitter:card") === LARGE_IMAGE_CARD
        ? [
            <Paper key="frame" className={styles.frame} hasPadding={false}>
                {image}
                {line("title", title, styles.overlay)}
            </Paper>,
            <Typography key="from" data-sel-role="osm-share-card-domain" className={classes(styles.text, styles.from)}>
                {t("shareCard.from", { domain })}
            </Typography>,
          ]
        : [
            <Paper key="frame" className={classes(styles.frame, styles.summary)} hasPadding={false}>
                <Paper data-sel-role="osm-share-card-thumbnail" className={styles.thumbnail} hasPadding={false}>
                    {src === null ? <File size="big"/> : image}
                </Paper>
                <Paper className={styles.summaryText} hasPadding={false}>
                    {line("domain", domain, styles.domain)}
                    {line("title", title, styles.title)}
                    {line("description", description, styles.description)}
                </Paper>
            </Paper>,
          ],
  };

  return (
      <>
          <Tab data-sel-role="osm-share-tabs" className={styles.tabs}>
              {NETWORKS.map(item => (
                  <TabItem
                    key={item.name}
                    type="button"
                    data-sel-role="osm-share-tab"
                    data-sel-network={item.name}
                    label={item.label}
                    isSelected={item.name === network}
                    onClick={() => setNetwork(item.name)}
                  />
              ))}
          </Tab>
          <Paper
            data-sel-role="osm-share-card"
            data-sel-network={network}
            className={classes(styles.card, styles[network])}
            hasPadding={false}
          >
              {network === "x" ? null : image}
              {cards[network]()}
          </Paper>
      </>
  );
};

export default ShareCard;

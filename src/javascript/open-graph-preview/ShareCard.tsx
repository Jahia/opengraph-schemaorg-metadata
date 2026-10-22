import { Paper, Tab, TabItem, Typography } from "@jahia/moonstone";
import { useState, type ReactElement } from "react";
import type { OgTag } from "./ogPreview.gql.ts";
import styles from "./ShareCard.module.css";

// On X, summary_large_image shows the image of the card, and summary shows no image.
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

const ShareCard = ({ tags, domain }: ShareCardProps) => {
  const [network, setNetwork] = useState<Network>("facebook");
  const textOf = (property: string) => tags.find(tag => tag.property === property)?.content ?? "";
  const hasImage = network !== "x" || textOf("twitter:card") === LARGE_IMAGE_CARD;
  const src = hasImage ? imageUrl(tags.find(tag => tag.property === "og:image")) : null;

  const line = (role: string, text: string, props: Parameters<typeof Typography>[0] = {}): ReactElement[] =>
    text === ""
      ? []
      : [
          <Typography key={role} data-sel-role={`vog-share-card-${role}`} className={styles.line} {...props}>
              {text}
          </Typography>,
        ];
  const title = line("title", textOf("og:title"), { weight: "bold" });
  const domainLine = line("domain", domain, { variant: "caption", isUpperCase: network === "facebook" });
  const lines =
    network === "facebook"
      ? [...domainLine, ...title, ...line("description", textOf("og:description"), { variant: "caption" })]
      : [...title, ...domainLine];

  return (
      <>
          <Tab data-sel-role="vog-share-tabs">
              {NETWORKS.map(item => (
                  <TabItem
                    key={item.name}
                    type="button"
                    data-sel-role="vog-share-tab"
                    data-sel-network={item.name}
                    label={item.label}
                    isSelected={item.name === network}
                    onClick={() => setNetwork(item.name)}
                  />
              ))}
          </Tab>
          <Paper data-sel-role="vog-share-card" data-sel-network={network} className={styles.card} hasPadding={false}>
              {src !== null && (
              <img
                data-sel-role="vog-share-card-image"
                className={`${styles.image} ${styles[network]}`}
                src={src}
                alt={textOf("og:image:alt")}
              />
              )}
              {lines}
          </Paper>
      </>
  );
};

export default ShareCard;

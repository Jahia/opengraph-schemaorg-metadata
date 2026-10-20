/// <reference types="vite/client" />

/* eslint-disable no-var -- a global that globalThis exposes must be declared with var */
declare var contextJsParameters: {
  uilang?: string;
  [key: string]: unknown;
} | undefined;

declare var jahia: {
  /** Jahia's shared Apollo client. */
  apolloClient?: import("@apollo/client").ApolloClient<
    import("@apollo/client").NormalizedCacheObject
  >;
  reduxStore?: {
    getState: () => { site?: string; [k: string]: unknown };
  };
} | undefined;

/** The Content Editor API of jContent. needRefresh is true when the editor saved the node. */
declare var CE_API: {
  create: (config: {
    path: string;
    nodeTypes: string[];
    includeSubTypes: boolean;
    isFullscreen: boolean;
    onClosedCallback: (config: unknown, needRefresh: boolean) => void;
  }) => void;
  edit: (config: {
    uuid: string;
    isFullscreen: boolean;
    onClosedCallback: (config: unknown, needRefresh: boolean) => void;
  }) => void;
} | undefined;
/* eslint-enable no-var */

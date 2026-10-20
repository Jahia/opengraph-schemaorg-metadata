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

/** The part of the federated module of jContent that the Open Graph preview uses. */
declare module "@jahia/jcontent" {
  export type ContentEditorField = {
    name: string;
    propertyName?: string;
    selectorType?: string;
  };
  export type ContentEditorSection = {
    name: string;
    visible?: boolean;
    fieldSets?: { fields?: ContentEditorField[] }[];
  };
  /** The sections of the Content Editor form. A section shows while visible is true, after onSectionsUpdate. */
  export const useContentEditorSectionContext: () =>
    | { sections?: ContentEditorSection[]; onSectionsUpdate?: () => void }
    | undefined;
}

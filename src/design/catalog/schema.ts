export type DesignCatalogCategory =
  | 'action'
  | 'data-display'
  | 'feedback'
  | 'iconography'
  | 'identity'
  | 'input'
  | 'layout'
  | 'navigation'
  | 'surface'
  | 'typography';

export type DesignCatalogComponent = Readonly<{
  accessibility: readonly string[];
  aliases: readonly string[];
  avoidWhen: readonly string[];
  category: DesignCatalogCategory;
  gallery: readonly string[];
  keywords: readonly string[];
  name: string;
  propsType: string;
  related: readonly string[];
  source: string;
  states: readonly string[];
  summary: string;
  tests: readonly string[];
  useWhen: readonly string[];
}>;

export type DesignCatalog = Readonly<{
  catalogVersion: string;
  components: readonly DesignCatalogComponent[];
  coverage: Readonly<{
    barrel: string;
    ignoredExports: readonly Readonly<{
      name: string;
      reason: string;
    }>[];
  }>;
  documentation: Readonly<{
    file: string;
    marker: string;
  }>;
  schemaVersion: 1;
}>;

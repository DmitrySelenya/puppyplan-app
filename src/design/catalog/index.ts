import rawDesignCatalog from '@/design/catalog/catalog.json';

import type { DesignCatalog } from '@/design/catalog/schema';

export const designCatalog = rawDesignCatalog as DesignCatalog;

export type { DesignCatalog, DesignCatalogCategory, DesignCatalogComponent } from './schema';

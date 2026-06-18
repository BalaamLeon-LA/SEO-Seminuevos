import 'dotenv/config';

/**
 * URL canónica de producción. Es el dominio contra el que se validan los
 * <link rel="canonical"> en TODOS los ambientes — incluyendo staging.
 * Un canonical que apunte a staging en vez de producción es un bug SEO.
 */
export const productionBaseURL =
  process.env.PRODUCTION_BASE_URL ?? 'https://www.seminuevos.com';

export const stagingBaseURL = process.env.STAGING_BASE_URL ?? '';

/** Hostname del ambiente de staging, para detectar URLs de staging en canonicals y links. */
export const stagingHostname = stagingBaseURL
  ? (() => { try { return new URL(stagingBaseURL).hostname; } catch { return null; } })()
  : null;

/**
 * Rutas de páginas a testear, organizadas por tipo de página.
 *
 * Tipos disponibles (del checklist):
 * - home    → página principal
 * - hub     → listado general (/usados/-/autos, /usados/-/motos)
 * - brand   → página de marca (/usados/-/autos/-/ford)
 * - model   → página de modelo (/usados/-/autos/-/ford/bronco)
 * - details → ficha de vehículo (/vehicle/...)
 *
 * El tipo determina qué @types de schema se verifican automáticamente.
 */
export const pagesByType = {
  home: ['/'],
  hub: [
    '/usados/-/autos',
  ],
  brand: [
    '/usados/-/autos/-/volkswagen',
  ],
  model: [
    '/usados/-/autos/-/ford/bronco',
  ],
  details: [
    '/vehicle/autos-ford-bronco-zapopan-2023/4797505',
  ],
} satisfies Record<string, string[]>;

export type PageType = keyof typeof pagesByType;

export const allPages: Array<{ path: string; type: PageType }> = (
  Object.entries(pagesByType) as Array<[PageType, string[]]>
).flatMap(([type, paths]) => paths.map((path) => ({ path, type })));

// ─── Schema esperado por tipo de página ───────────────────────────────────────

export type SchemaExpectations = {
  /** @types que deben estar presentes en algún bloque JSON-LD (todos). */
  required: string[];
  /** Para cada grupo, al menos uno de los @types debe estar presente. */
  anyOf?: string[][];
  /** Nombres de campos JSON que deben aparecer en el schema (para fichas de vehículo). */
  fields?: string[];
};

/**
 * Expectativas de schema por tipo de página, según el Checklist SEO.
 *
 * Home:    WebPage + Organization/AutomotiveBusiness
 * Hub:     WebPage + Organization
 * Brand:   WebPage + BreadcrumbList + Brand
 * Model:   WebPage + BreadcrumbList
 * Details: Car/Product + Offer + campos de vehículo
 */
export const schemaByPageType: Partial<Record<PageType | 'custom', SchemaExpectations>> = {
  home: {
    required: ['WebPage', 'Itemlist', 'SiteNavigationElement', 'FAQPage'],
    anyOf: [['Organization', 'AutomotiveBusiness']],
  },
  hub: {
    required: ['WebPage', 'Organization', 'ItemList', 'SiteNavigationElement', 'FAQPage'
    ],
  },
  brand: {
    required: ['WebPage', 'Brand', 'BreadcrumbList', 'Itemlist', 'FAQPage'],
  },
  model: {
    required: ['WebPage', 'BreadcrumbList', 'Itemlist', 'Brand', 'Model', 'FAQPage'],
  },
  details: {
    required: ['Brand', 'Model', 'VehicleModelDate', 'Price'],
    anyOf: [['Car', 'Product']],
    fields: ['Mileage', 'PriceCurrency', 'Offer', 'Availability', 'VehicleModelDate', 'Image'],
  },
};

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
 * Home:    WebSite + Organization/AutomotiveBusiness + ItemList + FAQPage
 * Hub:     WebSite + Organization/AutomotiveBusiness + BreadcrumbList + ItemList + FAQPage
 * Brand:   WebSite + Organization/AutomotiveBusiness + BreadcrumbList + ItemList + FAQPage + Brand
 * Model:   WebSite + Organization/AutomotiveBusiness + BreadcrumbList + ItemList + FAQPage + Brand + Model
 * Details: Car/Product + Organization/AutomotiveBusiness + Brand + Model + VehicleModelDate + Price + campos de vehículo
 */
export const schemaByPageType: Partial<Record<PageType | 'custom', SchemaExpectations>> = {
  home: {
    required: ['WebSite', 'ItemList', 'FAQPage'],
    anyOf: [['Organization', 'AutomotiveBusiness']],
  },
  hub: {
    required: ['WebSite', 'ItemList', 'BreadcrumbList', 'FAQPage'],
    anyOf: [['Organization', 'AutomotiveBusiness']],
  },
  brand: {
    required: ['WebSite', 'Brand', 'BreadcrumbList', 'ItemList', 'FAQPage'],
    anyOf: [['Organization', 'AutomotiveBusiness']],
  },
  model: {
    required: ['WebSite', 'BreadcrumbList', 'ItemList', 'Brand', 'Model', 'FAQPage'],
    anyOf: [['Organization', 'AutomotiveBusiness']],
  },
  details: {
    required: ['Brand', 'Model', 'VehicleModelDate', 'Price'],
    anyOf: [['Car', 'Product'], ['Organization', 'AutomotiveBusiness']],
    fields: ['Mileage', 'PriceCurrency', 'Offer', 'Availability', 'VehicleModelDate', 'Image'],
  },
};

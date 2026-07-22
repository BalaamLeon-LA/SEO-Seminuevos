import 'dotenv/config';

/**
 * Portal contra el que corren los tests. MX y EC comparten prácticamente
 * todos los templates, por lo que reusan el mismo suite — solo cambian las
 * URLs base y (cuando aplica) el path de la ficha de vehículo.
 *
 * Selección vía variable de entorno: COUNTRY=MX (default) o COUNTRY=EC.
 */
export type Country = 'MX' | 'EC';

const VALID_COUNTRIES: Country[] = ['MX', 'EC'];

function resolveCountry(): Country {
  const raw = (process.env.COUNTRY ?? 'MX').toUpperCase();
  if (!VALID_COUNTRIES.includes(raw as Country)) {
    throw new Error(`COUNTRY inválido: "${raw}". Valores permitidos: ${VALID_COUNTRIES.join(', ')}`);
  }
  return raw as Country;
}

export const country = resolveCountry();

const productionBaseURLByCountry: Record<Country, string> = {
  MX: 'https://www.seminuevos.com',
  EC: 'https://ecuador.patiotuerca.com',
};

const demoBaseURLByCountry: Record<Country, string> = {
  MX: process.env.DEMO_BASE_URL_MX ?? '',
  EC: process.env.DEMO_BASE_URL_EC ?? '',
};

/**
 * URL canónica de producción. Es el dominio contra el que se validan los
 * <link rel="canonical"> en TODOS los ambientes — incluyendo demo.
 * Un canonical que apunte a demo en vez de producción es un bug SEO.
 */
export const productionBaseURL =
  process.env.PRODUCTION_BASE_URL ?? productionBaseURLByCountry[country];

export const demoBaseURL = demoBaseURLByCountry[country];

/**
 * Hostname de producción de cada país. Se usa para validar que el schema de
 * Organization/AutomotiveBusiness pertenezca al país correspondiente y no
 * al del otro portal (LATAM-466).
 */
export const productionHostnameByCountry: Record<Country, string> = Object.fromEntries(
  Object.entries(productionBaseURLByCountry).map(([c, url]) => [c, new URL(url).hostname]),
) as Record<Country, string>;

export const ownCountryHostname = productionHostnameByCountry[country];

export const otherCountryHostnames = (Object.keys(productionHostnameByCountry) as Country[])
  .filter((c) => c !== country)
  .map((c) => productionHostnameByCountry[c]);

/** Hostname del ambiente de demo, para detectar URLs de demo en canonicals y links. */
export const demoHostname = demoBaseURL
  ? (() => { try { return new URL(demoBaseURL).hostname; } catch { return null; } })()
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
/** Ficha de vehículo de referencia: el path difiere por país porque el catálogo no se comparte. */
const detailsPathByCountry: Record<Country, string> = {
  MX: '/vehicle/autos-ford-bronco-zapopan-2023/4797505',
  EC: '/vehicle/autos-ford-bronco-cumbaya-2026/1956381',
};

export const pagesByType = {
  home: ['/'],
  hub: [
    '/usados/-/autos',
  ],
  brand: [
    '/usados/-/autos/-/volkswagen',
  ],
  model: [
    '/usados/-/autos/-/ford/expedition',
  ],
  details: [
    detailsPathByCountry[country],
  ],
} satisfies Record<string, string[]>;

export type PageType = keyof typeof pagesByType;

export const allPages: Array<{ path: string; type: PageType }> = (
  Object.entries(pagesByType) as Array<[PageType, string[]]>
).flatMap(([type, paths]) => paths.map((path) => ({ path, type })));

/**
 * LATAM-463: páginas de combinación Marca + Modelo + Año. El title y la meta
 * description deben incluir el año — se testean aparte del checklist genérico
 * porque el único requisito del ticket es sobre ese contenido, no sobre schema.
 */
export const modelYearPathsByCountry: Partial<Record<Country, string[]>> = {
  MX: ['/usados/-/autos/-/volkswagen/jetta/2020'],
};

export const modelYearPaths = modelYearPathsByCountry[country] ?? [];

/**
 * LATAM-481: páginas de combinación Autos + Año SIN marca/modelo (ej.
 * /usados/-/autos/-/-/-/2020) que antes compartían el mismo title/meta
 * description genérico sin importar el año. Mismo requisito que
 * modelYearPaths (LATAM-463) — título y meta description deben incluir el
 * año — por eso seo-model-year.spec.ts itera ambas listas juntas.
 */
export const yearOnlyPathsByCountry: Partial<Record<Country, string[]>> = {
  MX: ['/usados/-/autos/-/-/-/2020'],
};

export const yearOnlyPaths = yearOnlyPathsByCountry[country] ?? [];

/**
 * LATAM-442: URLs con parámetros de filtro/moderación (`?type_autos_*`) que no
 * deben indexarse. A diferencia del resto del checklist, estas páginas deben
 * llevar meta robots "noindex, follow" y canonical autorreferenciada
 * (incluyendo el query string) en vez de la canonical "limpia" del listado.
 */
export const filteredPathsByCountry: Partial<Record<Country, string[]>> = {
  MX: [
    '/usados/ciudad+de+mexico-/autos/camioneta+suv/land+rover/-/2016?type_autos_motor-credit-status=activado&type_autos_moderated=moderated',
    // LATAM-482: el noindex debe aplicar a CUALQUIER query param que empiece
    // con "type_", no solo a los ya conocidos de LATAM-442 (type_autos_*).
    // Se usa un parámetro sintético para probar la regla de forma genérica,
    // en vez de otro parámetro real que también caería bajo LATAM-442.
    '/usados/-/autos/-/volkswagen?type_qa_regresion_test=1',
  ],
};

export const filteredPaths = filteredPathsByCountry[country] ?? [];

// ─── Schema esperado por tipo de página ───────────────────────────────────────

export type SchemaExpectations = {
  /** @types que deben estar presentes en algún bloque JSON-LD (todos). */
  required: string[];
  /** Para cada grupo, al menos uno de los @types debe estar presente. */
  anyOf?: string[][];
  /** Nombres de campos JSON que deben aparecer en el schema (para fichas de vehículo). */
  fields?: string[];
  /** @types de nivel superior que NO deben aparecer (schemas que el rediseño reemplaza). */
  forbiddenTypes?: string[];
  /** Nombres de campos JSON que NO deben aparecer en ningún bloque del schema. */
  forbiddenFields?: string[];
  /** SEO-119: @types que deben aparecer dentro de itemListElement[].item del ItemList (ej. Product + Car). */
  itemListItemTypes?: string[];
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
    // AutomotiveBusiness va en su propio grupo de un solo elemento (no en
    // `required`) para que su test corra independiente del resto — igual
    // razón que en `brand`/`model` para SiteNavigationElement. `Organization`
    // ya no se incluye como alternativa: LAA-726 lo prohíbe explícitamente
    // vía `forbiddenTypes`, así que listarlo aquí como válido sería contradictorio.
    anyOf: [['AutomotiveBusiness']],
    // LAA-726: el rediseño Patiotuerca reemplaza Organization por AutomotiveBusiness
    // y elimina la propiedad `addressCountry` (no soportada) del schema de tipo Car.
    forbiddenTypes: ['Organization'],
    forbiddenFields: ['addressCountry'],
    // SEO-119: cada item del ItemList debe tener ambos @type, como en MX.
    itemListItemTypes: ['Product', 'Car'],
  },
  hub: {
    required: ['WebSite', 'ItemList', 'BreadcrumbList', 'FAQPage'],
    // hub no tiene ticket de reemplazo — Organization sigue siendo una
    // alternativa válida a AutomotiveBusiness aquí (a diferencia de home/brand/model).
    anyOf: [['Organization', 'AutomotiveBusiness']],
    // SEO-119: mismo requisito que en `home` — ver nota ahí.
    itemListItemTypes: ['Product', 'Car'],
  },
  brand: {
    required: ['WebSite', 'Brand', 'BreadcrumbList', 'ItemList', 'FAQPage'],
    // Cada grupo de un solo elemento reporta su propio requisito (LAA-728) en
    // un test independiente del resto de `required` — así un gap preexistente
    // (ej. falta de "Brand") no enmascara estos checks. Ver nota en `home`
    // sobre por qué "Organization" ya no aparece como alternativa aquí.
    anyOf: [['AutomotiveBusiness'], ['SiteNavigationElement']],
    // LAA-728: mismo reemplazo de schema que LAA-726, más SiteNavigationElement.
    forbiddenTypes: ['Organization'],
    forbiddenFields: ['addressCountry'],
    // SEO-119: mismo requisito que en `home` — ver nota ahí.
    itemListItemTypes: ['Product', 'Car'],
  },
  model: {
    required: ['WebSite', 'BreadcrumbList', 'ItemList', 'Brand', 'Model', 'FAQPage'],
    // Ver nota en `brand` sobre los grupos de un solo elemento.
    anyOf: [['AutomotiveBusiness'], ['SiteNavigationElement']],
    // LAA-727: mismo reemplazo de schema que LAA-726, más SiteNavigationElement.
    forbiddenTypes: ['Organization'],
    forbiddenFields: ['addressCountry'],
    // SEO-119: mismo requisito que en `home` — ver nota ahí.
    itemListItemTypes: ['Product', 'Car'],
  },
  details: {
    required: ['Brand', 'Model', 'VehicleModelDate', 'Price'],
    anyOf: [['Car', 'Product'], ['Organization', 'AutomotiveBusiness']],
    fields: ['Mileage', 'PriceCurrency', 'Offer', 'Availability', 'VehicleModelDate', 'Image'],
  },
};

/**
 * LAA-726: anchors long-tail que SEO pidió agregar como enlazado interno en la
 * Home del rediseño Patiotuerca (EC). Es específico de ese portal/ticket, por
 * lo que solo se define para EC — sigue el mismo patrón que modelYearPaths.
 */
export const longTailAnchorsByCountry: Partial<Record<Country, string[]>> = {
  EC: [
    'carros seminuevos Guayaquil',
    'seminuevos',
    'patiotuerca',
    'carros económicos Ecuador',
    'carros híbridos en Ecuador',
    'carros usados Quito de oportunidad',
    'seminuevos Chevrolet',
    'carros familiares',
    'autos eléctricos Quito',
    'carros automáticos',
    'carros chinos',
    'Toyota seminuevos',
    'Patio Tuerca Cuenca',
    'carros a diesel',
    'Chevrolet Cruze',
    'autos de venta por enfermedad urgente',
    'venta de camionetas doble cabina publicado hoy',
    'seminuevos Hyundai',
    'camionetas 2023',
    'carros chocados de venta',
    'Renault Ambato',
    'Renault Logan',
    'Kia Carnival',
    'Kia Optima Ecuador',
  ],
};

export const longTailAnchors = longTailAnchorsByCountry[country] ?? [];

/**
 * LAA-727 / LAA-728: sección "Continúa tu búsqueda de carros" que debe existir
 * al final de las páginas de Modelo y Marca del rediseño Patiotuerca (EC).
 * Reusa los paths ya definidos en pagesByType para no duplicar rutas.
 */
export const continueSearchSectionPathsByCountry: Partial<Record<Country, string[]>> = {
  EC: [...pagesByType.brand, ...pagesByType.model],
};

export const continueSearchSectionPaths = continueSearchSectionPathsByCountry[country] ?? [];

/**
 * SEO-136: en Ecuador el <html lang> debe ser "es-EC" en vez del genérico
 * "es". Solo se define para EC porque es el único país con este ticket.
 */
export const expectedHtmlLangByCountry: Partial<Record<Country, string>> = {
  EC: 'es-EC',
};

export const expectedHtmlLang = expectedHtmlLangByCountry[country];

/**
 * SEO-137: el Local Schema (bloque Organization/AutomotiveBusiness) de EC
 * debe incluir priceRange ($$-$$$) y una dirección de Ecuador — hoy ausentes.
 */
export const localSchemaFieldsByCountry: Partial<Record<Country, string[]>> = {
  EC: ['priceRange', 'address'],
};

export const localSchemaFields = localSchemaFieldsByCountry[country] ?? [];

/**
 * SEO-129: rutas de cuenta de usuario (publicar vehículo, tablero, favoritos)
 * enlazadas desde la home de EC que hoy devuelven 401 para visitantes
 * anónimos. El fix las redirige a una landing en vez de mostrar el error —
 * este test verifica que ya no devuelvan 401.
 */
export const knownBrokenLinksByCountry: Partial<Record<Country, string[]>> = {
  EC: [
    '/particulares/vehiculos/publicar/_/seleccionar-plan',
    '/particulares/vehiculos/publicar/_/informacion-y-precio?reset=true',
    '/particulares/tablero',
    '/particulares/favoritos',
  ],
};

export const knownBrokenLinks = knownBrokenLinksByCountry[country] ?? [];

/**
 * SEO-104/107/142/143/145: rutas de "solo ubicación" (ciudad, sin filtro de
 * marca) que llevan contenido city-specific (tabla de precios, FAQ, agencias)
 * validado aparte del checklist genérico porque no hay un `type` de página
 * para ellas en `pagesByType` — mismo patrón que `modelYearPaths`/`filteredPaths`.
 */
export const localRoutePathsByCountry: Partial<Record<Country, string[]>> = {
  MX: ['/usados/ciudad+de+mexico/autos'],
};

export const localRoutePaths = localRoutePathsByCountry[country] ?? [];

/**
 * SEO-105/SEO-116: variantes de URL con bug conocido (guion sobrante que
 * generaba `buildSeoUrl`, o `%20` sin codificar) que deben redirigir con 301
 * en un solo hop a la ruta local limpia. SEO-149/SEO-148 son el mismo bug
 * clonado para Patiotuerca (EC).
 */
export const localRouteRedirectsByCountry: Partial<Record<Country, Array<{ from: string; to: string }>>> = {
  MX: [
    { from: '/usados/ciudad+de+mexico-/autos', to: '/usados/ciudad+de+mexico/autos' },
    { from: '/usados/ciudad%20de%20mexico-/autos', to: '/usados/ciudad+de+mexico/autos' },
  ],
  EC: [
    { from: '/usados/pichincha-quito-/autos', to: '/usados/pichincha-quito/autos' },
    { from: '/usados/guayas-guayaquil%20norte-/autos', to: '/usados/guayas-guayaquil+norte/autos' },
  ],
};

export const localRouteRedirects = localRouteRedirectsByCountry[country] ?? [];

/** SEO-125: Referrer-Policy header esperado en la home. */
export const expectedReferrerPolicyByCountry: Partial<Record<Country, string>> = {
  EC: 'strict-origin-when-cross-origin',
};

export const expectedReferrerPolicy = expectedReferrerPolicyByCountry[country];

/** SEO-128: X-Content-Type-Options header esperado en la home. */
export const expectedXContentTypeOptionsByCountry: Partial<Record<Country, string>> = {
  EC: 'nosniff',
};

export const expectedXContentTypeOptions = expectedXContentTypeOptionsByCountry[country];

/**
 * SEO-130: Content-Security-Policy en la home. El ticket acepta como fase
 * inicial la variante `Content-Security-Policy-Report-Only`, por eso el check
 * acepta cualquiera de los dos headers en vez de exigir solo el definitivo.
 */
export const requireContentSecurityPolicyByCountry: Partial<Record<Country, boolean>> = {
  EC: true,
};

export const requireContentSecurityPolicy = requireContentSecurityPolicyByCountry[country] ?? false;

/** SEO-135: Open Graph / Twitter Card tags requeridos en la home. */
export const ogTwitterRequiredByCountry: Partial<Record<Country, string[]>> = {
  EC: ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description'],
};

export const ogTwitterRequired = ogTwitterRequiredByCountry[country] ?? [];

/**
 * SEO-132: banners de la home cuyo alt text debe existir y ser descriptivo
 * (no vacío). Identificados por patrón de filename ya que el contenido rota.
 */
export const bannerImageFilenamePatternByCountry: Partial<Record<Country, RegExp>> = {
  EC: /portada-/,
};

export const bannerImageFilenamePattern = bannerImageFilenamePatternByCountry[country];

/**
 * SEO-150: guías locales SEO (parque vehicular, autos más buscados, etc.) que
 * deben mostrarse en las 8 páginas de ciudad exacta de Ecuador listadas en el
 * doc fuente "SEO - CONTENIDOS_BRIEFS PATIOTUERCA". El match es exclusivo por
 * ciudad — la provincia sola o un tipo de vehículo distinto a "autos" no
 * heredan la guía (ver `localGuideNegativePaths`).
 */
export const localGuidePathsByCountry: Partial<Record<Country, string[]>> = {
  EC: [
    '/usados/pichincha-quito/autos',
    '/usados/guayas-guayaquil/autos',
    '/usados/azuay-cuenca/autos',
    '/usados/tungurahua-ambato/autos',
    '/usados/imbabura-ibarra/autos',
    '/usados/manabi-portoviejo/autos',
    '/usados/loja-loja/autos',
    '/usados/manabi-manta/autos',
  ],
};

export const localGuidePaths = localGuidePathsByCountry[country] ?? [];

/**
 * SEO-150: casos negativos — la guía NO debe aparecer en la página de solo
 * provincia (sin ciudad) ni en un tipo de vehículo distinto a "autos" para
 * una ciudad que sí tiene guía.
 */
export const localGuideNegativePathsByCountry: Partial<Record<Country, string[]>> = {
  EC: ['/usados/pichincha/autos', '/usados/pichincha-quito/motos'],
};

export const localGuideNegativePaths = localGuideNegativePathsByCountry[country] ?? [];

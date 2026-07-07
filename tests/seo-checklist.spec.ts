import { test, expect } from '@playwright/test';
import {
  allPages,
  productionBaseURL,
  demoHostname,
  schemaByPageType,
  ownCountryHostname,
  otherCountryHostnames,
} from './config';

/** Concatena el contenido de todos los bloques JSON-LD (para buscar campos/strings). */
function collectSchemas(html: string): string {
  return [
    ...html.matchAll(
      /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((m) => m[1])
    .join('\n');
}

/**
 * Devuelve los @type de nivel superior de todos los bloques JSON-LD.
 * Evita falsos positivos con @types anidados (ej. Product dentro de ItemList).
 */
function getTopLevelTypes(html: string): string[] {
  return [
    ...html.matchAll(
      /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].flatMap(([, content]) => {
    try {
      const d = JSON.parse(content.trim()) as Record<string, unknown>;
      const t = d['@type'];
      return Array.isArray(t) ? (t as string[]) : t ? [t as string] : [];
    } catch {
      return [];
    }
  });
}

/** Devuelve los bloques JSON-LD de nivel superior cuyo @type incluye alguno de `types`. */
function getTopLevelBlocksByType(html: string, types: string[]): Record<string, unknown>[] {
  return [
    ...html.matchAll(
      /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].flatMap(([, content]) => {
    try {
      const d = JSON.parse(content.trim()) as Record<string, unknown>;
      const t = d['@type'];
      const blockTypes = Array.isArray(t) ? (t as string[]) : t ? [t as string] : [];
      return blockTypes.some((bt) => types.includes(bt)) ? [d] : [];
    } catch {
      return [];
    }
  });
}

const productionHostname = new URL(productionBaseURL).hostname;

/**
 * TEST_PATHS: para testear solo páginas específicas (rutas manuales).
 * TEST_TYPE:  para testear todas las páginas de uno o más tipos definidos en config.ts.
 *
 * Ejemplos:
 *   TEST_PATHS=/usados/-/autos npm run test:prod
 *   TEST_PATHS=/mi-landing,/otra-landing npm run test:prod
 *   TEST_TYPE=home npm run test:prod
 *   TEST_TYPE=model,details npm run test:demo
 *
 * TEST_PATHS tiene prioridad sobre TEST_TYPE.
 */
const customPaths = process.env['TEST_PATHS']?.split(',').map((p: string) => p.trim()).filter(Boolean);
const customTypes = process.env['TEST_TYPE']?.split(',').map((t: string) => t.trim()).filter(Boolean);
const pagesToTest = customPaths?.length
  ? customPaths.map((path: string) => ({ path, type: 'custom' as const }))
  : customTypes?.length
    ? allPages.filter(({ type }) => customTypes.includes(type))
    : allPages;

// Valores de placeholder que no deben aparecer en texto visible ni schema
const PLACEHOLDER = /\b(undefined|null|NaN)\b|\{\{[^}]*\}\}/i;

// ─── Tests por página ──────────────────────────────────────────────────────────

for (const { path, type } of pagesToTest) {
  // Para rutas custom inferimos el tipo por el path para activar checks específicos
  const effectiveType =
    type === 'custom' ? (path.includes('/vehicle/') ? 'details' : 'categories') : type;

  test.describe(`[${type}] ${path}`, () => {
    let html = '';       // DOM renderizado por el browser (request.get() es bloqueado por Cloudflare)
    let domHtml = '';    // Alias de html — mismo contenido, para checks de schema JS-inyectado
    let statusCode = 0;

    test.beforeAll(async ({ browser, baseURL }) => {
      // Una sola navegación con browser real para pasar el challenge de Cloudflare.
      // Para sitios SSR el DOM preserva el HTML del servidor, por lo que los checks
      // de crawler (title, meta, canonical, H1) son equivalentes al HTML crudo.
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      // Capturar el status de la última respuesta de documento (después del challenge de Cloudflare)
      page.on('response', (response) => {
        if (
          response.request().resourceType() === 'document' &&
          response.url().startsWith(baseURL ?? '')
        ) {
          statusCode = response.status();
        }
      });
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      // El schema JSON-LD se inyecta client-side y puede tardar unos segundos
      // en montarse tras 'load'. Esperamos a que aparezca al menos un bloque
      // (con timeout) para no reportar falsos negativos en G. Schema JSON-LD;
      // si de verdad no hay ninguno, el timeout expira y los checks de esa
      // sección fallan igual — es una señal real, no se enmascara.
      await page
        .waitForFunction(
          () => document.querySelectorAll('script[type="application/ld+json"]').length > 0,
          { timeout: 8_000 },
        )
        .catch(() => {});
      html = await page.content();
      domHtml = html;
      await context.close();
    });

    // ── A. Status code ──────────────────────────────────────────────────────

    test('A. status code es 200', () => {
      expect(statusCode, `La página devolvió ${statusCode} en lugar de 200`).toBe(200);
    });

    // ── B. Meta robots ──────────────────────────────────────────────────────

    test.describe('B. Meta robots', () => {
      test.beforeEach(({ }, testInfo) => {
        test.skip(testInfo.project.name !== 'production', 'Demo debe tener noindex; solo se verifica en producción');
      });

      test('no tiene noindex', () => {
        const p1 = /<meta\s[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["']/i;
        const p2 = /<meta\s[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i;
        expect(html, 'Tiene noindex — la página no será indexada por Google').not.toMatch(p1);
        expect(html).not.toMatch(p2);
      });

      test('no tiene nofollow accidental', () => {
        const p1 = /<meta\s[^>]*name=["']robots["'][^>]*content=["'][^"']*nofollow[^"']*["']/i;
        const p2 = /<meta\s[^>]*content=["'][^"']*nofollow[^"']*["'][^>]*name=["']robots["']/i;
        expect(html, 'Tiene nofollow en meta robots — Google no seguirá ningún link').not.toMatch(p1);
        expect(html).not.toMatch(p2);
      });
    });

    // ── C. Title ────────────────────────────────────────────────────────────

    test.describe('C. Title', () => {
      test('existe exactamente un <title>', () => {
        const count = (html.match(/<title[\s>]/gi) ?? []).length;
        expect(count, `Se encontraron ${count} etiquetas <title>, debe haber exactamente 1`).toBe(1);
      });

      test('tiene texto válido sin placeholders', () => {
        const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        expect(m, 'No se encontró etiqueta <title>').not.toBeNull();
        const title = m![1].trim();
        expect(title, '<title> está vacío').not.toBe('');
        expect(title, `<title> contiene un valor inválido: "${title}"`).not.toMatch(PLACEHOLDER);
      });
    });

    // ── D. Meta description ─────────────────────────────────────────────────

    test.describe('D. Meta description', () => {
      test('existe y tiene texto válido sin placeholders', () => {
        const m =
          html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
          html.match(/<meta\s[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
        expect(m, 'No se encontró <meta name="description">').not.toBeNull();
        const d = m![1].trim();
        expect(d, 'La meta description está vacía').not.toBe('');
        expect(d, `Meta description con valor inválido: "${d}"`).not.toMatch(PLACEHOLDER);
      });
    });

    // ── E. Canonical ────────────────────────────────────────────────────────

    test.describe('E. Canonical', () => {
      test('existe, usa HTTPS y apunta al dominio de producción', () => {
        const m =
          html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
          html.match(/<link\s[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
        expect(m, 'No se encontró <link rel="canonical">').not.toBeNull();
        const url = m![1].trim();
        expect(url, 'El canonical no usa HTTPS').toMatch(/^https:\/\//i);
        expect(url, `El canonical debe apuntar a ${productionHostname}`).toContain(productionHostname);
      });

      test('no contiene demo, localhost ni placeholders', () => {
        const m =
          html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
          html.match(/<link\s[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
        if (!m) return; // cubierto por el test anterior
        const url = m![1].trim();
        expect(url).not.toMatch(/localhost|127\.0\.0\.1/i);
        expect(url, 'El canonical contiene un valor inválido').not.toMatch(PLACEHOLDER);
        if (demoHostname) {
          expect(url, `El canonical apunta a demo (${demoHostname})`).not.toContain(demoHostname);
        }
      });
    });

    // ── F. H1 ───────────────────────────────────────────────────────────────

    test.describe('F. H1', () => {
      test('existe exactamente un H1', () => {
        const count = (html.match(/<h1[\s>]/gi) ?? []).length;
        expect(count, `Se encontraron ${count} H1, debe haber exactamente 1`).toBe(1);
      });

      test('tiene texto válido sin placeholders', () => {
        const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        expect(m, 'No se encontró H1').not.toBeNull();
        const text = m![1].replace(/<[^>]+>/g, '').trim();
        expect(text, 'H1 está vacío').not.toBe('');
        expect(text, `H1 contiene un valor inválido: "${text}"`).not.toMatch(PLACEHOLDER);
      });

      // LAA-726/727/728: el H1 debe ser el primer encabezado relevante de la
      // página — no debe haber H2-H6 (ni otro H1) antes de él en el DOM.
      test('es el primer encabezado de la página (sin encabezados previos)', () => {
        const h1Index = html.search(/<h1[\s>]/i);
        expect(h1Index, 'No se encontró H1').toBeGreaterThanOrEqual(0);
        const before = html.slice(0, h1Index).match(/<h[1-6][\s>]/gi) ?? [];
        expect(
          before,
          `Se encontraron encabezados antes del H1: ${before.join(', ')}`,
        ).toHaveLength(0);
      });

      // LAA-726/727/728: el H1 no debe duplicar el contenido del <title>.
      test('no duplica el contenido del <title>', () => {
        const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        expect(h1Match, 'No se encontró H1').not.toBeNull();
        expect(titleMatch, 'No se encontró <title>').not.toBeNull();
        const h1Text = h1Match![1].replace(/<[^>]+>/g, '').trim().toLowerCase();
        const titleText = titleMatch![1].trim().toLowerCase();
        expect(h1Text, `El H1 duplica el <title>: "${h1Text}"`).not.toBe(titleText);
      });
    });

    // ── G. Schema JSON-LD ───────────────────────────────────────────────────

    test.describe('G. Schema JSON-LD', () => {
      test('hay al menos un bloque válido con @context y @type', () => {
        const blocks = [
          ...domHtml.matchAll(
            /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
          ),
        ];
        expect(
          blocks.length,
          'No se encontró ningún <script type="application/ld+json">',
        ).toBeGreaterThan(0);

        for (const [, content] of blocks) {
          if (!content.trim()) continue;
          let parsed: unknown;
          expect(
            () => { parsed = JSON.parse(content.trim()); },
            'El JSON-LD no es JSON válido',
          ).not.toThrow();
          const s = parsed as Record<string, unknown>;
          expect(String(s['@context'] ?? ''), '@context debe apuntar a schema.org').toMatch(
            /schema\.org/,
          );
          expect(s['@type'], '@type no debe estar vacío').toBeTruthy();
        }
      });

      test('no contiene strings con valores inválidos', () => {
        const blocks = [
          ...domHtml.matchAll(
            /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
          ),
        ];
        for (const [, content] of blocks) {
          // Detecta placeholders dentro de strings JSON (ej: "name": "{{Marca}}")
          expect(content, 'JSON-LD contiene un string con placeholder').not.toMatch(
            /"(undefined|NaN)|"\{\{[^}]*\}\}"/i,
          );
        }
      });

      // ── Checks por tipo de página (driven by schemaByPageType in config.ts) ─

      const expectations = schemaByPageType[effectiveType as keyof typeof schemaByPageType];

      if (expectations?.required && expectations.required.length > 0) {
        test(`@type requeridos: ${expectations.required.join(', ')}`, () => {
          const types = getTopLevelTypes(domHtml);
          for (const t of expectations.required) {
            expect(types, `Falta @type "${t}" en el schema`).toContain(t);
          }
        });
      }

      for (const group of (expectations?.anyOf ?? [])) {
        test(`al menos uno de: ${group.join(' / ')}`, () => {
          const types = getTopLevelTypes(domHtml);
          expect(
            group.some((t) => types.includes(t)),
            `Se esperaba al menos uno de estos @type de nivel superior: ${group.join(', ')}`,
          ).toBe(true);
        });
      }

      if (expectations?.fields && expectations.fields.length > 0) {
        test(`campos de vehículo: ${expectations.fields.join(', ')}`, () => {
          const schemas = collectSchemas(domHtml);
          for (const field of expectations.fields!) {
            expect(schemas, `Falta el campo "${field}" en el schema`).toContain(`"${field}"`);
          }
        });
      }

      // LAA-726/727/728: @types que el rediseño reemplaza (ej. Organization -> AutomotiveBusiness).
      if (expectations?.forbiddenTypes && expectations.forbiddenTypes.length > 0) {
        test(`no debe incluir @type: ${expectations.forbiddenTypes.join(', ')}`, () => {
          const types = getTopLevelTypes(domHtml);
          for (const t of expectations.forbiddenTypes!) {
            expect(types, `El @type "${t}" debería haber sido reemplazado`).not.toContain(t);
          }
        });
      }

      // LAA-726/727/728: propiedades no soportadas que deben eliminarse del schema (ej. addressCountry en Car).
      if (expectations?.forbiddenFields && expectations.forbiddenFields.length > 0) {
        test(`no debe incluir el campo: ${expectations.forbiddenFields.join(', ')}`, () => {
          const schemas = collectSchemas(domHtml);
          for (const field of expectations.forbiddenFields!) {
            expect(schemas, `El campo "${field}" no debería estar en el schema`).not.toContain(`"${field}"`);
          }
        });
      }

      // LATAM-466: el schema de Organization/AutomotiveBusiness debe pertenecer
      // al país correspondiente (dominio propio), no al del otro portal.
      if (expectations?.anyOf?.some((group) => group.includes('Organization') || group.includes('AutomotiveBusiness'))) {
        test(`Organization/AutomotiveBusiness pertenece a ${ownCountryHostname}`, () => {
          const blocks = getTopLevelBlocksByType(domHtml, ['Organization', 'AutomotiveBusiness']);
          expect(
            blocks.length,
            'No se encontró ningún bloque Organization/AutomotiveBusiness para validar',
          ).toBeGreaterThan(0);
          for (const block of blocks) {
            const json = JSON.stringify(block);
            expect(
              json,
              `El schema de Organization/AutomotiveBusiness no contiene el dominio esperado (${ownCountryHostname})`,
            ).toContain(ownCountryHostname);
            for (const otherHost of otherCountryHostnames) {
              expect(
                json,
                `El schema de Organization/AutomotiveBusiness contiene datos de otro país (${otherHost})`,
              ).not.toContain(otherHost);
            }
          }
        });
      }
    });

    // ── H. Links internos ───────────────────────────────────────────────────

    test.describe('H. Links internos', () => {
      test('no hay links apuntando a demo ni localhost', () => {
        const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
        const bad = hrefs.filter(
          (h) =>
            /localhost|127\.0\.0\.1/i.test(h) ||
            (demoHostname ? h.includes(demoHostname) : false),
        );
        expect(bad, `Links incorrectos encontrados: ${bad.join(', ')}`).toHaveLength(0);
      });
    });

    // ── I. Imágenes ─────────────────────────────────────────────────────────

    test.describe('I. Imágenes', () => {
      test('atributos alt no contienen placeholders', () => {
        const badAlts = [...html.matchAll(/\salt=["']([^"']+)["']/gi)]
          .map((m) => m[1])
          .filter((alt) => PLACEHOLDER.test(alt));
        expect(
          badAlts,
          `Alt texts con valores inválidos: ${badAlts.join(', ')}`,
        ).toHaveLength(0);
      });
    });

    // ── J. Scripts de seguimiento ───────────────────────────────────────────

    test.describe('J. Scripts de seguimiento', () => {
      test('Google Tag Manager está presente', () => {
        expect(html, 'No se encontró el script de Google Tag Manager').toContain(
          'googletagmanager.com',
        );
      });
    });
  });
}

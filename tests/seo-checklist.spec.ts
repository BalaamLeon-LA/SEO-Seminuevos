import { test, expect } from '@playwright/test';
import { allPages, productionBaseURL, stagingHostname, schemaByPageType } from './config';

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

const productionHostname = new URL(productionBaseURL).hostname;

/**
 * TEST_PATHS: para testear solo páginas específicas.
 *
 * Ejemplos:
 *   TEST_PATHS=/usados/-/autos npm run test:prod
 *   TEST_PATHS=/vehicle/autos-ford-bronco-zapopan-2023/4797505 npm run test:staging
 *   TEST_PATHS=/mi-landing,/otra-landing npm run test:prod
 */
const customPaths = process.env['TEST_PATHS']?.split(',').map((p: string) => p.trim()).filter(Boolean);
const pagesToTest = customPaths?.length
  ? customPaths.map((path: string) => ({ path, type: 'custom' as const }))
  : allPages;

// Valores de placeholder que no deben aparecer en texto visible ni schema
const PLACEHOLDER = /\b(undefined|null|NaN)\b|\{\{[^}]*\}\}/i;

// ─── Tests por página ──────────────────────────────────────────────────────────

for (const { path, type } of pagesToTest) {
  // Para rutas custom inferimos el tipo por el path para activar checks específicos
  const effectiveType =
    type === 'custom' ? (path.includes('/vehicle/') ? 'details' : 'categories') : type;

  test.describe(`[${type}] ${path}`, () => {
    let html = '';       // HTML crudo del servidor (lo que ve Googlebot en el primer pase)
    let domHtml = '';    // DOM tras ejecución de JS (para schema inyectado via JavaScript)
    let statusCode = 0;

    test.beforeAll(async ({ request, browser, baseURL }) => {
      const r = await request.get(`${baseURL}${path}`);
      statusCode = r.status();
      html = await r.text();

      // Navegación real para capturar schema inyectado por JS
      // `page` no está disponible en beforeAll (es per-test), se crea el contexto manualmente
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      domHtml = await page.content();
      await context.close();
    });

    // ── A. Status code ──────────────────────────────────────────────────────

    test('A. status code es 200', () => {
      expect(statusCode, `La página devolvió ${statusCode} en lugar de 200`).toBe(200);
    });

    // ── B. Meta robots ──────────────────────────────────────────────────────

    test.describe('B. Meta robots', () => {
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

      test('no contiene staging, localhost ni placeholders', () => {
        const m =
          html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
          html.match(/<link\s[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
        if (!m) return; // cubierto por el test anterior
        const url = m![1].trim();
        expect(url).not.toMatch(/localhost|127\.0\.0\.1/i);
        expect(url, 'El canonical contiene un valor inválido').not.toMatch(PLACEHOLDER);
        if (stagingHostname) {
          expect(url, `El canonical apunta a staging (${stagingHostname})`).not.toContain(stagingHostname);
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
    });

    // ── H. Links internos ───────────────────────────────────────────────────

    test.describe('H. Links internos', () => {
      test('no hay links apuntando a staging ni localhost', () => {
        const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
        const bad = hrefs.filter(
          (h) =>
            /localhost|127\.0\.0\.1/i.test(h) ||
            (stagingHostname ? h.includes(stagingHostname) : false),
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

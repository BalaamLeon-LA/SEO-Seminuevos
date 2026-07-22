import { test, expect } from '@playwright/test';
import { localGuidePaths, localGuideNegativePaths } from './config';

/**
 * SEO-150: guías locales SEO por ciudad en /usados/{ubicación}/autos (EC).
 *
 * Los checks de contenido corren sobre `rawHtml` (el body crudo, antes de que
 * ejecute JS) porque la guía debe ser 100% SSR — mismo patrón que
 * seo-local-routes.spec.ts. El schema Article se valida sobre el DOM
 * hidratado porque el resto del JSON-LD del sitio se inyecta client-side.
 *
 * El mainEntityOfPage del Article se compara contra el <link rel="canonical">
 * real de la MISMA página (no contra el dominio de producción hardcodeado):
 * el ambiente de demo hoy sirve canonicals apuntando a su propio dominio en
 * varias páginas (bug preexistente, ajeno a este ticket) — comparar contra el
 * canonical real evita que ese bug no relacionado haga fallar este check.
 */
function getCanonical(html: string): string | null {
  const m =
    html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
    html.match(/<link\s[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1].trim() : null;
}

function getArticleBlock(html: string): Record<string, unknown> | null {
  const blocks = [
    ...html.matchAll(
      /<script\s[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const [, content] of blocks) {
    try {
      const d = JSON.parse(content.trim()) as Record<string, unknown>;
      if (d['@type'] === 'Article') return d;
    } catch {
      // bloque no parseable, se ignora
    }
  }
  return null;
}

const GUIDE_HEADING = /<h2[^>]*>[\s\S]*?autos seminuevos en[\s\S]*?<\/h2>/i;
const GUIDE_KEYWORD = /parque vehicular/i;

for (const path of localGuidePaths) {
  test.describe(`[local-guide] ${path}`, () => {
    let rawHtml = '';
    let domHtml = '';
    let statusCode = 0;

    test.beforeAll(async ({ browser, baseURL }) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      let rawHtmlPromise: Promise<string> = Promise.resolve('');
      page.on('response', (response) => {
        if (
          response.request().resourceType() === 'document' &&
          response.frame() === page.mainFrame() &&
          response.url().startsWith(baseURL ?? '')
        ) {
          statusCode = response.status();
          rawHtmlPromise = response.text().catch(() => '');
        }
      });
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      await page
        .waitForFunction(
          () => document.querySelectorAll('script[type="application/ld+json"]').length > 0,
          { timeout: 8_000 },
        )
        .catch(() => {});
      domHtml = await page.content();
      rawHtml = await rawHtmlPromise;
      await context.close();
    });

    test('status code es 200', () => {
      expect(statusCode, `La página devolvió ${statusCode} en lugar de 200`).toBe(200);
    });

    test('la guía local está en el HTML fuente (SSR)', () => {
      expect(
        rawHtml,
        'No se encontró el H2 "Autos seminuevos en ..." en el HTML fuente — la guía parece depender de JS',
      ).toMatch(GUIDE_HEADING);
      expect(
        rawHtml,
        'No se encontró el contenido de "parque vehicular" en el HTML fuente',
      ).toMatch(GUIDE_KEYWORD);
    });

    test('incluye schema Article con mainEntityOfPage apuntando al canonical real', () => {
      const article = getArticleBlock(domHtml);
      expect(article, 'No se encontró un bloque JSON-LD de @type "Article"').not.toBeNull();

      const canonical = getCanonical(domHtml);
      expect(canonical, 'No se encontró <link rel="canonical"> en la página').not.toBeNull();

      const mainEntity = article!['mainEntityOfPage'] as Record<string, unknown> | string | undefined;
      const mainEntityUrl =
        typeof mainEntity === 'string' ? mainEntity : (mainEntity?.['@id'] as string | undefined);

      expect(
        mainEntityUrl,
        'El Article no tiene mainEntityOfPage (ni como string ni como @id)',
      ).toBeTruthy();
      expect(
        mainEntityUrl,
        `mainEntityOfPage ("${mainEntityUrl}") no coincide con el canonical real ("${canonical}")`,
      ).toBe(canonical);
    });
  });
}

/**
 * SEO-150: casos negativos — la guía NO debe mostrarse en la página de solo
 * provincia (sin ciudad) ni en un tipo de vehículo distinto a "autos".
 */
for (const path of localGuideNegativePaths) {
  test.describe(`[local-guide negative] ${path}`, () => {
    let rawHtml = '';

    test.beforeAll(async ({ browser, baseURL }) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      let rawHtmlPromise: Promise<string> = Promise.resolve('');
      page.on('response', (response) => {
        if (
          response.request().resourceType() === 'document' &&
          response.frame() === page.mainFrame() &&
          response.url().startsWith(baseURL ?? '')
        ) {
          rawHtmlPromise = response.text().catch(() => '');
        }
      });
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      rawHtml = await rawHtmlPromise;
      await context.close();
    });

    test('no muestra la guía local', () => {
      expect(rawHtml, 'Se encontró el H2 de guía local donde no debería aparecer').not.toMatch(
        GUIDE_HEADING,
      );
      expect(
        rawHtml,
        'Se encontró el contenido de "parque vehicular" donde no debería aparecer',
      ).not.toMatch(GUIDE_KEYWORD);
    });
  });
}

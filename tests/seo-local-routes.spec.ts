import { test, expect } from '@playwright/test';
import { localRoutePaths, localRouteRedirects } from './config';

/**
 * SEO-104/107/142/143/145: contenido específico de rutas de "solo ubicación"
 * (ciudad, sin filtro de marca) que no encaja en el checklist genérico porque
 * no hay un `type` de página para ellas en `pagesByType` — mismo patrón que
 * seo-noindex.spec.ts / seo-model-year.spec.ts.
 *
 * Los checks corren sobre `rawHtml` (el body crudo, antes de que ejecute JS)
 * en vez de sobre el DOM renderizado — así se prueba que el contenido es
 * visible para un crawler que no ejecuta JavaScript, no solo tras hidratación.
 */
for (const path of localRoutePaths) {
  test.describe(`[local] ${path}`, () => {
    let rawHtml = '';
    let domHtml = ''; // DOM tras hidratación — el schema AutoDealer se inyecta client-side, igual que en el resto del checklist
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

    // SEO-104: tabla de rango de precios calculada a partir del listado real.
    test('incluye tabla de rango de precios', () => {
      const h2s = [...rawHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
        m[1].replace(/<[^>]+>/g, '').trim(),
      );
      expect(
        h2s.some((h2) => /rango de precios/i.test(h2)),
        `No se encontró un H2 de "Rango de precios" en el HTML fuente. H2 encontrados: ${h2s.join(' | ')}`,
      ).toBe(true);
    });

    // SEO-143: el H2 de FAQ debe incluir el keyword de la ruta, no el texto genérico a secas.
    test('el H2 de "Preguntas frecuentes" incluye el keyword de la ruta', () => {
      const h2s = [...rawHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) =>
        m[1].replace(/<[^>]+>/g, '').trim(),
      );
      const faqH2 = h2s.find((h2) => /preguntas frecuentes/i.test(h2));
      expect(faqH2, `No se encontró un H2 de "Preguntas frecuentes". H2 encontrados: ${h2s.join(' | ')}`).toBeTruthy();
      expect(
        faqH2!.trim().toLowerCase(),
        `El H2 de FAQ es el texto genérico sin keyword: "${faqH2}"`,
      ).not.toBe('preguntas frecuentes');
    });

    // SEO-145: el nombre de cada agencia debe ser un H3, no un <p>.
    test('los nombres de agencia están en H3', () => {
      const h3Count = (rawHtml.match(/<h3[\s>]/gi) ?? []).length;
      expect(h3Count, 'No se encontró ningún H3 en el HTML fuente (agencias)').toBeGreaterThan(0);
    });

    // SEO-142: la sección de Agencias debe venir en el HTML fuente (SSR), no depender de JS.
    test('la sección de Agencias está en el HTML fuente (SSR)', () => {
      expect(
        rawHtml,
        'No se encontró un H2 de "Agencias" en el HTML fuente — la sección parece depender de JS',
      ).toMatch(/<h2[^>]*>[\s\S]*?agencias[\s\S]*?<\/h2>/i);
    });

    // SEO-107: Local Schema (AutoDealer) para todas las agencias, no solo el headquarters.
    // Se inyecta client-side (igual que el resto del schema JSON-LD del sitio),
    // por eso se valida contra el DOM ya hidratado, no contra el HTML crudo.
    test('incluye Local Schema (AutoDealer) para más de una agencia', () => {
      const count = (domHtml.match(/"@type"\s*:\s*"AutoDealer"/g) ?? []).length;
      expect(
        count,
        `Solo se encontró ${count} bloque(s) AutoDealer en el schema — se esperaba más de 1 (todas las agencias, no solo el headquarters)`,
      ).toBeGreaterThan(1);
    });
  });
}

/**
 * SEO-105/SEO-116: variantes de URL con bug conocido (guion sobrante que
 * generaba `buildSeoUrl`, o `%20` sin codificar) deben redirigir con 301 en
 * un solo hop a la ruta local limpia — no servir contenido duplicado ni
 * encadenar múltiples redirects.
 */
for (const { from, to } of localRouteRedirects) {
  test.describe(`[redirect] ${from}`, () => {
    let hops: Array<{ url: string; status: number }> = [];
    let finalUrl = '';

    test.beforeAll(async ({ browser, baseURL }) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      page.on('response', (response) => {
        if (response.request().resourceType() === 'document' && response.frame() === page.mainFrame()) {
          hops.push({ url: response.url(), status: response.status() });
        }
      });
      await page.goto(`${baseURL}${from}`, { waitUntil: 'load' });
      finalUrl = page.url();
      await context.close();
    });

    test(`redirige con 301 a la ruta limpia (${to}) en un solo hop`, ({ baseURL }) => {
      expect(hops.length, `Se esperaba una cadena de 2 respuestas (301 + 200), se obtuvieron ${hops.length}: ${JSON.stringify(hops)}`).toBe(2);
      expect(hops[0].status, `El primer hop debería ser un 301, fue ${hops[0].status}`).toBe(301);
      expect(hops[1].status, `El hop final debería ser 200, fue ${hops[1].status}`).toBe(200);
      expect(finalUrl, 'La URL final no es la ruta local limpia esperada').toBe(`${baseURL}${to}`);
    });
  });
}

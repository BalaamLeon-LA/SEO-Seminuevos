import { test, expect } from '@playwright/test';
import { filteredPaths } from './config';

/**
 * LATAM-442: URLs con parámetros de filtro/moderación (?type_autos_*) no
 * deben indexarse. A diferencia del checklist genérico (que exige
 * index,follow y una canonical "limpia"), estas páginas deben llevar
 * meta robots "noindex, follow" y canonical autorreferenciada, incluyendo
 * el query string — no la canonical del listado base sin parámetros.
 */
for (const path of filteredPaths) {
  test.describe(`[filtrada] ${path}`, () => {
    let html = '';
    let statusCode = 0;

    test.beforeAll(async ({ browser, baseURL }) => {
      // Navegación con browser real: request.get() es bloqueado por Cloudflare.
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      page.on('response', (response) => {
        if (
          response.request().resourceType() === 'document' &&
          response.url().startsWith(baseURL ?? '')
        ) {
          statusCode = response.status();
        }
      });
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      html = await page.content();
      await context.close();
    });

    test('status code es 200', () => {
      expect(statusCode, `La página devolvió ${statusCode} en lugar de 200`).toBe(200);
    });

    test('meta robots es noindex, follow', () => {
      const m =
        html.match(/<meta\s[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i) ??
        html.match(/<meta\s[^>]*content=["']([^"']*)["'][^>]*name=["']robots["']/i);
      expect(m, 'No se encontró <meta name="robots">').not.toBeNull();
      const content = m![1].toLowerCase();
      expect(content, `meta robots debería contener "noindex", se encontró "${m![1]}"`).toContain(
        'noindex',
      );
      expect(content, `meta robots debería contener "follow", se encontró "${m![1]}"`).toContain(
        'follow',
      );
    });

    test('la canonical apunta a sí misma, incluyendo el query string', ({ baseURL }) => {
      const m =
        html.match(/<link\s[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ??
        html.match(/<link\s[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
      expect(m, 'No se encontró <link rel="canonical">').not.toBeNull();
      expect(
        m![1].trim(),
        'La canonical debería ser la URL exacta de esta página (con query string), no la del listado limpio',
      ).toBe(`${baseURL}${path}`);
    });
  });
}

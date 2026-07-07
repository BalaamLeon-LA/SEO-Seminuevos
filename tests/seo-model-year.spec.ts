import { test, expect } from '@playwright/test';
import { modelYearPaths, yearOnlyPaths } from './config';

/**
 * LATAM-463: en las páginas de combinación Marca + Modelo + Año, el <title> y
 * la meta description deben incluir el año del path (ej. ".../jetta/2020" ->
 * "Volkswagen Jetta 2020 ..."). Se testea aparte del checklist genérico
 * (seo-checklist.spec.ts) porque el ticket solo pide validar ese contenido,
 * no el schema de la página.
 *
 * LATAM-481: mismo requisito, pero para páginas de combinación Autos + Año
 * SIN marca/modelo (ej. /usados/-/autos/-/-/-/2020) — se agregan a la misma
 * lista porque el check (año en título y meta description) es idéntico.
 */
for (const path of [...modelYearPaths, ...yearOnlyPaths]) {
  const year = path.match(/(\d{4})$/)?.[1] ?? '';

  test.describe(`[model-year] ${path}`, () => {
    let html = '';

    test.beforeAll(async ({ browser, baseURL }) => {
      // Navegación con browser real: request.get() es bloqueado por Cloudflare.
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      html = await page.content();
      await context.close();
    });

    test('el año existe en el path', () => {
      expect(year, `No se pudo extraer un año de 4 dígitos del final de "${path}"`).not.toBe('');
    });

    test('el <title> incluye el año', () => {
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      expect(m, 'No se encontró etiqueta <title>').not.toBeNull();
      const title = m![1].trim();
      expect(title, `El <title> no incluye el año ${year}: "${title}"`).toContain(year);
    });

    test('la meta description incluye el año', () => {
      const m =
        html.match(/<meta\s[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
        html.match(/<meta\s[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      expect(m, 'No se encontró <meta name="description">').not.toBeNull();
      const description = m![1].trim();
      expect(
        description,
        `La meta description no incluye el año ${year}: "${description}"`,
      ).toContain(year);
    });
  });
}

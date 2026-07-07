import { test, expect } from '@playwright/test';
import { pagesByType, longTailAnchors, continueSearchSectionPaths } from './config';

/**
 * LAA-726: la Home del rediseño Patiotuerca (EC) debe incluir enlaces
 * internos con los anchors long-tail sugeridos por SEO. Se testea aparte del
 * checklist genérico porque es contenido específico de un ticket, no un
 * requisito de todas las páginas de tipo "home".
 */
test.describe('[home] enlaces long-tail (LAA-726)', () => {
  for (const path of pagesByType.home) {
    test(`${path} incluye los anchors long-tail definidos por SEO`, async ({ browser, baseURL }) => {
      test.skip(longTailAnchors.length === 0, 'longTailAnchors no está definido para este país');

      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      const anchorTexts = (await page.locator('a').allTextContents()).map((t) => t.trim().toLowerCase());
      await context.close();

      const missing = longTailAnchors.filter(
        (anchor) => !anchorTexts.includes(anchor.toLowerCase()),
      );
      expect(missing, `Faltan anchors long-tail en ${path}: ${missing.join(', ')}`).toHaveLength(0);
    });
  }
});

/**
 * LAA-727 / LAA-728: las páginas de Modelo y Marca deben incluir, al final
 * del contenido, la sección "Continúa tu búsqueda de carros" con enlaces
 * agrupados por marca/categoría. Se testea aparte del checklist genérico por
 * la misma razón que el bloque anterior.
 */
test.describe('[model/brand] sección "Continúa tu búsqueda de carros" (LAA-727 / LAA-728)', () => {
  for (const path of continueSearchSectionPaths) {
    test(`${path} incluye la sección "Continúa tu búsqueda de carros"`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
      const html = await page.content();
      await context.close();

      const hasSectionHeading = /contin[uú]a tu b[uú]squeda de carros/i.test(html);
      expect(
        hasSectionHeading,
        `No se encontró la sección "Continúa tu búsqueda de carros" en ${path}`,
      ).toBe(true);
    });
  }
});

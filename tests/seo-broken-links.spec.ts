import { test, expect } from '@playwright/test';
import { knownBrokenLinks } from './config';

/**
 * SEO-129: rutas de cuenta de usuario (publicar vehículo, tablero, favoritos)
 * enlazadas desde la home de EC que devolvían 401 para visitantes anónimos.
 * El fix las redirige a una landing en vez de mostrar el error de sesión.
 */
for (const path of knownBrokenLinks) {
  test.describe(`[broken-link] ${path}`, () => {
    // Todos los status de documento dentro del dominio propio, en orden. El
    // fix redirige (3xx) a una landing/login que puede vivir en otro dominio
    // (ej. Keycloak en un subdominio de auth) — por eso no exigimos un status
    // final único, sino que ninguna respuesta propia sea un error 4xx/5xx.
    let ownDomainStatusCodes: number[] = [];

    test.beforeAll(async ({ browser, baseURL }) => {
      // Navegación con browser real, sesión anónima (sin login).
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      page.on('response', (response) => {
        // mainFrame(): evita capturar iframes ocultos con resourceType "document"
        // (ej. silent-check-sso.html de Keycloak) en vez de la navegación real.
        if (
          response.request().resourceType() === 'document' &&
          response.frame() === page.mainFrame() &&
          response.url().startsWith(baseURL ?? '')
        ) {
          ownDomainStatusCodes.push(response.status());
        }
      });
      await page.goto(`${baseURL}${path}`, { waitUntil: 'load' }).catch(() => {});
      await context.close();
    });

    test('no devuelve 401 (debe redirigir a una landing)', () => {
      expect(
        ownDomainStatusCodes,
        `${path} devolvió 401 para un visitante anónimo — debería redirigir a una landing`,
      ).not.toContain(401);
    });

    test('ninguna respuesta propia es un error 4xx/5xx', () => {
      const errors = ownDomainStatusCodes.filter((s) => s >= 400);
      expect(
        errors,
        `${path} devolvió error(es) ${errors.join(', ')} — debería redirigir a una landing sin errores`,
      ).toHaveLength(0);
    });
  });
}

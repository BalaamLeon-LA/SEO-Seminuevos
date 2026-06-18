import { test, expect } from '@playwright/test';
import { stagingHostname } from './config';

// ─── robots.txt ────────────────────────────────────────────────────────────────

test.describe('robots.txt', () => {
  let body = '';

  test.beforeAll(async ({ request, baseURL }) => {
    const r = await request.get(`${baseURL}/robots.txt`);
    expect(r.status(), `robots.txt devolvió ${r.status()}`).toBe(200);
    body = await r.text();
  });

  test('User-agent: * no tiene Disallow: /', () => {
    // Solo evalúa el bloque del wildcard para no generar falsos positivos con
    // bots (Ahrefs, Semrush…) que sí se bloquean intencionalmente con Disallow: /
    const block = body.match(/User-agent:\s*\*\s*\n([\s\S]*?)(?=User-agent:|$)/i)?.[1] ?? '';
    expect(
      block,
      'User-agent: * tiene "Disallow: /" — bloquearía a Googlebot',
    ).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });

  test('no bloquea rutas SEO críticas', () => {
    const block = body.match(/User-agent:\s*\*\s*\n([\s\S]*?)(?=User-agent:|$)/i)?.[1] ?? '';
    const criticalPaths = ['/usados', '/vehicle'];
    for (const path of criticalPaths) {
      // Disallow exacto a esa ruta (no como prefijo de otra cosa)
      expect(
        block,
        `User-agent: * tiene Disallow para la ruta crítica: ${path}`,
      ).not.toMatch(new RegExp(`^Disallow:\\s*${path.replace('/', '\\/')}\\s*$`, 'm'));
    }
  });
});

// ─── Sitemap ───────────────────────────────────────────────────────────────────

test.describe('Sitemaps', () => {
  // Se pueblan en beforeAll leyendo robots.txt
  let sitemapPaths: string[] = [];

  test.beforeAll(async ({ request, baseURL }) => {
    const r = await request.get(`${baseURL}/robots.txt`);
    const robotsBody = await r.text();

    // Extrae solo el path de cada directiva "Sitemap: https://dominio.com/path"
    sitemapPaths = [...robotsBody.matchAll(/^Sitemap:\s*https?:\/\/[^/\s]+(\S+)/gm)].map(
      (m) => m[1],
    );

    if (!sitemapPaths.length) sitemapPaths = ['/sitemap.xml'];
  });

  test('hay sitemaps declarados en robots.txt', () => {
    expect(
      sitemapPaths.length,
      'No se encontraron directivas "Sitemap:" en robots.txt',
    ).toBeGreaterThan(0);
  });

  test('todos los sitemaps responden con 200', async ({ request, baseURL }) => {
    for (const path of sitemapPaths) {
      const r = await request.head(`${baseURL}${path}`);
      expect(r.status(), `Sitemap ${path} devolvió ${r.status()}`).toBe(200);
    }
  });

  test('sitemaps no contienen URLs de staging ni localhost', async ({ request, baseURL }) => {
    // Solo descarga los primeros 3 para no tardar demasiado en sitemaps grandes
    for (const path of sitemapPaths.slice(0, 3)) {
      const r = await request.get(`${baseURL}${path}`);
      const xml = await r.text();
      expect(xml, `Sitemap ${path} contiene localhost`).not.toMatch(/localhost|127\.0\.0\.1/i);
      if (stagingHostname) {
        expect(xml, `Sitemap ${path} contiene URLs de staging (${stagingHostname})`).not.toContain(
          stagingHostname,
        );
      }
    }
  });
});

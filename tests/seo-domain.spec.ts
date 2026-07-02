import { test, expect } from '@playwright/test';
import { demoHostname } from './config';

/** Extrae el bloque de reglas de un User-agent específico (hasta el siguiente User-agent o EOF). */
function getBotBlock(body: string, userAgent: string): string {
  const re = new RegExp(`User-agent:\\s*${userAgent}\\s*\\n([\\s\\S]*?)(?=User-agent:|$)`, 'i');
  return body.match(re)?.[1] ?? '';
}

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
    // bots de IA/scraping que sí se bloquean intencionalmente con Disallow: /
    const block = getBotBlock(body, '\\*');
    expect(
      block,
      'User-agent: * tiene "Disallow: /" — bloquearía a Googlebot',
    ).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });

  test('no bloquea rutas SEO críticas', () => {
    const block = getBotBlock(body, '\\*');
    const criticalPaths = ['/usados', '/vehicle'];
    for (const path of criticalPaths) {
      // Disallow exacto a esa ruta (no como prefijo de otra cosa)
      expect(
        block,
        `User-agent: * tiene Disallow para la ruta crítica: ${path}`,
      ).not.toMatch(new RegExp(`^Disallow:\\s*${path.replace('/', '\\/')}\\s*$`, 'm'));
    }
  });

  // LATAM-449: bots de scraping/IA agresivos deben seguir bloqueados por completo.
  test.describe('bloquea bots de scraping e IA', () => {
    const blockedBots = ['MJ12bot', 'DotBot', 'Rogerbot', 'GPTBot', 'CCBot'];
    for (const bot of blockedBots) {
      test(`${bot} tiene Disallow: /`, () => {
        const block = getBotBlock(body, bot);
        expect(block, `${bot} debería tener "Disallow: /" y no lo tiene`).toMatch(
          /^Disallow:\s*\/\s*$/m,
        );
      });
    }
  });

  // LATAM-449: se retira el bloqueo a Ahrefs/Semrush para permitir auditorías SEO internas.
  test.describe('no bloquea bots de auditoría SEO interna', () => {
    const allowedBots = ['AhrefsBot', 'SemrushBot', 'SemrushBot-SA'];
    for (const bot of allowedBots) {
      test(`${bot} no tiene Disallow: /`, () => {
        const block = getBotBlock(body, bot);
        expect(
          block,
          `${bot} sigue bloqueado con "Disallow: /" — debería permitirse para auditorías SEO internas`,
        ).not.toMatch(/^Disallow:\s*\/\s*$/m);
      });
    }
  });

  // LATAM-449: bloquear parámetros cruzados de filtros secundarios que saturan el crawl budget.
  test('bloquea parámetros de filtros secundarios (seller, fuel, drive, transmission)', () => {
    const block = getBotBlock(body, '\\*');
    const params = ['seller', 'fuel', 'drive', 'transmission'];
    for (const param of params) {
      expect(
        block,
        `User-agent: * no bloquea el parámetro de filtro "${param}="`,
      ).toMatch(new RegExp(`Disallow:[^\\n]*[?&][^\\n]*${param}=`, 'i'));
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

  test('sitemaps no contienen URLs de demo ni localhost', async ({ request, baseURL }) => {
    // Solo descarga los primeros 3 para no tardar demasiado en sitemaps grandes
    for (const path of sitemapPaths.slice(0, 3)) {
      const r = await request.get(`${baseURL}${path}`);
      const xml = await r.text();
      expect(xml, `Sitemap ${path} contiene localhost`).not.toMatch(/localhost|127\.0\.0\.1/i);
      if (demoHostname) {
        expect(xml, `Sitemap ${path} contiene URLs de demo (${demoHostname})`).not.toContain(
          demoHostname,
        );
      }
    }
  });

  // LATAM-448: las URLs con parámetros de filtro/tracking no deben estar en el
  // sitemap — saturan el crawl budget e indexan contenido duplicado. Se
  // revisan todos los sitemaps (no solo los primeros 3): los que contienen
  // fichas de vehículo con filtros suelen estar al final de la lista.
  test('sitemaps no contienen URLs con parámetros (?)', async ({ request, baseURL }) => {
    const results = await Promise.all(
      sitemapPaths.map(async (path) => {
        const r = await request.get(`${baseURL}${path}`);
        const xml = await r.text();
        const urlsWithQuery = [...xml.matchAll(/<loc>([^<]*\?[^<]*)<\/loc>/g)].map((m) => m[1]);
        return { path, urlsWithQuery };
      }),
    );
    for (const { path, urlsWithQuery } of results) {
      expect(
        urlsWithQuery.slice(0, 5),
        `Sitemap ${path} tiene ${urlsWithQuery.length} URLs con parámetros (ej: ${urlsWithQuery[0]}) — deberían excluirse del sitemap`,
      ).toHaveLength(0);
    }
  });
});

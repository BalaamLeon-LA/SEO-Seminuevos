import { test, expect } from '@playwright/test';
import { country } from './config';

/**
 * LATAM-486: limpieza de 430 rutas antiguas del blog de Seminuevos (Portal:
 * Seminuevos → solo MX), separadas en dos buckets a implementar vía
 * Cloudflare (`blog-redirects/seminuevos_cloudflare_implementation_notes.txt`):
 *
 * - `blog-redirects/seminuevos_cloudflare_bulk_redirects_301.txt` (198 filas): CSV para
 *   Cloudflare Bulk Redirects. Cada source_url debe redirigir (301) en UN
 *   solo salto al target_url, sin pasar por la redirección de trailing-slash
 *   propia del blog ni crear cadenas de redirects.
 * - `blog-redirects/seminuevos_cloudflare_410_urls.txt` (232 filas): Cloudflare Bulk
 *   Redirects no genera 410 — el ticket pide implementarlo vía origin/Worker.
 *   Estas URLs deben responder 410 Gone, no 404 ni redirigir a home/blog
 *   (soft-404).
 *
 * Al momento de escribir esto el ticket está en Discovery — ninguna de las
 * dos reglas está desplegada (los blog posts siguen respondiendo 200). Estos
 * tests quedan en rojo a propósito hasta el deploy, como regresión que
 * confirme automáticamente cuando se implemente (mismo patrón que LAA-726
 * y seo-404-redirects.spec.ts para LATAM-445).
 *
 * Se testea una muestra representativa de cada bucket (12 y 10 filas, de 198
 * y 232 totales) cubriendo distintas formas de target: marca+modelo+año,
 * hub de motos, ruta /precio, marca sola, marca+modelo con caracteres
 * especiales, y — para el bucket 410 — tanto posts como páginas de autor.
 */

const redirects301 = [
  {
    source: '/blog/las-dos-caras-de-la-practicidad-ram-700-2018',
    target: '/usados/-/autos/-/ram/700/2018',
  },
  {
    source: '/blog/chevrolet-camaro-2016-establece-nuevos-parametros-en-la-categoria',
    target: '/precio/autos/chevrolet/camaro/2016',
  },
  { source: '/blog/zanella-lanzo-las-nuevas-rx-150-y-200-next', target: '/usados/-/motos' },
  {
    source: '/blog/yamaha-fz-s-fi-ahora-con-nueva-estetica',
    target: '/usados/-/motos/-/yamaha/fz-s+2.0',
  },
  {
    source: '/blog/jeep-compass-2017-forzando-al-maximo-la-genetica-2',
    target: '/usados/-/autos/-/jeep/compass',
  },
  { source: '/blog/kia-carnival-2015-tes-drive', target: '/usados/-/autos/-/kia' },
  { source: '/blog/great-wall-wingle-5-peru-2015', target: '/usados/-/autos/-/gwm' },
  {
    source: '/blog/honda-crv-2023-renovada-precio-mexico',
    target: '/usados/-/autos/-/honda/cr-v',
  },
  {
    source: '/blog/mercedes-benz-en-ecuador-con-casa-nueva-y-vehiculos-exonerados',
    target: '/usados/-/autos/-/mercedes+benz',
  },
  { source: '/blog/mg-gs-2016-la-primera-suv-de-la-marca-llega-a-peru', target: '/usados/-/autos/-/mg' },
  { source: '/blog/volkswagen-t-cross-precio', target: '/usados/-/autos/-/volkswagen/t-cross' },
  {
    source: '/blog/nissan-pathfinder-2017-tercera-generacion-que-se-reinventa',
    target: '/usados/-/autos/-/nissan/pathfinder',
  },
];

// Muestra representativa del bucket 410 (10 de 232): posts + páginas de autor.
const shouldBeGone410 = [
  { type: 'Blog post', path: '/blog/baojun-560-el-nuevo-crossover-low-cost-de-gm' },
  { type: 'Blog post', path: '/blog/que-es-y-como-funciona-el-intercooler' },
  { type: 'Blog post', path: '/blog/clones-esos-autos-parecidos-entre-si' },
  { type: 'Blog post', path: '/blog/neumaticos-llanta-auto-usado' },
  { type: 'Blog post', path: '/blog/calendario-de-la-nueva-verificacion-2016' },
  { type: 'Blog post', path: '/blog/ciclovias-bicicletas-trafico' },
  { type: 'Blog post', path: '/blog/ayrton-senna-frases-cumpleanos-55' },
  { type: 'Blog author', path: '/blog/author/itzel' },
  { type: 'Blog author', path: '/blog/author/mario' },
  { type: 'Blog author (paginado)', path: '/blog/author/rodrigo/page/2' },
];

// El crosswalk es específico del blog de Seminuevos (MX); en EC no genera tests.
if (country === 'MX') {
  test.describe('LATAM-486: limpieza de rutas antiguas del blog (Cloudflare)', () => {
    test.describe('redirects 301 (Cloudflare Bulk Redirects)', () => {
      for (const { source, target } of redirects301) {
        test(`${source} -> 301 -> ${target}, en un solo salto`, async ({ request, baseURL }) => {
          const r = await request.get(`${baseURL}${source}`, { maxRedirects: 0 });
          expect(
            [301, 308],
            `${source} debería redirigir (301) a ${target}, devolvió ${r.status()}`,
          ).toContain(r.status());
          const location = r.headers()['location'] ?? '';
          expect(location, `El redirect de ${source} no apunta a ${target}: "${location}"`).toContain(
            target,
          );

          const targetResponse = await request.get(`${baseURL}${target}`);
          expect(
            targetResponse.status(),
            `El destino del redirect ${target} devolvió ${targetResponse.status()} en lugar de 200`,
          ).toBe(200);
        });
      }
    });

    test.describe('URLs retiradas: deben responder 410, no redirigir a home/blog', () => {
      for (const { type, path } of shouldBeGone410) {
        test(`[${type}] ${path} -> 410`, async ({ request, baseURL }) => {
          const r = await request.get(`${baseURL}${path}`, { maxRedirects: 0 });
          expect(
            r.status(),
            `${path} debería responder 410 Gone, devolvió ${r.status()} (revisar que no redirija a home/blog como soft-404)`,
          ).toBe(410);
        });
      }
    });
  });
}

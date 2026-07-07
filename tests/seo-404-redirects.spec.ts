import { test, expect } from '@playwright/test';
import { country } from './config';

/**
 * LATAM-445: limpieza de 404s del blog detectados en GSC, según el crosswalk
 * blog-redirects/seminuevos_blog_404_redirect_crosswalk.xlsx (Portal: Seminuevos → solo MX).
 *
 * Del crosswalk (997 URLs 404 clasificadas) se testean dos buckets:
 * - "Ready to implement" (301): las 13 URLs de match exacto/alta confianza,
 *   completas — deben redirigir 301 al target sugerido, y ese target debe
 *   responder 200.
 * - "Serve 410 / retired": una muestra representativa (2 por tipo, del total
 *   de 823) que NO deben redirigirse a home/blog — deben responder 410 Gone.
 *
 * Los buckets "301 contextual" y "Revisar manual" quedan fuera a propósito:
 * el ticket pide validarlos manualmente antes de aplicar un target.
 * "Corregir referencia técnica" (assets JS rotos) tampoco aplica aquí: no es
 * un redirect SEO, es limpiar la referencia en el HTML.
 */

const readyToImplement = [
  {
    source: '/blog/roborace-la-competencia-sin-pilotos-la-formula-e/amp/Seg%C3%BAn',
    target: '/blog/roborace-la-competencia-sin-pilotos-la-formula-e/',
  },
  { source: '/blog/tag/super-bowl/', target: '/blog/tag/super-bowl-lx/' },
  {
    source: '/blog/s1000-bmw-actualiza-su-gama-de-motos-deportivas/amp/BMW',
    target: '/blog/s1000-bmw-actualiza-su-gama-de-motos-deportivas/',
  },
  { source: '/blog/tag/ceo-volkswagen/', target: '/blog/tag/volkswagen/' },
  {
    source: '/blog/boutique-volvo-el-glamoroso-showroom-de-palermo/amp/Volvo',
    target: '/blog/boutique-volvo-el-glamoroso-showroom-de-palermo/',
  },
  { source: '/blog/tag/mantenimiento-auto/', target: '/blog/tag/mantenimiento-automotriz/' },
  { source: '/blog/tag/reglas-de-transito/', target: '/blog/tag/multas-de-transito/' },
  { source: '/blog/accesorios-para-tu-auto/', target: '/blog/diez-accesorios-para-tu-automovil/' },
  {
    source: '/blog/gt3-cup-nueva-edicion-del-porsche-911-en-paris/amp/Porsche',
    target: '/blog/gt3-cup-nueva-edicion-del-porsche-911-en-paris/',
  },
  {
    source: '/blog/gt3-cup-nueva-edicion-del-porsche-911-en-paris/amp/4',
    target: '/blog/gt3-cup-nueva-edicion-del-porsche-911-en-paris/',
  },
  {
    source: '/blog/undercoating-que-es-y-beneficios-2/amp/www.seminuevos.com',
    target: '/blog/undercoating-que-es-y-beneficios/',
  },
  {
    source: '/blog/conductor-seguro-presentado-wibe',
    target: '/blog/conductor-seguro-presentado-wibe-protegete-caso-lluvia/',
  },
  { source: '/blog/heaven-and-earth-seem', target: '/blog/heaven-and-earth-seem-2-2/' },
];

// Muestra representativa del bucket "Serve 410 / retired" (2 por tipo, de 823 totales)
const shouldBeGone = [
  { type: 'Blog post', path: '/blog/acura-rdx-2022-es-una-de-las-suv-de-lujo-mas-completa-a-su-y-equipada-de-su-segmento/' },
  { type: 'Blog post', path: '/blog/xx-para-conocer/' },
  { type: 'Blog tag', path: '/blog/tag/252-hp/' },
  { type: 'Blog tag', path: '/blog/tag/senna-ayrton/' },
  { type: 'Blog author', path: '/blog/author/alopez/' },
  { type: 'Blog author', path: '/blog/author/tnoboa' },
  { type: 'Vehicle detail', path: '/vehicle/4778315' },
  { type: 'Vehicle detail', path: '/vehicle/4777618' },
  { type: 'Blog pagination', path: '/blog/page/1223' },
  { type: 'Blog pagination', path: '/blog/page/1115' },
  { type: 'Blog date archive', path: '/blog/2015/07' },
  { type: 'Blog date archive', path: '/blog/2019/06' },
  { type: 'Blog category', path: '/blog/category/elexperto' },
  { type: 'Blog category', path: '/blog/category/noticias' },
];

// El crosswalk de 404s es específico del blog de Seminuevos (MX); en EC no genera tests.
if (country === 'MX') {
test.describe('LATAM-445: limpieza de 404s del blog', () => {
  test.describe('redirects 301 listos para implementar', () => {
    for (const { source, target } of readyToImplement) {
      test(`${source} -> 301 -> ${target} (200)`, async ({ request, baseURL }) => {
        const r = await request.get(`${baseURL}${source}`, { maxRedirects: 0 });
        expect(
          [301, 308],
          `${source} debería redirigir (301) a ${target}, devolvió ${r.status()}`,
        ).toContain(r.status());
        const location = r.headers()['location'] ?? '';
        expect(location, `El redirect de ${source} no apunta a ${target}`).toContain(target);

        const targetResponse = await request.get(`${baseURL}${target}`);
        expect(
          targetResponse.status(),
          `El destino del redirect ${target} devolvió ${targetResponse.status()} en lugar de 200`,
        ).toBe(200);
      });
    }
  });

  test.describe('URLs retiradas: deben responder 410, no redirigir a home/blog', () => {
    for (const { type, path } of shouldBeGone) {
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

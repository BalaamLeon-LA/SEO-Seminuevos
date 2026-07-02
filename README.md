# SEO-Seminuevos

Tests automatizados de QA SEO para [seminuevos.com](https://www.seminuevos.com) (MX) y [patiotuerca.com](https://ecuador.patiotuerca.com) (EC), basados en el Checklist de Calidad de Despliegue.

Verifican el HTML que recibe el servidor (equivalente a "Ver código fuente") para detectar regresiones de SEO antes y después de cada deploy.

---

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
npx playwright install chromium
```

## Configuración

```bash
cp .env.example .env
```

Edita `.env` y agrega las URLs de demo:

```env
COUNTRY=MX                                          # MX o EC — portal por defecto
DEMO_BASE_URL_MX=https://demo.seminuevos.com
DEMO_BASE_URL_EC=https://demo-ecuador.patiotuerca.com
```

`PRODUCTION_BASE_URL` no necesita configurarse: se infiere de `COUNTRY` (MX → `https://www.seminuevos.com`, EC → `https://ecuador.patiotuerca.com`). Solo defínela si necesitas forzar un dominio distinto.

## Uso

Este suite testea dos portales casi idénticos, MX y EC, con el mismo set de tests. El portal se selecciona con la variable `COUNTRY` (default `MX`).

### Correr contra producción

```bash
npm run test:prod        # MX (default)
npm run test:prod:mx
npm run test:prod:ec
```

### Correr contra demo

```bash
npm run test:demo        # MX (default)
npm run test:demo:mx
npm run test:demo:ec
```

### Combinar país con otras variables

`COUNTRY` se puede combinar con `TEST_PATHS` o `TEST_TYPE`:

```bash
COUNTRY=EC TEST_TYPE=details npm run test:prod
COUNTRY=EC TEST_PATHS=/usados/-/autos npm run test:demo
```

### Correr solo páginas específicas

Útil cuando el deploy afecta únicamente un template o landing.

```bash
TEST_PATHS=/usados/-/autos npm run test:prod
TEST_PATHS=/mi-landing,/otra-landing npm run test:demo
```

### Ver reporte HTML

```bash
npm run report
```

---

## Qué se verifica

### Nivel de dominio (`seo-domain.spec.ts`)

Siempre corre, independientemente de `TEST_PATHS`.

| Check | Descripción |
|---|---|
| `robots.txt` | `User-agent: *` no tiene `Disallow: /` ni bloquea rutas críticas (`/usados`, `/vehicle`) |
| `Sitemaps` | Todos los sitemaps declarados en `robots.txt` responden con 200 |
| `Sitemaps` | No contienen URLs de demo ni localhost |

### Por página (`seo-checklist.spec.ts`)

Se ejecuta para cada URL en `tests/config.ts` (o las definidas con `TEST_PATHS`).

| Sección | Check |
|---|---|
| `A. Status code` | La página devuelve 200 |
| `B. Meta robots` | No tiene `noindex` ni `nofollow` accidental |
| `C. Title` | Existe exactamente uno, sin valores vacíos ni placeholders |
| `D. Meta description` | Existe y no contiene `undefined`, `null`, `NaN` ni `{{ }}` |
| `E. Canonical` | Existe, usa HTTPS, apunta al dominio de producción, sin demo ni localhost |
| `F. H1` | Existe exactamente uno, sin valores vacíos ni placeholders |
| `G. Schema JSON-LD` | JSON válido con `@context` y `@type`; verifica los tipos esperados por tipo de página (ver tabla abajo) |
| `H. Links internos` | Ningún `href` apunta a demo ni localhost |
| `I. Imágenes` | Atributos `alt` sin valores placeholder |
| `J. GTM` | Google Tag Manager está presente |

> Los checks corren sobre el HTML crudo del servidor, no sobre el DOM renderizado por JavaScript — lo mismo que ve Googlebot.

### Schema esperado por tipo de página

| Tipo | `@type` requeridos | Al menos uno de |
|---|---|---|
| `home` | `WebPage` | `Organization`, `AutomotiveBusiness` |
| `hub` | `WebPage` | — |
| `brand` | `WebPage`, `BreadcrumbList` | — |
| `model` | `WebPage`, `BreadcrumbList` | — |
| `details` | `Offer` | `Car`, `Product` |

Las fichas (`details`) también verifican que el schema incluya los campos: `price`, `priceCurrency`, `availability`, `brand`, `model`, `vehicleModelDate`.

---

## Agregar páginas al suite

MX y EC comparten el mismo catálogo de rutas, con una excepción: la ficha de vehículo (`details`) no se comparte entre catálogos, así que su path se define por país en `detailsPathByCountry` (`tests/config.ts`). El resto de tipos (`home`, `hub`, `brand`, `model`) usa las mismas rutas para ambos portales.

Edita `tests/config.ts` y agrega rutas en el tipo que corresponda:

```ts
export const pagesByType = {
  home: ['/'],
  hub: [
    '/usados/-/autos',
    '/usados/-/motos',
  ],
  brand: [
    '/usados/-/autos/-/volkswagen',
    '/usados/-/autos/-/ford',
  ],
  model: [
    '/usados/-/autos/-/volkswagen/-/jetta',
  ],
  details: [
    '/vehicle/autos-ford-bronco-zapopan-2023/4797505',
  ],
};
```

El tipo determina qué `@type` de schema se verifican. Para ajustar las expectativas edita `schemaByPageType` en el mismo archivo.

---

## Severidad de fallos (según checklist)

| Fallo | Severidad | Acción |
|---|---|---|
| Status 4xx/5xx, noindex, canonical incorrecto, title/H1 ausente, schema ausente | **Pr0** | Detener deploy / rollback inmediato |
| Meta description ausente, más de un H1, schema con errores | **Pr1** | No aprobar sin revisión SEO |
| Alt texts mejorables, warnings menores de schema | **Pr2** | Ticket a backlog |

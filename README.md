# SEO-Seminuevos

Tests automatizados de QA SEO para [seminuevos.com](https://www.seminuevos.com), basados en el Checklist de Calidad de Despliegue.

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

Edita `.env` y agrega la URL de staging:

```env
PRODUCTION_BASE_URL=https://www.seminuevos.com   # ya configurado por defecto
STAGING_BASE_URL=https://staging.seminuevos.com
```

## Uso

### Correr contra producción

```bash
npm run test:prod
```

### Correr contra staging

```bash
npm run test:staging
```

### Correr solo páginas específicas

Útil cuando el deploy afecta únicamente un template o landing.

```bash
TEST_PATHS=/usados/-/autos npm run test:prod
TEST_PATHS=/mi-landing,/otra-landing npm run test:staging
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
| `Sitemaps` | No contienen URLs de staging ni localhost |

### Por página (`seo-checklist.spec.ts`)

Se ejecuta para cada URL en `tests/config.ts` (o las definidas con `TEST_PATHS`).

| Sección | Check |
|---|---|
| `A. Status code` | La página devuelve 200 |
| `B. Meta robots` | No tiene `noindex` ni `nofollow` accidental |
| `C. Title` | Existe exactamente uno, sin valores vacíos ni placeholders |
| `D. Meta description` | Existe y no contiene `undefined`, `null`, `NaN` ni `{{ }}` |
| `E. Canonical` | Existe, usa HTTPS, apunta al dominio de producción, sin staging ni localhost |
| `F. H1` | Existe exactamente uno, sin valores vacíos ni placeholders |
| `G. Schema JSON-LD` | JSON válido con `@context` y `@type`; verifica los tipos esperados por tipo de página (ver tabla abajo) |
| `H. Links internos` | Ningún `href` apunta a staging ni localhost |
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

# Checklist mínimo

# Protocolo de QA:(Pre/Post Deploy)

**Objetivo:** Asegurar que los componentes críticos de indexación y renderizado no se eliminen ni se alteren durante los despliegues.   
**Tiempo estimado:** 5 minutos.

## **1\. Fase PRE-DEPLOY (En el Pull Request / Staging)**

*A ejecutar antes de aprobar cualquier PR a la rama de producción.*

- [ ] **Configuración de Entorno (Envs):** Verificar que la variable APP\_ENV esté correctamente configurada para producción. (Si apunta a staging, las URLs en los canonicals serán erróneas).  
- [ ] **Persistencia del Layout:** Si se modificaron archivos de layout (\_document, App.js, base.html, etc.), asegurar que los *placeholders* destinados a inyectar metadatos (title, description, canonicals, schema) no hayan sido eliminados o comentados.  
- [ ] **Revisión de Robots:** Confirmar que no exista la meta etiqueta \<meta name="robots" content="noindex"\> en los archivos que deben ser públicos.  
- [ ] **Integridad de Scripts:** Validar que los scripts de terceros (GTM, analíticas, pixel de seguimiento) sigan presentes en el componente de cabecera.

## **2\. Fase POST-DEPLOY (En Producción)**

*A ejecutar inmediatamente después de completar el deploy. Se deben revisar 3 páginas (Home, 1 categoría, 1 detalle).*

### **A. Inspección Visual de Código (Ctrl \+ U)**

*No usar el inspector de elementos (F12), usar "Ver código fuente de la página" para ver lo que recibe el servidor.*

- [ ] **Verificar Canonical:** Buscar `<link rel="canonical"`.  
      - [ ] **Validación:** El `href` debe mostrar la URL final correcta (ej. `https://dominio.com/slug`) y no una URL de staging o localhost.  
- [ ] **Verificar Meta Tags:** Buscar etiquetas `<title>` y `<meta name="description"`.  
      - [ ] **Validación:** Deben contener texto descriptivo y no valores nulos, vacíos o placeholders como `{{ title }}`.  
- [ ] **Verificar Schema JSON-LD:** Buscar `"@context": "https://schema.org"`.  
      - [ ] **Validación:** El bloque de `<script type="application/ld+json">` debe contener el JSON completo y no estar vacío.

### **B. Pruebas de Sistema**

- [ ] **Status Code 200:** Confirmar que la página cargada no sea un error 404 o 500 disfrazado (verificar en la pestaña "Network" de las herramientas de desarrollador).  
- [ ] **Robots.txt:** Acceder a `dominio.com/robots.txt`.  
      - [ ] **Validación:** No debe contener `Disallow: /`.

## **3\. Matriz de Reporte de Errores (Si falla algo)**

Si algún ítem falla, **detener el despliegue / realizar rollback inmediatamente** y notificar al equipo responsable con este formato:

* **Página afectada:** (URL)  
* **Elemento fallido:** (Ej. Schema faltante, Canonical incorrecto)  
* **Comportamiento esperado:** (Ej. Debería mostrar la URL final)  
* **Comportamiento actual:** (Ej. Muestra URL de Staging)


# Checklist extenso

# **SEO QA Checklist para Deploys**

**Uso:** completar antes y después de cada deploy.  
**Responsable:** IT / QA.  
**Objetivo:** confirmar que las páginas críticas conservan los elementos SEO mínimos después de cada actualización.

# **1\. URLs a revisar en cada deploy**

Seleccionar una muestra mínima de páginas antes de iniciar el QA.

| Tipo de página | URL revisada | Status |
| :---- | :---- | :---- |
| Home | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Usados / Hub | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Marca | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Modelo | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Página local/ubiación | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Dealer | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐  |
| Precio | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Subtipos | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Long-tail /carros | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
|  |  |  |

---

# **2\. Fase PRE-DEPLOY**

Ejecutar en staging antes de publicar.

## **A. Status code**

Para cada URL de prueba:

☐ Abrir la página en staging.  
☐ Confirmar que carga correctamente.  
☐ Confirmar que no muestra error visual.  
☐ Abrir DevTools \> Network.  
☐ Recargar la página.  
☐ Confirmar que el documento principal devuelve 200.

**Debe pasar:**

* Status code 200.  
* No debe devolver 404, 500, 502, 503 o 504.  
* No debe cargar una página de error disfrazada como página normal.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **B. Canonical**

En cada URL de prueba:

☐ Abrir la página.  
☐ Presionar Ctrl \+ U o seleccionar “Ver código fuente de la página”.  
☐ Buscar: \<link rel="canonical"  
☐ Confirmar que existe.  
☐ Confirmar que el href tiene la URL final correcta.  
☐ Confirmar que usa https://www.seminuevos.com/...  
☐ Confirmar que no apunta a staging.  
☐ Confirmar que no apunta a localhost.  
☐ Confirmar que no apunta a otra página incorrecta.

**Debe verse así:**  
\<link rel="canonical" href="https://www.seminuevos.com/ruta-final"\>

**No debe verse así:**  
staging.seminuevos.com  
localhost  
undefined  
null  
{{ canonical }}

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **C. Title tag**

En el código fuente de cada URL:

☐ Buscar: \<title\>  
☐ Confirmar que existe.  
☐ Confirmar que solo hay un \<title\>.  
☐ Confirmar que tiene texto descriptivo.  
☐ Confirmar que corresponde al tipo de página.  
☐ Confirmar que no tiene placeholders.

**No debe contener:**  
undefined  
null  
NaN  
{{ title }}  
{{Marca}}  
{{Modelo}}  
{{Año}}  
Texto vacío.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **D. Meta description**

En el código fuente de cada URL:

☐ Buscar: \<meta name="description"  
☐ Confirmar que existe.  
☐ Confirmar que el atributo content tiene texto.  
☐ Confirmar que describe la página real.  
☐ Confirmar que no está vacío.  
☐ Confirmar que no tiene placeholders.

**Debe verse así:**  
\<meta name="description" content="Texto descriptivo de la página"\>

**No debe verse así:**  
content=""  
content="undefined"  
content="{{ description }}"  
content="{{Meta description}}"

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **E. Meta robots**

En el código fuente de cada URL:

☐ Buscar: \<meta name="robots"  
☐ Confirmar que existe.  
☐ Confirmar que las páginas indexables tienen index, follow.  
☐ Confirmar que no aparece noindex sin aprobación SEO.  
☐ Confirmar que no aparece nofollow sin aprobación SEO.

**Debe verse así en páginas indexables:**  
\<meta name="robots" content="index, follow"\>

**Bloquear deploy si aparece sin aprobación:**  
noindex  
nofollow  
none

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **F. H1**

En cada URL:

☐ Abrir la página en el navegador.  
☐ Revisar visualmente el encabezado principal.  
☐ Abrir DevTools o usar una extensión SEO.  
☐ Confirmar que existe un H1.  
☐ Confirmar que solo hay un H1.  
☐ Confirmar que el H1 corresponde a la página.  
☐ Confirmar que elementos de UI como “Filtros” no estén marcados como H1.

**Debe pasar:**

* 1 solo H1 por página.  
* H1 descriptivo.  
* H1 sin placeholders.

**Ejemplos esperados:**  
Home: Encuentra tu próximo auto seminuevo  
Hub: Venta de autos usados en México  
Marca: Autos Chevrolet  
Modelo: Autos Chevrolet Aveo  
Marca \+ Año: Autos Chevrolet 2010

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **G. Schema JSON-LD**

En el código fuente de cada URL:

☐ Buscar: application/ld+json  
☐ Confirmar que existe al menos un bloque JSON-LD.  
☐ Confirmar que el bloque no está vacío.  
☐ Confirmar que incluye "@context": "https://schema.org".  
☐ Confirmar que incluye "@type".  
☐ Confirmar que el JSON no está cortado.  
☐ Confirmar que no tiene placeholders.  
☐ Validarlo en Rich Results Test o Schema Markup Validator.  
☐ Confirmar que no hay errores críticos.

**No debe contener:**  
undefined  
null  
NaN  
{{Marca}}  
{{Modelo}}  
{{Año}}  
JSON vacío.  
JSON incompleto.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **H. Schema esperado por tipo de página**

Marcar solo los tipos de página que apliquen.

### **Home**

☐ WebPage presente.  
☐ AutomotiveBusiness u Organization presente.  
☐ SiteNavigationElement presente.  
☐ FAQPage presente si aplica.  
☐ URLs del schema apuntan a producción.

Resultado:  
☐ OK  
☐ Falla

---

### **Hub / Categoría**

☐ WebPage presente.  
☐ Organization presente.  
☐ SiteNavigationElement presente.  
☐ FAQPage presente si aplica.  
☐ Canonical del schema coincide con la URL final.

Resultado:  
☐ OK  
☐ Falla

---

### **Marca**

☐ WebPage presente.  
☐ Brand presente.  
☐ BreadcrumbList presente.  
☐ Product o AggregateOffer presente si aplica.  
☐ FAQPage presente si aplica.  
☐ La marca del schema coincide con la página.

Resultado:  
☐ OK  
☐ Falla

---

### **Modelo**

☐ WebPage presente.  
☐ BreadcrumbList presente.  
☐ Product presente.  
☐ Brand presente.  
☐ Model presente.  
☐ AggregateOffer presente si aplica.  
☐ FAQPage presente si aplica.  
☐ Marca y modelo coinciden con la URL.

Resultado:  
☐ OK  
☐ Falla

---

### **Detalle de vehículo**

☐ Car o Product schema presente.  
☐ Offer presente.  
☐ Price presente.  
☐ PriceCurrency presente.  
☐ Availability presente.  
☐ Brand presente.  
☐ Model presente.  
☐ VehicleModelDate presente.  
☐ MileageFromOdometer presente si aplica.  
☐ Image presente.  
☐ URL de la ficha presente.

Resultado:  
☐ OK  
☐ Falla

---

## **I. Links internos**

En cada URL de prueba:

☐ Revisar menú principal.  
☐ Revisar breadcrumbs.  
☐ Revisar cards de vehículos o productos.  
☐ Revisar CTAs principales.  
☐ Revisar paginación si aplica.  
☐ Confirmar que los links abren URLs válidas.  
☐ Confirmar que no hay links a staging.  
☐ Confirmar que no hay links a localhost.  
☐ Confirmar que no hay links rotos.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **J. Imágenes**

En cada URL de prueba:

☐ Confirmar que las imágenes principales cargan.  
☐ Confirmar que las cards muestran imagen.  
☐ Confirmar que logos y assets globales cargan.  
☐ Confirmar que no hay imágenes rotas.  
☐ Confirmar que las imágenes principales tienen atributo alt.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **K. Robots.txt**

Antes de deploy:

☐ Abrir /robots.txt en staging si aplica.  
☐ Confirmar que las reglas esperadas están presentes.  
☐ Confirmar que ninguna regla de staging será copiada a producción.  
☐ Confirmar que producción no quedará bloqueada.

**Bloquear deploy si producción queda con:**  
Disallow: /  
noindex global.  
Bloqueos accidentales a rutas SEO importantes.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **L. Sitemap \- reunirnos para definir el protocolo de revisión**

Antes de deploy:

☐ Abrir el sitemap principal.  
☐ Confirmar que carga.  
☐ Confirmar que no devuelve 404 o 5xx.  
☐ Confirmar que contiene URLs de producción.  
☐ Confirmar que no contiene URLs de staging.  
☐ Confirmar que no contiene localhost.  
☐ Confirmar que las URLs importantes siguen incluidas.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

# **3\. Aprobación PRE-DEPLOY**

El deploy puede avanzar solo si:

☐ Todas las URLs de muestra devuelven 200\.  
☐ Canonicals correctos.  
☐ Titles presentes.  
☐ Meta descriptions presentes.  
☐ Meta robots correcto.  
☐ No hay noindex accidental.  
☐ Hay un solo H1.  
☐ Schema JSON-LD presente.  
☐ Schema sin errores críticos.  
☐ No hay placeholders visibles.  
☐ No hay links a staging o localhost.  
☐ No hay errores 5xx.

**Resultado final pre-deploy:**  
☐ Aprobado  
☐ No aprobado

Responsable: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Fecha: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Notas:

---

---

# **4\. Fase POST-DEPLOY**

Ejecutar inmediatamente después del deploy en producción.

## **A. URLs a validar en producción**

Revisar mínimo 3 páginas. Idealmente 5\.

| Tipo de página | URL producción | Status |
| ----- | ----- | ----- |
| Home | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Categoría / Hub | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Marca o Modelo | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Detalle de vehículo | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Página adicional modificada | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |

---

## **B. Status code en producción**

Para cada URL:

☐ Abrir la página en producción.  
☐ Abrir DevTools \> Network.  
☐ Recargar la página.  
☐ Confirmar que el documento principal devuelve 200.  
☐ Confirmar que no devuelve 404\.  
☐ Confirmar que no devuelve 500\.  
☐ Confirmar que no devuelve 504\.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **C. Canonical en producción**

En cada URL:

☐ Abrir “Ver código fuente de la página”.  
☐ Buscar \<link rel="canonical".  
☐ Confirmar que existe.  
☐ Confirmar que apunta a la URL final de producción.  
☐ Confirmar que no apunta a staging.  
☐ Confirmar que no apunta a localhost.  
☐ Confirmar que no apunta a otra página no aprobada.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **D. Meta tags en producción**

En cada URL:

☐ Buscar \<title\>.  
☐ Confirmar que existe.  
☐ Confirmar que tiene texto correcto.  
☐ Buscar \<meta name="description".  
☐ Confirmar que existe.  
☐ Confirmar que tiene texto correcto.  
☐ Confirmar que no hay valores vacíos.  
☐ Confirmar que no hay placeholders.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **E. Meta robots en producción**

En cada URL:

☐ Buscar \<meta name="robots".  
☐ Confirmar que existe.  
☐ Confirmar que las páginas indexables tienen index, follow.  
☐ Confirmar que no aparece noindex accidental.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **F. Schema JSON-LD en producción**

En cada URL:

☐ Buscar application/ld+json.  
☐ Confirmar que existe.  
☐ Confirmar que incluye "@context": "https://schema.org".  
☐ Confirmar que incluye "@type".  
☐ Confirmar que el JSON no está vacío.  
☐ Confirmar que el JSON no está cortado.  
☐ Confirmar que no contiene placeholders.  
☐ Validar con Rich Results Test o Schema Markup Validator.  
☐ Confirmar que no hay errores críticos.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **G. H1 en producción**

En cada URL:

☐ Revisar el H1 visual.  
☐ Confirmar que existe.  
☐ Confirmar que solo hay un H1.  
☐ Confirmar que corresponde a la página.  
☐ Confirmar que no muestra placeholders.  
☐ Confirmar que “Filtros” u otros elementos de UI no son H1.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **H. Robots.txt en producción**

☐ Abrir https://www.seminuevos.com/robots.txt.  
☐ Confirmar que carga.  
☐ Confirmar que no devuelve 404\.  
☐ Confirmar que no contiene Disallow: / para todo el sitio.  
☐ Confirmar que no bloquea rutas SEO importantes.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **I. Sitemap en producción**

☐ Abrir el sitemap principal.  
☐ Confirmar que carga.  
☐ Confirmar que contiene URLs de producción.  
☐ Confirmar que no contiene staging.  
☐ Confirmar que no contiene localhost.  
☐ Confirmar que las URLs críticas siguen presentes.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

## **J. Links e imágenes en producción**

En cada URL:

☐ Confirmar que el menú funciona.  
☐ Confirmar que breadcrumbs funcionan.  
☐ Confirmar que cards o listados funcionan.  
☐ Confirmar que CTAs funcionan.  
☐ Confirmar que imágenes principales cargan.  
☐ Confirmar que no hay imágenes rotas.  
☐ Confirmar que no hay enlaces a staging.  
☐ Confirmar que no hay enlaces a localhost.

**Resultado:**  
☐ OK  
☐ Falla

Notas:

---

---

# **5\. Aprobación POST-DEPLOY**

El deploy se considera correcto solo si:

☐ Las URLs revisadas cargan con status 200\.  
☐ No hay errores 404, 500 o 504 en páginas críticas.  
☐ Canonicals apuntan a producción.  
☐ Titles están presentes.  
☐ Meta descriptions están presentes.  
☐ Meta robots está correcto.  
☐ No hay noindex accidental.  
☐ Hay un solo H1.  
☐ Schema JSON-LD está presente.  
☐ Schema no tiene errores críticos.  
☐ No hay placeholders.  
☐ Robots.txt no bloquea el sitio.  
☐ Sitemap carga correctamente.  
☐ Links principales funcionan.  
☐ Imágenes principales cargan.

**Resultado final post-deploy:**  
☐ Aprobado  
☐ No aprobado  
☐ Requiere rollback  
☐ Requiere hotfix

Responsable: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Fecha: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
Hora: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Notas finales:

---

---

# **6\. Qué hacer si algo falla**

## **Si falla un Pr0**

Marcar como Pr0 si ocurre cualquiera de estos casos:

☐ Página crítica devuelve 404, 500 o 504\.  
☐ Página indexable tiene noindex.  
☐ Canonical apunta a staging, localhost o URL incorrecta.  
☐ Title desapareció.  
☐ Schema obligatorio desapareció.  
☐ Contenido principal no carga.  
☐ Robots.txt bloquea todo el sitio.  
☐ Sitemap principal no carga.

**Acción:**  
☐ Detener deploy si está en pre-deploy.  
☐ Hacer rollback si ya está en producción.  
☐ Notificar a SEO y Tech Lead.  
☐ Crear ticket con URL, screenshot y descripción del error.

---

## **Si falla un Pr1**

Marcar como Pr1 si ocurre cualquiera de estos casos:

☐ Meta description ausente.  
☐ Más de un H1.  
☐ BreadcrumbList ausente.  
☐ FAQPage ausente donde aplica.  
☐ Product / Offer schema con datos incompletos.  
☐ Links internos principales rotos.  
☐ Imágenes principales sin alt.  
☐ Datos dinámicos incorrectos.

**Acción:**  
☐ No aprobar deploy sin revisión SEO.  
☐ Crear ticket.  
☐ Corregir antes de cerrar el deploy.

---

## **Si falla un Pr2**

Marcar como Pr2 si ocurre cualquiera de estos casos:

☐ Warnings no críticos de schema.  
☐ Alt text mejorable.  
☐ Title mejorable.  
☐ Meta description mejorable.  
☐ Performance menor a lo esperado, pero página funcional.

**Acción:**  
☐ Crear ticket.  
☐ Asignar a backlog.  
☐ No bloquear deploy salvo indicación SEO.

---

# **7\. Formato de reporte de error**

Cuando algo falle, reportar con este formato:

**URL afectada:**

---

**Ambiente:**  
☐ Staging  
☐ Producción

**Tipo de error:**  
☐ Status code  
☐ Canonical  
☐ Title  
☐ Meta description  
☐ Meta robots  
☐ H1  
☐ Schema  
☐ Robots.txt  
☐ Sitemap  
☐ Links  
☐ Imágenes  
☐ Otro

**Severidad:**  
☐ Pr0  
☐ Pr1  
☐ Pr2

**Qué se esperaba:**

---

**Qué ocurrió:**

---

**Screenshot adjunto:**  
☐ Sí  
☐ No

**Responsable asignado:**

---

**Fecha:**

---

# QA SEO y UX

# **SEO & UX QA Checklist Post-Deploy**

**Para revisión manual en producción**

**Objetivo:** confirmar que las páginas principales siguen funcionando correctamente después de un deploy, desde una revisión visual, SEO básica y UX.  
**Perfil del revisor:** cualquier persona del equipo con acceso al sitio y una extensión SEO básica en el navegador.  
**No requiere:** conocimientos de desarrollo, código, inspección técnica avanzada o acceso a servidores.

---

# **1\. Herramientas recomendadas**

Antes de iniciar, tener a la mano:

☐ Navegador Chrome.  
☐ Extensión SEO simple, por ejemplo: SEO Meta in 1 Click, Detailed SEO Extension o similar.  
☐ Acceso al sitio en producción.  
☐ Archivo o lista de URLs a revisar.  
☐ Google Rich Results Test, solo si se requiere validar schema.  
☐ PageSpeed Insights, solo si se requiere validar performance básica.

---

# **2\. Muestra mínima de páginas a revisar**

Revisar al menos 3 páginas después de cada deploy.

| Tipo de página | URL revisada | Status |
| :---- | :---- | :---- |
| Home | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Categoría / Hub principal | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Página de marca, modelo o detalle | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |

Si el deploy afectó templates SEO, revisar idealmente 5 páginas:

| Tipo de página | URL revisada | Status |
| :---- | :---- | :---- |
| Home | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Hub / Categoría | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Marca | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Modelo | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |
| Detalle de auto / producto | \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ | ☐ |

---

# **3\. Checklist rápido por página**

Completar este bloque para cada URL revisada.

## **A. Carga de la página**

☐ La página abre correctamente.  
☐ La página no muestra error 404\.  
☐ La página no muestra error 500, 502, 503 o 504\.  
☐ La página no se queda cargando indefinidamente.  
☐ La página no aparece en blanco.  
☐ La página carga en versión desktop.  
☐ La página carga en versión mobile.  
☐ El contenido principal aparece sin tener que recargar varias veces.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **B. Revisión visual del contenido principal**

☐ El contenido principal de la página está visible.  
☐ El contenido corresponde a la URL revisada.  
☐ No aparece contenido de otra marca, modelo, ciudad, categoría o página.  
☐ No aparecen textos de prueba.  
☐ No aparecen placeholders como {{Marca}}, {{Modelo}}, {{Año}}, undefined, null o similares.  
☐ No hay textos cortados de forma grave.  
☐ No hay bloques vacíos donde debería haber contenido.  
☐ No hay secciones duplicadas accidentalmente.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **C. Title SEO**

Usar una extensión SEO para revisar el title.

☐ La página tiene title SEO.  
☐ El title no está vacío.  
☐ El title describe correctamente la página.  
☐ El title coincide con el tipo de página revisada.  
☐ El title no contiene placeholders.  
☐ El title no está duplicado visualmente con otra página revisada, salvo que aplique por estrategia.

**Ejemplos esperados:**  
Home: Autos seminuevos como nuevos en México | Seminuevos.com  
Hub: Autos usados en México, más de 19 mil carros a elegir  
Marca: Autos Chevrolet seminuevos en venta \- Mes Año  
Modelo: Autos Chevrolet Aveo seminuevos en venta \- Mes Año

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **D. Meta description**

Usar una extensión SEO para revisar la meta description.

☐ La página tiene meta description.  
☐ La meta description no está vacía.  
☐ La meta description describe correctamente la página.  
☐ La meta description no contiene placeholders.  
☐ La meta description no parece genérica para todas las páginas.  
☐ La meta description no está cortada por error de carga.  
☐ La meta description no menciona una marca, modelo o categoría incorrecta.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **E. H1 visible**

Revisar visualmente y con la extensión SEO.

☐ La página tiene un H1 principal.  
☐ Solo existe un H1 en la página.  
☐ El H1 coincide con la intención de la página.  
☐ El H1 no contiene placeholders.  
☐ El H1 no dice algo genérico si la página es específica.  
☐ Elementos como “Filtros”, “Ordenar”, “Menú” o “Resultados” no aparecen como H1.

**Ejemplos esperados:**  
Home: Encuentra tu próximo auto seminuevo  
Hub: Venta de autos usados en México  
Marca: Autos Chevrolet  
Modelo: Autos Chevrolet Aveo  
Marca \+ Año: Autos Chevrolet 2010

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **F. Canonical**

Usar una extensión SEO que muestre canonical.

☐ La página tiene canonical.  
☐ El canonical apunta a una URL de producción.  
☐ El canonical no apunta a una URL de pruebas.  
☐ El canonical no apunta a una página incorrecta.  
☐ El canonical no está vacío.  
☐ El canonical coincide con la página revisada o con la URL aprobada por SEO.

**No debe contener:**  
☐ staging  
☐ localhost  
☐ URL vacía  
☐ URL de otra marca/modelo/categoría  
☐ placeholders

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **G. Indexabilidad básica**

Usar una extensión SEO.

☐ La página aparece como indexable.  
☐ No aparece marcada como noindex.  
☐ No aparece marcada como bloqueada.  
☐ No aparece una advertencia grave de robots.  
☐ La página no muestra mensaje de acceso restringido.  
☐ La página no requiere login para ver el contenido principal.

**Bloquear reporte como falla crítica si aparece:**  
noindex en una página que debe posicionar.  
Página bloqueada.  
Página sin contenido.  
Página con acceso restringido.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **H. Schema / datos estructurados**

Usar una extensión SEO o Google Rich Results Test.

☐ La página tiene schema si el tipo de página lo requiere.  
☐ El schema no aparece vacío.  
☐ No hay errores críticos en Rich Results Test.  
☐ El schema corresponde al tipo de página.  
☐ El schema no contiene datos de otra página.  
☐ El schema no contiene placeholders.

**Schema esperado por tipo de página:**

Home:  
☐ WebPage  
☐ Organization / AutomotiveBusiness  
☐ Itemlist (product snippets / merchant listings)  
☐ SiteNavigationElement  
☐ FAQPage si aplica  
Hub / Categoría:  
☐ WebPage  
☐ Organization  
☐ Itemlist (product snippets / merchant listings)  
☐ SiteNavigationElement  
☐ FAQPage si aplica

Marca:  
☐ WebPage  
☐ Brand  
☐ BreadcrumbList  
☐  Itemlist (product snippets / merchant listings)  
☐ FAQPage si aplica

Modelo:  
☐ WebPage  
☐ BreadcrumbList  
☐  Itemlist (product snippets / merchant listings)  
☐ Brand  
☐ Model  
☐ AggregateOffer si aplica  
☐ FAQPage si aplica

Detalle de auto:  
☐ Car o Product  
☐ Offer  
☐ Price  
☐ PriceCurrency  
☐ Availability  
☐ Brand  
☐ Model  
☐ VehicleModelDate  
☐ Mileage / kilometraje si aplica  
☐ Image

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **I. Breadcrumbs**

Revisar visualmente la ruta de navegación.

☐ La página muestra breadcrumbs si aplica.  
☐ Los breadcrumbs siguen una jerarquía lógica.  
☐ Los breadcrumbs tienen links funcionales.  
☐ Los breadcrumbs no apuntan a páginas incorrectas.  
☐ Los breadcrumbs no tienen placeholders.  
☐ La marca/modelo/categoría del breadcrumb coincide con la página.

**Ejemplo esperado en modelo:**  
Inicio \> Autos usados \> Chevrolet \> Aveo

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **J. Menú y navegación principal**

☐ El menú principal carga correctamente.  
☐ Los links principales funcionan.  
☐ El logo lleva a la home.  
☐ Las categorías principales abren correctamente.  
☐ No hay links rotos visibles.  
☐ No hay botones que no respondan.  
☐ No hay links que lleven a páginas de prueba.  
☐ La navegación funciona en mobile.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **K. Cards, listados o resultados**

Aplicar en páginas de categoría, marca, modelo, precio o búsqueda.

☐ Los listados cargan correctamente.  
☐ Las cards muestran imagen.  
☐ Las cards muestran título o nombre del vehículo/producto.  
☐ Las cards muestran precio si aplica.  
☐ Las cards muestran ubicación o datos relevantes si aplica.  
☐ Al hacer clic en una card, abre una página válida.  
☐ Los resultados corresponden al filtro o página revisada.  
☐ No aparecen cards vacías.  
☐ No aparecen datos como undefined, null o NaN.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **L. Filtros y ordenamiento**

Aplicar en páginas con filtros.

☐ Los filtros se muestran correctamente.  
☐ Los filtros se pueden abrir y cerrar.  
☐ Los filtros seleccionados se aplican correctamente.  
☐ El ordenamiento funciona si existe.  
☐ La página no se rompe al aplicar filtros.  
☐ La URL no se vuelve extraña o ilegible después de filtrar.  
☐ No aparecen resultados incompatibles con el filtro seleccionado.  
☐ No hay loaders infinitos.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **M. Imágenes**

☐ Las imágenes principales cargan.  
☐ El logo carga correctamente.  
☐ Las imágenes de cards cargan.  
☐ No aparecen imágenes rotas.  
☐ No aparecen espacios vacíos donde debería haber imagen.  
☐ Las imágenes no se ven deformadas.  
☐ Las imágenes no se ven demasiado pesadas o lentas en cargar.  
☐ Las imágenes importantes tienen alt text según la extensión SEO, si la herramienta lo permite revisar.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **N. Enlaces internos**

☐ Los enlaces principales funcionan.  
☐ Los CTAs funcionan.  
☐ Los breadcrumbs funcionan.  
☐ Los links de cards funcionan.  
☐ Los links del footer funcionan.  
☐ No hay links visibles que lleven a error 404\.  
☐ No hay links visibles que lleven a páginas de prueba.  
☐ No hay links visibles con textos raros o placeholders.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **O. CTAs y formularios**

☐ Los botones principales son visibles.  
☐ Los CTAs tienen texto claro.  
☐ Los CTAs llevan a la acción esperada.  
☐ Los formularios cargan.  
☐ Los campos del formulario son visibles.  
☐ El formulario permite escribir.  
☐ Los mensajes de error del formulario se entienden.  
☐ El botón de envío funciona o muestra confirmación esperada.  
☐ Los botones de llamada, WhatsApp o contacto funcionan si aplican.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **P. UX mobile**

Revisar desde celular o modo responsive del navegador.

☐ La página carga en mobile.  
☐ El menú mobile abre y cierra correctamente.  
☐ El contenido se lee sin hacer zoom.  
☐ Los botones son fáciles de tocar.  
☐ Las cards se ven correctamente.  
☐ Los filtros funcionan en mobile.  
☐ No hay elementos encimados.  
☐ No hay texto cortado de forma grave.  
☐ No hay popups que bloqueen el contenido principal.  
☐ El usuario puede navegar hasta una página de detalle sin problema.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **Q. UX desktop**

☐ La página se ve correctamente en desktop.  
☐ El layout no está roto.  
☐ No hay espacios vacíos grandes sin intención.  
☐ No hay elementos encimados.  
☐ El menú funciona.  
☐ Los filtros funcionan.  
☐ Las cards se ven ordenadas.  
☐ Los CTAs son visibles.  
☐ El footer carga correctamente.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

## **R. Velocidad percibida**

Revisión visual simple.

☐ La página carga en tiempo razonable.  
☐ El contenido principal aparece rápido.  
☐ Las imágenes no tardan demasiado en aparecer.  
☐ No hay saltos visuales fuertes mientras carga.  
☐ No hay loaders infinitos.  
☐ No hay bloqueo por scripts, popups o banners.

Opcional: revisar PageSpeed Insights.

☐ Mobile revisado.  
☐ Desktop revisado.  
☐ No hay caída fuerte frente al benchmark previo.

**Resultado:**  
☐ OK  
☐ Falla

**Notas:**

---

---

# **4\. Checklist específico por tipo de página**

## **Home**

☐ La home carga correctamente.  
☐ El H1 principal es correcto.  
☐ El title habla de autos seminuevos/usados en México.  
☐ La meta description describe el portal.  
☐ El canonical apunta a la home.  
☐ El logo carga.  
☐ El menú principal funciona.  
☐ Los enlaces principales a inventario funcionan.  
☐ Las secciones principales cargan.  
☐ El schema esperado está presente si se valida con herramienta.  
☐ No hay placeholders.  
☐ No hay errores visuales graves.

**Resultado Home:**  
☐ OK  
☐ Falla

Notas:

---

---

## **Hub / Categoría**

☐ La página carga correctamente.  
☐ El H1 corresponde a la categoría.  
☐ El title corresponde a la categoría.  
☐ La meta description corresponde a la categoría.  
☐ El canonical apunta a la URL de la categoría.  
☐ Los listados cargan.  
☐ Los filtros funcionan.  
☐ Los links de cards funcionan.  
☐ Los breadcrumbs funcionan si aplica.  
☐ No hay más de un H1.  
☐ No hay placeholders.  
☐ No hay resultados incompatibles con la categoría.

**Resultado Hub / Categoría:**  
☐ OK  
☐ Falla

Notas:

---

---

## **Marca**

☐ La página carga correctamente.  
☐ La marca correcta aparece en el H1.  
☐ La marca correcta aparece en el title.  
☐ La marca correcta aparece en la meta description.  
☐ El canonical apunta a la URL de la marca.  
☐ Los listados corresponden a esa marca.  
☐ Los filtros funcionan.  
☐ Los breadcrumbs muestran la marca correcta.  
☐ El schema de Brand está presente si se valida.  
☐ No hay placeholders.  
☐ No aparece contenido de otra marca.  
☐ No hay más de un H1.

**Resultado Marca:**  
☐ OK  
☐ Falla

Notas:

---

---

## **Modelo**

☐ La página carga correctamente.  
☐ La marca y modelo correctos aparecen en el H1.  
☐ La marca y modelo correctos aparecen en el title.  
☐ La marca y modelo correctos aparecen en la meta description.  
☐ El canonical apunta a la URL del modelo.  
☐ Los listados corresponden a ese modelo.  
☐ Los breadcrumbs muestran Inicio \> Categoría \> Marca \> Modelo.  
☐ Las cards tienen datos completos.  
☐ El schema de Product / Model está presente si se valida.  
☐ No hay placeholders.  
☐ No aparece contenido de otro modelo.  
☐ No hay más de un H1.

**Resultado Modelo:**  
☐ OK  
☐ Falla

Notas:

---

---

## **Marca \+ Año**

☐ La página carga correctamente.  
☐ La marca y año correctos aparecen en el H1.  
☐ La marca y año correctos aparecen en el title.  
☐ La marca y año correctos aparecen en la meta description.  
☐ El canonical apunta a la URL correcta.  
☐ Los listados corresponden a esa marca y año.  
☐ No aparecen vehículos de años incorrectos.  
☐ No aparecen vehículos de otra marca.  
☐ Los breadcrumbs funcionan.  
☐ No hay placeholders.  
☐ No hay más de un H1.

**Resultado Marca \+ Año:**  
☐ OK  
☐ Falla

Notas:

---

---

## **Detalle de vehículo**

☐ La ficha carga correctamente.  
☐ El título/H1 muestra el vehículo correcto.  
☐ El title SEO corresponde al vehículo.  
☐ La meta description corresponde al vehículo.  
☐ El canonical apunta a la ficha correcta.  
☐ Las imágenes del vehículo cargan.  
☐ El precio aparece.  
☐ La marca aparece.  
☐ El modelo aparece.  
☐ El año aparece.  
☐ El kilometraje aparece si aplica.  
☐ La ubicación aparece si aplica.  
☐ Los botones de contacto funcionan.  
☐ WhatsApp, teléfono o formulario funcionan si aplican.  
☐ No hay datos vacíos.  
☐ No hay placeholders.  
☐ No hay información contradictoria entre título, ficha y schema si se valida.

**Resultado Detalle:**  
☐ OK  
☐ Falla

Notas:

---

---

# **5\. Criterios de severidad**

## **Falla crítica**

Marcar como falla crítica si ocurre cualquiera de estos casos:

☐ La página no carga.  
☐ La página muestra 404, 500 o 504\.  
☐ La página aparece en blanco.  
☐ El contenido principal no aparece.  
☐ La página tiene noindex cuando debería posicionar.  
☐ El canonical apunta a una URL incorrecta.  
☐ El title desapareció.  
☐ El H1 desapareció.  
☐ Hay placeholders visibles.  
☐ Los listados no cargan.  
☐ Los botones principales de contacto no funcionan en páginas de detalle.  
☐ Mobile está roto.

**Acción:**  
☐ Reportar inmediatamente.  
☐ No aprobar el QA.  
☐ Escalar a SEO \+ Producto \+ Tecnología.

---

## **Falla media**

Marcar como falla media si ocurre cualquiera de estos casos:

☐ Meta description ausente.  
☐ Más de un H1.  
☐ Breadcrumbs rotos.  
☐ Imágenes principales rotas.  
☐ Algunos links internos rotos.  
☐ Filtros no funcionan correctamente.  
☐ Schema tiene errores críticos si fue validado.  
☐ Cards con información incompleta.  
☐ UX mobile con problemas, pero la página aún se puede usar.

**Acción:**  
☐ Reportar en ticket.  
☐ Requiere corrección prioritaria.  
☐ SEO debe validar si bloquea o no el release.

---

## **Falla baja**

Marcar como falla baja si ocurre cualquiera de estos casos:

☐ Textos mejorables.  
☐ Title demasiado largo o corto.  
☐ Meta description mejorable.  
☐ Alt text faltante en imágenes secundarias.  
☐ Warnings menores de schema.  
☐ Performance visual algo lenta, pero funcional.  
☐ Pequeños detalles visuales que no bloquean uso ni SEO crítico.

**Acción:**  
☐ Documentar.  
☐ Pasar a backlog.  
☐ No bloquea release salvo indicación SEO.

---

# **6\. Formato de reporte de error**

Usar este formato para reportar cualquier falla.

**URL afectada:**

---

**Tipo de página:**  
☐ Home  
☐ Hub / Categoría  
☐ Marca  
☐ Modelo  
☐ Marca \+ Año  
☐ Detalle  
☐ Otra: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Tipo de falla:**  
☐ Página no carga  
☐ Error 404 / 500 / 504  
☐ Title  
☐ Meta description  
☐ Canonical  
☐ Indexabilidad  
☐ H1  
☐ Schema  
☐ Breadcrumbs  
☐ Menú  
☐ Links  
☐ Imágenes  
☐ Cards / listados  
☐ Filtros  
☐ CTA / formulario  
☐ Mobile  
☐ Desktop  
☐ Contenido incorrecto  
☐ Placeholder visible  
☐ Otro: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**Severidad:**  
☐ Crítica  
☐ Media  
☐ Baja

**Qué se esperaba ver:**

---

**Qué se ve actualmente:**

---

**Captura adjunta:**  
☐ Sí  
☐ No

**Dispositivo usado:**  
☐ Desktop  
☐ Mobile

**Navegador:**

---

**Fecha y hora:**

---

**Revisor:**

---

---

# **7\. Aprobación final del QA**

El QA post-deploy se aprueba solo si:

☐ Las páginas revisadas cargan correctamente.  
☐ No hay errores 404, 500 o 504\.  
☐ El contenido principal aparece.  
☐ El title está presente.  
☐ La meta description está presente.  
☐ El canonical es correcto.  
☐ La página aparece como indexable cuando debe ser indexable.  
☐ Hay un solo H1.  
☐ No hay placeholders visibles.  
☐ Los listados funcionan.  
☐ Los links principales funcionan.  
☐ Los CTAs principales funcionan.  
☐ Las imágenes principales cargan.  
☐ La navegación funciona en mobile.  
☐ La navegación funciona en desktop.  
☐ No hay fallas críticas abiertas.

**Resultado final:**  
☐ Aprobado  
☐ No aprobado  
☐ Aprobado con observaciones menores

**Revisor:**

---

**Fecha:**

---

**Notas finales:**

---


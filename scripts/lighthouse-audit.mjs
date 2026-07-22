#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

/**
 * Auditoría de performance vía Lighthouse — SEO-117/118/126/127.
 *
 * No forma parte del suite de Playwright: Lighthouse no es determinístico
 * corrida a corrida (varía con la red/carga del momento), así que no sirve
 * como gate automático confiable en CI. Se corre a mano antes de dar el OK
 * de un ticket de performance para pasar a producción.
 *
 * Uso:
 *   node scripts/lighthouse-audit.mjs                  # COUNTRY=MX (default), demo, home ("/")
 *   COUNTRY=EC node scripts/lighthouse-audit.mjs
 *   COUNTRY=EC TARGET=production node scripts/lighthouse-audit.mjs
 *   COUNTRY=EC PATH_TO_AUDIT=/usados/-/autos node scripts/lighthouse-audit.mjs
 *
 * Requiere DEMO_BASE_URL_MX / DEMO_BASE_URL_EC en .env (igual que el suite
 * de Playwright) y Chrome/Chromium instalado localmente. TARGET=production
 * usa los dominios públicos directamente, sin necesidad de .env.
 */

const VALID_COUNTRIES = ['MX', 'EC'];
const country = (process.env.COUNTRY ?? 'MX').toUpperCase();
if (!VALID_COUNTRIES.includes(country)) {
  throw new Error(`COUNTRY inválido: "${country}". Valores permitidos: ${VALID_COUNTRIES.join(', ')}`);
}

const target = (process.env.TARGET ?? 'demo').toLowerCase();
if (!['demo', 'production'].includes(target)) {
  throw new Error(`TARGET inválido: "${target}". Valores permitidos: demo, production`);
}

const productionBaseURLByCountry = {
  MX: 'https://www.seminuevos.com',
  EC: 'https://ecuador.patiotuerca.com',
};

const demoBaseURLByCountry = {
  MX: process.env.DEMO_BASE_URL_MX ?? '',
  EC: process.env.DEMO_BASE_URL_EC ?? '',
};

const baseURL = target === 'production' ? productionBaseURLByCountry[country] : demoBaseURLByCountry[country];
if (!baseURL) {
  throw new Error(`No hay DEMO_BASE_URL_${country} configurada en .env`);
}

const pathToAudit = process.env.PATH_TO_AUDIT ?? '/';
const url = `${baseURL}${pathToAudit}`;

// Cada auditoría de Lighthouse corresponde 1:1 al hallazgo de un ticket.
// IDs verificados contra lighthouse@13 — Lighthouse renombra auditorías entre
// versiones mayores (ej. "render-blocking-resources" -> "render-blocking-insight"),
// así que si al actualizar `lighthouse` un ticket empieza a mostrar
// "auditoría no encontrada", revisa el JSON de `lighthouse-reports/` para
// encontrar el nuevo id (buscar por palabra clave en `audits`).
const AUDITS = [
  { id: 'server-response-time', ticket: 'SEO-126', label: 'Tiempo de respuesta del servidor (TTFB)' },
  { id: 'bootup-time', ticket: 'SEO-118', label: 'Tiempo de ejecución de JavaScript' },
  { id: 'mainthread-work-breakdown', ticket: 'SEO-117', label: 'Trabajo del hilo principal' },
  { id: 'render-blocking-insight', ticket: 'SEO-127', label: 'Recursos que bloquean el renderizado' },
];

function formatAuditValue(audit) {
  if (!audit) return '(auditoría no encontrada en este reporte)';
  if (audit.displayValue) return audit.displayValue;
  if (typeof audit.numericValue === 'number') {
    return `${Math.round(audit.numericValue)} ${audit.numericUnit ?? ''}`.trim();
  }
  return audit.score === 1 ? 'OK' : 'Sin datos';
}

function formatSavings(audit) {
  const ms = audit?.details?.overallSavingsMs;
  return typeof ms === 'number' && ms > 0 ? `~${Math.round(ms)} ms de ahorro potencial` : '';
}

async function main() {
  console.log(`Corriendo Lighthouse (mobile) contra: ${url}\n`);

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      onlyCategories: ['performance'],
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 375, height: 667, deviceScaleFactor: 2, disabled: false },
    });

    const { lhr } = result;
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const outDir = path.join(scriptDir, '..', 'lighthouse-reports');
    fs.mkdirSync(outDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(outDir, `lighthouse-${country}-${target}-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(lhr, null, 2));

    const score = Math.round((lhr.categories.performance.score ?? 0) * 100);
    console.log(`Performance score: ${score}/100\n`);

    console.table(
      AUDITS.map(({ id, ticket, label }) => {
        const audit = lhr.audits[id];
        return {
          Ticket: ticket,
          Métrica: label,
          Valor: formatAuditValue(audit),
          Detalle: formatSavings(audit),
        };
      }),
    );

    console.log(`\nReporte completo (JSON) guardado en: ${reportPath}`);
    console.log('Para verlo en detalle: https://googlechrome.github.io/lighthouse/viewer/ (arrastra el JSON ahí).');
  } finally {
    await chrome.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

/* ============================================================
   SOSER · Ficha de Evaluación de Establecimiento
   Motor de cuestionario (1 pregunta = 1 pantalla)
   Backend integrado: no requiere configuración del usuario.
   ============================================================ */

const EXEC = 'https://script.google.com/macros/s/AKfycbykNWqnSYvD-u20PBBxEpt6vrNS7oAEiW-Eesm-T1v2IypNzH-Yi1eifPvJtfG4ZtcI/exec';

const COL = { RBD: 0, NOM: 1, DIR: 2, COM: 3, SUP: 4, INST: 5, TEC: 6 };
const LS_DRAFT = 'soser_ficha_draft';
const LS_NAME = 'soser_ficha_evaluador';
const FOTO_MAX_LADO = 1920;

const LOGO_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F49A0F"/><stop offset="0.5" stop-color="#E8A30C"/><stop offset="1" stop-color="#7DB61C"/></linearGradient></defs><path d="M50 12 C30 12 20 30 28 48 C34 62 50 64 50 64 C50 64 66 62 72 48 C80 30 70 12 50 12 Z" fill="url(#sg)"/><path d="M50 20 C44 30 56 40 50 52 C46 44 54 34 50 20 Z" fill="#2E7D32" opacity="0.85"/></svg>`;

/* ---------------- Opciones reutilizables ---------------- */
const SI_NO = ['SI', 'NO'];
const BUE_MAL = ['BUENO', 'MALO'];
const CAMPANA = ['SI', 'NO', 'Extractor (SI)', 'Extractor (NO)'];

/* La plantilla guarda campana y extractor en UNA sola celda, con la lista
   SI / NO / Extractor (SI) / Extractor (NO). En la app se preguntan por
   separado y aquí se combinan respetando ese mismo vocabulario. */
function pairTexto(v) {
  if (!v) return '';
  const c = v.campana, e = v.extractor;
  if (!c && !e) return '';
  if (!e) return c;
  if (!c) return 'Extractor (' + e + ')';
  return c + ' / Extractor (' + e + ')';
}
function respondida(q) {
  const v = S.resp[q.n];
  if (q.tipo === 'pair') return !!(v && q.pares.every(p => v[p.key]));
  if (q.tipo === 'multi') return Array.isArray(v) && v.length > 0;
  return v !== undefined && String(v).trim() !== '';
}

/* ============================================================
   DEFINICIÓN DE LAS 51 PREGUNTAS
   n     = número de pregunta (= número de columna en el Sheet)
   col   = título EXACTO de la columna en la plantilla Excel
   g     = bloque (fila 1 del Sheet)
   t     = texto de la pregunta tal como la ve la manipuladora
   tipo  = single | multi | text | num | auto
   ops   = opciones
   if    = condición para mostrarse
   foto  = { when, req, multi, key, hint }   -> va a columna adicional
   sub   = subpregunta que cae en columna adicional
   ============================================================ */
const Q = [
  { n: 1, col: 'RBD', g: 'Registro de antecedentes', tipo: 'auto' },
  { n: 2, col: 'Nombre del establecimiento', g: 'Registro de antecedentes', tipo: 'auto' },
  { n: 3, col: 'Dirección', g: 'Registro de antecedentes', tipo: 'auto' },
  { n: 4, col: 'Comuna', g: 'Registro de antecedentes', tipo: 'auto' },

  { n: 5, col: 'Programa', g: 'Registro de antecedentes', t: '¿Qué programa se atiende en este establecimiento?', tipo: 'single', ops: ['PAE', 'PAP'] },
  { n: 6, col: 'Organismo asociado', g: 'Registro de antecedentes', t: '¿A qué organismo pertenece?', tipo: 'single', ops: ['JUNAEB', 'JUNJI', 'INTEGRA'] },
  { n: 7, col: 'Dependencia', g: 'Registro de antecedentes', t: '¿De quién depende el establecimiento?', tipo: 'single', ops: ['Municipal', 'Servicio Local de Educación Pública (SLEP)', 'Particular subvencionado', 'Administración delegada', 'JUNJI (Jardín infantil)', 'Fundación Integra (Jardín infantil)', 'Otro'] },
  { n: 8, col: 'Nombre Sostenedor (Municipalidad , Slep etc.)', g: 'Registro de antecedentes', t: '¿Cuál es el nombre del sostenedor?', tipo: 'text', ph: 'Ej: Municipalidad de Santiago' },
  { n: 9, col: 'Número de raciones diarias', g: 'Registro de antecedentes', t: '¿Cuántas raciones diarias certificadas tiene?', tipo: 'num', ph: 'Ej: 320' },
  {
    n: 10, col: 'Cuenta con Resolución Sanitaria de Cocina', g: 'Registro de antecedentes',
    t: '¿La cocina cuenta con Resolución Sanitaria?', tipo: 'single', ops: SI_NO,
    foto: { when: 'SI', req: true, multi: true, key: 'p10', hint: 'Saca foto de la resolución. Debe terminar de subir para poder continuar.' }
  },
  { n: 11, col: 'Número de Resolución Sanitaria de Cocina', g: 'Registro de antecedentes', t: '¿Cuál es el número de la Resolución Sanitaria de cocina?', tipo: 'text', ph: 'Ej: 12345-B / 2019', if: q => ans(10) === 'SI' },

  { n: 12, col: 'Agua potable', g: 'Servicios Básicos Establecimiento', t: '¿El establecimiento cuenta con agua potable?', tipo: 'single', ops: SI_NO },
  { n: 13, col: 'Origen del agua', g: 'Servicios Básicos Establecimiento', t: '¿De dónde proviene el agua?', tipo: 'single', ops: ['Red Pública', 'APR', 'Pozo / Noria', 'Aljibe', 'Otro'] },
  { n: 14, col: 'Alcantarillado', g: 'Servicios Básicos Establecimiento', t: '¿Cómo se eliminan las aguas servidas?', tipo: 'multi', ops: ['Red Pública', 'Pozo Negro', 'Fosa Séptica', 'Otro'], hint: 'Puedes marcar más de una y desmarcar tocando de nuevo.' },

  { n: 15, col: 'Existencia de cocina', g: 'Evaluación Cocina', t: '¿Existe cocina en el establecimiento?', tipo: 'single', ops: SI_NO, hint: 'Si marcas NO, se omiten todas las preguntas de cocina.' },
  { n: 16, col: 'Dimensiones de la cocina (m2)', g: 'Evaluación Cocina', t: '¿Cuánto mide la cocina en m²?', tipo: 'text', ph: 'Ej: 24 m2  ·  o 6 x 4', if: cocina },

  {
    n: 17, col: 'Campana  Cubre Fogones', g: 'Campanas Cocina', t: 'Fogones: ¿tienen campana y/o extractor?', tipo: 'pair', if: cocina,
    pares: [{ key: 'campana', ic: '🏠', label: '¿Hay campana que cubra los fogones?' }, { key: 'extractor', ic: '🌀', label: '¿Hay extractor?' }],
    foto: { req: false, multi: true, key: 'p17', hint: 'Foto de evidencia de los fogones (opcional pero recomendada).' }
  },
  {
    n: 18, col: 'Campana  Cubre Hornos', g: 'Campanas Cocina', t: 'Hornos: ¿tienen campana y/o extractor?', tipo: 'pair', if: cocina,
    pares: [{ key: 'campana', ic: '🏠', label: '¿Hay campana que cubra los hornos?' }, { key: 'extractor', ic: '🌀', label: '¿Hay extractor?' }],
    foto: { req: false, multi: true, key: 'p18', hint: 'Foto de evidencia de los hornos (opcional pero recomendada).' }
  },
  {
    n: 19, col: 'Campana  Cubre Baño María', g: 'Campanas Cocina', t: 'Baño maría: ¿tiene campana y/o extractor?', tipo: 'pair', if: cocina,
    pares: [{ key: 'campana', ic: '🏠', label: '¿Hay campana que cubra el baño maría?' }, { key: 'extractor', ic: '🌀', label: '¿Hay extractor?' }],
    foto: { req: false, multi: true, key: 'p19', hint: 'Foto de evidencia del baño maría (opcional pero recomendada).' }
  },

  {
    n: 20, col: 'Iluminación Adecuada', g: 'Iluminación Cocina', t: '¿La cocina tiene iluminación adecuada para trabajar?', tipo: 'single', ops: SI_NO, if: cocina,
    sub: { key: 'p20q', label: '¿Hay focos quemados dentro de la cocina?', tipo: 'single', ops: SI_NO },
    foto: { whenSub: 'SI', req: false, multi: true, key: 'p20f', hint: 'Si hay focos quemados, adjunta foto de cada uno.' }
  },
  {
    n: 21, col: 'Lámparas con protección', g: 'Iluminación Cocina', t: '¿Las lámparas de la cocina tienen protección estanca?', tipo: 'single', ops: SI_NO, if: cocina,
    foto: { when: 'NO', req: true, multi: true, key: 'p21', hint: 'Adjunta una foto por cada lámpara SIN protección estanca. Puedes agregar todas las que necesites.' }
  },

  { n: 22, col: 'Piso Cocina', g: 'Piso Cocina', t: '¿El piso de la cocina es cerámico o lavable?', tipo: 'single', ops: SI_NO, if: cocina },
  { n: 23, col: 'Declive con evacuación de Agua', g: 'Piso Cocina', t: '¿El piso tiene declive hacia la evacuación de agua?', tipo: 'single', ops: SI_NO, if: cocina },
  { n: 24, col: 'Desagüe', g: 'Piso Cocina', t: '¿La cocina tiene desagüe o rejilla en el piso?', tipo: 'single', ops: SI_NO, if: cocina },
  {
    n: 25, col: 'Estado Piso Cocina', g: 'Piso Cocina', t: '¿En qué estado está el piso de la cocina?', tipo: 'single', ops: BUE_MAL, if: cocina,
    foto: { when: 'MALO', req: true, multi: true, key: 'p25', hint: 'Adjunta foto del daño. Puedes subir una o varias.' }
  },
  {
    n: 26, col: 'Lavamanos Manipuladoras', g: 'Piso Cocina', t: '¿Hay lavamanos dentro de la cocina?', tipo: 'single', ops: SI_NO, if: cocina,
    foto: { when: 'SI', req: true, multi: true, key: 'p26', hint: 'Saca una foto al lavamanos de la cocina.' }
  },

  {
    n: 27, col: 'Cerámico', colAlias: 'Paredes · Cerámico', g: 'Paredes', t: '¿Las paredes de la cocina son cerámicas?', tipo: 'single', ops: SI_NO, if: cocina,
    foto: { when: 'NO', req: true, multi: true, key: 'p27', hint: 'Adjunta foto que evidencie el material de la pared.' },
    sub: { key: 'p27d', label: 'Describe de qué material es la pared', tipo: 'text', when: 'NO', ph: 'Ej: muro de albañilería pintado, sin cerámico hasta 1,8 m', req: true }
  },
  { n: 28, col: 'Estado', colAlias: 'Paredes · Estado', g: 'Paredes', t: '¿En qué estado están las paredes de la cocina?', tipo: 'single', ops: BUE_MAL, if: cocina },
  {
    n: 29, col: 'Programa de Protección de Plagas', g: 'Paredes', t: '¿La cocina tiene programa de control de plagas?', tipo: 'single', ops: SI_NO, if: cocina,
    foto: { req: false, multi: true, key: 'p29', hint: 'Si está a la vista, adjunta foto del calendario o certificado de la última visita.' }
  },

  { n: 30, col: 'Existencia de Bodega', g: 'Evaluación de Bodega', t: '¿Existe bodega de alimentos?', tipo: 'single', ops: SI_NO, hint: 'Si marcas NO, se omiten las preguntas de bodega.' },
  { n: 31, col: 'Dimensiones de la bodega (m2)', g: 'Evaluación de Bodega', t: '¿Cuánto mide la bodega en m²?', tipo: 'text', ph: 'Ej: 9 m2  ·  o 3 x 3', if: bodega },
  { n: 32, col: 'Iluminación Adecuada', colAlias: 'Bodega · Iluminación Adecuada', g: 'Iluminación Bodega', t: '¿La bodega tiene iluminación adecuada?', tipo: 'single', ops: SI_NO, if: bodega },
  {
    n: 33, col: 'Lámparas con Protección', g: 'Iluminación Bodega', t: '¿Las lámparas de la bodega tienen protección?', tipo: 'single', ops: SI_NO, if: bodega,
    foto: { when: 'NO', req: false, multi: true, key: 'p33', hint: 'Puedes adjuntar fotos de las lámparas sin protección.' }
  },
  { n: 34, col: 'Cerámico', colAlias: 'Bodega · Piso Cerámico', g: 'Piso Bodega', t: '¿El piso de la bodega es cerámico?', tipo: 'single', ops: SI_NO, if: bodega },
  { n: 35, col: 'Estado Piso Bodega', g: 'Piso Bodega', t: '¿En qué estado está el piso de la bodega?', tipo: 'single', ops: BUE_MAL, if: bodega },

  { n: 36, col: 'Existencia de Baño', g: 'Baño para manipuladoras', t: '¿Existe baño para las manipuladoras?', tipo: 'single', ops: SI_NO, hint: 'Si marcas NO, se omiten las preguntas del baño.' },
  { n: 37, col: 'Uso exclusivo Baño', g: 'Baño para manipuladoras', t: '¿El baño es de uso exclusivo de las manipuladoras?', tipo: 'single', ops: SI_NO, if: bano },
  { n: 38, col: 'Lavamanos', colAlias: 'Baño · Lavamanos', g: 'Baño para manipuladoras', t: '¿El baño tiene lavamanos?', tipo: 'single', ops: SI_NO, if: bano },
  { n: 39, col: 'Excusado', g: 'Baño para manipuladoras', t: '¿El baño tiene excusado en buen estado?', tipo: 'single', ops: SI_NO, if: bano },
  { n: 40, col: 'Ducha', g: 'Baño para manipuladoras', t: '¿El baño tiene ducha?', tipo: 'single', ops: SI_NO, if: bano },
  { n: 41, col: 'Agua caliente', g: 'Baño para manipuladoras', t: '¿El baño tiene agua caliente?', tipo: 'single', ops: SI_NO, if: bano },

  { n: 42, col: 'Existencia Sala de Vestuario', g: 'Sala de Vestuario', t: '¿Existe sala de vestuario?', tipo: 'single', ops: SI_NO, hint: 'Si marcas NO, se omiten las preguntas de vestuario.' },
  { n: 43, col: 'Uso exclusivo Sala de Vestuario', g: 'Sala de Vestuario', t: '¿La sala de vestuario es de uso exclusivo?', tipo: 'single', ops: SI_NO, if: vest },
  { n: 44, col: 'Espacio Locker', g: 'Sala de Vestuario', t: '¿Hay lockers o casilleros para el personal?', tipo: 'single', ops: SI_NO, if: vest },

  { n: 45, col: 'Caseta de Gas', g: 'Patio de Servicio', t: '¿Existe caseta de gas?', tipo: 'single', ops: SI_NO, hint: 'Si marcas NO, se omiten estado y certificación SEC.' },
  {
    n: 46, col: 'Estado Caseta de Gas', g: 'Patio de Servicio', t: '¿En qué estado está la caseta de gas?', tipo: 'single', ops: BUE_MAL, if: gas,
    foto: { when: 'MALO', req: true, multi: true, key: 'p46', hint: 'Adjunta foto que evidencie el mal estado de la caseta.' }
  },
  {
    n: 47, col: 'Certificación SEC', g: 'Patio de Servicio', t: '¿La instalación de gas tiene certificación SEC?', tipo: 'single', ops: SI_NO, if: gas,
    foto: { when: 'SI', req: true, multi: true, key: 'p47', hint: 'Saca foto al sello o certificado SEC.' }
  },
  { n: 48, col: 'Lugar para Disposición Basura', g: 'Patio de Servicio', t: '¿Hay un lugar definido para la disposición de basura?', tipo: 'single', ops: SI_NO },
  { n: 49, col: 'Superficie piso patio servicio', g: 'Patio de Servicio', t: '¿De qué material es el piso del patio de servicio?', tipo: 'multi', ops: ['Pavimento', 'Cerámica', 'Tierra', 'Otro'], hint: 'Puedes marcar más de una si el patio tiene distintas superficies.' },

  { n: 50, col: 'Fuentes de contaminación cercanas', g: 'Entorno', t: '¿Hay fuentes de contaminación cerca del establecimiento?', tipo: 'multi', ops: ['Ninguna', 'Basural o microbasural', 'Canal o acequia', 'Aguas servidas', 'Criadero de animales', 'Camino de tierra / polvo', 'Industria', 'Otro'], hint: 'Marca todas las que apliquen.' },
  { n: 51, col: 'Programa Protección Plagas del establecimiento y su entorno', g: 'Entorno', t: '¿El establecimiento y su entorno tienen programa de control de plagas?', tipo: 'single', ops: SI_NO }
];

/* Columnas adicionales (van al final del Sheet, en azul, indicando a qué pregunta pertenecen) */
const EXTRA_COLS = [
  { key: '_id', h: 'ID Ficha' },
  { key: '_evaluador', h: 'Evaluador' },
  { key: '_fecha', h: 'Fecha' },
  { key: '_ts', h: 'Timestamp' },
  { key: '_gps', h: 'GPS' },
  { key: '_gpsacc', h: 'Precisión GPS (m)' },
  { key: 'p10', h: '→ P10 · Foto Resolución Sanitaria de Cocina' },
  { key: 'p17', h: '→ P17 · Foto Campana Fogones' },
  { key: 'p18', h: '→ P18 · Foto Campana Hornos' },
  { key: 'p19', h: '→ P19 · Foto Campana Baño María' },
  { key: 'p20q', h: '→ P20 · ¿Focos quemados en la cocina?' },
  { key: 'p20f', h: '→ P20 · Fotos focos quemados' },
  { key: 'p21', h: '→ P21 · Fotos lámparas sin protección' },
  { key: 'p25', h: '→ P25 · Fotos piso cocina en mal estado' },
  { key: 'p26', h: '→ P26 · Foto lavamanos cocina' },
  { key: 'p27', h: '→ P27 · Fotos paredes cocina' },
  { key: 'p27d', h: '→ P27 · Descripción material paredes' },
  { key: 'p29', h: '→ P29 · Foto calendario control de plagas' },
  { key: 'p33', h: '→ P33 · Fotos lámparas bodega sin protección' },
  { key: 'p46', h: '→ P46 · Foto caseta de gas en mal estado' },
  { key: 'p47', h: '→ P47 · Foto certificación SEC' }
];

/* Condiciones de salto */
function ans(n) { return S.resp[n]; }
function cocina() { return ans(15) !== 'NO'; }
function bodega() { return ans(30) !== 'NO'; }
function bano() { return ans(36) !== 'NO'; }
function vest() { return ans(42) !== 'NO'; }
function gas() { return ans(45) !== 'NO'; }

/* ============================================================
   ESTADO
   ============================================================ */
const S = {
  evaluador: '', est: null, resp: {}, subs: {}, fotos: {},
  idx: 0, fichaId: null, startedAt: null, gps: null, gpsWatch: null
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const content = $('#content'), navwrap = $('#navwrap'), overlays = $('#overlays');
const btnBack = $('#btnBack'), btnNext = $('#btnNext');
$('#logoSlot').innerHTML = LOGO_SVG;

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function toast(m, ms = 2400) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function showNav(v) { navwrap.classList.toggle('hidden', !v); }
function stamp() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`; }

/* ---------------- Caché local (anti bloqueo de pantalla) ---------------- */
function saveDraft() {
  try {
    localStorage.setItem(LS_DRAFT, JSON.stringify({
      evaluador: S.evaluador, est: S.est, resp: S.resp, subs: S.subs, idx: S.idx,
      fichaId: S.fichaId, startedAt: S.startedAt,
      fotos: Object.fromEntries(Object.entries(S.fotos).map(([k, arr]) =>
        [k, arr.filter(m => m.upState === 'done').map(m => ({ name: m.driveName, url: m.driveUrl, upState: 'done', type: 'photo' }))]))
    }));
  } catch (e) { /* cuota llena: la ficha sigue viva en memoria */ }
}
function loadDraft() { try { return JSON.parse(localStorage.getItem(LS_DRAFT)); } catch { return null; } }
function clearDraft() { localStorage.removeItem(LS_DRAFT); }

/* ---------------- GPS ---------------- */
function startGPS() {
  const chip = $('#gpsChip'), dot = $('#gpsDot'), txt = $('#gpsTxt');
  if (!navigator.geolocation) return;
  chip.classList.remove('hidden');
  S.gpsWatch = navigator.geolocation.watchPosition(p => {
    S.gps = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
    dot.className = 'dot ok'; txt.textContent = '±' + Math.round(p.coords.accuracy) + ' m';
  }, () => { dot.className = 'dot'; txt.textContent = 'Sin GPS'; }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 });
}
function stopGPS() { if (S.gpsWatch) { navigator.geolocation.clearWatch(S.gpsWatch); S.gpsWatch = null; } $('#gpsChip').classList.add('hidden'); }

/* ---------------- Establecimientos (Santiago y Estación Central) ---------------- */
const ESTS = (() => {
  const seen = new Set(), out = [];
  for (const r of BBDD) {
    const k = String(r[COL.RBD]) + '|' + norm(r[COL.NOM]);
    if (seen.has(k)) continue; seen.add(k); out.push(r);
  }
  return out;
})();

/* ============================================================
   PANTALLA 1 · INICIO
   ============================================================ */
function renderHome() {
  stopGPS(); showNav(false); $('#btnHome').classList.add('hidden');
  const d = loadDraft();
  const hasDraft = d && d.est;
  content.innerHTML = `<div class="screen"><div class="scroll">
    <div class="hero"><div class="mark">${LOGO_SVG}</div>
      <h1>Ficha de Evaluación</h1>
      <p>Condiciones sanitarias, infraestructura y entorno</p></div>
    <div class="home-actions">
      ${hasDraft ? `<button class="primary-action draft" id="goDraft">
        <div class="pa-ic">↻</div>
        <div><h3>Continuar ficha</h3><p>${esc(d.est[COL.NOM])} · guardada en este equipo</p></div>
        <div class="pa-arrow">›</div></button>` : ''}
      <button class="primary-action" id="goIn">
        <div class="pa-ic">📋</div>
        <div><h3>Ingresar</h3><p>Iniciar una evaluación nueva</p></div>
        <div class="pa-arrow">›</div></button>
    </div>
    <p class="note" style="text-align:center;margin-top:18px">51 preguntas · se guarda sola en tu teléfono</p>
  </div></div>`;
  $('#goIn').onclick = () => { if (hasDraft && !confirm('Hay una ficha sin terminar. Si inicias una nueva, se pierde. ¿Continuar?')) return; clearDraft(); startNueva(); };
  if (hasDraft) $('#goDraft').onclick = () => resumeDraft(d);
}

function startNueva() {
  S.est = null; S.resp = {}; S.subs = {}; S.fotos = {}; S.idx = 0;
  S.fichaId = null; S.startedAt = new Date().toISOString();
  S.evaluador = localStorage.getItem(LS_NAME) || '';
  renderEvaluador();
}
function resumeDraft(d) {
  S.evaluador = d.evaluador || ''; S.est = d.est; S.resp = d.resp || {}; S.subs = d.subs || {};
  S.fichaId = d.fichaId; S.startedAt = d.startedAt; S.idx = d.idx || 0;
  S.fotos = {};
  for (const [k, arr] of Object.entries(d.fotos || {})) S.fotos[k] = arr.map(m => ({ ...m, url: m.url }));
  startGPS(); renderQ();
}

/* ============================================================
   PANTALLA 2 · QUIÉN INGRESA
   ============================================================ */
function renderEvaluador() {
  showNav(true); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = renderHome;
  content.innerHTML = `<div class="screen"><div class="scroll"><div class="card">
    <div class="eyebrow"><b>Ficha</b> <span class="grp">· Identificación</span></div>
    <h2 class="q">¿Quién está realizando la evaluación?</h2>
    <div class="field-block"><label class="fld">Nombre completo</label>
      <input type="text" id="evName" placeholder="Ej: Manuel Echeverría" autocomplete="name" value="${esc(S.evaluador)}"></div>
    <p class="note">Tu nombre queda registrado en la ficha junto a la fecha y la ubicación.</p>
  </div></div></div>`;
  btnBack.onclick = renderHome;
  btnNext.className = 'btn accent'; btnNext.textContent = 'Continuar';
  const inp = $('#evName');
  const upd = () => { S.evaluador = inp.value.trim(); btnNext.disabled = S.evaluador.length < 3; };
  inp.oninput = upd; upd();
  btnNext.onclick = () => { localStorage.setItem(LS_NAME, S.evaluador); renderEst(); };
  setTimeout(() => inp.focus(), 120);
}

/* ============================================================
   PANTALLA 3 · ESTABLECIMIENTO  (mismo flujo que "Agregar caso")
   ============================================================ */
function renderEst() {
  showNav(true); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = renderHome;
  const ch = !!S.est;
  content.innerHTML = `<div class="screen"><div class="scroll"><div class="card">
    <div class="eyebrow"><b>Ficha</b> <span class="grp">· Establecimiento</span></div>
    <h2 class="q">Indica el establecimiento</h2>
    <div id="searchZone">${ch ? bubbleHTML() : searchHTML()}</div>
    <div id="estData" class="${ch ? '' : 'hidden'}"><div class="readonly-grid" style="margin-top:4px">
      <div class="ro full"><span>Dirección</span><b id="dDir">${ch ? esc(S.est[COL.DIR]) : '—'}</b></div>
      <div class="ro"><span>Comuna</span><b id="dCom">${ch ? esc(S.est[COL.COM]) : '—'}</b></div>
      <div class="ro"><span>Institución</span><b id="dInst">${ch ? esc(S.est[COL.INST]) : '—'}</b></div>
      <div class="ro"><span>Supervisora</span><b id="dSup">${ch ? esc(S.est[COL.SUP]) : '—'}</b></div>
      <div class="ro tech full"><span>RBD</span><b id="dRbd">${ch ? esc(S.est[COL.RBD]) : '—'}</b></div>
    </div>
    <p class="note">RBD, nombre, dirección y comuna se llenan solos con estos datos (preguntas 1 a 4).</p></div>
  </div></div></div>`;
  btnBack.onclick = renderEvaluador;
  btnNext.className = 'btn accent'; btnNext.textContent = 'Comenzar ficha'; btnNext.disabled = !ch;
  btnNext.onclick = () => {
    S.fichaId = 'F-' + String(S.est[COL.RBD]) + '-' + stamp();
    // Pre-carga del organismo según la base
    const inst = norm(S.est[COL.INST]);
    if (!S.resp[6]) S.resp[6] = inst.includes('junji') ? 'JUNJI' : inst.includes('integra') ? 'INTEGRA' : 'JUNAEB';
    S.idx = 0; startGPS(); saveDraft(); renderQ();
  };
  if (ch) bindBubble(); else bindSearch();
}
function searchHTML() {
  return `<div class="field-block"><label class="fld">Establecimiento</label>
      <div class="search-wrap"><span class="ic-lead">🏫</span>
        <input type="text" id="qNom" placeholder="Ej: Carlos Condell" autocomplete="off">
        <button class="clearbtn hidden" id="clrNom">✕</button><div class="suggest hidden" id="sgNom"></div></div></div>
    <div class="divider-or">O BIEN</div>
    <div class="field-block"><label class="fld">RBD</label>
      <div class="search-wrap"><span class="ic-lead">🔢</span>
        <input type="text" id="qRbd" inputmode="numeric" placeholder="Ej: 8521" autocomplete="off">
        <button class="clearbtn hidden" id="clrRbd">✕</button><div class="suggest hidden" id="sgRbd"></div></div></div>`;
}
function bubbleHTML() {
  return `<div class="bubble-row"><button class="bubble" id="bubble"><span>🏫</span><span class="b-txt">${esc(S.est[COL.NOM])} · RBD ${esc(S.est[COL.RBD])}</span><span class="b-edit">✎</span></button></div>`;
}
function bindBubble() { const b = $('#bubble'); if (b) b.onclick = () => { S.est = null; renderEst(); }; }
function bindSearch() { setupSearch('qRbd', 'sgRbd', 'clrRbd', COL.RBD, true); setupSearch('qNom', 'sgNom', 'clrNom', COL.NOM, false); }
function setupSearch(inputId, sgId, clrId, col, isRbd) {
  const inp = $('#' + inputId); if (!inp) return;
  const sg = $('#' + sgId), clr = $('#' + clrId); let hl = -1, cur = [];
  inp.addEventListener('input', () => {
    const v = norm(inp.value.trim()); clr.classList.toggle('hidden', !inp.value);
    if (!v) { sg.classList.add('hidden'); return; }
    cur = ESTS.filter(r => norm(r[col]).includes(v)).slice(0, 14);
    if (!cur.length) { sg.classList.add('hidden'); return; }
    sg.innerHTML = cur.map((r, i) => `<div class="sopt" data-i="${i}"><div class="stxt">${esc(r[col])}<small>${isRbd ? esc(r[COL.NOM]) : 'RBD ' + esc(r[COL.RBD])} · ${esc(r[COL.COM])}</small></div></div>`).join('');
    sg.classList.remove('hidden'); hl = -1;
    $$('#' + sgId + ' .sopt[data-i]').forEach(d => d.onclick = () => pickEst(cur[+d.dataset.i]));
  });
  inp.addEventListener('keydown', e => {
    const it = $$('#' + sgId + ' .sopt[data-i]'); if (!it.length) return;
    if (e.key === 'ArrowDown') hl = Math.min(hl + 1, it.length - 1);
    else if (e.key === 'ArrowUp') hl = Math.max(hl - 1, 0);
    else if (e.key === 'Enter' && hl >= 0) { pickEst(cur[hl]); return; }
    else return;
    it.forEach((d, i) => d.classList.toggle('hl', i === hl)); e.preventDefault();
  });
  clr.onclick = () => { inp.value = ''; clr.classList.add('hidden'); sg.classList.add('hidden'); };
}
function pickEst(r) {
  S.est = r;
  $('#searchZone').innerHTML = bubbleHTML(); bindBubble();
  $('#dDir').textContent = r[COL.DIR] || '—'; $('#dCom').textContent = r[COL.COM] || '—';
  $('#dInst').textContent = r[COL.INST] || '—'; $('#dSup').textContent = r[COL.SUP] || '—';
  $('#dRbd').textContent = r[COL.RBD] || '—';
  $('#estData').classList.remove('hidden'); btnNext.disabled = false;
}

/* ============================================================
   CUESTIONARIO
   ============================================================ */
function visibles() { return Q.filter(q => q.tipo !== 'auto' && (!q.if || q.if())); }

function renderQ() {
  const list = visibles();
  if (S.idx >= list.length) return renderResumen();
  if (S.idx < 0) S.idx = 0;
  const q = list[S.idx];
  const pct = Math.round((S.idx) / list.length * 100);
  const val = S.resp[q.n];

  /* foto: ¿aplica en este momento? */
  const fotoOn = fotoAplica(q);
  const subOn = subAplica(q);

  content.innerHTML = `<div class="screen">
    <div class="prog"><div class="ptop"><span>${esc(q.g)}</span><span>Pregunta ${q.n} de 51</span></div>
      <div class="ptrack"><i style="width:${pct}%"></i></div></div>
    <div class="scroll"><div class="card">
      <div class="eyebrow"><b>${esc(q.g)}</b></div>
      <h2 class="q">${esc(q.t)}</h2>
      <div id="ansZone">${ansHTML(q, val)}</div>
      ${q.hint ? `<p class="note">${esc(q.hint)}</p>` : ''}
      <div id="subZone">${subOn ? subHTML(q) : ''}</div>
      <div id="fotoZone">${fotoOn ? fotoHTML(q) : ''}</div>
    </div></div>
  </div>`;

  bindAns(q); if (subOn) bindSub(q); if (fotoOn) bindFoto(q);
  showNav(true); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = confirmSalir;
  btnBack.onclick = () => { S.idx--; saveDraft(); renderQ(); };
  const ultima = S.idx === list.length - 1;
  btnNext.className = ultima ? 'btn finish' : 'btn accent';
  btnNext.textContent = ultima ? 'Revisar y enviar' : 'Continuar';
  btnNext.onclick = () => { S.idx++; saveDraft(); renderQ(); };
  refreshNext();
}

function ansHTML(q, val) {
  if (q.tipo === 'text') return `<input type="text" id="fTxt" placeholder="${esc(q.ph || '')}" value="${esc(val || '')}">`;
  if (q.tipo === 'num') return `<input type="number" id="fNum" inputmode="numeric" placeholder="${esc(q.ph || '')}" value="${esc(val || '')}">`;
  if (q.tipo === 'pair') {
    const v = val || {};
    const cajas = q.pares.map(p => {
      const sel = v[p.key];
      const opts = SI_NO.map(o => {
        const on = sel === o, tone = on ? (o === 'SI' ? ' good' : ' bad') : '';
        return `<button class="opt${on ? ' sel' : ''}${tone}" data-p="${esc(p.key)}" data-o="${esc(o)}"><span class="mark">${on ? '✓' : ''}</span><span>${esc(o)}</span></button>`;
      }).join('');
      return `<div class="pairbox${sel ? ' done' : ''}">
        <div class="pl"><span class="pic">${p.ic}</span><span>${esc(p.label)}</span></div>
        <div class="opts">${opts}</div></div>`;
    }).join('');
    const txt = pairTexto(v);
    return `<div class="pairq">${cajas}</div>
      <p class="pairnote">Responde las dos. En la planilla se guarda como <b>${esc(txt || '—')}</b>.</p>`;
  }
  const multi = q.tipo === 'multi';
  const sel = multi ? (Array.isArray(val) ? val : []) : [val];
  const two = q.ops.length === 2 && q.ops.every(o => o.length <= 6);
  return `<div class="opts ${two ? 'two' : ''}">${q.ops.map(o => {
    const on = sel.includes(o);
    const tone = on ? (['SI', 'BUENO'].includes(o) ? ' good' : (['NO', 'MALO'].includes(o) ? ' bad' : '')) : '';
    return `<button class="opt${multi ? ' box' : ''}${on ? ' sel' : ''}${tone}" data-o="${esc(o)}"><span class="mark">${on ? '✓' : ''}</span><span>${esc(o)}</span></button>`;
  }).join('')}</div>`;
}
function bindAns(q) {
  if (q.tipo === 'text' || q.tipo === 'num') {
    const i = $('#fTxt') || $('#fNum');
    i.oninput = () => { S.resp[q.n] = i.value.trim(); refreshNext(); saveDraft(); };
    return;
  }
  if (q.tipo === 'pair') {
    $$('#ansZone .opt[data-p]').forEach(b => b.onclick = () => {
      const v = Object.assign({}, S.resp[q.n]);
      v[b.dataset.p] = b.dataset.o;
      S.resp[q.n] = v;
      $('#ansZone').innerHTML = ansHTML(q, v); bindAns(q);
      $('#fotoZone').innerHTML = fotoAplica(q) ? fotoHTML(q) : ''; if (fotoAplica(q)) bindFoto(q);
      refreshNext(); saveDraft();
    });
    return;
  }
  $$('#ansZone .opt').forEach(b => b.onclick = () => {
    const o = b.dataset.o;
    if (q.tipo === 'multi') {
      const cur = Array.isArray(S.resp[q.n]) ? S.resp[q.n] : [];
      S.resp[q.n] = cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o];
    } else {
      S.resp[q.n] = o;
    }
    /* Si al cambiar la respuesta la foto o la subpregunta ya no aplican, se limpian
       para que no queden links huérfanos en las columnas adicionales. */
    if (q.foto && (q.foto.when || q.foto.whenSub) && !fotoAplica(q)) S.fotos[q.foto.key] = [];
    if (q.sub && q.sub.when && !subAplica(q)) delete S.subs[q.sub.key];
    $('#ansZone').innerHTML = ansHTML(q, S.resp[q.n]); bindAns(q);
    $('#subZone').innerHTML = subAplica(q) ? subHTML(q) : ''; if (subAplica(q)) bindSub(q);
    $('#fotoZone').innerHTML = fotoAplica(q) ? fotoHTML(q) : ''; if (fotoAplica(q)) bindFoto(q);
    refreshNext(); saveDraft();
  });
}

/* --------- Subpregunta (cae en columna adicional) --------- */
function subAplica(q) { return !!(q.sub && (!q.sub.when || S.resp[q.n] === q.sub.when)); }
function subHTML(q) {
  const s = q.sub, v = S.subs[s.key];
  const body = s.tipo === 'text'
    ? `<textarea id="sTxt" placeholder="${esc(s.ph || '')}">${esc(v || '')}</textarea>`
    : `<div class="opts two">${s.ops.map(o => {
      const on = v === o; const tone = on ? (o === 'SI' ? ' good' : ' bad') : '';
      return `<button class="opt${on ? ' sel' : ''}${tone}" data-s="${esc(o)}"><span class="mark">${on ? '✓' : ''}</span><span>${esc(o)}</span></button>`;
    }).join('')}</div>`;
  return `<div class="subq"><div class="sl">${esc(s.label)}</div>${body}</div>`;
}
function bindSub(q) {
  const s = q.sub;
  if (s.tipo === 'text') { const t = $('#sTxt'); t.oninput = () => { S.subs[s.key] = t.value.trim(); refreshNext(); saveDraft(); }; return; }
  $$('#subZone .opt').forEach(b => b.onclick = () => {
    S.subs[s.key] = b.dataset.s;
    $('#subZone').innerHTML = subHTML(q); bindSub(q);
    $('#fotoZone').innerHTML = fotoAplica(q) ? fotoHTML(q) : ''; if (fotoAplica(q)) bindFoto(q);
    refreshNext(); saveDraft();
  });
}

/* --------------------- Fotos --------------------- */
function fotoAplica(q) {
  if (!q.foto) return false;
  if (q.foto.when) return S.resp[q.n] === q.foto.when;
  if (q.foto.whenSub) return S.subs[q.sub.key] === q.foto.whenSub;
  return respondida(q);
}
function fotoReq(q) {
  if (!fotoAplica(q)) return false;
  return !!q.foto.req;
}
function fotoHTML(q) {
  const req = fotoReq(q);
  return `<div class="verifier ${req ? 'req' : ''}">
    <div class="vtitle">${req ? 'Foto obligatoria' : 'Foto de evidencia (opcional)'}</div>
    <p class="vhint">${esc(q.foto.hint || '')}</p>
    <div class="vbtns">
      <button class="vbtn" id="vCam"><span class="ic">📷</span>Cámara</button>
      <button class="vbtn" id="vGal"><span class="ic">🖼️</span>Galería</button>
    </div>
    <div class="thumbs" id="thumbs"></div>
    <div id="upSummary"></div>
  </div>`;
}
function bindFoto(q) {
  $('#vCam').onclick = () => openCamera(q.foto.key);
  $('#vGal').onclick = () => pickGallery(q.foto.key, q.foto.multi !== false);
  paintThumbs(q.foto.key);
}
function fotos(key) { if (!S.fotos[key]) S.fotos[key] = []; return S.fotos[key]; }
function paintThumbs(key) {
  const box = $('#thumbs'); if (!box) return;
  const arr = fotos(key);
  box.innerHTML = arr.map((m, i) => {
    let ov = '';
    if (m.upState === 'uploading') ov = `<div class="up"><div class="ring"></div></div>`;
    else if (m.upState === 'done') ov = `<div class="up done"><span class="ok">✓</span></div>`;
    else if (m.upState === 'error') ov = `<button class="up err" data-retry="${i}"><span class="ok">!</span><span class="rt">Reintentar</span></button>`;
    return `<div class="thumb"><img src="${m.url}" alt=""><button class="del" data-del="${i}">✕</button>${ov}</div>`;
  }).join('');
  $$('#thumbs .del').forEach(b => b.onclick = () => { const i = +b.dataset.del; const m = arr[i]; if (m) m.cancelled = true; arr.splice(i, 1); paintThumbs(key); refreshNext(); saveDraft(); });
  $$('#thumbs [data-retry]').forEach(b => b.onclick = () => { const m = arr[+b.dataset.retry]; if (m) { m.upState = 'uploading'; paintThumbs(key); refreshNext(); uploadOne(m, key); } });
  paintUpBar(key);
}
function paintUpBar(key) {
  const box = $('#upSummary'); if (!box) return;
  const arr = fotos(key).filter(m => !m.cancelled);
  if (!arr.length) { box.innerHTML = ''; return; }
  const done = arr.filter(m => m.upState === 'done').length;
  const upl = arr.filter(m => m.upState === 'uploading').length;
  const err = arr.filter(m => m.upState === 'error').length;
  const pct = Math.round(done / arr.length * 100);
  const cls = upl ? '' : (err ? 'err' : 'ok');
  const st = upl ? `Subiendo ${done}/${arr.length}…` : (err ? `${err} con error` : `${done}/${arr.length} en Drive`);
  box.innerHTML = `<div class="upglobal ${cls}"><div class="ut"><span>Fotos</span><span class="st">${st}</span></div>
    <div class="track"><i style="width:${pct}%"></i></div>
    ${upl ? '<p class="note" style="margin-top:8px">Espera a que termine de subir para continuar.</p>' : ''}
    ${err ? '<p class="note" style="margin-top:8px;color:var(--red)">Alguna foto falló. Toca el recuadro rojo para <b>reintentar</b> o bórrala con ✕.</p>' : ''}</div>`;
}

function refreshNext() {
  const list = visibles(); const q = list[S.idx]; if (!q) return;
  let ok = respondida(q);
  if (ok && q.sub && subAplica(q)) {
    const sv = S.subs[q.sub.key];
    if (q.sub.req !== false) ok = sv !== undefined && String(sv).trim() !== '';
  }
  if (ok && fotoAplica(q)) {
    const arr = fotos(q.foto.key).filter(m => !m.cancelled);
    if (arr.some(m => m.upState === 'uploading')) ok = false;
    if (fotoReq(q) && !arr.some(m => m.upState === 'done')) ok = false;
  }
  btnNext.disabled = !ok;
}

function confirmSalir() {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal"><h3>Salir de la ficha</h3>
    <p>Se guarda como borrador en este teléfono. Puedes retomarla desde el inicio.</p>
    <div class="mbtns"><button class="btn ghost" id="mNo" style="flex:1">Seguir</button><button class="btn primary" id="mSi" style="flex:1">Salir</button></div></div>`;
  overlays.appendChild(bg);
  $('#mNo', bg).onclick = () => bg.remove();
  $('#mSi', bg).onclick = () => { saveDraft(); bg.remove(); renderHome(); };
}

/* ============================================================
   CÁMARA / GALERÍA / SUBIDA
   ============================================================ */
let camStream = null;
function stopCam() { if (camStream) { camStream.getTracks().forEach(t => { try { t.stop(); } catch (e) { } }); camStream = null; } }
async function openCamera(key) {
  const secure = window.isSecureContext || location.hostname === 'localhost';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !secure) { toast('La cámara requiere HTTPS. Usa "Galería".', 3400); return; }
  const ov = document.createElement('div'); ov.className = 'cam-bg';
  ov.innerHTML = `<button class="camclose">✕</button><video autoplay playsinline muted></video><div class="cambar"><div class="shoot"></div></div>`;
  overlays.appendChild(ov);
  const video = $('video', ov);
  const close = () => { stopCam(); ov.remove(); };
  $('.camclose', ov).onclick = close;
  stopCam();
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    video.srcObject = camStream; await video.play().catch(() => { });
  } catch (err) {
    close();
    const msg = err && err.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Actívalo o usa "Galería".'
      : err && err.name === 'NotReadableError' ? 'La cámara está ocupada por otra app.'
        : 'No se pudo abrir la cámara. Usa "Galería".';
    toast(msg, 3600); return;
  }
  $('.shoot', ov).onclick = () => {
    const c = document.createElement('canvas'); c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720;
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    c.toBlob(b => { if (b) addFoto(key, { blob: b, url: URL.createObjectURL(b) }); close(); }, 'image/jpeg', .82);
  };
}
function pickGallery(key, multi) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = !!multi;
  inp.onchange = async () => {
    for (const f of inp.files) {
      const small = await downscale(f).catch(() => f);
      addFoto(key, { blob: small, url: URL.createObjectURL(small) });
    }
  };
  inp.click();
}
function downscale(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w, h) <= FOTO_MAX_LADO && file.size < 2.5 * 1024 * 1024) { URL.revokeObjectURL(img.src); res(file); return; }
      const k = Math.min(1, FOTO_MAX_LADO / Math.max(w, h));
      const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => b ? res(b) : rej(new Error('toBlob')), 'image/jpeg', .85);
    };
    img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}
function addFoto(key, m) {
  m.upState = 'uploading'; m.driveName = null; m.driveUrl = ''; m.cancelled = false; m.type = 'photo';
  fotos(key).push(m); paintThumbs(key); refreshNext();
  uploadOne(m, key);
}
async function uploadOne(m, key) {
  const rbd = S.est ? S.est[COL.RBD] : 'SN';
  if (!m.driveName) m.driveName = `${key}_RBD${rbd}_${stamp()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
  try {
    const b64 = await blobToB64(m.blob);
    if (m.cancelled) return;
    const r = await postJSON({ accion: 'subirFotoFicha', evaluador: S.evaluador, fichaId: S.fichaId, rbd, fileName: m.driveName, mime: 'image/jpeg', data: b64 });
    if (m.cancelled) return;
    if (r && r.ok) { m.upState = 'done'; m.driveUrl = r.url || ''; }
    else m.upState = 'error';
  } catch (e) { m.upState = 'error'; }
  paintThumbs(key); refreshNext(); saveDraft();
}
function blobToB64(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(b); }); }
async function postJSON(payload, timeoutMs = 90000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(EXEC, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal });
    return await res.json();
  } finally { clearTimeout(t); }
}

/* ============================================================
   RESUMEN Y ENVÍO
   ============================================================ */
function valorTexto(q) {
  const v = S.resp[q.n];
  if (q.tipo === 'pair') return pairTexto(v) || '—';
  if (Array.isArray(v)) return v.join(' · ');
  return v === undefined || v === '' ? '—' : String(v);
}
function renderResumen() {
  const list = visibles();
  const omit = Q.filter(q => q.tipo !== 'auto' && q.if && !q.if()).length;
  let html = '', gAct = '';
  const base = [
    ['1', 'RBD', S.est[COL.RBD]], ['2', 'Nombre del establecimiento', S.est[COL.NOM]],
    ['3', 'Dirección', S.est[COL.DIR]], ['4', 'Comuna', S.est[COL.COM]]
  ];
  html += `<div class="rblock"><div class="rb-h">Registro de antecedentes</div>` +
    base.map(([n, l, v]) => `<div class="rrow"><div class="rn">${n}</div><div class="rq">${esc(l)}<b>${esc(v)}</b></div><div class="rp">auto</div></div>`).join('') + `</div>`;
  for (const q of list) {
    if (q.g !== gAct) { if (gAct) html += '</div>'; gAct = q.g; html += `<div class="rblock"><div class="rb-h">${esc(q.g)}</div>`; }
    const nf = q.foto ? fotos(q.foto.key).filter(m => m.upState === 'done').length : 0;
    html += `<div class="rrow"><div class="rn">${q.n}</div><div class="rq">${esc(q.colAlias || q.col)}<b>${esc(valorTexto(q))}</b></div>${nf ? `<div class="rp">${nf} 📷</div>` : ''}</div>`;
  }
  html += '</div>';

  content.innerHTML = `<div class="screen">
    <div class="prog"><div class="ptop"><span>Revisión final</span><span>${list.length + 4} respuestas</span></div><div class="ptrack"><i style="width:100%"></i></div></div>
    <div class="scroll">
      <div class="banner">Revisa antes de enviar. Toca ‹ para volver a corregir cualquier pregunta.${omit ? ` Se omitieron <b>${omit}</b> preguntas por los saltos.` : ''}</div>
      ${html}
    </div></div>`;
  showNav(true); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = confirmSalir;
  btnBack.onclick = () => { S.idx = list.length - 1; renderQ(); };
  btnNext.className = 'btn finish'; btnNext.textContent = 'Enviar ficha'; btnNext.disabled = false;
  btnNext.onclick = enviar;
}

function urlsDe(key) { return fotos(key).filter(m => m.upState === 'done' && m.driveUrl).map(m => m.driveUrl).join('\n'); }

async function enviar() {
  btnNext.disabled = true; btnNext.innerHTML = '<span class="spinner"></span> Enviando…';
  if (!S.gps) {
    try {
      S.gps = await new Promise(r => {
        if (!navigator.geolocation) return r(null);
        navigator.geolocation.getCurrentPosition(p => r({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }), () => r(null), { timeout: 6000 });
      });
    } catch { S.gps = null; }
  }
  const now = new Date();
  /* Fila base: exactamente las 51 columnas de la plantilla, en orden */
  const fila = Q.map(q => {
    if (q.n === 1) return S.est[COL.RBD];
    if (q.n === 2) return S.est[COL.NOM];
    if (q.n === 3) return S.est[COL.DIR];
    if (q.n === 4) return S.est[COL.COM];
    if (q.if && !q.if()) return 'NO APLICA';
    const v = S.resp[q.n];
    if (q.tipo === 'pair') return pairTexto(v);
    if (Array.isArray(v)) return v.join(' / ');
    return v === undefined ? '' : String(v);
  });
  /* Columnas adicionales */
  const extra = EXTRA_COLS.map(e => {
    if (e.key === '_id') return S.fichaId;
    if (e.key === '_evaluador') return S.evaluador;
    if (e.key === '_fecha') return now.toLocaleString('es-CL');
    if (e.key === '_ts') return now.toISOString();
    if (e.key === '_gps') return S.gps ? `${S.gps.lat.toFixed(6)}, ${S.gps.lon.toFixed(6)}` : '';
    if (e.key === '_gpsacc') return S.gps ? Math.round(S.gps.acc) : '';
    if (e.key === 'p20q') return S.subs.p20q || '';
    if (e.key === 'p27d') return S.subs.p27d || '';
    return urlsDe(e.key);
  });

  let ok = false;
  try {
    const r = await postJSON({
      accion: 'ficha', evaluador: S.evaluador, fichaId: S.fichaId,
      headers: Q.map(q => q.col), extraHeaders: EXTRA_COLS.map(e => e.h),
      fila, extra
    });
    ok = !!(r && r.ok);
  } catch (e) { ok = false; }
  if (ok) clearDraft(); else saveDraft();
  stopGPS(); renderDone(ok);
}

function renderDone(ok) {
  showNav(false); $('#btnHome').classList.add('hidden');
  content.innerHTML = `<div class="screen"><div class="scroll" style="display:flex;flex-direction:column;justify-content:center">
    <div class="hero"><div class="mark">${LOGO_SVG}</div>
      <h1>${ok ? 'Ficha enviada' : 'Ficha guardada'}</h1>
      <p>${esc(S.est[COL.NOM])} · RBD ${esc(S.est[COL.RBD])}</p></div>
    <div class="card" style="text-align:center;margin-top:10px">
      <p>${ok ? 'La ficha quedó registrada en la planilla y las fotos en Drive.' : 'No hubo conexión al enviar. Quedó guardada en este teléfono: entra de nuevo y toca <b>Continuar ficha</b> cuando tengas señal.'}</p>
      <p class="note">Evaluada por ${esc(S.evaluador)} · ${new Date().toLocaleString('es-CL')}</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        <button class="btn accent" id="otra">Evaluar otro establecimiento</button>
        <button class="btn ghost" id="home" style="width:100%">Volver al inicio</button>
      </div></div>
  </div></div>`;
  $('#otra').onclick = () => { clearDraft(); startNueva(); };
  $('#home').onclick = renderHome;
}

/* ------------------------ ARRANQUE ------------------------- */
renderHome();

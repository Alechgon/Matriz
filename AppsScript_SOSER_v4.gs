/*******************************************************************
 * SOSER · Backend Google Apps Script (v4)
 * -----------------------------------------------------------------
 * v4 AGREGA (sin tocar nada de "Agregar Caso"):
 *   - accion 'ficha'          -> escribe una fila en la hoja
 *                                "Ficha de Evaluación", replicando la
 *                                plantilla Excel (51 columnas) y sumando
 *                                las columnas adicionales al final.
 *   - accion 'subirFotoFicha' -> sube la foto a la carpeta de Drive
 *                                SOSER_Fichas_<idHoja> y devuelve el link.
 *   - doGet(?fichas=1)        -> devuelve las fichas en JSON.
 *
 * La hoja se crea sola la primera vez que llega una ficha:
 *   Fila 1 = bloques (combinados, gris SOSER / azul para adicionales)
 *   Fila 2 = títulos EXACTOS de la plantilla
 *   Fila 3 en adelante = datos
 *
 * ACTUALIZAR conservando la misma URL /exec:
 *   1. Google Sheet ▸ Extensiones ▸ Apps Script
 *   2. Borra todo y pega este archivo completo
 *   3. Implementar ▸ Gestionar implementaciones ▸ ✎ ▸
 *      Versión: Nueva versión ▸ Implementar
 *      (Ejecutar como: Yo · Acceso: Cualquier persona)
 *******************************************************************/

var RBD_SEMILLA = [
  // [RBD, Establecimiento, Direccion, Comuna, Supervisor, Institucion, Tecnico]
];

var PREGUNTAS_APP = [
  ['Pantalla','Texto'],
  ['Inicio - título','Gestión de Casos'],
  ['Agregar caso - establecimiento','Indica el establecimiento'],
  ['Categorías','Gas | Electricidad | Filtraciones | Infraestructura | Equipos | Otro'],
  ['Descripción - label','Indique'],
  ['Verificadores','Foto | Video (máx 15s)'],
  ['Regla técnico','Estación Central = Multitécnico · Santiago = Rodrigo Martínez · resto = Por asignar']
];

var HEADERS = ['ID','Fecha','RBD','Establecimiento','Dirección','Comuna','Institución','Supervisor','Técnico','Categoría','Descripción','GPS','Precisión (m)','Verificadores','Timestamp','Visado','Derivado a'];

/* ================= FICHA DE EVALUACIÓN ================= */

var HOJA_FICHA = 'Ficha de Evaluación';

/* Bloques de la fila 1: [texto, columna inicio, columna fin] (1-indexado) */
var BLOQUES_FICHA = [
  ['Registro de antecedentes, condiciones sanitarias, infraestructura y entorno', 1, 11],
  ['Servicios Básicos Establecimiento', 12, 14],
  ['Evaluación Cocina', 15, 16],
  ['Campanas Cocina', 17, 19],
  ['Iluminación Cocina', 20, 21],
  ['Piso Cocina', 22, 26],
  ['Paredes', 27, 29],
  ['Evaluación de Bodega', 30, 31],
  ['Iluminación Bodega', 32, 33],
  ['Piso Bodega', 34, 35],
  ['Baño para manipuladoras', 36, 41],
  ['Sala de Vestuario', 42, 44],
  ['Patio de Servicio', 45, 49],
  ['Entorno', 50, 51]
];

var COLOR_BASE = '#333333';   // carbón SOSER
var COLOR_EXTRA = '#1769AA';  // azul: columnas que NO existen en la plantilla
var COLOR_BLOQUE = '#F49A0F'; // naranjo SOSER para la fila de bloques

function hojaFicha(ss, headers, extraHeaders) {
  var sh = ss.getSheetByName(HOJA_FICHA);
  var nBase = headers.length, nExtra = extraHeaders.length;
  if (!sh) {
    sh = ss.insertSheet(HOJA_FICHA);

    // Fila 1: bloques
    for (var b = 0; b < BLOQUES_FICHA.length; b++) {
      var bl = BLOQUES_FICHA[b];
      var rng = sh.getRange(1, bl[1], 1, bl[2] - bl[1] + 1);
      if (bl[2] > bl[1]) rng.merge();
      rng.setValue(bl[0]);
    }
    sh.getRange(1, 1, 1, nBase)
      .setFontWeight('bold').setBackground(COLOR_BLOQUE).setFontColor('#ffffff')
      .setHorizontalAlignment('center').setFontSize(10);

    var rngExtraBloque = sh.getRange(1, nBase + 1, 1, nExtra);
    rngExtraBloque.merge();
    rngExtraBloque.setValue('DATOS ADICIONALES DE LA APP (no existen en la plantilla original)')
      .setFontWeight('bold').setBackground(COLOR_EXTRA).setFontColor('#ffffff')
      .setHorizontalAlignment('center').setFontSize(10);

    // Fila 2: títulos
    sh.getRange(2, 1, 1, nBase).setValues([headers])
      .setFontWeight('bold').setBackground(COLOR_BASE).setFontColor('#ffffff')
      .setWrap(true).setVerticalAlignment('middle').setFontSize(9);
    sh.getRange(2, nBase + 1, 1, nExtra).setValues([extraHeaders])
      .setFontWeight('bold').setBackground(COLOR_EXTRA).setFontColor('#ffffff')
      .setWrap(true).setVerticalAlignment('middle').setFontSize(9);

    sh.setFrozenRows(2);
    sh.setFrozenColumns(2);
    sh.setRowHeight(2, 78);
    for (var c = 1; c <= nBase + nExtra; c++) sh.setColumnWidth(c, c <= 4 ? 170 : 132);
  }
  return sh;
}

function agregarFicha(ss, data) {
  var headers = data.headers || [];
  var extraHeaders = data.extraHeaders || [];
  var sh = hojaFicha(ss, headers, extraHeaders);
  var fila = (data.fila || []).concat(data.extra || []);
  sh.appendRow(fila);

  var r = sh.getLastRow();
  var nBase = headers.length;

  // Pinta suavemente las columnas adicionales para distinguirlas de la plantilla
  sh.getRange(r, nBase + 1, 1, extraHeaders.length).setBackground('#EAF2F8');

  // Marca en rojo las no conformidades críticas para que salten a la vista
  var criticas = { 10: 'NO', 12: 'NO', 25: 'MALO', 26: 'NO', 46: 'MALO', 47: 'NO' };
  for (var k in criticas) {
    var i = parseInt(k, 10);
    if (String(fila[i - 1]).toUpperCase() === criticas[k]) {
      sh.getRange(r, i).setBackground('#F8D7DA').setFontColor('#8B1E2D').setFontWeight('bold');
    }
  }
  // "NO APLICA" en gris claro
  for (var j = 0; j < nBase; j++) {
    if (String(fila[j]) === 'NO APLICA') sh.getRange(r, j + 1).setFontColor('#AAAAAA').setFontStyle('italic');
  }
  return r;
}

function carpetaFichas(idHoja) {
  var nombre = 'SOSER_Fichas_' + idHoja;
  var it = DriveApp.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(nombre);
}

/* ================= INSTALACIÓN ================= */

function primeraVez() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = ss.getSheetByName('Configuración') || ss.insertSheet('Configuración');
  if (cfg.getLastRow() === 0) {
    cfg.getRange(1,1,1,7).setValues([['RBD','Establecimiento','Dirección','Comuna','Supervisor','Institución','Técnico mantención']]);
    cfg.getRange(1,1,1,7).setFontWeight('bold').setBackground('#333333').setFontColor('#ffffff');
    if (RBD_SEMILLA.length) cfg.getRange(2,1,RBD_SEMILLA.length,7).setValues(RBD_SEMILLA);
    cfg.setFrozenRows(1);
    var startRow = Math.max(cfg.getLastRow(), 1) + 3;
    cfg.getRange(startRow,1).setValue('TEXTOS / PREGUNTAS DE LA APP (editables)').setFontWeight('bold');
    cfg.getRange(startRow+1,1,PREGUNTAS_APP.length,2).setValues(PREGUNTAS_APP);
    cfg.getRange(startRow+1,1,1,2).setFontWeight('bold').setBackground('#F49A0F').setFontColor('#ffffff');
  }
  SpreadsheetApp.getUi().alert('Listo. La hoja "Ficha de Evaluación" se crea sola con la primera ficha enviada. Recuerda re-implementar como Nueva versión.');
}

function hojaEncargado(ss, nombre) {
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.appendRow(HEADERS);
    sh.getRange(1,1,1,HEADERS.length).setFontWeight('bold').setBackground('#333333').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else {
    var lastCol = sh.getLastColumn();
    var head = sh.getRange(1,1,1,Math.max(lastCol,HEADERS.length)).getValues()[0];
    if (head.indexOf('Visado') === -1) sh.getRange(1, HEADERS.indexOf('Visado')+1).setValue('Visado').setFontWeight('bold').setBackground('#333333').setFontColor('#ffffff');
    if (head.indexOf('Derivado a') === -1) sh.getRange(1, HEADERS.indexOf('Derivado a')+1).setValue('Derivado a').setFontWeight('bold').setBackground('#333333').setFontColor('#ffffff');
  }
  return sh;
}

/* ================= POST ================= */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    /* ---------- FICHA DE EVALUACIÓN ---------- */
    if (data.accion === 'subirFotoFicha') {
      var fF = carpetaFichas(ss.getId());
      var blobF = Utilities.newBlob(Utilities.base64Decode(data.data), data.mime || 'image/jpeg', data.fileName);
      var fileF = fF.createFile(blobF);
      fileF.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileF.setDescription('Ficha ' + (data.fichaId||'') + ' · RBD ' + (data.rbd||'') + ' · ' + (data.evaluador||''));
      return json({ok:true, fileName:data.fileName, url:fileF.getUrl()});
    }
    if (data.accion === 'ficha') {
      var filaN = agregarFicha(ss, data);
      return json({ok:true, fichaId:data.fichaId, fila:filaN});
    }

    /* ---------- AGREGAR CASO (sin cambios) ---------- */
    if (data.accion === 'subirArchivo') {
      var folderU = obtenerCarpeta(ss.getId());
      var blobU = Utilities.newBlob(Utilities.base64Decode(data.data), data.mime, data.fileName);
      var fileU = folderU.createFile(blobU);
      fileU.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return json({ok:true, fileName:data.fileName, url:fileU.getUrl()});
    }
    if (data.accion === 'borrarArchivo') {
      var folderD = obtenerCarpeta(ss.getId());
      var itD = folderD.getFilesByName(data.fileName);
      while (itD.hasNext()) { itD.next().setTrashed(true); }
      return json({ok:true, borrado:data.fileName});
    }
    if (data.accion === 'borrar') {
      var shB = ss.getSheetByName(data.encargado);
      if (shB) {
        var vB = shB.getRange(1,1,shB.getLastRow(),shB.getLastColumn()).getValues();
        var hB = vB[0]; var cIdB = hB.indexOf('ID'); var cVisB = hB.indexOf('Visado');
        for (var rb=1; rb<vB.length; rb++) {
          if (String(vB[rb][cIdB]) === String(data.reporteId)) {
            shB.getRange(rb+1, cVisB+1).setValue('ELIMINADO: ' + (data.motivo||''));
            shB.getRange(rb+1,1,1,shB.getLastColumn()).setBackground('#EDEDEA').setFontColor('#999999');
            return json({ok:true, borrado:data.reporteId});
          }
        }
      }
      return json({ok:false, error:'No encontrado'});
    }
    if (data.accion === 'derivar' || data.accion === 'visar') {
      var shE = ss.getSheetByName(data.encargado);
      if (!shE) return json({ok:false, error:'Hoja de encargado no encontrada'});
      var vals = shE.getRange(1,1,shE.getLastRow(),HEADERS.length).getValues();
      var head = vals[0];
      var cId = head.indexOf('ID'), cVis = head.indexOf('Visado'), cDer = head.indexOf('Derivado a');
      for (var r=1;r<vals.length;r++){
        if (String(vals[r][cId]) === String(data.reporteId)) {
          if (data.accion === 'derivar' && cDer !== -1) shE.getRange(r+1, cDer+1).setValue(data.derivadoA||'');
          if (typeof data.visado !== 'undefined' && cVis !== -1) shE.getRange(r+1, cVis+1).setValue(data.visado||'');
          return json({ok:true, updated:data.reporteId});
        }
      }
      return json({ok:false, error:'Reporte no encontrado'});
    }

    var nombreHoja = (data.encargado || 'Sin encargado').substring(0,90);
    var sh = hojaEncargado(ss, nombreHoja);
    var links = [];
    if (data.verificadores) {
      var folderC = null;
      var lineas = String(data.verificadores).split('\n');
      for (var li=0; li<lineas.length; li++) {
        if (!lineas[li]) continue;
        if (lineas[li].indexOf('http') !== -1) { links.push(lineas[li]); continue; }
        if (!folderC) folderC = obtenerCarpeta(ss.getId());
        var partes = lineas[li].split(': ');
        var fname = partes.length>1 ? partes[1] : lineas[li];
        var itc = folderC.getFilesByName(fname.trim());
        links.push(itc.hasNext() ? (lineas[li] + ' -> ' + itc.next().getUrl()) : lineas[li]);
      }
    }
    sh.appendRow([
      data.reporteId||'', data.fecha||'', data.rbd||'', data.establecimiento||'',
      data.direccion||'', data.comuna||'', data.institucion||'', data.supervisor||'',
      data.tecnico||'', data.categoria||'', data.descripcion||'',
      data.gps||'', data.gps_acc||'', links.join('\n'), data.timestamp||'',
      '', ''
    ]);
    return json({ok:true, id:data.reporteId});
  } catch (err) {
    return json({ok:false, error:String(err)});
  }
}

/* ================= GET ================= */

var HOJAS_SISTEMA = ['Configuración','Configuracion','Ficha de Evaluación','Ficha de Evaluacion'];

function leerHoja(sh, encargado) {
  var out = [];
  if (!sh || sh.getLastRow() < 2) return out;
  var values = sh.getRange(1,1,sh.getLastRow(),HEADERS.length).getValues();
  var head = values[0];
  var idx = {};
  HEADERS.forEach(function(h){ idx[h] = head.indexOf(h); });
  for (var r=1; r<values.length; r++) {
    var row = values[r];
    if (!row[idx['ID']]) continue;
    out.push({
      encargado: encargado, fila: r+1,
      id: row[idx['ID']], fecha: row[idx['Fecha']], rbd: row[idx['RBD']],
      establecimiento: row[idx['Establecimiento']], direccion: row[idx['Dirección']],
      comuna: row[idx['Comuna']], institucion: row[idx['Institución']],
      supervisor: row[idx['Supervisor']], tecnico: row[idx['Técnico']],
      categoria: row[idx['Categoría']], descripcion: row[idx['Descripción']],
      gps: row[idx['GPS']], precision: row[idx['Precisión (m)']],
      verificadores: row[idx['Verificadores']], timestamp: row[idx['Timestamp']],
      visado: row[idx['Visado']] || '', derivadoA: row[idx['Derivado a']] || ''
    });
  }
  return out;
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (e && e.parameter && e.parameter.fichas) {
      var shF = ss.getSheetByName(HOJA_FICHA);
      if (!shF || shF.getLastRow() < 3) return json({ok:true, fichas:[]});
      var vF = shF.getRange(2,1,shF.getLastRow()-1,shF.getLastColumn()).getValues();
      var hF = vF.shift();
      var outF = vF.map(function(row){
        var o = {}; for (var i=0;i<hF.length;i++) o[hF[i] || ('col'+i)] = row[i]; return o;
      });
      return json({ok:true, fichas:outF});
    }

    if (e && e.parameter && e.parameter.admin) {
      var sheets = ss.getSheets();
      var all = [];
      for (var i=0;i<sheets.length;i++) {
        var name = sheets[i].getName();
        if (HOJAS_SISTEMA.indexOf(name) !== -1) continue;
        all = all.concat(leerHoja(sheets[i], name));
      }
      return json({ok:true, reportes:all});
    }
    var enc = e && e.parameter && e.parameter.encargado;
    if (!enc) return ContentService.createTextOutput('SOSER backend activo (casos + fichas). Usa POST desde la app.');
    return json({ok:true, reportes: leerHoja(ss.getSheetByName(enc), enc)});
  } catch (err) {
    return json({ok:false, error:String(err)});
  }
}

function obtenerCarpeta(idHoja) {
  var nombre = 'SOSER_Casos_' + idHoja;
  var it = DriveApp.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(nombre);
}
function json(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

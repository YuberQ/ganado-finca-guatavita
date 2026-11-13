// excel.js — Exporta la relación de ganado a Excel (.xlsx) con el mismo formato
// de la planilla de la finca: título enmarcado, encabezados, fórmula de precio
// total, franjas amarillas por grupo y fecha al pie. Usa ExcelJS (estilos reales).
import { getAnimales, getVendidos, getPerdidos } from './db.js';
import { showToast, showLoading, hideLoading } from './ui.js';

const TITULO = 'RELACION GANADO FINCA ANGEL MARIA UVER QUINTERO';
const ENCABEZADOS = ['N°', 'PESO KG entrada', 'precio entrada', 'precio total', 'tipo', 'nombre', 'observaciones'];
const ANCHOS = [4.17, 11.03, 11.43, 13.32, 13.72, 13.45, 17.89];
const FMT_PRECIO_KG = '_-"$"\\ * #,##0_-;\\-"$"\\ * #,##0_-;_-"$"\\ * "-"??_-;_-@_-';
const FMT_TOTAL = '[$$-540A]#,##0';
const FMT_FECHA = 'mm-dd-yy'; // fecha corta según la configuración regional de Excel
const FILAS_VACIAS = 4;

const ORDEN_TIPO = { vaca: 1, toro: 2, novilla: 3, ternera: 4, ternero: 5 };
const PLURAL = { vaca: 'VACAS', toro: 'TOROS', novilla: 'NOVILLAS', ternero: 'TERNEROS', ternera: 'TERNEROS' };

const FINO = { style: 'thin' };
const GRUESO = { style: 'medium' };
const BORDE_FINO = { top: FINO, left: FINO, bottom: FINO, right: FINO };
const FUENTE = { name: 'Calibri', size: 11 };

export function renderExportPage(container) {
  container.innerHTML = `
    <div class="card" style="max-width: 750px; margin: 0 auto;">
      <div class="card-header">
        <h2>Exportar relación de ganado a Excel</h2>
      </div>
      <div class="card-body">
        <p style="font-size:14px; color:var(--text-secondary); margin-bottom:20px; line-height:1.5;">
          Genera la planilla con el mismo formato de la relación de la finca: N°, peso de entrada,
          precio por kilo, precio total (calculado con fórmula), tipo, nombre y observaciones.
          Los animales que ingresaron este año van aparte, en la franja amarilla.
        </p>

        <form id="export-form">
          <div class="form-group" style="background:var(--brown-100); border:2px solid var(--brown-300); padding:16px;">
            <label class="form-label" style="margin-bottom:12px;">Grupos a incluir:</label>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-vacas" checked />
                <span><strong>Vacas</strong></span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-toros" checked />
                <span><strong>Toros</strong></span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-novillas" checked />
                <span><strong>Novillas y terneros</strong></span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-vendidos" checked />
                <span><strong>Vendidos</strong> (hoja aparte, con peso y precio de salida)</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-perdidos" checked />
                <span><strong>Eliminados</strong> (hoja aparte)</span>
              </label>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
            <button type="submit" class="btn btn-primary btn-lg" style="padding:14px 28px; font-size:16px;">
              Descargar Excel (.xlsx)
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.querySelector('#export-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const options = {
      vacas: container.querySelector('#chk-vacas').checked,
      toros: container.querySelector('#chk-toros').checked,
      novillas: container.querySelector('#chk-novillas').checked,
      vendidos: container.querySelector('#chk-vendidos').checked,
      perdidos: container.querySelector('#chk-perdidos').checked,
    };

    if (!Object.values(options).some(Boolean)) {
      showToast('Seleccione al menos un grupo para exportar', 'error');
      return;
    }

    await exportToExcel(options);
  });
}

export async function exportToExcel(options = { vacas: true, toros: true, novillas: true, vendidos: true, perdidos: true }) {
  if (typeof window.ExcelJS === 'undefined') {
    showToast('No se pudo cargar el generador de Excel. Revise la conexión a internet.', 'error');
    return;
  }

  showLoading();
  try {
    const [activos, vendidos, perdidos] = await Promise.all([
      getAnimales({ estado: 'activo' }),
      options.vendidos ? getVendidos() : Promise.resolve([]),
      options.perdidos ? getPerdidos() : Promise.resolve([]),
    ]);

    const wb = buildWorkbook({ activos, vendidos, perdidos }, options);
    const buffer = await wb.xlsx.writeBuffer();
    const fecha = fechaISO(new Date());
    descargar(buffer, `Relacion_Ganado_Angel_Maria_${fecha}.xlsx`);
    showToast('Archivo Excel descargado', 'success');
  } catch (err) {
    console.error(err);
    showToast('Error generando el Excel: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}

/**
 * Arma el libro de Excel. Separado de la descarga para poder probarlo con datos de ejemplo.
 * @param {{activos:Array, vendidos:Array, perdidos:Array}} data
 * @param {object} options
 * @param {Date} [hoy]
 */
export function buildWorkbook(data, options, hoy = new Date()) {
  const wb = new window.ExcelJS.Workbook();
  wb.creator = 'Finca Angel Maria';
  wb.created = hoy;
  const year = hoy.getFullYear();

  // ── Hoja principal: animales activos ──
  const incluir = (a) =>
    (options.vacas && a.tipo === 'vaca') ||
    (options.toros && a.tipo === 'toro') ||
    (options.novillas && ['novilla', 'ternero', 'ternera'].includes(a.tipo));

  const activos = (data.activos || []).filter(incluir).sort(ordenar);
  const esDeEsteAno = (a) => a.fecha_ingreso && Number(String(a.fecha_ingreso).slice(0, 4)) === year;
  const anteriores = activos.filter((a) => !esDeEsteAno(a)).map(filaActivo);
  const nuevos = activos.filter(esDeEsteAno);

  const bloques = [{ titulo: null, filas: anteriores }];
  if (nuevos.length) {
    bloques.push({ titulo: `${tituloGrupo(nuevos)} RELACION ${year}`, filas: nuevos.map(filaActivo) });
  }
  hojaRelacion(wb, `Relación ${year}`, TITULO, ENCABEZADOS, bloques, hoy);

  // ── Vendidos ──
  if (options.vendidos && data.vendidos?.length) {
    const filas = [...data.vendidos].sort(ordenar).map((a) => {
      const v = a.ventas?.[0] || {};
      const obs = ['Vendido', v.fecha_venta ? `el ${fechaCorta(v.fecha_venta)}` : '', v.comprador ? `a ${v.comprador}` : '']
        .filter(Boolean).join(' ');
      return {
        numero: a.numero, peso: v.peso_salida, total: v.precio_venta,
        tipo: a.tipo, nombre: a.nombre, obs: unir(obs, a.hierro, v.nota),
      };
    });
    hojaRelacion(wb, 'Vendidos', 'ANIMALES VENDIDOS FINCA ANGEL MARIA UVER QUINTERO',
      ['N°', 'PESO KG salida', 'precio venta', 'precio total', 'tipo', 'nombre', 'observaciones'],
      [{ titulo: null, filas }], hoy);
  }

  // ── Eliminados ──
  if (options.perdidos && data.perdidos?.length) {
    const filas = [...data.perdidos].sort(ordenar).map(filaActivo);
    hojaRelacion(wb, 'Eliminados', 'ANIMALES ELIMINADOS FINCA ANGEL MARIA UVER QUINTERO', ENCABEZADOS,
      [{ titulo: null, filas }], hoy);
  }

  return wb;
}

// ─── Construcción de una hoja con el formato de la relación ───────────────

function hojaRelacion(wb, nombreHoja, titulo, encabezados, bloques, hoy) {
  const ws = wb.addWorksheet(nombreHoja, {
    pageSetup: { paperSize: 1, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = ANCHOS.map((width) => ({ width }));
  ws.properties.defaultRowHeight = 15;

  // Título: A1:G4 combinado, letra 16, centrado, marco grueso.
  // Los bordes se ponen ANTES de combinar: al combinar, ExcelJS comparte un solo estilo
  // entre todas las celdas y el marco quedaría incompleto.
  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 7; c++) {
      const b = {};
      if (r === 1) b.top = GRUESO;
      if (r === 4) b.bottom = GRUESO;
      if (c === 1) b.left = GRUESO;
      if (c === 7) b.right = GRUESO;
      ws.getCell(r, c).style = { font: { ...FUENTE }, border: b };
    }
  }
  const t = ws.getCell('A1');
  t.value = titulo;
  t.style = {
    font: { ...FUENTE, size: 16 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: GRUESO, left: GRUESO },
  };
  if (typeof ws.mergeCellsWithoutStyle === 'function') ws.mergeCellsWithoutStyle('A1:G4');
  else ws.mergeCells('A1:G4');
  ws.getRow(4).height = 15.75;

  // Encabezados (fila 5)
  const h = ws.getRow(5);
  h.height = 34.5;
  encabezados.forEach((txt, i) => {
    const c = h.getCell(i + 1);
    c.value = txt;
    c.font = FUENTE;
    c.alignment = { vertical: 'middle', wrapText: true };
    c.border = BORDE_FINO;
  });

  let r = 6;
  for (const bloque of bloques) {
    if (bloque.titulo) {
      ws.mergeCells(r, 1, r, 7);
      const c = ws.getCell(r, 1);
      c.value = bloque.titulo;
      c.font = FUENTE;
      c.alignment = { horizontal: 'center' };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
      for (let col = 1; col <= 7; col++) ws.getCell(r, col).border = BORDE_FINO;
      r++;
    }
    for (const f of bloque.filas) {
      escribirFila(ws, r, f);
      r++;
    }
  }
  const ultimaFilaDatos = r - 1;
  if (ultimaFilaDatos >= 6) {
    ws.autoFilter = { from: { row: 5, column: 5 }, to: { row: ultimaFilaDatos, column: 5 } };
  }

  // Filas vacías con borde para anotar a mano
  for (let i = 0; i < FILAS_VACIAS; i++, r++) escribirFila(ws, r, null);

  // Fecha al pie, columna G, marco grueso
  const fc = ws.getCell(r, 7);
  fc.value = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  fc.numFmt = FMT_FECHA;
  fc.font = FUENTE;
  fc.border = { top: GRUESO, left: GRUESO, bottom: GRUESO, right: GRUESO };
  ws.getRow(r).height = 15.75;

  return ws;
}

function escribirFila(ws, r, f) {
  const row = ws.getRow(r);
  for (let col = 1; col <= 7; col++) {
    const c = row.getCell(col);
    c.font = FUENTE;
    c.border = BORDE_FINO;
  }
  row.getCell(3).numFmt = FMT_PRECIO_KG;
  row.getCell(4).numFmt = FMT_TOTAL;
  if (!f) return;

  const peso = num(f.peso);
  const total = num(f.total);
  row.getCell(1).value = num(f.numero);
  row.getCell(2).value = peso;
  if (peso && total) {
    // precio por kilo = total / peso, y el total queda como fórmula =B*C (como en la planilla)
    const precioKg = total / peso;
    row.getCell(3).value = precioKg;
    row.getCell(4).value = { formula: `B${r}*C${r}`, result: total };
  } else {
    row.getCell(3).value = null;
    row.getCell(4).value = total;
  }
  row.getCell(3).alignment = { horizontal: 'right' };
  row.getCell(5).value = f.tipo || null;
  row.getCell(6).value = f.nombre || null;
  row.getCell(7).value = f.obs || null;
}

// ─── Utilidades ──────────────────────────────────────────────────────────

function filaActivo(a) {
  return {
    numero: a.numero,
    peso: a.peso_entrada,
    total: a.valor_compra,
    tipo: a.tipo,
    nombre: a.nombre,
    obs: unir(a.hierro, a.observaciones),
  };
}

function ordenar(a, b) {
  return (ORDEN_TIPO[a.tipo] || 9) - (ORDEN_TIPO[b.tipo] || 9) || (a.numero || 0) - (b.numero || 0);
}

function tituloGrupo(animales) {
  const grupos = [...new Set(animales.map((a) => PLURAL[a.tipo]).filter(Boolean))];
  if (grupos.length <= 1) return grupos[0] || 'ANIMALES';
  return grupos.slice(0, -1).join(', ') + ' Y ' + grupos[grupos.length - 1];
}

function unir(...partes) {
  return partes.map((p) => (p == null ? '' : String(p).trim())).filter(Boolean).join(', ');
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fechaISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaCorta(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : String(iso);
}

function descargar(buffer, nombre) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

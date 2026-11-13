// excel.js — Generador y exportador exacto de Excel (.xlsx) con SheetJS
import { getAnimales, getVendidos, getPerdidos } from './db.js';
import { showToast, showLoading, hideLoading } from './ui.js';

export function renderExportPage(container) {
  container.innerHTML = `
    <div class="card" style="max-width: 750px; margin: 0 auto;">
      <div class="card-header">
        <h2> Exportar Relación de Ganado a Excel</h2>
      </div>
      <div class="card-body">
        <p style="font-size:14px; color:var(--text-secondary); margin-bottom:20px; line-height:1.5;">
          Genera un archivo Excel (.xlsx) estructurado exactamente con el formato de la 
          <strong>Finca Guatavita</strong>, organizado por categorías (Vacas, Toros, Novillas/Terneros, Vendidos y Perdidos), 
          con el cálculo de peso, precio unitario de entrada y valor total.
        </p>

        <form id="export-form">
          <div class="form-group" style="background:var(--brown-100); border:2px solid var(--brown-300); padding:16px;">
            <label class="form-label" style="margin-bottom:12px;">Seleccione los grupos a incluir en el reporte:</label>
            <div style="display:flex; flex-direction:column; gap:10px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-vacas" checked />
                <span><strong>Vacas Activas</strong></span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-toros" checked />
                <span><strong>Toros Activos</strong></span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-novillas" checked />
                <span><strong>Novillas y Terneros Activos</strong></span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-vendidos" checked />
                <span><strong>Animales Vendidos</strong> (con peso de salida y precio final)</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="chk-perdidos" checked />
                <span><strong>Animales Perdidos / Bajas</strong></span>
              </label>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
            <button type="submit" class="btn btn-primary btn-lg" style="padding:14px 28px; font-size:16px;">
               Descargar Archivo Excel (.xlsx)
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

    if (!options.vacas && !options.toros && !options.novillas && !options.vendidos && !options.perdidos) {
      showToast('Seleccione al menos una categoría para exportar', 'error');
      return;
    }

    await exportToExcel(options);
  });
}

/**
 * Genera el archivo Excel idéntico al formato solicitado por el usuario:
 * RELACION GANADO FINCA GUATAVITA UVER QUINTERO
 * N° | PESO KG entrada | precio entrada | precio total | tipo | nombre | observaciones
 */
export async function exportToExcel(options = { vacas: true, toros: true, novillas: true, vendidos: true, perdidos: true }) {
  if (typeof window.XLSX === 'undefined') {
    showToast('Biblioteca SheetJS no cargada', 'error');
    return;
  }

  showLoading();
  try {
    const [activos, vendidos, perdidos] = await Promise.all([
      getAnimales({ estado: 'activo' }),
      options.vendidos ? getVendidos() : Promise.resolve([]),
      options.perdidos ? getPerdidos() : Promise.resolve([])
    ]);

    const wb = window.XLSX.utils.book_new();

    // Hoja principal: Inventario Activo
    const rows = [];
    rows.push(['RELACION GANADO FINCA GUATAVITA UVER QUINTERO', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['', '', '', '', '', '', '']);
    rows.push(['N°', 'PESO KG entrada', 'precio entrada', 'precio total', 'tipo', 'nombre', 'observaciones']);

    let rowIndex = 6; // fila base en Excel (1-indexed)

    // 1. Vacas
    if (options.vacas) {
      const vacas = activos.filter(a => a.tipo === 'vaca');
      vacas.forEach(a => {
        const peso = a.peso_entrada || 0;
        const precioEntrada = peso > 0 && a.valor_compra ? Math.round(a.valor_compra / peso) : (a.valor_compra || 0);
        const valorTotal = a.valor_compra || (peso * precioEntrada);

        rows.push([
          a.numero,
          peso,
          precioEntrada,
          valorTotal,
          a.tipo,
          a.nombre,
          a.observaciones || ''
        ]);
        rowIndex++;
      });
    }

    // 2. Toros
    if (options.toros) {
      const toros = activos.filter(a => a.tipo === 'toro');
      if (toros.length > 0) {
        rows.push(['TOROS RELACION', '', '', '', '', '', '']);
        rowIndex++;
        toros.forEach(a => {
          const peso = a.peso_entrada || 0;
          const precioEntrada = peso > 0 && a.valor_compra ? Math.round(a.valor_compra / peso) : (a.valor_compra || 0);
          const valorTotal = a.valor_compra || (peso * precioEntrada);

          rows.push([
            a.numero,
            peso,
            precioEntrada,
            valorTotal,
            a.tipo,
            a.nombre,
            a.observaciones || ''
          ]);
          rowIndex++;
        });
      }
    }

    // 3. Novillas y Terneros
    if (options.novillas) {
      const menores = activos.filter(a => a.tipo === 'novilla' || a.tipo === 'ternero' || a.tipo === 'ternera');
      if (menores.length > 0) {
        const year = new Date().getFullYear();
        rows.push([`NOVILLAS Y TERNEROS RELACION ${year}`, '', '', '', '', '', '']);
        rowIndex++;
        menores.forEach(a => {
          const peso = a.peso_entrada || 0;
          const precioEntrada = peso > 0 && a.valor_compra ? Math.round(a.valor_compra / peso) : (a.valor_compra || 0);
          const valorTotal = a.valor_compra || (peso * precioEntrada);

          rows.push([
            a.numero,
            peso,
            precioEntrada,
            valorTotal,
            a.tipo,
            a.nombre,
            a.observaciones || ''
          ]);
          rowIndex++;
        });
      }
    }

    // Fecha al final de la relación
    const todayStr = new Date().toISOString().split('T')[0];
    rows.push(['', '', '', '', '', '', todayStr]);

    const wsPrincipal = window.XLSX.utils.aoa_to_sheet(rows);
    window.XLSX.utils.book_append_sheet(wb, wsPrincipal, 'Inventario Activo');

    // Hoja adicional: Vendidos
    if (options.vendidos && vendidos && vendidos.length > 0) {
      const soldRows = [
        ['ANIMALES VENDIDOS — FINCA GUATAVITA', '', '', '', '', '', '', ''],
        ['N°', 'Nombre', 'Tipo', 'Peso Entrada (kg)', 'Peso Salida (kg)', 'Precio Venta ($)', 'Fecha Venta', 'Comprador']
      ];

      vendidos.forEach(a => {
        const v = a.ventas && a.ventas.length > 0 ? a.ventas[0] : null;
        soldRows.push([
          a.numero,
          a.nombre,
          a.tipo,
          a.peso_entrada || '',
          v?.peso_salida || 'Sin pesar',
          v?.precio_venta || 0,
          v?.fecha_venta || '',
          v?.comprador || ''
        ]);
      });

      const wsVendidos = window.XLSX.utils.aoa_to_sheet(soldRows);
      window.XLSX.utils.book_append_sheet(wb, wsVendidos, 'Vendidos');
    }

    // Hoja adicional: Perdidos
    if (options.perdidos && perdidos && perdidos.length > 0) {
      const lostRows = [
        ['ANIMALES PERDIDOS / BAJAS — FINCA GUATAVITA', '', '', '', ''],
        ['N°', 'Nombre', 'Tipo', 'Fecha Registro', 'Observaciones / Motivo']
      ];

      perdidos.forEach(a => {
        lostRows.push([
          a.numero,
          a.nombre,
          a.tipo,
          a.updated_at ? a.updated_at.split('T')[0] : '',
          a.observaciones || ''
        ]);
      });

      const wsPerdidos = window.XLSX.utils.aoa_to_sheet(lostRows);
      window.XLSX.utils.book_append_sheet(wb, wsPerdidos, 'Perdidos');
    }

    // Descargar archivo
    window.XLSX.writeFile(wb, `Relacion_Ganado_Guatavita_${todayStr}.xlsx`);
    showToast('Archivo Excel descargado exitosamente', 'success');

  } catch (err) {
    console.error(err);
    showToast('Error generando archivo Excel: ' + err.message, 'error');
  } finally {
    hideLoading();
  }
}


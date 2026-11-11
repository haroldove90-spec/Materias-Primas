// Utility functions for exporting application data to Excel (CSV with UTF-8 BOM) and PDF (jsPDF + autoTable)
// as well as iframe-based isolated printing (guaranteed to work in iframe & bypass popup blockers)

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleNote, TransferSheet } from '../types';
import { MIAULOO_LOGO_BASE64 } from './miaulooLogoBase64';

export const MIAULOO_LOGO = 'https://mwtzisudncwrlsizmgap.supabase.co/storage/v1/object/public/logo/miauloo.png';

// ============================================================================
// 1. EXPORT TO EXCEL (CSV with UTF-8 BOM)
// ============================================================================
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string,
  columns?: { key: string; label: string }[]
) {
  if (!data || data.length === 0) {
    console.warn('No hay datos para exportar.');
    return;
  }

  // Determine columns
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key.toUpperCase() }));

  // Create CSV Header
  const headerRow = cols.map(c => `"${String(c.label).replace(/"/g, '""')}"`).join(',');

  // Create CSV Rows
  const bodyRows = data.map(row => {
    return cols.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = JSON.stringify(val);
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',');
  });

  // Combine with UTF-8 BOM so Excel opens with correct Spanish accents (ñ, á, é, etc.)
  const csvContent = '\uFEFF' + [headerRow, ...bodyRows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// 2. ISOLATED IFRAME PRINT ENGINE (Works in any iframe / browser, 0 popup issues)
// ============================================================================
export function printElement(
  elementOrHtml: string | HTMLElement,
  title: string = 'Documento de Impresión'
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Remove any previous print iframes
      const oldIframe = document.getElementById('miauloo-print-iframe');
      if (oldIframe && oldIframe.parentNode) {
        oldIframe.parentNode.removeChild(oldIframe);
      }

      // Create an invisible but fully dimensioned iframe at origin (0,0)
      // CRITICAL: NEVER use visibility: hidden or width: 0 / height: 0,
      // and NEVER use left: -10000px (Blink calculates negative print bounds -> blank page)!
      const iframe = document.createElement('iframe');
      iframe.id = 'miauloo-print-iframe';
      iframe.setAttribute(
        'style',
        'position: fixed; top: 0; left: 0; width: 100%; height: 100%; border: none; opacity: 0.001; pointer-events: none; z-index: -999999;'
      );
      document.body.appendChild(iframe);

      let contentHtml = '';
      if (typeof elementOrHtml === 'string') {
        const trimmed = elementOrHtml.trim();
        if (trimmed.startsWith('<')) {
          contentHtml = trimmed;
        } else {
          const el = document.getElementById(elementOrHtml);
          if (el) {
            contentHtml = el.innerHTML;
          } else {
            console.warn(`Element with ID "${elementOrHtml}" not found in DOM.`);
            contentHtml = `<div style="padding: 20px; font-family: sans-serif;"><h3>Documento: ${title}</h3><p>Contenido no disponible para impresión directa.</p></div>`;
          }
        }
      } else if (elementOrHtml && elementOrHtml.innerHTML) {
        contentHtml = elementOrHtml.innerHTML;
      }

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        window.print();
        resolve(true);
        return;
      }

      const fullPrintHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>${title} - MIAULOO</title>
          <style>
            @page {
              size: auto;
              margin: 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              visibility: visible !important;
              opacity: 1 !important;
              display: block !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 5px 8px;
              text-align: left;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .border { border: 1px solid #cbd5e1; }
            .border-b { border-bottom: 1px solid #cbd5e1; }
            .border-t { border-top: 1px solid #cbd5e1; }
            .border-r { border-right: 1px solid #cbd5e1; }
            .rounded { border-radius: 4px; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .bg-amber-50 { background-color: #fffbeb !important; }
            .text-red-600 { color: #dc2626 !important; }
            .text-blue-900 { color: #1e3a8a !important; }
            .bg-blue-900 { background-color: #1e3a8a !important; color: #ffffff !important; }
            .print\\:hidden, button {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(fullPrintHtml);
      iframeDoc.close();

      const doPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 4000);
          resolve(true);
        } catch (e) {
          console.error('Error during iframe printing:', e);
          window.print();
          resolve(false);
        }
      };

      // Wait for any images in the iframe to finish loading before triggering print preview
      const images = Array.from(iframeDoc.images || []);
      if (images.length === 0 || images.every(img => img.complete)) {
        setTimeout(doPrint, 250);
      } else {
        let remaining = images.length;
        const handleImageDone = () => {
          remaining--;
          if (remaining <= 0) {
            setTimeout(doPrint, 150);
          }
        };
        images.forEach(img => {
          if (img.complete) {
            remaining--;
          } else {
            img.onload = handleImageDone;
            img.onerror = handleImageDone;
          }
        });
        if (remaining <= 0) {
          setTimeout(doPrint, 150);
        } else {
          // Safety timeout so print never hangs indefinitely
          setTimeout(doPrint, 1200);
        }
      }
    } catch (err) {
      console.error('Print iframe init error:', err);
      window.print();
      resolve(false);
    }
  });
}

// ============================================================================
// 3. EXPORT TABLE REPORT TO PDF (Generates true .pdf and downloads immediately)
// ============================================================================
export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  fileName?: string
) {
  if (!rows || rows.length === 0) {
    console.warn('No hay datos para exportar.');
    return;
  }

  const orientation = columns.length > 5 ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(3, 43, 78); // #032B4E
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Miauloo Logo (PNG base64: ratio ~0.815 -> width 14mm, height 17mm)
  try {
    if (MIAULOO_LOGO_BASE64) {
      doc.addImage(MIAULOO_LOGO_BASE64, 'PNG', 12, 3.5, 14, 17);
    }
  } catch (err) {
    console.warn('Could not render logo in table PDF header:', err);
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('MIAULOO ERP • ' + title.toUpperCase(), 30, 11);

  // Subtitle / Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generado el: ${dateStr} • Registros totales: ${rows.length}`, 30, 17);

  // AutoTable
  autoTable(doc, {
    startY: 28,
    head: [columns],
    body: rows.map(r => r.map(c => (c !== null && c !== undefined ? String(c) : ''))),
    theme: 'striped',
    headStyles: {
      fillColor: [3, 43, 78],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 12, right: 12 }
  });

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages} • Documento Oficial Sistema ERP Miauloo`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const safeFileName = (fileName || title.replace(/[^a-zA-Z0-9_-]/g, '_')) + '.pdf';
  doc.save(safeFileName);
}

/**
 * Direct printer layout for any tabular report or list across all ERP modules
 */
export function printTableReport(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  docTitle?: string
) {
  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const tableHtml = `
    <div style="font-family: system-ui, sans-serif; padding: 20px; color: #0f172a; max-width: 1000px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #032b4e; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${MIAULOO_LOGO_BASE64 || MIAULOO_LOGO}" alt="Miauloo" style="height: 48px; width: auto; object-fit: contain;" />
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #032b4e; text-transform: uppercase; letter-spacing: 0.5px;">MIAULOO ERP</h1>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: 700;">${title.toUpperCase()}</p>
          </div>
        </div>
        <div style="text-align: right; font-size: 11px; color: #475569;">
          <div><strong>Fecha de emisión:</strong> ${dateStr}</div>
          <div><strong>Total de registros:</strong> ${rows.length}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 20px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #032b4e; color: #ffffff;">
            ${columns.map(c => `<th style="padding: 8px 10px; text-align: left; font-weight: bold; border-right: 1px solid #1e40af; font-size: 10px; text-transform: uppercase;">${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              ${row.map(cell => `<td style="padding: 7px 10px; border-right: 1px solid #e2e8f0;">${cell !== null && cell !== undefined ? String(cell) : ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 9.5px; color: #94a3b8;">
        Documento Oficial emitido por Sistema ERP Miauloo • San Juan del Río, Qro. • Tel: 427 116 9640
      </div>
    </div>
  `;

  return printElement(tableHtml, docTitle || title);
}

// ============================================================================
// 4. PRINT AND PDF EXPORT FOR INDIVIDUAL SALE NOTES (NOTAS DE VENTA MIAULOO)
// ============================================================================

export function exportSaleNoteToPDF(note: SaleNote) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(30, 58, 138); // #1E3A8A
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Miauloo Logo (PNG base64)
  try {
    if (MIAULOO_LOGO_BASE64) {
      doc.addImage(MIAULOO_LOGO_BASE64, 'PNG', 12, 3, 14, 17);
    }
  } catch (err) {
    console.warn('Could not render logo in sale note PDF:', err);
  }

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('MIAULOO', 30, 11);

  // Verse / slogan
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(224, 242, 254);
  doc.text('"PURIFICAME CON HISOPO, Y SERÉ LIMPIO; LÁVAME, Y SERÉ MÁS BLANCO QUE LA NIEVE"', 30, 18);

  // Red Note badge
  doc.setFillColor(254, 242, 242);
  doc.rect(pageWidth - 65, 5, 50, 14, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.rect(pageWidth - 65, 5, 50, 14, 'D');

  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NOTA DE VENTA', pageWidth - 40, 10, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`No. ${note.noteNo}`, pageWidth - 40, 16, { align: 'center' });

  // Client info card
  doc.setFillColor(254, 243, 199); // amber-50
  doc.setDrawColor(251, 191, 36);
  doc.rect(14, 30, pageWidth - 28, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('CLIENTE:', 18, 37);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(note.clientName.toUpperCase(), 38, 37);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('FECHA:', pageWidth - 70, 37);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(note.date, pageWidth - 52, 37);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TELÉFONO:', 18, 45);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(note.phone || '4271169640', 40, 45);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('CIUDAD:', pageWidth - 70, 45);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(note.city || 'San Juan del Río, Qro.', pageWidth - 52, 45);

  // Items Table
  const tableData = note.items.map(it => [
    String(it.pieces || 0),
    (it.product || '').toUpperCase(),
    `$${Number(it.unitPrice || 0).toFixed(2)}`,
    `$${Number(it.total || 0).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['PIEZA', 'DESCRIPCIÓN DEL PRODUCTO', 'PRECIO UNITARIO', 'IMPORTE']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 }
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [15, 23, 42]
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // Summary totals box
  const totalsBoxX = pageWidth - 75;
  const totalsBoxY = finalY + 8;
  
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(totalsBoxX, totalsBoxY, 61, 24, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('SUBTOTAL:', totalsBoxX + 4, totalsBoxY + 6);
  doc.text(`$${Number(note.subtotal || 0).toFixed(2)}`, totalsBoxX + 57, totalsBoxY + 6, { align: 'right' });

  doc.text('IVA (0% / Exento):', totalsBoxX + 4, totalsBoxY + 12);
  doc.text('$0.00', totalsBoxX + 57, totalsBoxY + 12, { align: 'right' });

  doc.setFillColor(30, 58, 138);
  doc.rect(totalsBoxX, totalsBoxY + 15, 61, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('TOTAL:', totalsBoxX + 4, totalsBoxY + 21);
  doc.text(`$${Number(note.total || 0).toFixed(2)}`, totalsBoxX + 57, totalsBoxY + 21, { align: 'right' });

  // Notes if available
  if (note.notes) {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, totalsBoxY, pageWidth - 95, 24, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('OBSERVACIONES:', 18, totalsBoxY + 6);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(note.notes, pageWidth - 103);
    doc.text(splitNotes, 18, totalsBoxY + 12);
  }

  // Signatures
  const signY = totalsBoxY + 40;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, signY, 85, signY);
  doc.line(pageWidth - 85, signY, pageWidth - 25, signY);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('RECIBÍ DE CONFORMIDAD (CLIENTE)', 55, signY + 5, { align: 'center' });
  doc.text('ENTREGADO POR (MIAULOO)', pageWidth - 55, signY + 5, { align: 'center' });

  // Contact Footer
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('MIAULOO - Soluciones Integrales de Abasto • Tel: 427 116 9640 • San Juan del Río, Qro.', pageWidth / 2, footerY, { align: 'center' });

  const fileName = `Nota_Venta_${note.noteNo.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

export function printSaleNoteReceipt(note: SaleNote) {
  const htmlContent = `
    <div style="max-width: 800px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; color: #0f172a;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1E3A8A; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${MIAULOO_LOGO_BASE64 || MIAULOO_LOGO}" alt="Miauloo" style="height: 48px; width: auto; object-fit: contain;" onerror="this.style.display='none'" />
          <div>
            <h1 style="font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #1E3A8A; margin: 0; font-family: serif; text-transform: uppercase;">
              MIAULOO
            </h1>
            <p style="font-size: 8px; font-style: italic; font-weight: 600; color: #164e63; margin: 2px 0 0 0;">
              "PURIFICAME CON HISOPO, Y SERÉ LIMPIO; LÁVAME, Y SERÉ MÁS BLANCO QUE LA NIEVE"
            </p>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="background: #1E3A8A; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 13px; display: inline-block;">
            NOTA DE VENTA
          </div>
          <div style="color: #dc2626; font-weight: 900; font-size: 17px; margin-top: 4px;">
            No. ${note.noteNo}
          </div>
          <div style="font-size: 10px; font-weight: 600; color: #475569; margin-top: 2px;">
            FECHA: <u>${note.date}</u>
          </div>
        </div>
      </div>

      <!-- Client Info -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px;">
        <div style="margin-bottom: 4px;">
          <strong style="color: #1E3A8A;">NOMBRE:</strong>
          <span style="font-weight: 700; text-transform: uppercase; margin-left: 6px;">${note.clientName}</span>
        </div>
        <div style="display: flex; gap: 24px;">
          <div>
            <strong style="color: #1E3A8A;">TELÉFONO:</strong>
            <span style="margin-left: 4px;">${note.phone || '4271169640'}</span>
          </div>
          <div>
            <strong style="color: #1E3A8A;">CIUDAD:</strong>
            <span style="margin-left: 4px;">${note.city || 'San Juan del Río, Qro.'}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #1E3A8A; border-radius: 4px; overflow: hidden;">
        <thead>
          <tr style="background: #1E3A8A; color: white; font-weight: bold; font-size: 10px; text-transform: uppercase;">
            <th style="padding: 8px; text-align: center; width: 60px; border-right: 1px solid #1e40af;">PIEZA</th>
            <th style="padding: 8px; text-align: left; border-right: 1px solid #1e40af;">PRODUCTO</th>
            <th style="padding: 8px; text-align: right; width: 100px; border-right: 1px solid #1e40af;">P.U</th>
            <th style="padding: 8px; text-align: right; width: 100px;">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          ${note.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 7px; text-align: center; border-right: 1px solid #e2e8f0; font-weight: 600;">${it.pieces || 0}</td>
              <td style="padding: 7px; border-right: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase;">${it.product || ''}</td>
              <td style="padding: 7px; text-align: right; border-right: 1px solid #e2e8f0;">$${Number(it.unitPrice || 0).toFixed(2)}</td>
              <td style="padding: 7px; text-align: right; font-weight: 900; color: #0f172a;">$${Number(it.total || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals & Notes -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div style="max-width: 450px;">
          ${note.notes ? `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 4px; font-size: 10px; color: #475569;">
              <strong style="color: #0f172a;">Observaciones:</strong> ${note.notes}
            </div>
          ` : '<div></div>'}
        </div>

        <div style="width: 220px; border: 1px solid #1E3A8A; border-radius: 4px; overflow: hidden; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">
            <span style="font-weight: 600;">SUBTOTAL:</span>
            <span>$${Number(note.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">
            <span>IVA:</span>
            <span>$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: #1E3A8A; color: white; font-weight: 900; font-size: 13px;">
            <span>TOTAL:</span>
            <span>$${Number(note.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- Signatures -->
      <div style="display: flex; justify-content: space-around; margin-top: 40px; margin-bottom: 30px; text-align: center; font-size: 9px; color: #64748b;">
        <div>
          <div style="width: 180px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px;"></div>
          <span>RECIBÍ DE CONFORMIDAD (CLIENTE)</span>
        </div>
        <div>
          <div style="width: 180px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px;"></div>
          <span>ENTREGADO POR (MIAULOO)</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 9px; color: #64748b;">
        MIAULOO • Soluciones Integrales de Abasto • Tel: 427 116 9640 • San Juan del Río, Qro.
      </div>
    </div>
  `;

  return printElement(htmlContent, `Nota_Venta_${note.noteNo}`);
}

// ============================================================================
// 5. PRINT AND PDF EXPORT FOR TRANSFER SHEETS (HOJAS DE TRASLADO)
// ============================================================================

export function exportTransferSheetToPDF(sheet: TransferSheet) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Top header banner
  doc.setFillColor(11, 37, 69); // #0B2545
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Miauloo Logo (PNG base64)
  try {
    if (MIAULOO_LOGO_BASE64) {
      doc.addImage(MIAULOO_LOGO_BASE64, 'PNG', 12, 2.5, 13, 16);
    }
  } catch (err) {
    console.warn('Could not render logo in transfer sheet PDF:', err);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('HOJA DE TRASLADO DE PRODUCTOS', 28, 11);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('MIAULOO • Control Logístico de Mercancía en Tránsito', 28, 16.5);

  // Folio badge
  doc.setFillColor(238, 242, 255);
  doc.rect(pageWidth - 60, 4, 46, 14, 'F');
  doc.setTextColor(11, 37, 69);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FOLIO:', pageWidth - 37, 9, { align: 'center' });
  doc.setFontSize(11);
  doc.text(sheet.folio, pageWidth - 37, 15, { align: 'center' });

  // Metadata Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, 26, pageWidth - 28, 30, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE DESTINO:', 18, 32);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(sheet.clientName, 48, 32);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('FECHA:', pageWidth - 70, 32);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(sheet.date, pageWidth - 54, 32);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DESTINO:', 18, 39);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(sheet.destination || 'Entrega a domicilio', 35, 39);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('OPERADOR:', 18, 46);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(sheet.operator || 'No asignado', 38, 46);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('PLACAS:', pageWidth - 70, 46);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(sheet.plateNo || 'S/P', pageWidth - 54, 46);

  // Items table
  const tableData = sheet.items.map(it => [
    `${it.quantity} ${it.unit}`,
    it.description,
    it.unitPrice !== undefined && it.unitPrice !== null ? `$${Number(it.unitPrice || 0).toFixed(2)}` : 'S/P',
    it.total !== undefined && it.total !== null ? `$${Number(it.total || 0).toFixed(2)}` : 'S/P'
  ]);

  autoTable(doc, {
    startY: 60,
    head: [['CANTIDAD', 'DESCRIPCIÓN DE MERCANCÍA / INSUMOS', 'P. UNITARIO', 'IMPORTE']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [11, 37, 69],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 130;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(11, 37, 69);
  doc.text(`TOTAL TRASLADO: $${Number(sheet.total || 0).toFixed(2)}`, pageWidth - 16, finalY + 10, { align: 'right' });

  doc.save(`Hoja_Traslado_${sheet.folio.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}

export function printTransferSheetReceipt(sheet: TransferSheet) {
  const htmlContent = `
    <div style="max-width: 820px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; color: #0f172a;">
      <div style="background: #0B2545; color: white; font-weight: 900; text-align: center; padding: 8px; font-size: 15px; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px 4px 0 0;">
        HOJA DE TRASLADO DE PRODUCTOS
      </div>

      <div style="display: flex; border: 1px solid #0B2545; border-top: none; font-size: 11px;">
        <div style="width: 35%; padding: 12px; border-right: 1px solid #0B2545; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #f8fafc;">
          <img src="${MIAULOO_LOGO_BASE64 || MIAULOO_LOGO}" alt="Miauloo" style="height: 48px; width: auto; object-fit: contain; margin-bottom: 6px;" />
          <div style="font-weight: 800; font-size: 9px; text-transform: uppercase; color: #0B2545; line-height: 1.2;">
            SOLUCIONES INTEGRALES DE ABASTO, LIMPIEZA Y RECOLECCION
          </div>
        </div>

        <div style="width: 65%; font-size: 10px;">
          <div style="display: flex; border-bottom: 1px solid #0B2545;">
            <div style="width: 50%; padding: 5px 8px; border-right: 1px solid #0B2545;"><strong>RFC:</strong> ${sheet.rfc || 'BAMN8611098PA'}</div>
            <div style="width: 50%; padding: 5px 8px;"><strong>E-MAIL:</strong> miauloosolucionesintegrales@gmail.com</div>
          </div>
          <div style="padding: 5px 8px; border-bottom: 1px solid #0B2545;">
            <strong>MOVIL:</strong> ${sheet.phone || '(52) 427 116 9640'}
          </div>
          <div style="padding: 5px 8px; border-bottom: 1px solid #0B2545;">
            <strong>Expedido en:</strong> Sta. Cruz 71, La Loma, 76804 San Juan del Río, Qro.
          </div>
          <div style="display: flex; border-bottom: 1px solid #0B2545;">
            <div style="width: 50%; padding: 5px 8px; border-right: 1px solid #0B2545;"><strong>Fecha:</strong> ${sheet.date}</div>
            <div style="width: 50%; padding: 5px 8px; font-weight: bold; color: #1e3a8a; background: #eff6ff;"><strong>Folio:</strong> ${sheet.folio}</div>
          </div>
          <div style="display: flex;">
            <div style="width: 50%; padding: 5px 8px; border-right: 1px solid #0B2545;"><strong>Lugar:</strong> ${sheet.expeditedIn || 'San Juan del Rio, Qro.'}</div>
            <div style="width: 50%; padding: 5px 8px;"><strong>Elaborado por:</strong> ${sheet.elaboratedBy || 'Areli Antonia Mireles Cruz'}</div>
          </div>
        </div>
      </div>

      <div style="border: 1px solid #0B2545; border-top: none; padding: 10px; font-size: 10.5px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div><strong>Cliente:</strong> <span style="text-transform: uppercase; font-weight: bold;">${sheet.clientName}</span></div>
          <div><strong>Destino:</strong> <span style="text-transform: uppercase;">${sheet.destination || 'Entrega a domicilio'}</span></div>
        </div>
        <div style="display: flex; gap: 16px; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-bottom: 4px;">
          <div><strong>Dirección:</strong> ${sheet.address || 'N/A'}</div>
          <div><strong>C.P.:</strong> ${sheet.cp || 'N/A'}</div>
          <div><strong>Colonia:</strong> ${sheet.colonia || 'N/A'}</div>
        </div>
        <div style="display: flex; gap: 16px; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-bottom: 4px;">
          <div><strong>Régimen Fiscal:</strong> ${sheet.fiscalRegimen || 'General de Ley Personas Morales'}</div>
          <div><strong>Tel:</strong> ${sheet.phone || 'N/A'}</div>
        </div>
        <div style="display: flex; gap: 16px; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-bottom: 4px;">
          <div><strong>No. Cliente:</strong> ${sheet.clientNo || 'CL-001'}</div>
          <div><strong>RFC:</strong> ${sheet.rfc || 'XAXX010101000'}</div>
          <div><strong>CURP:</strong> ${sheet.curp || 'N/A'}</div>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-bottom: 4px;">
          <strong>Forma de Pago:</strong> ${sheet.paymentForm || 'Transferencia Electrónica'}
        </div>
        <div style="display: flex; gap: 20px; border-top: 1px solid #e2e8f0; padding-top: 4px; background: #f8fafc; padding: 4px 6px;">
          <div><strong>Operador:</strong> ${sheet.operator || 'No asignado'}</div>
          <div><strong>No. de Placas:</strong> ${sheet.plateNo || 'S/P'}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #0B2545; font-size: 10.5px;">
        <thead>
          <tr style="background: #0B2545; color: white; text-transform: uppercase; font-size: 9.5px;">
            <th style="padding: 7px; text-align: center; width: 65px; border-right: 1px solid #1e3a8a;">Cantidad</th>
            <th style="padding: 7px; text-align: center; width: 65px; border-right: 1px solid #1e3a8a;">Unidad</th>
            <th style="padding: 7px; text-align: left; border-right: 1px solid #1e3a8a;">Descripción</th>
            <th style="padding: 7px; text-align: right; width: 90px; border-right: 1px solid #1e3a8a;">P/U</th>
            <th style="padding: 7px; text-align: right; width: 100px;">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${sheet.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 6px; text-align: center; border-right: 1px solid #cbd5e1; font-weight: 600;">${it.quantity}</td>
              <td style="padding: 6px; text-align: center; border-right: 1px solid #cbd5e1; text-transform: uppercase;">${it.unit}</td>
              <td style="padding: 6px; border-right: 1px solid #cbd5e1; font-weight: 700; text-transform: uppercase;">${it.description}</td>
              <td style="padding: 6px; text-align: right; border-right: 1px solid #cbd5e1;">$${Number(it.unitPrice || 0).toFixed(2)}</td>
              <td style="padding: 6px; text-align: right; font-weight: 900;">$${Number(it.total || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
        <div style="width: 250px; border: 1px solid #0B2545; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #cbd5e1;">
            <strong>SUBTOTAL:</strong>
            <span>$${Number(sheet.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #cbd5e1; color: #64748b;">
            <span>I.V.A (0%):</span>
            <span>$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 7px 10px; background: #0B2545; color: white; font-weight: 900; font-size: 13px;">
            <span>TOTAL:</span>
            <span>$${Number(sheet.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style="border: 1px solid #0B2545; padding: 10px; margin-top: 12px; font-size: 9.5px; background: #f8fafc;">
        <p style="margin: 0 0 6px 0; line-height: 1.3;">
          <strong style="color: #b91c1c;">NOTA:</strong> Al momento de la entrega de su pedido, por favor revise que este sea correcto en cuanto a cantidad y producto de acuerdo a lo solicitado. En caso de que todo esté conforme, por favor agregue la siguiente leyenda: <strong>"Recibí mi pedido completo"</strong>, su nombre, firma y fecha.
        </p>
        ${sheet.notes ? `<div style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;"><strong>Observaciones:</strong> ${sheet.notes}</div>` : ''}

        <div style="margin-top: 35px; display: flex; justify-content: center; text-align: center;">
          <div style="width: 240px; border-top: 2px solid #0f172a; padding-top: 4px;">
            <div style="font-weight: bold; text-transform: uppercase;">${sheet.clientName}</div>
            <div style="color: #64748b; font-size: 9px;">Acepto de Conformidad (Firma)</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px;">
        MIAULOO • Soluciones Integrales de Abasto • San Juan del Río, Qro. • Tel: 427 116 9640
      </div>
    </div>
  `;

  return printElement(htmlContent, `Hoja_Traslado_${sheet.folio}`);
}


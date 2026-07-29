// Utility functions for exporting application data to Excel (CSV with UTF-8 BOM) and PDF (formatted printable HTML)

export function exportToExcel(
  data: Record<string, any>[],
  fileName: string,
  columns?: { key: string; label: string }[]
) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar.');
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

export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  fileName?: string
) {
  if (!rows || rows.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permita las ventanas emergentes (popups) para generar el PDF.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title} - MIAULOO ERP</title>
      <style>
        @page { size: A4 landscape; margin: 15mm; }
        body { font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0b2545; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 18px; font-weight: bold; color: #0b2545; margin: 0; text-transform: uppercase; }
        .subtitle { font-size: 10px; color: #64748b; margin-top: 4px; }
        .logo-box { background: #0b2545; color: white; padding: 6px 14px; font-weight: 900; font-size: 14px; border-radius: 4px; letter-spacing: 1px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th { background: #0b2545; color: white; text-align: left; padding: 8px 10px; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${title}</h1>
          <div class="subtitle">MIAULOO Soluciones Integrales - Reporte Generado: ${dateStr}</div>
        </div>
        <div class="logo-box">MIAULOO</div>
      </div>

      <table>
        <thead>
          <tr>
            ${columns.map(c => `<th>${c}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              ${r.map(cell => `<td>${cell !== null && cell !== undefined ? String(cell) : ''}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Documento Oficial generado desde Sistema ERP Miauloo. Documento Confidencial.
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

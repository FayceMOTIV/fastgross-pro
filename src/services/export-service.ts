/**
 * Export Service - PDF and Excel generation
 * Uses browser-native APIs for maximum compatibility
 */

// Types
export interface ExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: { start: Date; end: Date };
  includeCharts?: boolean;
  format: "pdf" | "csv" | "excel";
}

export interface ReportData {
  kpis: {
    label: string;
    value: string | number;
    variation?: number;
    unit?: string;
  }[];
  tables: {
    title: string;
    headers: string[];
    rows: (string | number)[][];
  }[];
  charts?: {
    title: string;
    type: "line" | "bar" | "pie";
    data: Record<string, unknown>[];
  }[];
}

export interface ClientReportData {
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
    type: string;
    createdAt: Date;
  };
  orders: {
    id: string;
    date: Date;
    total: number;
    status: string;
    items: { name: string; quantity: number; price: number }[];
  }[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrder: number;
    lastOrderDate: Date | null;
  };
}

export interface OrderReportData {
  order: {
    id: string;
    date: Date;
    client: string;
    status: string;
    deliveryAddress: string;
    notes?: string;
  };
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totals: {
    subtotal: number;
    tax: number;
    delivery: number;
    total: number;
  };
}

// Utility functions
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Generate HTML for PDF printing
function generatePDFHTML(
  title: string,
  content: string,
  options?: { subtitle?: string; dateRange?: { start: Date; end: Date } }
): string {
  const dateRangeStr = options?.dateRange
    ? `Du ${formatDate(options.dateRange.start)} au ${formatDate(options.dateRange.end)}`
    : formatDate(new Date());

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #1a1a1a;
          padding: 20mm;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e5e5;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #16a34a;
        }
        .logo span {
          color: #1a1a1a;
        }
        .report-info {
          text-align: right;
        }
        .report-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .report-subtitle {
          color: #666;
          font-size: 14px;
        }
        .report-date {
          color: #888;
          font-size: 11px;
          margin-top: 5px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #16a34a;
          margin-bottom: 15px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e5e5e5;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }
        .kpi-card {
          background: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .kpi-value {
          font-size: 20px;
          font-weight: bold;
          color: #1a1a1a;
        }
        .kpi-label {
          font-size: 11px;
          color: #666;
          margin-top: 5px;
        }
        .kpi-variation {
          font-size: 10px;
          margin-top: 3px;
        }
        .kpi-variation.positive {
          color: #16a34a;
        }
        .kpi-variation.negative {
          color: #dc2626;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #e5e5e5;
        }
        th {
          background: #f3f4f6;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
        }
        tr:nth-child(even) {
          background: #fafafa;
        }
        .text-right {
          text-align: right;
        }
        .text-center {
          text-align: center;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
        }
        .badge-green {
          background: #dcfce7;
          color: #16a34a;
        }
        .badge-yellow {
          background: #fef3c7;
          color: #d97706;
        }
        .badge-red {
          background: #fee2e2;
          color: #dc2626;
        }
        .badge-blue {
          background: #dbeafe;
          color: #2563eb;
        }
        .totals {
          margin-top: 20px;
          padding-top: 15px;
          border-top: 2px solid #e5e5e5;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }
        .total-row.final {
          font-size: 16px;
          font-weight: bold;
          padding-top: 10px;
          border-top: 1px solid #e5e5e5;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          text-align: center;
          color: #888;
          font-size: 10px;
        }
        @media print {
          body {
            padding: 10mm;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Fast<span>Gross</span> Pro</div>
        <div class="report-info">
          <div class="report-title">${title}</div>
          ${options?.subtitle ? `<div class="report-subtitle">${options.subtitle}</div>` : ""}
          <div class="report-date">${dateRangeStr}</div>
        </div>
      </div>

      ${content}

      <div class="footer">
        <p>Document généré automatiquement par DISTRAM</p>
        <p>© ${new Date().getFullYear()} DISTRAM - Tous droits réservés</p>
      </div>
    </body>
    </html>
  `;
}

// Export functions
export async function exportDashboardReport(
  data: ReportData,
  options: ExportOptions
): Promise<void> {
  const kpisHTML = `
    <div class="section">
      <h2 class="section-title">Indicateurs Clés</h2>
      <div class="kpi-grid">
        ${data.kpis
          .map(
            (kpi) => `
          <div class="kpi-card">
            <div class="kpi-value">${kpi.value}${kpi.unit || ""}</div>
            <div class="kpi-label">${kpi.label}</div>
            ${
              kpi.variation !== undefined
                ? `<div class="kpi-variation ${kpi.variation >= 0 ? "positive" : "negative"}">
                    ${kpi.variation >= 0 ? "+" : ""}${kpi.variation}%
                  </div>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  const tablesHTML = data.tables
    .map(
      (table) => `
    <div class="section">
      <h2 class="section-title">${table.title}</h2>
      <table>
        <thead>
          <tr>
            ${table.headers.map((h) => `<th>${h}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${table.rows
            .map(
              (row) => `
            <tr>
              ${row.map((cell) => `<td>${cell}</td>`).join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
    )
    .join("");

  const html = generatePDFHTML(options.title, kpisHTML + tablesHTML, {
    subtitle: options.subtitle,
    dateRange: options.dateRange,
  });

  if (options.format === "pdf") {
    printToPDF(html);
  } else if (options.format === "csv") {
    exportToCSV(data.tables, options.title);
  }
}

export async function exportClientReport(
  data: ClientReportData,
  options: ExportOptions
): Promise<void> {
  const clientInfoHTML = `
    <div class="section">
      <h2 class="section-title">Informations Client</h2>
      <table>
        <tr><td><strong>Nom</strong></td><td>${data.client.name}</td></tr>
        <tr><td><strong>Email</strong></td><td>${data.client.email}</td></tr>
        <tr><td><strong>Téléphone</strong></td><td>${data.client.phone}</td></tr>
        <tr><td><strong>Adresse</strong></td><td>${data.client.address}</td></tr>
        <tr><td><strong>Type</strong></td><td>${data.client.type}</td></tr>
        <tr><td><strong>Client depuis</strong></td><td>${formatDate(data.client.createdAt)}</td></tr>
      </table>
    </div>
  `;

  const statsHTML = `
    <div class="section">
      <h2 class="section-title">Statistiques</h2>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">${data.stats.totalOrders}</div>
          <div class="kpi-label">Commandes totales</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatCurrency(data.stats.totalSpent)}</div>
          <div class="kpi-label">Total dépensé</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${formatCurrency(data.stats.averageOrder)}</div>
          <div class="kpi-label">Panier moyen</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">${data.stats.lastOrderDate ? formatDate(data.stats.lastOrderDate) : "N/A"}</div>
          <div class="kpi-label">Dernière commande</div>
        </div>
      </div>
    </div>
  `;

  const ordersHTML = `
    <div class="section">
      <h2 class="section-title">Historique des Commandes</h2>
      <table>
        <thead>
          <tr>
            <th>N° Commande</th>
            <th>Date</th>
            <th>Articles</th>
            <th class="text-right">Total</th>
            <th class="text-center">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${data.orders
            .map(
              (order) => `
            <tr>
              <td>${order.id}</td>
              <td>${formatDate(order.date)}</td>
              <td>${order.items.length} article(s)</td>
              <td class="text-right">${formatCurrency(order.total)}</td>
              <td class="text-center">
                <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  const html = generatePDFHTML(
    options.title,
    clientInfoHTML + statsHTML + ordersHTML,
    { subtitle: data.client.name }
  );

  if (options.format === "pdf") {
    printToPDF(html);
  }
}

export async function exportOrderReport(
  data: OrderReportData,
  options: ExportOptions
): Promise<void> {
  const orderInfoHTML = `
    <div class="section">
      <h2 class="section-title">Détails de la Commande</h2>
      <table>
        <tr><td><strong>N° Commande</strong></td><td>${data.order.id}</td></tr>
        <tr><td><strong>Date</strong></td><td>${formatDateTime(data.order.date)}</td></tr>
        <tr><td><strong>Client</strong></td><td>${data.order.client}</td></tr>
        <tr><td><strong>Adresse de livraison</strong></td><td>${data.order.deliveryAddress}</td></tr>
        <tr><td><strong>Statut</strong></td><td><span class="badge ${getStatusBadgeClass(data.order.status)}">${data.order.status}</span></td></tr>
        ${data.order.notes ? `<tr><td><strong>Notes</strong></td><td>${data.order.notes}</td></tr>` : ""}
      </table>
    </div>
  `;

  const itemsHTML = `
    <div class="section">
      <h2 class="section-title">Articles</h2>
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th class="text-center">Quantité</th>
            <th class="text-right">Prix unitaire</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items
            .map(
              (item) => `
            <tr>
              <td>${item.name}</td>
              <td class="text-center">${item.quantity}</td>
              <td class="text-right">${formatCurrency(item.unitPrice)}</td>
              <td class="text-right">${formatCurrency(item.total)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Sous-total</span>
          <span>${formatCurrency(data.totals.subtotal)}</span>
        </div>
        <div class="total-row">
          <span>TVA (20%)</span>
          <span>${formatCurrency(data.totals.tax)}</span>
        </div>
        <div class="total-row">
          <span>Livraison</span>
          <span>${formatCurrency(data.totals.delivery)}</span>
        </div>
        <div class="total-row final">
          <span>Total TTC</span>
          <span>${formatCurrency(data.totals.total)}</span>
        </div>
      </div>
    </div>
  `;

  const html = generatePDFHTML(options.title, orderInfoHTML + itemsHTML, {
    subtitle: `Commande ${data.order.id}`,
  });

  if (options.format === "pdf") {
    printToPDF(html);
  }
}

// Export weekly AI report
export async function exportAIWeeklyReport(
  reportContent: string,
  weekNumber: number
): Promise<void> {
  const sections = reportContent.split("\n\n").map((section) => {
    const lines = section.split("\n");
    const title = lines[0]?.replace(/^#+\s*/, "") || "";
    const content = lines.slice(1).join("<br>");
    return { title, content };
  });

  const contentHTML = sections
    .map(
      (section) => `
    <div class="section">
      <h2 class="section-title">${section.title}</h2>
      <p>${section.content}</p>
    </div>
  `
    )
    .join("");

  const html = generatePDFHTML(
    `Rapport IA Hebdomadaire - Semaine ${weekNumber}`,
    contentHTML,
    { subtitle: "Analyses et Recommandations Automatiques" }
  );

  printToPDF(html);
}

// Helper functions
function getStatusBadgeClass(status: string): string {
  const statusMap: Record<string, string> = {
    livré: "badge-green",
    delivered: "badge-green",
    completed: "badge-green",
    "en cours": "badge-yellow",
    pending: "badge-yellow",
    processing: "badge-yellow",
    annulé: "badge-red",
    cancelled: "badge-red",
    nouveau: "badge-blue",
    new: "badge-blue",
  };
  return statusMap[status.toLowerCase()] || "badge-blue";
}

function printToPDF(html: string): void {
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

function exportToCSV(
  tables: { title: string; headers: string[]; rows: (string | number)[][] }[],
  filename: string
): void {
  let csvContent = "";

  tables.forEach((table) => {
    csvContent += `${table.title}\n`;
    csvContent += table.headers.join(",") + "\n";
    table.rows.forEach((row) => {
      csvContent +=
        row
          .map((cell) => {
            const str = String(cell);
            // Escape quotes and wrap in quotes if contains comma
            if (str.includes(",") || str.includes('"')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",") + "\n";
    });
    csvContent += "\n";
  });

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename.replace(/\s+/g, "_")}_${formatDate(new Date())}.csv`;
  link.click();
}

// Export to Excel (using CSV with Excel-compatible format)
export function exportToExcel(
  data: { headers: string[]; rows: (string | number)[][] },
  filename: string
): void {
  let content = data.headers.join("\t") + "\n";
  data.rows.forEach((row) => {
    content += row.join("\t") + "\n";
  });

  const blob = new Blob(["\ufeff" + content], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename.replace(/\s+/g, "_")}_${formatDate(new Date())}.xls`;
  link.click();
}

// Quick export for simple data
export function quickExportPDF(
  title: string,
  content: { label: string; value: string }[]
): void {
  const contentHTML = `
    <div class="section">
      <table>
        ${content.map((item) => `<tr><td><strong>${item.label}</strong></td><td>${item.value}</td></tr>`).join("")}
      </table>
    </div>
  `;

  const html = generatePDFHTML(title, contentHTML);
  printToPDF(html);
}

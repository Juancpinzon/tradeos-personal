import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent, formatCompactNumber } from './formatters';
import type { ScreenerResultItem } from '../types';

export function exportToMarkdown(results: ScreenerResultItem[], aiSummary: string) {
  let md = `# Screener Results\n\n`;
  if (aiSummary) {
    md += `## AI Summary\n\n_${aiSummary}_\n\n`;
  }
  md += `## Candidates\n\n`;
  md += `| Symbol | Name | Price | Market Cap | Rev Growth | ATH Dist | RSI | Score | AI Note |\n`;
  md += `|---|---|---|---|---|---|---|---|---|\n`;
  
  results.forEach((item) => {
    md += `| **${item.symbol}** | ${item.name} | ${formatCurrency(item.price)} | ${formatCompactNumber(item.market_cap)} | ${item.revenue_growth_pct ? formatPercent(item.revenue_growth_pct) : '-'} | ${item.ath_distance_pct ? formatPercent(item.ath_distance_pct) : '-'} | ${item.rsi_weekly?.toFixed(1) || '-'} | ${item.score} | ${item.ai_note} |\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `screener_results_${new Date().toISOString().slice(0,10)}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(results: ScreenerResultItem[], aiSummary: string) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text("Screener Results", 14, 22);
  
  let startY = 30;
  
  if (aiSummary) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("AI Summary:", 14, startY);
    startY += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    const splitSummary = doc.splitTextToSize(aiSummary, 180);
    doc.text(splitSummary, 14, startY);
    startY += (splitSummary.length * 5) + 6;
  }
  
  autoTable(doc, {
    startY: startY,
    head: [['Symbol', 'Name', 'Price', 'Score', 'AI Note']],
    body: results.map(item => [
      item.symbol,
      item.name,
      formatCurrency(item.price),
      item.score.toString(),
      item.ai_note
    ]),
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15 },
      4: { cellWidth: 'auto' }
    },
    styles: { fontSize: 8 }
  });
  
  doc.save(`screener_results_${new Date().toISOString().slice(0,10)}.pdf`);
}

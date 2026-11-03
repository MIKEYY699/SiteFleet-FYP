// jsPDF + autotable are about 130 KB gzipped and only needed when someone clicks
// "Export PDF", so they're loaded on demand instead of with the page.
export async function loadPdfTools() {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  return { jsPDF, autoTable };
}

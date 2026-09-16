const MARGIN_MM = 10;

/**
 * Renderiza um elemento como PDF A4 multipágina.
 *
 * html2canvas e jsPDF só são importados aqui dentro: juntos passam de 500 KB e
 * não têm por que entrar no bundle inicial de quem nunca exporta.
 */
export async function exportElementToPdf(element: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pdf.internal.pageSize.getWidth() - MARGIN_MM * 2;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const imageData = canvas.toDataURL('image/jpeg', 0.95);
  const usablePageHeight = pageHeight - MARGIN_MM * 2;

  // A imagem inteira é redesenhada a cada página, deslocada para cima, de modo
  // que só a fatia correspondente fique visível dentro das margens.
  let remaining = imageHeight;
  let offset = MARGIN_MM;

  pdf.addImage(imageData, 'JPEG', MARGIN_MM, offset, imageWidth, imageHeight);
  remaining -= usablePageHeight;

  while (remaining > 0) {
    offset = remaining - imageHeight + MARGIN_MM;
    pdf.addPage();
    pdf.addImage(imageData, 'JPEG', MARGIN_MM, offset, imageWidth, imageHeight);
    remaining -= usablePageHeight;
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

export const slugifyForFileName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

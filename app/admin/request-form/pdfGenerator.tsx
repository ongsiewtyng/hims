import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const createPdf = async (
    items: { no: number; vendor: string; item: string; quantity: number; unit: string; sectionA: any }[],
) => {
    // Dynamic page height based on items length and other content
    const initialHeight = 700;
    const logoHeight = 80; // Adjust based on actual logo size
    const sectionAHeight = 100;
    const sectionBHeight = 120;
    const itemRowHeight = 20;
    const extraPadding = 40;

    const totalItemHeight = items.length * itemRowHeight;
    const pageHeight = initialHeight + totalItemHeight + sectionAHeight + sectionBHeight + extraPadding;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, pageHeight]); // Dynamic page height
    const { height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    const addressX = 420; // Adjust this to position the text closer to the right edge
    const addressY = height - 35; // Starting Y position at the top

    // Hardcoded address example
    page.drawText('1-Z, Lebuh Bukit Jambul', { x: addressX, y: addressY, size: fontSize, font, color: rgb(0, 0, 0) });
    page.drawText('Bukit Jambul', { x: addressX, y: addressY - 15, size: fontSize, font, color: rgb(0, 0, 0) });
    page.drawText('11900 Bayan Lepas', { x: addressX, y: addressY - 30, size: fontSize, font, color: rgb(0, 0, 0) });
    page.drawText('Pulau Pinang', { x: addressX, y: addressY - 45, size: fontSize, font, color: rgb(0, 0, 0) });


    try {
        // Fetch and embed the logo
        // const logoUrl = new URL('/logo.png', 'http://localhost:3000'); // Replace with actual URL
        const logoUrl = new URL('/logo.png', 'https://hims-five.vercel.app'); // Replace with actual URL
        const response = await fetch(logoUrl.href);
        if (!response.ok) throw new Error('Failed to fetch logo');

        const logoBytes = await response.arrayBuffer();
        const logo = await pdfDoc.embedPng(logoBytes);

        // Scale and position the logo
        const logoDims = logo.scale(0.01); // Adjust scale for desired size
        const logoX = 50;
        const logoY = height - logoDims.height - 20;

        page.drawImage(logo, {
            x: logoX,
            y: logoY,
            width: logoDims.width,
            height: logoDims.height,
        });

    } catch (error) {
        console.error('Logo embedding error:', error);
    }

    // Title
    const titleY = height - logoHeight - 40;
    page.drawText('Request Details', {
        x: 50,
        y: titleY,
        size: fontSize + 4,
        font,
        color: rgb(0, 0.3, 0.6),
    });

    // Section A Title - "General Info"
    const sectionAY = titleY - 40;
    page.drawText('General Info', {
        x: 50,
        y: sectionAY,
        size: fontSize + 2,
        font,
        color: rgb(0, 0, 0),
    });

    // Section A Data Table
    const sectionATableY = sectionAY - 30;
    const tableMarginX = 50;
    const tableWidth = 500;
    const tableHeight = 80;

    // Draw the Section A table
    page.drawRectangle({
        x: tableMarginX,
        y: sectionATableY - tableHeight,
        width: tableWidth,
        height: tableHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    // Draw Section A content
    const col1X = tableMarginX + 150;
    const rowHeight = 20;

    // Horizontal lines for Section A table
    for (let i = 0; i <= 4; i++) {
        page.drawLine({
            start: { x: tableMarginX, y: sectionATableY - i * rowHeight },
            end: { x: tableMarginX + tableWidth, y: sectionATableY - i * rowHeight },
            color: rgb(0, 0, 0),
            thickness: 0.5,
        });
    }

    // Draw vertical line for Section A columns
    page.drawLine({
        start: { x: col1X, y: sectionATableY },
        end: { x: col1X, y: sectionATableY - tableHeight },
        color: rgb(0, 0, 0),
        thickness: 0.5,
    });

    // Column titles
    page.drawText('Delivery Date:', { x: tableMarginX + 10, y: sectionATableY - 15, size: fontSize, font });
    page.drawText('Project/Services:', { x: tableMarginX + 10, y: sectionATableY - 35, size: fontSize, font });
    page.drawText('PIC Contact:', { x: tableMarginX + 10, y: sectionATableY - 55, size: fontSize, font });
    page.drawText('Entity:', { x: tableMarginX + 10, y: sectionATableY - 75, size: fontSize, font });

    // Section A Data
    const firstItemSectionA = items[0]?.sectionA || {};
    page.drawText(String(firstItemSectionA.deliveryDate || 'N/A'), { x: col1X + 10, y: sectionATableY - 15, size: fontSize, font });
    page.drawText(String(firstItemSectionA.projectDetails || 'N/A'), { x: col1X + 10, y: sectionATableY - 35, size: fontSize, font });
    page.drawText(String(firstItemSectionA.picContact || 'N/A'), { x: col1X + 10, y: sectionATableY - 55, size: fontSize, font });
    page.drawText(String(firstItemSectionA.entity || 'N/A'), { x: col1X + 10, y: sectionATableY - 75, size: fontSize, font });

    // Section B Title - "Description / Details of Service / Product"
    const sectionBTitleY = sectionATableY - tableHeight - 40;
    page.drawText('Description / Details of Service / Product', {
        x: 50,
        y: sectionBTitleY,
        size: fontSize + 2,
        font,
        color: rgb(0, 0, 0),
    });

    // Item Table
    const tableStartY = sectionBTitleY - 30;
    const itemTableHeight = 20 + items.length * 20;

    // Draw item table
    page.drawRectangle({
        x: tableMarginX,
        y: tableStartY - itemTableHeight,
        width: tableWidth,
        height: itemTableHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    // Horizontal lines for items
    for (let i = 0; i <= items.length + 1; i++) {
        page.drawLine({
            start: { x: tableMarginX, y: tableStartY - i * 20 },
            end: { x: tableMarginX + tableWidth, y: tableStartY - i * 20 },
            color: rgb(0, 0, 0),
            thickness: 0.5,
        });
    }

    // Vertical lines for columns
    const col2X = tableMarginX + 40;
    const col3X = tableMarginX + 200;
    const col4X = tableMarginX + 350;
    const col5X = tableMarginX + 430;

    [col2X, col3X, col4X, col5X].forEach(x => {
        page.drawLine({
            start: { x, y: tableStartY },
            end: { x, y: tableStartY - itemTableHeight },
            color: rgb(0, 0, 0),
            thickness: 0.5,
        });
    });

    // Column headers
    page.drawText('No', { x: tableMarginX + 10, y: tableStartY - 15, size: fontSize, font });
    page.drawText('Vendor', { x: col2X + 10, y: tableStartY - 15, size: fontSize, font });
    page.drawText('Item', { x: col3X + 10, y: tableStartY - 15, size: fontSize, font });
    page.drawText('Quantity', { x: col4X + 10, y: tableStartY - 15, size: fontSize, font });
    page.drawText('Unit', { x: col5X + 10, y: tableStartY - 15, size: fontSize, font });

    // Populate the item rows
    items.forEach((item, index) => {
        const rowY = tableStartY - 35 - index * 20;
        page.drawText((index + 1).toString(), {x: tableMarginX + 10, y: rowY, size: fontSize, font});
        page.drawText(item.vendor, { x: col2X + 10, y: rowY, size: fontSize, font });
        page.drawText(item.item, { x: col3X + 10, y: rowY, size: fontSize, font });
        page.drawText(String(item.quantity), { x: col4X + 10, y: rowY, size: fontSize, font });
        page.drawText(item.unit, { x: col5X + 10, y: rowY, size: fontSize, font });
    });

    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();

    // Create a Blob for client-side preview
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    // Return both Blob for preview and pdfBytes as Uint8Array for backend use
    return { pdfBlob, pdfBytes: new Uint8Array(pdfBytes) };
};

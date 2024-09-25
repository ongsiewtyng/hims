import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import logoImage from '../../admin/styles/logo.png';

export const createPdf = async (
    items: { no: number; item: string; quantity: number; sectionA: any }[],
) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 700]); // Increased page height for more content space
    const { height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    // Title
    page.drawText('Request Details', {
        x: 50,
        y: height - 70,
        size: fontSize + 4, // Larger font size for title
        font,
        color: rgb(0, 0.3, 0.6), // A nice color for the title
    });

    // Section A Title - "General Info"
    page.drawText('General Info', {
        x: 50,
        y: height - 100,
        size: fontSize + 2,
        font,
        color: rgb(0, 0, 0),
    });

    // Section A Data as Table
    const sectionADataY = height - 130;
    const tableMarginX = 50;
    const tableWidth = 500;
    const tableHeight = 80;
    const rowHeight = 20;
    const col1X = tableMarginX + 150;

    // Draw outer rectangle for Section A table
    page.drawRectangle({
        x: tableMarginX,
        y: sectionADataY - tableHeight,
        width: tableWidth,
        height: tableHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    // Draw horizontal lines for Section A rows
    for (let i = 0; i <= 4; i++) {
        page.drawLine({
            start: { x: tableMarginX, y: sectionADataY - i * rowHeight },
            end: { x: tableMarginX + tableWidth, y: sectionADataY - i * rowHeight },
            color: rgb(0, 0, 0),
            thickness: 0.5,
        });
    }

    // Draw vertical line for Section A columns
    page.drawLine({
        start: { x: col1X, y: sectionADataY },
        end: { x: col1X, y: sectionADataY - tableHeight },
        color: rgb(0, 0, 0),
        thickness: 0.5,
    });

    // Column titles for Section A
    page.drawText('Delivery Date:', { x: tableMarginX + 10, y: sectionADataY - 15, size: fontSize, font });
    page.drawText('Project/Services:', { x: tableMarginX + 10, y: sectionADataY - 35, size: fontSize, font });
    page.drawText('PIC Contact:', { x: tableMarginX + 10, y: sectionADataY - 55, size: fontSize, font });
    page.drawText('Entity:', { x: tableMarginX + 10, y: sectionADataY - 75, size: fontSize, font });

    // Section A Data
    const firstItemSectionA = items[0]?.sectionA || {};
    page.drawText(firstItemSectionA.deliveryDate || 'N/A', { x: col1X + 10, y: sectionADataY - 15, size: fontSize, font });
    page.drawText(firstItemSectionA.projectDetails || 'N/A', { x: col1X + 10, y: sectionADataY - 35, size: fontSize, font });
    page.drawText(firstItemSectionA.picContact || 'N/A', { x: col1X + 10, y: sectionADataY - 55, size: fontSize, font });
    page.drawText(firstItemSectionA.entity || 'N/A', { x: col1X + 10, y: sectionADataY - 75, size: fontSize, font });

    // Section B Title - "Description / Details of Service / Product (compulsory)"
    const sectionBTitleY = sectionADataY - 120;
    page.drawText('Description / Details of Service / Product', {
        x: 50,
        y: sectionBTitleY,
        size: fontSize + 2,
        font,
        color: rgb(0, 0, 0),
    });

    // Item Table
    const tableStartY = sectionBTitleY - 30;
    const itemTableHeight = 20 + items.length * 20; // Header row + each item row
    const itemTableWidth = 500;

    // Draw outer rectangle for item table
    page.drawRectangle({
        x: tableMarginX,
        y: tableStartY - itemTableHeight,
        width: itemTableWidth,
        height: itemTableHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    // Draw horizontal lines for item rows
    for (let i = 0; i <= items.length + 1; i++) {
        page.drawLine({
            start: { x: tableMarginX, y: tableStartY - i * 20 },
            end: { x: tableMarginX + itemTableWidth, y: tableStartY - i * 20 },
            color: rgb(0, 0, 0),
            thickness: 0.5,
        });
    }

    // Draw vertical lines for item columns
    const col2X = tableMarginX + 50;
    const col3X = tableMarginX + 200;

    [col2X, col3X].forEach(x => {
        page.drawLine({
            start: { x, y: tableStartY },
            end: { x, y: tableStartY - itemTableHeight },
            color: rgb(0, 0, 0),
            thickness: 0.5,
        });
    });

    // Column headers for items
    page.drawText('No', { x: tableMarginX + 10, y: tableStartY - 15, size: fontSize, font });
    page.drawText('Item', { x: col2X + 10, y: tableStartY - 15, size: fontSize, font });
    page.drawText('Quantity', { x: col3X + 10, y: tableStartY - 15, size: fontSize, font });

    let yPosition = tableStartY - 35; // Start position for item rows
    let totalQuantity = 0;

    // Add item rows
    items.forEach((row, index) => {
        const no = (index + 1).toString();
        const item = row.item || 'N/A';
        const quantity = row.quantity || 0;

        page.drawText(no, { x: tableMarginX + 10, y: yPosition, size: fontSize, font });
        page.drawText(item, { x: col2X + 10, y: yPosition, size: fontSize, font });
        page.drawText(quantity.toString(), { x: col3X + 10, y: yPosition, size: fontSize, font });

        yPosition -= 20;
        totalQuantity += quantity;
    });

    // Total Quantity (aligned above the Quantity column, right side)
    const totalQuantityText = `Total Quantity: ${totalQuantity}`;
    const totalQuantityX = col3X + 10;
    const totalQuantityY = yPosition - 20;

    // Draw text for Total Quantity
    page.drawText(totalQuantityText, {
        x: totalQuantityX,
        y: totalQuantityY,
        size: fontSize,
        font,
    });

    // Draw rectangle around Total Quantity text
    const textWidth = font.widthOfTextAtSize(totalQuantityText, fontSize);
    const textHeight = fontSize + 4; // Adding some padding

    page.drawRectangle({
        x: totalQuantityX - 2, // Adding some padding
        y: totalQuantityY - textHeight + 2, // Adjusting for padding
        width: textWidth + 4, // Adding some padding
        height: textHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
};
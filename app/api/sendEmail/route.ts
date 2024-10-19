import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { createPdf } from '../../admin/request-form/pdfGenerator'; // Your PDF generator

export async function POST(request: Request) {
    try {
        const { recipient, items } = await request.json(); // Extract recipient and items from request body

        console.log("Received recipient:", recipient);
        console.log("Received items:", items);

        if (!recipient || !items) {
            return NextResponse.json({ error: 'Recipient and items are required' }, { status: 400 });
        }

        // Generate PDF from items (Ensure createPdf returns a valid Uint8Array or Buffer)
        const pdfBytes = await createPdf(items);
        if (!Buffer.isBuffer(pdfBytes)) {
            throw new Error('PDF generation failed. Expected Buffer.');
        }

        // Setup Nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipient,
            subject: 'Requested Items and Quantity Details',
            text: 'Please find the attached PDF with the requested item details.',
            html: `<p>Please find the attached PDF with the requested item details.</p>`,
            attachments: [
                {
                    filename: 'Request_Details.pdf',
                    content: Buffer.from(pdfBytes), // Buffer containing the PDF
                    contentType: 'application/pdf',
                },
            ],
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        console.log('Email sent successfully to:', recipient);
        return NextResponse.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: 'Error sending email' }, { status: 500 });
    }
}

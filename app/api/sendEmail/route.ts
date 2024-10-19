import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { createPdf } from '../../admin/request-form/pdfGenerator'; // Your PDF generator

export async function POST(request: Request) {
    console.log('Received request');

    try {
        const { recipient, items } = await request.json(); // Extract recipient and items from request body

        console.log("Received recipient:", recipient);
        console.log("Received items:", items);
        console.log("Received pdfBuffer:", pdfBuffer);

        if (!recipient || !items) {
            console.log('Missing recipient or items');
            return NextResponse.json({ error: 'Recipient and items are required' }, { status: 400 });
        }
        const { pdfBytes } = await createPdf(items);

        if (!(pdfBytes instanceof Uint8Array || Buffer.isBuffer(pdfBytes))) {
            throw new Error('Invalid PDF data type, must be Uint8Array or Buffer');
        }

        console.log('PDF Bytes:', pdfBytes);

        const pdfBuffer = Buffer.from(pdfBytes);

        console.log('PDF Buffer:', pdfBuffer);

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
                    content: pdfBuffer,
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
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('Received request');
    const { recipient, items, pdfBuffer, customMessage } = await request.json();

    console.log("Received recipient:", recipient);
    console.log("Received items:", items);
    console.log("Received custom message:", customMessage);

    if (!recipient || !items) {
        console.log('Missing recipient or items');
        return NextResponse.json({ error: 'Recipient and items are required' }, { status: 400 });
    }

    try {
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
            text: customMessage
                ? `${customMessage}\n\nPlease find the attached PDF with the requested item details.`
                : 'Please find the attached PDF with the requested item details.',
            html: customMessage
                ? `<div style="font-family: Arial, sans-serif; color: #333;">
                <div style="background-color: #f8f8f8; padding: 20px; border-bottom: 1px solid #ddd;">
                    <h2 style="margin: 0; font-size: 24px;">Requested Items and Quantity Details</h2>
                </div>
                <div style="padding: 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">${customMessage}</p>
                    <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
                        <p style="font-size: 14px; margin: 0;">Please find the attached PDF with the requested item details.</p>
                    </div>
                </div>
           </div>`
                : `<div style="font-family: Arial, sans-serif; color: #333;">
                <div style="background-color: #f8f8f8; padding: 20px; border-bottom: 1px solid #ddd;">
                    <h2 style="margin: 0; font-size: 24px;">Requested Items and Quantity Details</h2>
                </div>
                <div style="padding: 20px;">
                    <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9;">
                        <p style="font-size: 14px; margin: 0;">Please find the attached PDF with the requested item details.</p>
                    </div>
                </div>
           </div>`,
            attachments: [
                {
                    filename: 'Request_Details.pdf',
                    content: Buffer.from(pdfBuffer.data),
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
        return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
    }
}
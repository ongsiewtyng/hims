import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { recipient, fileUrl } = await request.json();

    if (!recipient || !fileUrl) {
        return NextResponse.json({ error: 'Recipient and file URL are required' }, { status: 400 });
    }

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
        subject: 'File from Vendor Selection',
        text: `Please find the file at the following link: ${fileUrl}`,
        html: `<p>Please find the file at the following link: <a href="${fileUrl}">${fileUrl}</a></p>`,
    };

    try {
        await transporter.sendMail(mailOptions);
        return NextResponse.json({ message: 'Email sent successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Error sending email' }, { status: 500 });
    }
}

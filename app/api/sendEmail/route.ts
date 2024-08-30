import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { sender, recipient, fileUrl, status, remark } = await request.json();
    console.log(sender, recipient, fileUrl, status, remark);

    if (!recipient || !fileUrl || !status) {
        return NextResponse.json({ error: 'Recipient, file URL, and status are required' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: sender || process.env.EMAIL_USER,
        to: recipient,
        subject: `Status Update: ${status}`,
        text: `The status of your request has been updated to: ${status}\n\nRemark: ${remark}\n\nPlease find the file at the following link: ${fileUrl}`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="text-align: center; padding-bottom: 20px;">
<!--                    <img src="https://your-company-logo-url.com/logo.png" alt="Company Logo" style="max-width: 100px;"/>-->
                </div>
                <h2 style="color: #333; font-size: 20px; text-align: center; margin-bottom: 24px;">Request Status Updated</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">Hello,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    The status of your request has been updated to: 
                    <span style="font-weight: bold; color: #4CAF50;">${status}</span>
                </p>
                ${remark ? `<p style="font-size: 16px; line-height: 1.6; color: #555;"><strong>Remark:</strong> ${remark}</p>` : ''}
                <p style="font-size: 16px; line-height: 1.6; color: #555;">You can view the file using the link below:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${fileUrl}" style="display: inline-block; padding: 12px 24px; color: white; background-color: #4CAF50; text-decoration: none; border-radius: 4px; font-size: 16px;">
                        Download File
                    </a>
                </div>
                <p style="font-size: 14px; line-height: 1.6; color: #999; text-align: center; margin-top: 40px;">
                    This is an automated message, please do not reply directly to this email.
                </p>
                <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 20px; text-align: center;">
                    <p style="font-size: 12px; color: #999;">&copy; 2024 Hospitality Inventory Management System. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return NextResponse.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: 'Error sending email' }, { status: 500 });
    }
}

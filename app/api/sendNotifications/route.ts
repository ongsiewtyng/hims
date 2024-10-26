import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('Received request');
    const { recipient, status, requestInfo } = await request.json(); // Extract recipient, status, and requestInfo from the request body

    console.log("Received recipient:", recipient);
    console.log("Received status:", status);
    console.log("Received requestInfo:", requestInfo);

    if (!recipient || !status || !requestInfo) {
        console.log('Missing recipient, status, or request info');
        return NextResponse.json({ error: 'Recipient, status, and request info are required' }, { status: 400 });
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

        // Construct HTML content with status and request details
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipient,
            subject: 'Request Status and Details',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #4CAF50;">Request Status: ${status}</h2>
                    <p>Dear ${recipient},</p>
                    <p>Below are the details of your request:</p>
                    
                    <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f2f2f2;">
                                <th style="padding: 10px; border: 1px solid #ddd;">No</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Item Name</th>
                                <th style="padding: 10px; border: 1px solid #ddd;">Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${requestInfo.length > 0 ? requestInfo.map((item: any) => `
                                <tr>
                                    <td style="padding: 10px; border: 1px solid #ddd;">${item.No}</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">${item['Description of Item ']}</td>
                                    <td style="padding: 10px; border: 1px solid #ddd;">${item.Qty}</td>
                                </tr>`).join('')
                            : `<tr>
                                    <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: center;">No items found</td>
                                </tr>`
                            }
               
                        </tbody>
                    </table>
                    
                    <p style="margin-top: 20px;">Thank you for your request. We will keep you updated on its progress.</p>
                    <p style="margin-top: 20px;">Best regards,<br>Your Team</p>
                </div>
            `,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        console.log('Email sent successfully to:', recipient);
        return NextResponse.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
}

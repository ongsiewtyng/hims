export const sendEmail = async (sender: string, recipient: string, fileUrl: string, status: string, remark: string) => {
    try {
        const response = await fetch('/api/sendEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender,
                recipient,
                fileUrl,
                status,
                remark,
            }),
        });

        if (response.ok) {
            return { success: true, message: 'Email sent successfully' };
        } else {
            const errorData = await response.json();
            return { success: false, message: errorData.error || 'Failed to send email' };
        }
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: 'Error sending email' };
    }
};

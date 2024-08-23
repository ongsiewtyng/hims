import React, { useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi'; // Import the icons for success and error messages

interface Vendor {
    id: string;
    name: string;
    email: string;
}

interface VendorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string; // URL to the file that will be sent
    vendors: Vendor[]; // List of vendors to choose from
}

const VendorSelectionModal: React.FC<VendorSelectionModalProps> = ({ isOpen, onClose, fileUrl, vendors }) => {
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [sending, setSending] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSendEmail = async () => {
        if (selectedVendor) {
            setSending(true);
            setError(null);
            setSuccess(null);


            try {
                // Use a placeholder URL for testing
                const testFileUrl = 'https://www.example.com/sample.pdf';

                const response = await fetch('/api/sendEmail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        recipient: selectedVendor.email,
                        fileUrl: testFileUrl,
                    }),
                });

                if (response.ok) {
                    setSuccess('Email sent successfully');
                    setTimeout(() => {
                        onClose(); // Close the modal after 5 seconds
                    }, 3000);
                } else {
                    setError('Failed to send email');
                }
            } catch (error) {
                console.error('Error sending email:', error);
                setError('Error sending email');
            } finally {
                setSending(false);
            }
        } else {
            setError('No vendor selected');
        }
    };

    return isOpen ? (
        <div className="fixed inset-0 flex items-center justify-center z-50 text-black">
            <div className="bg-black bg-opacity-50 absolute inset-0"></div>
            <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-md mx-4 relative">
                <h3 className="text-xl font-semibold mb-4">Select Vendor and Send File</h3>
                <div className="mb-4">
                    <label className="block mb-2 text-gray-700">Select Vendor:</label>
                    <select
                        value={selectedVendor ? selectedVendor.id : ''}
                        onChange={(e) =>
                            setSelectedVendor(vendors.find((vendor) => vendor.id === e.target.value) || null)
                        }
                        className="w-full border border-gray-300 p-2 rounded"
                    >
                        <option value="">Select a vendor</option>
                        {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                                {vendor.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={handleSendEmail}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        disabled={sending}
                    >
                        {sending ? 'Sending...' : 'Send'}
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                </div>
                {/* Notification Bar */}
                {(error || success) && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                        {success ? (
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500" />
                        ) : (
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500" />
                        )}
                        <span>{error || success}</span>
                    </div>
                )}
            </div>
        </div>
    ) : null;
};

export default VendorSelectionModal;

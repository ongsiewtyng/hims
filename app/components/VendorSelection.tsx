import React, { useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi'; // Import the icons for success and error messages
import { database } from "../services/firebase";
import { ref, get } from "@firebase/database";
import {createPdf} from "../admin/request-form/pdfGenerator";

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

    const fetchItems = async () => {
        try {
            const requestsRef = ref(database, 'requests');
            const snapshot = await get(requestsRef);
            const data = snapshot.val();

            console.log('Raw data from Firebase:', data);

            if (data) {
                const compiledItems = Object.keys(data).reduce((acc: any[], key: string) => {
                    const requestData = data[key];
                    const sectionA = requestData.sectionA; // Get Section A data here

                    console.log(`Processing request: ${key}, Status: ${requestData.status}`);

                    if (requestData.status === 'Admin Approved') {
                        console.log(`Request ${key} is approved, processing items...`);

                        const formatDate = (serialNumber: any) => {
                            const date = new Date((serialNumber - 25569) * 86400 * 1000); // Convert Excel date to JavaScript date
                            return date.toLocaleDateString(); // Format as desired, e.g., 'MM/DD/YYYY'
                        };

                        // Extract Section A fields from the indices
                        const deliveryDate = sectionA[0]?.[5] || 'N/A';  // Index 5: Delivery date value
                        const projectDetails = sectionA[1]?.[5] || 'N/A';  // Index 1, key 5 for project details (if nested array)
                        const picContact = sectionA[3]?.[5] || 'N/A';  // Assuming a similar structure for PIC contact
                        const entity = sectionA[5]?.[5] || 'N/A';  // Assuming a similar structure for entity


                        const items = requestData.excelData.map((entry: any) => {
                            const qtyString = entry.Qty ? entry.Qty.toString() : '0';
                            console.log(`Raw Qty: ${entry.Qty}, Qty as string: ${qtyString}`);
                            const qtyNumber = parseFloat(qtyString.replace(/^0+/, '')) || 0;
                            console.log(`Processed quantity: ${qtyNumber}`);
                            return {
                                item: entry["Description of Item "],
                                qty: qtyNumber,
                                vendor: requestData.vendor,
                                sectionA: {
                                    deliveryDate: formatDate(sectionA[0]?.[5]) || 'N/A',
                                    projectDetails: String(sectionA[1]?.[5] || 'N/A'),
                                    picContact: String(sectionA[3]?.[5] || 'N/A'),
                                    entity: String(sectionA[5]?.[5] || 'N/A'),
                                }
                            };
                        }).filter((entry: any) => entry.item && entry.qty);

                        console.log(`Items from request ${key}:`, items);

                        acc.push(...items);
                    }
                    return acc;
                }, []);

                console.log('Compiled items before grouping:', compiledItems);

                // Group by item name and sum quantities
                const groupedItems = compiledItems.reduce((acc: any, cur: any) => {
                    if (!acc[cur.item]) {
                        acc[cur.item] = {
                            item: cur.item,
                            qty: 0,
                            sectionA: cur.sectionA // Grouping sectionA info
                        };
                    }
                    acc[cur.item].qty += cur.qty;

                    // Log grouping progress
                    console.log(`Grouping item: ${cur.item}, Current quantity: ${cur.qty}, Total quantity so far: ${acc[cur.item].qty}`);


                    return acc;
                }, {});

                console.log('Grouped items:', groupedItems);

                return Object.values(groupedItems);
            } else {
                console.error('No data found in Firebase');
                return [];
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            return [];
        }
    };

    const handleSendEmail = async (selectedVendor: Vendor) => {
    if (selectedVendor) {
        setSending(true);
        setError(null);
        setSuccess(null);

        try {
            const items = await fetchItems();
            console.log('Received items:', items);

            if (items.length === 0) {
                setError('No items found');
                return;
            }

            // Map items to match the expected property names for the PDF
            const mappedItems = items.map(item => ({
                ...item,
                quantity: item.qty,
                sectionA: item.sectionA,
            }));

            console.log('Mapped items:', mappedItems);

            // Extract Section A data from the first item
            const sectionAData = items[0]?.sectionA || {};
            const { deliveryDate, projectDetails, picContact, entity } = sectionAData;

            // Log Section A data before generating PDF
            console.log('Section A Data:', {
                deliveryDate,
                projectDetails,
                picContact,
                entity
            });

            // Generate the PDF, passing Section A data and the items
            const pdfBytes = await createPdf(
                mappedItems,
            );

            console.log('PDF Generation Data:', {
                deliveryDate,
                projectDetails,
                picContact,
                entity
            });

            // Send the email with the generated PDF URL
            const response = await fetch('/api/sendEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient: selectedVendor.email,
                    items: mappedItems,  // Attach items data
                    pdfBytes  // Send PDF as base64 or URL (handle this as per your backend setup)
                }),
            });

            if (response.ok) {
                setSuccess('Email sent successfully');
                setTimeout(() => {
                    onClose();
                }, 3000);
            } else {
                const errorData = await response.json();
                setError('Failed to send email: ' + errorData.error);
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
                        {vendors && vendors.length > 0 ? (
                            vendors.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>
                                    {vendor.name}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>
                                No vendors available
                            </option>
                        )}
                    </select>
                </div>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={() => handleSendEmail(selectedVendor!)}
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
                    <div
                        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
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
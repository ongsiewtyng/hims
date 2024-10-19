import React, { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle, HiOutlineDocument } from 'react-icons/hi';
import { database } from "../services/firebase";
import { ref, get } from "@firebase/database";
import { createPdf } from "../admin/request-form/pdfGenerator";

interface Vendor {
    id: string;
    name: string;
    email: string;
}

interface VendorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    vendors: Vendor[];
}

interface WeekSelection {
    week: string;
    pdfFileName: string;
}

interface Request {
    dateCreated: string;
    week: string;
    status: string;
    vendor: string;
    excelData: any[];
    sectionA: any[];
}

const VendorSelectionModal: React.FC<VendorSelectionModalProps> = ({ isOpen, onClose, fileUrl, vendors }) => {
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [sending, setSending] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [weekSelections, setWeekSelections] = useState<{ [key: string]: WeekSelection[] }>({});
    const [selectedWeek, setSelectedWeek] = useState<string>('');
    const [requests, setRequests] = useState<Request[]>([]);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [matchingRequests, setMatchingRequests] = useState<Request[]>([]);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const requestsRef = ref(database, 'requests');
                const snapshot = await get(requestsRef);
                const data = snapshot.val();
                if (data) {
                    setRequests(Object.values(data));
                }
            } catch (error) {
                console.error('Error fetching requests:', error);
            }
        };

        fetchRequests();
    }, []);

    const handleVendorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const vendorId = e.target.value;
        console.log('Selected vendor:', vendorId);
        const vendor = vendors.find((v) => v.id === vendorId) || null;
        setSelectedVendor(vendor);

        if (vendor) {
            setWeekSelections((prev) => ({ ...prev, [vendor.id]: prev[vendor.id] || [] }));
        }
    };

    const handleWeekChange = (week: string, weekIndex: number) => {
        if (!selectedVendor) {
            console.error("Please select a vendor before selecting a week.");
            return;
        }

        // Update the selected week
        setSelectedWeek(week); // Store the selected week as a string

        const updatedSelections = { ...weekSelections };
        if (!updatedSelections[selectedVendor.id]) {
            updatedSelections[selectedVendor.id] = [];
        }

        updatedSelections[selectedVendor.id][weekIndex] = {
            ...updatedSelections[selectedVendor.id][weekIndex],
            week,
            pdfFileName: generatePdfFileName(week, selectedVendor.name)
        };

        setWeekSelections(updatedSelections);

        // Filter the requests based on the selected week (as a number)
        const matchingRequests = requests.filter(req => req.week.toString() === week);
        if (matchingRequests.length === 0) {
            console.log(`No matching request found for week: ${week}`);
        } else {
            console.log('Matching requests:', matchingRequests);
        }

        setMatchingRequests(matchingRequests);
    };

    const handleAddWeek = () => {
        if (!selectedVendor) {
            console.error("Please select a vendor before adding a week.");
            return;
        }

        const updatedSelections = { ...weekSelections };
        if (!updatedSelections[selectedVendor.id]) {
            updatedSelections[selectedVendor.id] = [];
        }

        updatedSelections[selectedVendor.id].push({ week: '', pdfFileName: '' });
        setWeekSelections(updatedSelections);
    };

    const handleDeleteWeek = () => {
        if (!selectedVendor) {
            console.error("Please select a vendor before deleting a week.");
            return;
        }

        const updatedSelections = { ...weekSelections };
        if (!updatedSelections[selectedVendor.id] || updatedSelections[selectedVendor.id].length === 0) {
            console.error("No weeks to delete for the selected vendor.");
            return;
        }

        updatedSelections[selectedVendor.id].pop();
        setWeekSelections(updatedSelections);
    };

    const generatePdfFileName = (week: string, vendorName: string): string => {
        const timestamp = new Date().toISOString().split('T')[0];
        return `${vendorName}_${week}_${timestamp}.pdf`;
    };

    const fetchItems = async (): Promise<any[]> => {
        try {
            const requestsRef = ref(database, 'requests');
            const snapshot = await get(requestsRef);
            const data = snapshot.val();

            if (data) {
                const compiledItems = Object.keys(data).reduce((acc: any[], key: string) => {
                    const requestData = data[key];
                    const sectionA = requestData.sectionA;

                    if (requestData.status === 'Admin Approved') {
                        const formatDate = (serialNumber: any) => {
                            const date = new Date((serialNumber - 25569) * 86400 * 1000);
                            return date.toLocaleDateString();
                        };

                        const items = requestData.excelData.map((entry: any) => ({
                            item: entry["Description of Item "] || 'N/A',
                            qty: entry.Qty || 0,
                            unit: entry["UOM (Unit, KG, Month, Job)"] || 'N/A',
                            vendor: requestData.vendor,
                            sectionA: {
                                deliveryDate: formatDate(sectionA[0]?.[5]) || 'N/A',
                                projectDetails: String(sectionA[1]?.[5] || 'N/A'),
                                picContact: String(sectionA[3]?.[5] || 'N/A'),
                                entity: String(sectionA[5]?.[5] || 'N/A'),
                            }
                        }));

                        acc.push(...items);
                    }
                    return acc;
                }, []);

                return compiledItems;
            } else {
                console.error('No data found in Firebase');
                return [];
            }
        } catch (error) {
            console.error('Error fetching items:', error);
            return [];
        }
    };

    const groupItems = (items: any[]): any[] => {
        const groupedItems = items.reduce((acc: any, cur: any) => {
            if (!acc[cur.item]) {
                acc[cur.item] = {
                    item: cur.item,
                    qty: 0,
                    sectionA: cur.sectionA,
                    unit: cur.unit
                };
            }
            acc[cur.item].qty += cur.qty;

            return acc;
        }, {});

        return Object.values(groupedItems);
    };

    const generatePdfPreview = async (request: Request) => {
        try {
            console.log('Selected week:', selectedWeek);

            // Fetch items using your logic
            const items = await fetchItems();

            if (items.length === 0) {
                setError('No items found for the preview');
                return;
            }

            console.log('Request:', request);

            // Extract sectionA data
            const sectionAData = {
                deliveryDate: request.sectionA[0]?.[5] || 'N/A',
                projectDetails: request.sectionA[1]?.[5] || 'N/A',
                picContact: request.sectionA[3]?.[5] || 'N/A',
                entity: request.sectionA[5]?.[5] || 'N/A',
            };

            // Map the items to include the required properties
            const mappedItems = request.excelData.map(item => ({
                ...item,
                item: item["Description of Item "] || 'N/A',  // Ensure the space in the key is correct
                quantity: item["Qty"] || 'N/A',
                sectionA: sectionAData,
                unit: item["UOM (Unit, KG, Month, Job)"] || 'N/A',
            }));

            // Generate the PDF preview
            const { pdfBlob } = await createPdf(mappedItems);

            // Create a URL for the PDF Blob
            const pdfUrl = URL.createObjectURL(pdfBlob);

            // Open the PDF URL in a new tab
            window.open(pdfUrl, '_blank');  // This will open the PDF in a new tab

            return pdfUrl;  // Optionally return the PDF URL if needed
        } catch (error) {
            console.error('Error generating PDF preview:', error);
            setError('Error generating PDF preview');
        }
    };

    const handleSendEmail = async () => {
        if (!selectedVendor) {
            setError('No vendor selected');
            return;
        }

        setSending(true);
        setError(null);
        setSuccess(null);

        try {
            const items = await fetchItems();
            if (items.length === 0) {
                setError('No items found to send');
                return;
            }

            const groupedItems = groupItems(items);

            const mappedItems = groupedItems.map(item => ({
                ...item,
                quantity: item.qty,
                sectionA: item.sectionA,
                unit: item.unit
            }));

            // Generate PDF (Ensure createPdf returns a valid Uint8Array or Buffer)
            const { pdfBytes } = await createPdf(mappedItems);

            if (!(pdfBytes instanceof Uint8Array || Buffer.isBuffer(pdfBytes))) {
                throw new Error('Invalid PDF data type, must be Uint8Array or Buffer');
            }

            console.log('PDF Bytes:', pdfBytes);

            const pdfBuffer = Buffer.from(pdfBytes);

            console.log('PDF Buffer:', pdfBuffer);

            // Send the email
            const response = await fetch('/api/sendEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient: selectedVendor.email,
                    items: mappedItems, // Ensure items are correctly formatted
                    pdfBuffer,           // Send the PDF Buffer
                    pdfFileName: generatePdfFileName(selectedWeek, selectedVendor.name),
                }),
            });

            if (response.ok) {
                setSuccess('Email sent successfully');
                setSelectedVendor(null);
                setWeekSelections({});
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
    };


    return isOpen ? (
        <div className="fixed inset-0 flex items-center justify-center z-50 text-black">
            <div className="bg-black bg-opacity-50 absolute inset-0"></div>
            <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-md mx-4 relative overflow-hidden">
                <h3 className="text-xl font-semibold mb-4">Select Vendor and Send File</h3>

                <div className="mb-4">
                    <label className="block mb-2 text-gray-700">Select Vendor:</label>
                    <select
                        value={selectedVendor ? selectedVendor.id : ''}
                        onChange={handleVendorChange}
                        className="w-full border border-gray-300 p-2 rounded mt-1"
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

                <div className="overflow-y-auto max-h-96">
                    {Object.entries(weekSelections).map(([vendorId, selections]) => (
                        <div key={vendorId}>
                            <h4 className="font-bold">{vendors.find(vendor => vendor.id === vendorId)?.name}</h4>
                            {selections.map((selection, index) => (
                                <div key={index} className="mb-4">
                                    <label className="block mb-2 text-gray-700">Select Week:</label>
                                    <select
                                        value={selection.week}
                                        onChange={(e) => handleWeekChange(e.target.value, index)}
                                        className="w-full border border-gray-300 p-2 rounded"
                                    >
                                        <option value="">Select a week</option>
                                        {Array.from({ length: 14 }, (_, i) => (
                                            <option key={i + 1} value={(i + 1).toString()}>
                                                Week {i + 1}
                                            </option>
                                        ))}
                                    </select>

                                    {/* PDF Preview and Download */}
                                    {matchingRequests.length > 0 && (
                                        <div className="flex flex-col space-y-4 p-4 bg-gray-100 rounded mt-2">
                                            {matchingRequests.map((request, index) => (
                                                <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded shadow">
                                                    <HiOutlineDocument className="h-6 w-6 text-gray-700" />

                                                    <span className="text-gray-700">
                                                    {`Request ${index + 1}: ${request.dateCreated ? new Date(request.dateCreated).toLocaleDateString('en-GB') : 'N/A'}`}
                                                </span>

                                                    {/* Download Button */}
                                                    <a
                                                        href={pdfPreviewUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:underline"
                                                        download={`request_${index + 1}_${selection.pdfFileName}`}
                                                    >
                                                        Download
                                                    </a>

                                                    {/* Preview Button */}
                                                    <button
                                                        onClick={() => generatePdfPreview(request)}  // Trigger PDF preview for each request
                                                        className="text-green-500 hover:underline"
                                                    >
                                                        Preview
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                    <span
                        onClick={handleAddWeek}
                        className="text-blue-500 cursor-pointer mr-4 hover:no-underline mb-4"
                    >
                    + Add Week
                </span>
                    <span
                        onClick={handleDeleteWeek}
                        className="text-red-500 cursor-pointer hover:no-underline mb-4"
                    >
                    - Delete Week
                </span>
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

                {(error || success) && (
                    <div
                        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4"
                    >
                        {success ? (
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500" />
                        ) : (
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500" />
                        )}
                        <span>{error || success}</span>
                    </div>
                )}

                {/*/!* PDF Preview Section *!/*/}
                {/*{pdfPreviewUrl && (*/}
                {/*    <div className="mt-4">*/}
                {/*        <h4 className="text-lg font-semibold mb-2">PDF Preview:</h4>*/}
                {/*        <iframe*/}
                {/*            src={pdfPreviewUrl}*/}
                {/*            width="100%"*/}
                {/*            height="400px"*/}
                {/*            className="border border-gray-300 rounded"*/}
                {/*        ></iframe>*/}
                {/*    </div>*/}
                {/*)}*/}
            </div>
        </div>
    ) : null;
};

export default VendorSelectionModal;
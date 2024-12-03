import React, { useEffect, useState } from 'react';
import { HiCheckCircle, HiXCircle, HiOutlineDocument } from 'react-icons/hi';
import { database } from "../services/firebase";
import {ref, get, update} from "firebase/database";
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
    requestId: string;
    userID: string;
}

const VendorSelectionModal: React.FC<VendorSelectionModalProps> = ({ isOpen, onClose, fileUrl, vendors }) => {
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [sending, setSending] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [weekSelections, setWeekSelections] = useState<{ [key: string]: WeekSelection[] }>({});
    const [selectedWeek, setSelectedWeek] = useState<string>('');
    const [requests, setRequests] = useState<Request[]>([]);
    const [matchingRequests, setMatchingRequests] = useState<Request[]>([]);
    const [selectedPreviews, setSelectedPreviews] = useState<{ [week: string]: string }>({});

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const requestsRef = ref(database, 'requests');
                const snapshot = await get(requestsRef);
                const data = snapshot.val();
                console.log('Requests:', Object.keys(data)); // Log the request IDs

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

        setSelectedWeek(week);

        const updatedSelections = { ...weekSelections };
        if (!updatedSelections[selectedVendor.id]) {
            updatedSelections[selectedVendor.id] = [];
        }

        // Update the week and PDF file name for the current selection
        updatedSelections[selectedVendor.id][weekIndex] = {
            ...updatedSelections[selectedVendor.id][weekIndex],
            week,
            pdfFileName: generatePdfFileName(week, selectedVendor.name)
        };

        setWeekSelections(updatedSelections);

        // Filter matching requests for the selected vendor and week
        const matchingRequestsForVendorAndWeek = requests.filter(req => {
            // Log the excelData for each request
            console.log("Request excelData:", req.excelData);

            // Check if any entry in excelData matches the selected vendor (case-insensitive)
            const vendorMatches = req.excelData.some(entry => {
                const isMatch = entry["Suggested Vendor "].toUpperCase() === selectedVendor.name.toUpperCase(); // Convert both to upper case
                console.log(`Comparing "${entry["Suggested Vendor "]}" to "${selectedVendor.name}": ${isMatch}`);
                return isMatch;
            });

            // Return true if both the week matches and the vendor matches
            return req.week.toString() === week && vendorMatches && req.status === 'Admin Approved';
        });

        // Check if there are no matching requests and alert the user
        if (matchingRequestsForVendorAndWeek.length === 0) {
            alert(`No matching requests found for vendor "${selectedVendor.name}" in week "${week}".`);
        }

        // Store matching requests separately for each vendor and week
        setMatchingRequests(prev => ({
            ...prev,
            [selectedVendor.id]: {
                ...prev[selectedVendor.id],
                [week]: matchingRequestsForVendorAndWeek
            }
        }));

        // Store selected previews separately for each vendor and week
        setSelectedPreviews(prev => ({
            ...prev,
            [selectedVendor.id]: {
                ...prev[selectedVendor.id],
                [week]: ''
            }
        }));

        console.log("Requests to be previewed/downloaded:", matchingRequestsForVendorAndWeek);
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

    const fetchItems = async (week: string): Promise<any[]> => {
        try {
            const requestsRef = ref(database, 'requests');
            const snapshot = await get(requestsRef);
            const data = snapshot.val();

            if (data) {
                const compiledItems = Object.keys(data).reduce((acc: any[], key: string) => {
                    let requestData = data[key];
                    requestData.id = key;
                    console.log('Request Data:', requestData.week, requestData.status, week);
                    console.log(requestData.week == week);
                    const sectionA = requestData.sectionA;

                    // Filter by 'Admin Approved' status AND the selected week
                    if (requestData.status === 'Admin Approved' && requestData.week == week) {
                        const formatDate = (serialNumber: any) => {
                            const date = new Date((serialNumber - 25569) * 86400 * 1000);
                            return date.toLocaleDateString();
                        };

                        const items = requestData.excelData.map((entry: any) => ({
                            item: entry["Description of Item "] || 'N/A',
                            qty: entry.Qty || 0,
                            unit: entry["UOM (Unit, KG, Month, Job)"] || 'N/A',
                            vendor: entry["Suggested Vendor "] || 'N/A',
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
            // Ensure qty is treated as a number
            const qty = parseFloat(cur.qty) || 0;

            // Check if the item already exists in the accumulator
            if (!acc[cur.item]) {
                acc[cur.item] = {
                    item: cur.item,
                    qty: 0, // Initialize quantity to 0
                    sectionA: cur.sectionA,
                    unit: cur.unit,
                    vendor: cur.vendor || 'Unknown' // Include vendor field
                };
            }

            // Add the quantity for the existing item
            acc[cur.item].qty += qty;

            return acc;
        }, {});

        // Convert the grouped object back to an array
        return Object.values(groupedItems);
    };



    const generatePdfPreview = async (request: Request, action: 'preview' | 'download' = 'preview') => {
        try {
            const formatDate = (serialNumber: any) => {
                const date = new Date((serialNumber - 25569) * 86400 * 1000);
                return date.toLocaleDateString();
            };

            console.log('Request:', request);

            // Extract sectionA data
            const sectionAData = {
                deliveryDate: formatDate(request.sectionA[0]?.[5]) || 'N/A',
                projectDetails: request.sectionA[1]?.[5] || 'N/A',
                picContact: request.sectionA[3]?.[5] || 'N/A',
                entity: request.sectionA[5]?.[5] || 'N/A',
            };

            // Map the items to include the required properties
            const mappedItems = request.excelData.map(item => ({
                ...item,
                item: item["Description of Item "] || 'N/A',
                vendor: item["Suggested Vendor "] || 'N/A',
                quantity: item["Qty"] || 'N/A',
                sectionA: sectionAData,
                unit: item["UOM (Unit, KG, Month, Job)"] || 'N/A',
            }));

            // Generate the PDF
            const { pdfBlob } = await createPdf(mappedItems); // Ensure createPdf returns pdfBlob

            // Handle actions based on the context
            if (action === 'download') {
                const pdfUrl = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = `request_${request.id || 'unknown'}.pdf`; // Use request ID or a fallback name
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } else {
                // Preview action: Open in new tab
                const pdfUrl = URL.createObjectURL(pdfBlob);
                window.open(pdfUrl, '_blank'); // Open the PDF in a new tab
            }

            return pdfBlob; // Return the PDF Blob
        } catch (error) {
            console.error('Error generating PDF preview:', error);
            setError('Error generating PDF preview');
            return null; // Return null in case of error
        }
    };

    const handleSendEmail = async () => {
        if (!Object.keys(weekSelections).length) {
            setError('No vendors selected');
            return;
        }

        setSending(true);
        setError(null);
        setSuccess(null);

        let emailSent = false; // Track if any email was successfully sent

        // Iterate over each vendor in weekSelections
        for (const vendorId of Object.keys(weekSelections)) {
            const vendor = vendors.find((v) => v.id === vendorId);

            if (!vendor) continue; // Skip if no valid vendor found

            const selectedWeeks = weekSelections[vendorId];

            if (!selectedWeeks.length) {
                setError(`No weeks selected for vendor ${vendor.name}`);
                continue;
            }

            // Array to hold items for all selected weeks for this vendor
            let allItemsForVendor: any[] = [];

            for (const weekSelection of selectedWeeks) {
                const { week } = weekSelection;

                console.log('Fetching items for vendor:', vendor.name, 'week:', week);

                try {
                    // Fetch items for the current week
                    const items = await fetchItems(week);

                    console.log('Items for week:', week, items);
                    if (items.length === 0) {
                        setError(`No items found for week ${week}`);
                        continue;
                    }

                    // Add the fetched items to the total list for the vendor
                    allItemsForVendor.push(...items);
                } catch (error) {
                    console.error('Error fetching items for week:', week, error);
                    setError(`Error fetching items for week ${week}`);

                }
            }

            // Group items by name to sum the quantities after all weeks are fetched
            const groupedItems = groupItems(allItemsForVendor);

            if (groupedItems.length === 0) {
                setError(`No items found for vendor ${vendor.name} in the selected weeks`);
                continue;
            }

            console.log('Grouped Items:', groupedItems);

            try {
                // Generate PDF with grouped items
                const { pdfBytes } = await createPdf(groupedItems);

                if (!(pdfBytes instanceof Uint8Array || Buffer.isBuffer(pdfBytes))) {
                    throw new Error('Invalid PDF data type, must be Uint8Array or Buffer');
                }

                const pdfBuffer = Buffer.from(pdfBytes);

                // Send the email
                const pdfFileName = generatePdfFileName(selectedWeeks.map(w => w.week).join('_'), vendor.name);
                const response = await fetch('/api/sendEmail', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        recipient: vendor.email,
                        items: groupedItems,
                        pdfBuffer,
                        pdfFileName,
                    }),
                });

                if (response.ok) {
                    setSuccess(`Email sent successfully to ${vendor.name} for ${selectedWeeks.map(w => `Week ${w.week}`).join(', ')}`);
                    emailSent = true; // Mark that at least one email was sent

                    // Update the status for all selected weeks
                    await Promise.all(
                        selectedWeeks.map(async (weekSelection) => {
                            const { week } = weekSelection;
                            await updateRequestStatus(week); // Update the status for each week
                        })
                    );
                } else {
                    const errorData = await response.json();
                    console.error('Failed to send email:', errorData.error);
                    setError('Failed to send email: ' + errorData.error);
                }
            } catch (error) {
                console.error('Error sending email:', error);
                setError('Error sending email');
            }
        }

        // Close the modal after a delay if at least one email was sent
        if (emailSent) {
            setTimeout(() => {
                onClose(); // Close the modal
            }, 3000); // Adjust the time as needed
        }

        // Reset after all emails are sent
        setSelectedVendor(null);
        setWeekSelections({});
        setSending(false);
    };


    // Function to update the status in Firebase Realtime Database
    const updateRequestStatus = async (week : any) => {
        try {
            console.log("Starting status update process");

            // Reference to the requests in the Firebase Realtime Database
            const requestsRef = ref(database, 'requests');
            const snapshot = await get(requestsRef);

            if (snapshot.exists()) {
                let data = snapshot.val();

                // Iterate over all requests
                for (const requestId in data) {
                    console.log('Request ID:', requestId);
                    const requestData = data[requestId];

                    // Check if the request status is "Admin Approved" and matches the selected week
                    if (requestData.status === 'Admin Approved' && requestData.week == week) {
                        // Update the status to "Send to Vendor"
                        const requestRef = ref(database, `requests/${requestId}`);

                        await update(requestRef, { status: 'Send to Vendor' });
                        console.log(`Status for request ${requestId} updated to: Send to Vendor`);

                        // Fetch the user's email using the userID
                        const userRef = ref(database, `users/${requestData.userID}`);
                        const userSnapshot = await get(userRef);

                        if (userSnapshot.exists()) {
                            const userData = userSnapshot.val();
                            const recipientEmail = userData.email; // Assume 'email' field holds the user's email

                            // Set up email parameters
                            const emailData = {
                                recipient: recipientEmail,
                                status: 'Send to Vendor',
                                requestInfo: requestData.excelData || [] // Adjust to the field with request details
                            };

                            // Send an email notification
                            const response = await fetch('/api/sendNotifications', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(emailData)
                            });

                            // Check the response
                            if (response.ok) {
                                console.log(`Email sent successfully to ${recipientEmail}`);
                            } else {
                                console.error('Failed to send email:', await response.json());
                            }
                        } else {
                            console.error(`User data not found for userID: ${requestData.userID}`);
                        }
                    }
                }
            } else {
                console.error('No requests found in the database');
            }
        } catch (error) {
            console.error('Error updating request status:', error);
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
                                        {Array.from({length: 14}, (_, i) => (
                                            <option key={i + 1} value={(i + 1).toString()}>
                                                Week {i + 1}
                                            </option>
                                        ))}
                                    </select>

                                    {/* PDF Preview and Download */}
                                    {matchingRequests[vendorId]?.[selection.week]?.length > 0 && (
                                        <div className="flex flex-col space-y-4 p-4 bg-gray-100 rounded mt-2">
                                            {matchingRequests[vendorId][selection.week].map((request, requestIndex) => (
                                                <div key={requestIndex}
                                                     className="flex items-center space-x-4 p-4 bg-white rounded shadow">
                                                    <HiOutlineDocument className="h-6 w-6 text-gray-700"/>

                                                    <span className="text-gray-700">
                                                        {`Request ${requestIndex + 1}: ${request.dateCreated ? new Date(request.dateCreated).toLocaleDateString('en-GB') : 'N/A'}`}
                                                    </span>

                                                    <a
                                                        onClick={async () => {
                                                            await generatePdfPreview(request, 'download'); // Call for download
                                                        }}
                                                        className="text-blue-500 hover:underline"
                                                    >
                                                        Download
                                                    </a>

                                                    {/* Preview Button */}
                                                    <button
                                                        onClick={async () => {
                                                            await generatePdfPreview(request, 'preview'); // Call for preview
                                                        }}
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
                        onClick={handleSendEmail}  // No longer need to pass `selectedVendor` directly
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
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                        ) : (
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                        )}
                        <span>{error || success}</span>
                    </div>
                )}

            </div>
        </div>
    ) : null;
};

export default VendorSelectionModal;
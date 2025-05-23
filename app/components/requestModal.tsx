import React, {useEffect, useState} from 'react';
import "../admin/styles/blink.css";
import {ref, update, onValue} from "firebase/database";
import {database} from "../services/firebase";
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';

interface Vendor {
    id: string;
    name: string;
    email: string;
}

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: {
        dateCreated: string;
        requester: string;
        picContact: string;
        department: string;
        status: string;
        downloadLink?: string;
        excelData?: { [key: string]: string }[]; // Assuming excelData is an array of objects with string key-value pairs
        sectionA?: string[][];
        requestId: string;
        userID: string;
    } | null;
}

const BlinkingStatusIndicator = ({ status }: { status: string }) => {
    const statusColors = {
        Pending: '#f59e0b', // Yellow
        'Admin Approved': '#10b981', // Green
        'Admin Disapproved': '#ef4444', // Red
        'Needs Editing': '#f97316', // Orange
        'Edit Requested': '#f59e0b', // Yellow
        'Send to Vendor': '#3b82f6', // Blue
        'Quotation Received': '#9333ea', // Purple
        'Request Successfully': '#22c55e', // Light Green
    };

    const color = statusColors[status] || '#d1d5db'; // Default to gray if status not found

    return (
        <div className="flex items-center space-x-2">
            <span
                className="inline-block w-2 h-2 rounded-full animate-blink"
                style={{ backgroundColor: color }}
            ></span>
            <span className="text-sm font-large">{status}</span>
        </div>
    );
};


const Modal: React.FC<RequestModalProps> = ({ isOpen, onClose, request }) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [remark, setRemark] = useState('');
    const [rejectionType, setRejectionType] = useState<'Needs Editing' | 'Admin Disapproved'>('Admin Disapproved');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFileUrl, setSelectedFileUrl] = useState(''); // URL of the file to send
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [status, setStatus] = useState<string>(request?.status || 'Unknown');

    useEffect(() => {
        const getVendors = ref(database, 'vendors');
        onValue (getVendors, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const vendorsList = Object.keys(data).map((key) => ({
                    id: key,
                    name: data[key].name,
                    email: data[key].email,
                }));
                setVendors(vendorsList);
            }
        });
    }, []);

    useEffect(() => {
        if (request && request.requestId) {
            const requestRef = ref(database, `requests/${request.requestId}`);

            const unsubscribe = onValue(requestRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setStatus(data.status);
                }
            });

            // Clean up the subscription when the component unmounts
            return () => unsubscribe();
        }
    }, [request]);


    const toTitleCase = (str : any) => {
        return typeof str === 'string'
            ? str.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            })
            : str;
    };

    const updateStatus = (status: string, remark = ""): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            if (!request || !request.requestId) {
                console.error("Invalid request data");
                reject("Invalid request data");
                return;
            }

            const requestRef = ref(database, `requests/${request.requestId}`);
            const userRef = ref(database, `users/${request.userID}`);

            // Fetch user data to get the email
            onValue(userRef, async (snapshot) => {
                const userData = snapshot.val();
                if (!userData || !userData.email) {
                    console.error("User data not found or email missing");
                    reject("User data not found or email missing");
                    return;
                }

                const userEmail = userData.email;

                console.log("Updating status with:", { status, remark, requestId: request.requestId, userEmail });

                try {
                    // Avoid re-triggering if status is the same
                    if (request.status === status && remark === "") {
                        console.log("Status is already the same, no update needed.");
                        setError("Status is already the same, no update needed.");
                        setTimeout(() => {
                            setError(null);
                        }, 3000);
                        resolve();
                        return;
                    }

                    // Update the request status and remark
                    await update(requestRef, { status, remark });
                    console.log("Status updated successfully");
                    setSuccess("Status updated successfully");
                    setTimeout(() => {
                        setSuccess(null);
                    }, 3000);

                    // Log the data being sent
                    console.log("Sending email notification with data:", {
                        recipient: userEmail,
                        status,
                        requestInfo: request?.excelData || [],
                    });

                    // Send email notification to the user
                    const response = await fetch('/api/sendNotifications', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            recipient: userEmail,
                            status,
                            requestInfo: request.excelData || [],
                        }),
                    });

                    if (!response.ok) {
                        console.error("Failed to send email notification:", response.statusText);
                        setError("Failed to send email notification");
                        setTimeout(() => {
                            setError(null);
                        }, 3000);
                        reject(response.statusText);
                    } else {
                        resolve();
                    }

                } catch (error) {
                    console.error("Failed to update status:", error);
                    setError("Failed to update status");
                    setTimeout(() => {
                        setError(null);
                    }, 3000);
                    reject(error);
                }
            });
        });
    };

    const approvedEdit = (fileUrl: string) => {
        setSelectedFileUrl(fileUrl);
        setIsModalOpen(true);
        updateStatus('Needs Editing').then(() => {
            setSuccess('Request Approved');
            setTimeout(() => {
                onClose();
            }, 5000);
        }).catch((error: any) => {
            setError('Failed to approve request');
        });
    }


    const handleApprove = (fileUrl: string) => {
        setSelectedFileUrl(fileUrl);
        setIsModalOpen(true);
        updateStatus('Admin Approved').then(() => {
            setSuccess('Request Approved');
            setTimeout(() => {
                onClose();
            }, 5000);
        }).catch((error: any) => {
            setError('Failed to approve request');
        });
    };

    const handleRejectWithRemark = () => {
        const statusToUpdate = rejectionType;
        updateStatus(statusToUpdate, remark);
        setShowRejectModal(false); // Close the reject modal
        setSuccess('Rejection Submitted')
        setTimeout(() => {
            onClose(); // Close the modal after 5 seconds
        }, 5000);
    };

    const excelDateToJSDate = (serial: number): string => {
        const utc_days = Math.floor(serial - 25569); // Excel serial date starts from January 1, 1900
        const utc_value = utc_days * 86400; // Convert days to seconds
        const date_info = new Date(utc_value * 1000); // Convert seconds to milliseconds
        const day = date_info.getUTCDate().toString().padStart(2, '0');
        const month = (date_info.getUTCMonth() + 1).toString().padStart(2, '0'); // Months are 0-based in JS
        const year = date_info.getUTCFullYear();
        return `${day}/${month}/${year}`; // Return the date in dd/mm/yyyy format
    };



    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 text-black">
            <div className="bg-black bg-opacity-50 absolute inset-0" onClick={onClose}></div>
            <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-7xl mx-4 relative max-h-[80vh] overflow-y-auto">
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                    {/* Blinking Status Indicator */}
                    <BlinkingStatusIndicator status={status}/>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="text-gray-700 hover:text-gray-900"
                    >
                        <HiXCircle className="h-6 w-6"/>
                    </button>

                </div>

                <h2 className="text-2xl font-bold mb-6">Request Details</h2>

                {/* Request Information */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Section A</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {request?.sectionA && request.sectionA.length > 0 &&
                                    request.sectionA.map((data, index) => (
                                        <th
                                            key={index}
                                            className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                        >
                                            {data.header}
                                        </th>
                                    ))}
                            </tr>
                            </thead>
                            <tbody>
                            {request?.sectionA && request.sectionA.length > 0 ? (
                                <tr className="even:bg-gray-50">
                                    {request.sectionA.map((data, index) => (
                                        <td
                                            key={index}
                                            className="py-3 px-4 border-b text-sm text-gray-700"
                                        >
                                            {data.header === "Delivery Date:"
                                                ? excelDateToJSDate(data.value)  // Convert and format the delivery date
                                                : data.value} {/* For other fields, just display data[5] */}
                                        </td>
                                    ))}
                                </tr>
                            ) : (
                                <tr>
                                    <td className="py-3 px-4 text-sm text-gray-700" colSpan={request?.sectionA?.length}>
                                        No Section A Data Available
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Excel Data */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Section B</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {request?.excelData && request.excelData.length > 0 &&
                                    Object.keys(request.excelData[0]).map((header, index) => (
                                        <th
                                            key={index}
                                            className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                        >
                                            {header}
                                        </th>
                                    ))}
                            </tr>
                            </thead>
                            <tbody>
                            {request?.excelData && request.excelData.length > 0 ? (
                                request.excelData.map((data, index) => (
                                    <tr key={index} className="even:bg-gray-50">
                                        {Object.values(data).map((value, subIndex) => (
                                            <td
                                                key={subIndex}
                                                className="py-3 px-4 border-b text-sm text-gray-700"
                                            >
                                                {toTitleCase(value)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td className="py-3 px-4 text-sm text-gray-700"
                                        colSpan={Object.keys(request.excelData[0] || {}).length}>
                                        No Excel Data Available
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Approve and Reject Buttons based on status */}
                <div className="flex justify-end space-x-4">
                    {status === 'Pending' && (
                        <>
                            <button
                                onClick={() => handleApprove(selectedFileUrl)}
                                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                                Reject
                            </button>
                        </>
                    )}

                    {status === 'Admin Disapproved' && (
                        <button
                            onClick={() => handleApprove(selectedFileUrl)}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Approve
                        </button>
                    )}

                    {status === 'Needs Editing' && (
                        <button
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    )}

                    {status === 'Admin Approved' && (
                        <button
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    )}

                    {status === 'Send to Vendor' && (
                        <>
                            <button
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                onClick={() => updateStatus('Quotation Received')}
                            >
                                Quotation Received
                            </button>

                            <button
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </>
                    )}

                    {status === 'Edit Requested' && (
                        <button
                            onClick={() => approvedEdit(selectedFileUrl)}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                            Approve
                        </button>
                    )}

                    {status === 'Quotation Received' && (
                        <>
                            <button
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                onClick={() => updateStatus('Request Successfully')}
                            >
                                Request Successfully
                            </button>

                            <button
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </>
                    )}

                </div>

                {/* Reject Modal for Adding Remarks */}
                {showRejectModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 text-black">
                        <div className="bg-black bg-opacity-50 absolute inset-0"></div>
                        <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-md mx-4 relative">
                            <h3 className="text-xl font-semibold mb-4">Add Remark</h3>
                            {/* Radio Buttons for Rejection Type */}
                            <div className="mb-4">
                                <label className="block mb-2 text-gray-700">Rejection Type:</label>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="rejectionType"
                                            value="Admin Disapproved"
                                            checked={rejectionType === 'Admin Disapproved'}
                                            onChange={() => setRejectionType('Admin Disapproved')}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">Admin Disapproved</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input
                                            type="radio"
                                            name="rejectionType"
                                            value="Needs Editing"
                                            checked={rejectionType === 'Needs Editing'}
                                            onChange={() => setRejectionType('Needs Editing')}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">Needs Editing</span>
                                    </label>
                                </div>
                            </div>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                className="w-full border border-gray-300 p-2 rounded mb-4"
                                rows={4}
                                placeholder="Enter remark for rejection"
                            ></textarea>
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={handleRejectWithRemark}
                                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                >
                                    Submit
                                </button>
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
    );
};

export default Modal;
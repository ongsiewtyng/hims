import React, {useState} from 'react';
import "../admin/styles/blink.css";
import {ref} from "@firebase/database";
import {update} from "firebase/database";
import {database} from "../services/firebase";

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
    } | null;
}

const BlinkingStatusIndicator = ({ status }: { status: string }) => {
    const statusColors = {
        Pending: '#f59e0b', // Yellow
        'admin approved': '#10b981', // Green
        'admin disapproved': '#ef4444', // Red
        'editing process': '#f97316', // Orange
        'send to vendor': '#3b82f6', // Blue
        'quotation received': '#9333ea', // Purple
        'request successfully': '#22c55e', // Light Green
    };

    console.log(status);

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


const Modal: React.FC<RequestModalProps> = ({isOpen, onClose, request}) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [remark, setRemark] = useState('');

    console.log('Modal opened with request:', request);

    if (!isOpen || !request) return null;

    const toTitleCase = (str) => {
        return typeof str === 'string'
            ? str.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            })
            : str;
    };

    const updateStatus = (status: string, remark= "") => {
        if (!request || !request.requestId) {
            console.error("Invalid request data");
            return;
        }

        const requestRef = ref(database, `requests/${request.requestId}`);

        update(requestRef, {
            status: status,
            remark: remark,
        }).then(() => {
            console.log("Status updated successfully");
            onClose(); // Close the modal after updating
        }).catch((error) => {
            console.error("Error updating status: ", error);
        });
    };

    const handleApprove = () => {
        updateStatus('admin approved');
    };


    const handleRejectWithRemark = () => {
        updateStatus('admin disapproved', remark);
        setShowRejectModal(false); // Close the reject modal
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 text-black">
            <div className="bg-black bg-opacity-50 absolute inset-0" onClick={onClose}></div>
            <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-6xl mx-4 relative">

                {/* Blinking Status Indicator */}
                <div className="absolute top-4 right-4">
                    <BlinkingStatusIndicator status={request.status}/>
                </div>

                <h2 className="text-2xl font-bold mb-6">Request Details</h2>

                {/* Section A: Request Information */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Section A</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {request.sectionA && request.sectionA.length > 0 &&
                                    request.sectionA.map((data, index) => (
                                        <th
                                            key={index}
                                            className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                        >
                                            {data[0]} {/* Header */}
                                        </th>
                                    ))}
                            </tr>
                            </thead>
                            <tbody>
                            {request.sectionA && request.sectionA.length > 0 ? (
                                <tr className="even:bg-gray-50">
                                    {request.sectionA.map((data, index) => (
                                        <td
                                            key={index}
                                            className="py-3 px-4 border-b text-sm text-gray-700"
                                        >
                                            {data[5]}
                                        </td>
                                    ))}
                                </tr>
                            ) : (
                                <tr>
                                    <td className="py-3 px-4  text-sm text-gray-700"
                                        colSpan={request.sectionA.length}>
                                        No Section A Data Available
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>


                {/* Section B: Excel Data */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Section B</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {request.excelData && request.excelData.length > 0 &&
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
                            {request.excelData && request.excelData.length > 0 ? (
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

                <div className="flex justify-end space-x-4">
                    <button
                        onClick={handleApprove}
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
                </div>

                <button
                    onClick={onClose}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Close
                </button>

                {/* Reject Modal for Adding Remarks */}
                {showRejectModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-50 text-black">
                        <div className="bg-black bg-opacity-50 absolute inset-0"></div>
                        <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-md mx-4 relative">
                            <h3 className="text-xl font-semibold mb-4">Add Remark</h3>
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
        </div>
    );
}

export default Modal;

import React, { useEffect, useState } from 'react';
import "../admin/styles/blink.css";
import { ref, update, onValue } from "firebase/database";
import { database } from "../services/firebase";
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
        excelData?: { [key: string]: string }[];
        sectionA?: { header: string; value: any }[];
        requestId: string;
        userID: string;
    } | null;
}

const BlinkingStatusIndicator = ({ status }: { status: string }) => {
    const statusColors: { [key: string]: string } = {
        Pending: '#f59e0b',
        'Admin Approved': '#10b981',
        'Admin Disapproved': '#ef4444',
        'Needs Editing': '#f97316',
        'Edit Requested': '#f59e0b',
        'Send to Vendor': '#3b82f6',
        'Quotation Received': '#9333ea',
        'Request Successfully': '#22c55e',
    };
    const color = statusColors[status] || '#d1d5db';
    return (
        <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full animate-blink" style={{ backgroundColor: color }}></span>
            <span className="text-sm font-medium">{status}</span>
        </div>
    );
};

const Modal: React.FC<RequestModalProps> = ({ isOpen, onClose, request }) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [remark, setRemark] = useState('');
    const [rejectionType, setRejectionType] = useState<'Needs Editing' | 'Admin Disapproved'>('Admin Disapproved');
    const [selectedFileUrl, setSelectedFileUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [status, setStatus] = useState<string>(request?.status || 'Unknown');

    useEffect(() => {
        const getVendors = ref(database, 'vendors');
        onValue(getVendors, (snapshot) => {
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
        if (request?.requestId) {
            const requestRef = ref(database, `requests/${request.requestId}`);
            return onValue(requestRef, (snapshot) => {
                const data = snapshot.val();
                if (data) setStatus(data.status);
            });
        }
    }, [request]);

    const updateStatus = async (newStatus: string, remark = ""): Promise<void> => {
        if (!request || !request.requestId) return;

        const requestRef = ref(database, `requests/${request.requestId}`);
        const userRef = ref(database, `users/${request.userID}`);

        onValue(userRef, async (snapshot) => {
            const userData = snapshot.val();
            if (!userData?.email) return;

            try {
                await update(requestRef, { status: newStatus, remark });
                setSuccess("Status updated successfully");
                setTimeout(() => setSuccess(null), 3000);

                await fetch('/api/sendNotifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: userData.email,
                        status: newStatus,
                        requestInfo: request.excelData || [],
                    }),
                });
            } catch (error) {
                setError("Failed to update status");
                setTimeout(() => setError(null), 3000);
            }
        });
    };

    const handleApprove = () => {
        if (!window.confirm("Are you sure you want to approve this request?")) return;
        setSelectedFileUrl("");
        updateStatus("Admin Approved").then(() => {
            setTimeout(onClose, 3000);
        });
    };

    const handleRejectWithRemark = () => {
        updateStatus(rejectionType, remark);
        setShowRejectModal(false);
        setTimeout(onClose, 3000);
    };

    const toTitleCase = (str: any) =>
        typeof str === 'string'
            ? str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
            : str;

    const excelDateToJSDate = (serial: number): string => {
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return `${String(date_info.getUTCDate()).padStart(2, '0')}/${String(date_info.getUTCMonth() + 1).padStart(2, '0')}/${date_info.getUTCFullYear()}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-black">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

            <div className="relative z-10 w-full max-w-7xl max-h-[90vh] bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">

                {/* Sticky Header */}
                <div className="bg-white px-6 py-4 border-b sticky top-0 z-20 flex items-center">
                    <h2 className="text-2xl font-bold">Request Details</h2>
                    <div className="ml-auto flex items-center space-x-4">
                        <BlinkingStatusIndicator status={status} />
                        <button onClick={onClose} className="text-gray-700 hover:text-gray-900">
                            <HiXCircle className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-8">
                    {/* Section A */}
                    <section>
                        <h3 className="text-xl font-semibold mb-2">Section A</h3>
                        <table className="min-w-full table-auto border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {request?.sectionA?.map((item, index) => (
                                    <th key={index} className="py-2 px-4 text-left text-xs uppercase">{item.header}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            <tr>
                                {request?.sectionA?.map((item, index) => (
                                    <td key={index} className="py-2 px-4 border-b text-sm text-gray-700">
                                        {item.header === "Delivery Date:" ? excelDateToJSDate(item.value) : item.value}
                                    </td>
                                ))}
                            </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* Section B */}
                    <section>
                        <h3 className="text-xl font-semibold mb-2">Section B</h3>
                        <table className="min-w-full table-auto border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {request?.excelData && Object.keys(request.excelData[0]).map((header, i) => (
                                    <th key={i} className="py-2 px-4 text-left text-xs uppercase">{header}</th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {request?.excelData?.map((row, i) => (
                                <tr key={i} className="even:bg-gray-50">
                                    {Object.values(row).map((val, j) => (
                                        <td key={j} className="py-2 px-4 border-b text-sm text-gray-700">{toTitleCase(val)}</td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </section>
                </div>

                {/* Sticky Footer Actions */}
                <div className="bg-white border-t px-6 py-4 sticky bottom-0 z-20 flex justify-end space-x-4">
                    {status === 'Pending' && (
                        <>
                            <button onClick={handleApprove} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Approve</button>
                            <button onClick={() => setShowRejectModal(true)} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Reject</button>
                        </>
                    )}
                    {(status === 'Admin Approved' || status === 'Needs Editing') && (
                        <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Close</button>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center text-black">
                    <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                    <div className="z-10 bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Add Remark</h3>
                        <div className="mb-4">
                            <label className="block mb-1 text-gray-700">Rejection Type:</label>
                            <div className="space-x-4">
                                {['Admin Disapproved', 'Needs Editing'].map(type => (
                                    <label key={type} className="inline-flex items-center">
                                        <input type="radio" className="form-radio" value={type} checked={rejectionType === type} onChange={() => setRejectionType(type as any)} />
                                        <span className="ml-2">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <textarea value={remark} onChange={e => setRemark(e.target.value)} className="w-full border p-2 rounded mb-4" rows={4} placeholder="Enter remark for rejection"></textarea>
                        <div className="flex justify-end space-x-4">
                            <button onClick={handleRejectWithRemark} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Submit</button>
                            <button onClick={() => setShowRejectModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification */}
            {(error || success) && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-md flex items-center space-x-2">
                    {success ? <HiCheckCircle className="text-green-400 h-5 w-5" /> : <HiXCircle className="text-red-400 h-5 w-5" />}
                    <span>{error || success}</span>
                </div>
            )}
        </div>
    );
};

export default Modal;

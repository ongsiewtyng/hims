import React, { useEffect, useState } from 'react';
import {ref, onValue, update} from "firebase/database";
import {HiOutlineSearch, HiOutlineTrash} from "react-icons/hi";
import Modal from "../components/requestModal";
import { database } from "../services/firebase";
import "../components/shake.css";

interface Request {
    dateCreated: string;
    requester: string;
    picContact: string;
    department: string;
    entity: string;
    status: string;
    downloadLink: string | null;
    excelData: any[];
    sectionA: any[];
    requestId?: string;
    week: string; // Added week property
}

const ProgressTracker = () => {
    const [requests, setRequests] = useState<Request[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const formatDate = (date: string) => {
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            year: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        return new Date(date).toLocaleString('en-US', options);
    };

    const toTitleCase = (str: string): string => str
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());

    const statusColors: { [key: string]: string } = {
        Pending: '#f59e0b', // Yellow
        'Admin Approved': '#10b981', // Green
        'Admin Disapproved': '#ef4444', // Red
        'Needs Editing': '#f97316', // Orange
        'Edit Requested': '#f59e0b', // Yellow
        'Send to Vendor': '#3b82f6', // Blue
        'Quotation Received': '#9333ea', // Purple
        'Request Successfully': '#22c55e', // Light Green
    };

    const circleStyles = (color: string) => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        marginRight: '8px',
        animation: 'blink 1.3s infinite',
    });

    useEffect(() => {
        const requestsRef = ref(database, 'requests');
        onValue(requestsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedData: Request[] = Object.keys(data)
                    .map(key => ({
                        dateCreated: formatDate(data[key].dateCreated),
                        requester: toTitleCase(data[key].sectionA[2].value),
                        archived: data[key].archived,
                        picContact: data[key].sectionA[3].value,
                        department: data[key].sectionA[4].value,
                        entity: data[key].sectionA[5].value,
                        status: data[key].status,
                        downloadLink: data[key].downloadLink || null,
                        excelData: data[key].excelData || [],
                        sectionA: data[key].sectionA || [],
                        requestId: key,
                        week: data[key].week,
                        userID: data[key].userID || null
                    }))
                    .filter(request => !request.archived); // Filter out archived requests
                setRequests(formattedData);
                console.log('Requests:', formattedData);
            } else {
                setRequests([]); // Handle case where there is no data
            }
        });
    }, []);

    const filteredRequests = requests.filter(request => {
        const query = searchQuery.toLowerCase();
        return (
            (request.dateCreated?.toLowerCase() || '').includes(query) ||
            (request.requester?.toLowerCase() || '').includes(query) ||
            (request.picContact?.toLowerCase() || '').includes(query) ||
            (request.department?.toLowerCase() || '').includes(query) ||
            (request.entity?.toLowerCase() || '').includes(query) ||
            (request.status?.toLowerCase() || '').includes(query)
        );
    });

    const groupedRequests: { [key: string]: Request[] } = filteredRequests.reduce((acc: { [key: string]: Request[] }, request: Request) => {
        const week = request.week;
        if (!acc[week]) {
            acc[week] = [];
        }
        acc[week].push(request);
        return acc;
    }, {});

    const handleArchive = (requestId: string) => {
        const requestRef = ref(database, `requests/${requestId}`);
        update(requestRef, { archived: true })
            .then(() => {
                console.log(`Request ${requestId} archived successfully.`);
                setRequests((prevRequests) =>
                    prevRequests.filter((request) => request.requestId !== requestId)
                );
            })
            .catch((error) => {
                console.error(`Failed to archive request ${requestId}:`, error);
            });
    };

    useEffect(() => {
        const archiveRequests = () => {
            const now = new Date().getTime();
            requests.forEach((request) => {
                if (request.status === 'Request Successfully') {
                    const requestDate = new Date(request.dateCreated).getTime();
                    const oneDay = 24 * 60 * 60 * 1000;
                    if (now - requestDate >= oneDay) {
                        handleArchive(request.requestId);
                    }
                }
            });
        };

        const interval = setInterval(archiveRequests, 60 * 60 * 1000); // Check every hour
        return () => clearInterval(interval);
    }, [requests]);

    return (
        <div>
            {/* Search bar */}
            <div className="mb-4 relative max-w-full">
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-black border border-gray-300 rounded-md py-2 px-4 pr-10 w-full focus:outline-none focus:border-blue-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <HiOutlineSearch className="h-5 w-5 text-gray-400" />
                </div>
            </div>

            {/* Group requests by week */}
            {Object.keys(groupedRequests).map((week) => (
                <div key={week} className="mb-8">
                    {/* Week title */}
                    <h2 className="text-xl font-bold text-gray-700 mb-4">
                        Week {week}
                    </h2>

                    {/* Requests Table */}
                    <table className="bg-white p-8 rounded-2xl shadow-2xl w-full">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Submission Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Requester
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                PIC & Contact Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Department
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Download
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {groupedRequests[week].map((request, index) => (
                            <tr
                                key={index}
                                className="cursor-pointer"
                                onClick={() => {
                                    console.log("Selected Request:", request.requestId);
                                    setSelectedRequest(request);
                                }}
                            >
                                <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">
                                    {request.dateCreated}
                                </td>
                                <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">
                                    {request.requester}
                                </td>
                                <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">
                                    {request.picContact}
                                </td>
                                <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">
                                    {request.department}
                                </td>
                                <td
                                    className="text-gray-600 px-6 py-4 whitespace-nowrap border"
                                    style={{color: statusColors[request.status] || '#6b7280'}}
                                >
                                    <span style={circleStyles(statusColors[request.status])}></span>
                                    {request.status}
                                </td>
                                <td
                                    className="text-gray-600 px-6 py-4 whitespace-nowrap border"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center">
                                        {request.downloadLink ? (
                                            <a href={request.downloadLink} className="text-blue-500">
                                                Download
                                            </a>
                                        ) : (
                                            'N/A'
                                        )}
                                        <HiOutlineTrash
                                            className="h-5 w-5 text-red-500 cursor-pointer ml-auto hover:text-red-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleArchive(request.requestId);
                                            }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ))}

            {/* No requests message */}
            {Object.keys(groupedRequests).length === 0 && (
                <div className="text-center text-gray-500 mt-4">
                    No requests at the moment
                </div>
            )}

            {/* Selected Request Modal */}
            {selectedRequest && (
                <Modal
                    isOpen={!!selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    request={selectedRequest}
                />
            )}
        </div>
    );
};

export default ProgressTracker;
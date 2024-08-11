import React, { useEffect, useState } from 'react';
import {off, ref} from "@firebase/database";
import {database} from "../services/firebase";
import {onValue} from "firebase/database";

interface Request {
    dateCreated: string;
    requester: string;
    picContact: string;
    department: string;
    entity: string;
    status: string;
    downloadLink: string | null;
}

interface RequestData {
    userID: string;
    dateCreated: string;
    sectionA: { [key: string]: string[] };
    status: string;
    downloadLink?: string;
    excelData?: { [key: string]: string }[];
}


const ReqTable = ({userID}) => {
    const [requests, setRequests] = useState<Request[]>([]);

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

    const statusColors = {
        Pending: '#f59e0b', // Yellow
        'admin approved': '#10b981', // Green
        'admin disapproved': '#ef4444', // Red
        'editing process': '#f97316', // Orange
        'send to vendor': '#3b82f6', // Blue
        'quotation received': '#9333ea', // Purple
        'request successfully': '#22c55e', // Light Green
    };

    // CSS for the blinking circle
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
        if (!userID) return; // Exit early if userID is not set

        const requestsRef = ref(database, 'requests');
        onValue(requestsRef, (snapshot) => {
            const data = snapshot.val();
            console.log('Fetched data:', data); // Debugging line

            if (data) {
                // Filter the data by userID
                const filteredRequests = Object.entries(data)
                    .filter(([key, value]) => {
                        const requestData = value as RequestData;
                        console.log('Request data:', requestData); // Debugging line
                        return requestData.userID === userID;
                    })
                    .map(([key, value]) => {
                        const requestData = value as RequestData;
                        return {
                            id: key,
                            dateCreated: formatDate(requestData.dateCreated),
                            requester: toTitleCase(requestData.sectionA['2'][5]),
                            picContact: requestData.sectionA['3'][5],
                            department: requestData.sectionA['4'][5],
                            entity: requestData.sectionA['5'][5],
                            status: requestData.status,
                            downloadLink: requestData.downloadLink || null,
                            excelData: requestData.excelData || [],
                            sectionA: requestData.sectionA || [],
                        };
                    });

                console.log('Filtered requests:', filteredRequests); // Debugging line
                setRequests(filteredRequests); // Set filtered and formatted data
            } else {
                setRequests([]); // Handle case where there is no data
            }
        });

        // Clean up the listener on unmount
        return () => {
            off(requestsRef);
        };
    }, [userID]);


    return (
        <div>
            {requests.length > 0 ?
                <table className="bg-white p-8 rounded-2xl shadow-2xl w-full">
                    <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Submission Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Requester</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">PIC & Contact Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Download</th>
                    </tr>
                    </thead>
                    <tbody>
                    {requests.map((request, index) => (
                        <tr key={index} className="cursor-pointer">
                            <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.dateCreated}</td>
                            <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.requester}</td>
                            <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.picContact}</td>
                            <td className="text-gray-600 px-6 py-4 whitespace-nowrap border">{request.department}</td>
                            <td className="text-gray-600 px-6 py-4 whitespace-nowrap border" style={{color: statusColors[request.status] || '#6b7280'}}>
                                <span style={circleStyles(statusColors[request.status])}></span>
                                {request.status}
                            </td>
                            <td className="text-gray-600 px-6 py-4 whitespace-nowrap border" onClick={e => e.stopPropagation()}>
                                {request.downloadLink ? (
                                    <a href={request.downloadLink} className="text-blue-500">Download</a>
                                ) : (
                                    'N/A'
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                :
                <div className="flex items-center justify-center">
                    <table className="min-w-full bg-white shadow-md rounded-lg">
                        <thead className="bg-gray-100 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Submission Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Requester</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">PIC & Contact Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Download</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td className="text-gray-600 px-6 py-4 whitespace-nowrap border" colSpan={6}>
                                <div className="flex items-center justify-center">
                                    <h1 className="text-l font-bold text-gray-500">No requests found</h1>
                                </div>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            }
        </div>
    );
};

export default ReqTable;
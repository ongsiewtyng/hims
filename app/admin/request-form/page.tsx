'use client'
import RequestForm from '../../components/RequestForm';
import Sidenav from "../../components/Sidenav";
import React, {useEffect, useState} from "react";
import {HiOutlineDocumentText} from "react-icons/hi";
import {ref} from "@firebase/database";
import {database} from "../../services/firebase";
import {onValue} from "firebase/database";
import Header from "../../components/Header";
import RequestTable from "../../components/RequestTable";

// Define the Request interface
interface Request {
    requester: string;
    dateCreated: string;
    status: string;
    // Add other properties if needed
}

export default function ItemRequest() {
    // fields for form
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);

    const [sectionA, setSectionA] = useState<any[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [extractedValues, setExtractedValues] = useState<string[]>([]);
    const [sectionAHeaders, setSectionAHeaders] = useState<string[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);

    const handleExcelDataChange = (sectionA: any[], header: string[], data: any[], extractedValues: any[]) => {
        setSectionA(sectionA);
        setHeaders(header);
        setExcelData(data);
        setExtractedValues(extractedValues);

        // Extract headers from sectionA
        const sectionAHeaderList = sectionA.map(row => row[0].replace(':', '').trim());
        setSectionAHeaders(sectionAHeaderList); // Update state with section A headers

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

    // CSS keyframes for the blink animation
    const blinkKeyframes = `
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
    }`;

    useEffect(() => {
        const requestsRef = ref(database, 'requests');
        onValue(requestsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const requestsArray = Object.keys(data).map(key => {
                    const requestData = data[key];
                    const requesterName = requestData.sectionA?.[2]?.[5] || 'Unknown';
                    return {
                        id: key,
                        ...requestData,
                        requester: toTitleCase(requesterName)
                    };
                });
                setRequests(requestsArray);
            }
        });
    }, []);

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen}/>
            <div className= {`flex-1 bg-white-50 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <Header/>
                <div className="min-h-screen flex-col items-center justify-center">
                    <div className="flex items-center justify-center h-16 text-black">
                        <h1 className="text-2xl font-bold">Item Request</h1>
                    </div>
                    <style>{blinkKeyframes}</style>
                    <RequestTable/>
                </div>
            </div>
        </div>
    );
}
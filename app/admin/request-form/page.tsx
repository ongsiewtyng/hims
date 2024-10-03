'use client'
import Sidenav from "../../components/Sidenav";
import React, {useEffect, useState} from "react";
import {database} from "../../services/firebase";
import {get, onValue, ref, set} from "@firebase/database";
import Header from "../../components/Header";
import RequestTable from "../../components/RequestTable";
import VendorSelectionModal from "../../components/VendorSelection";

// Define the Request interface
interface Request {
    requester: string;
    dateCreated: string;
    status: string;
    // Add other properties if needed
}

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
    onSendEmail: (vendor: Vendor) => void;
}

export default function AdminItemRequest() {
    // fields for form
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);

    const [requests, setRequests] = useState<Request[]>([]);
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [selectedFileUrl, setSelectedFileUrl] = useState('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isCountdownEnabled, setIsCountdownEnabled] = useState(false);


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

    const toTitleCase = (str: string): string => str
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());


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

    useEffect(() => {
        const countdownRef = ref(database, 'settings/countdownEnabled');
        onValue(countdownRef, (snapshot) => {
            const data = snapshot.val();
            setIsCountdownEnabled(data);
        });
    }, []);

    const handleToggleCountdown = async () => {
        const newState = !isCountdownEnabled; // Toggle the current state
        set(ref(database, 'settings/countdownEnabled'), newState); // Update in Firebase
        setIsCountdownEnabled(newState); // Local state update
    };

    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidenav setIsSidenavOpen={setIsSidenavOpen} />
            <div className={`flex-1 bg-white-50 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <Header />
                <div className="flex-1 min-h-screen flex-col items-center justify-center">
                    <div className="flex items-center justify-center h-16 text-black">
                        <h1 className="text-2xl font-bold">Item Request</h1>
                    </div>
                    <style>{blinkKeyframes}</style>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setShowVendorModal(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Send to Vendor
                        </button>
                    </div>

                    {/* Button to toggle the countdown */}
                    <div className="flex justify-end mb-4">
                        <span className="mr-3 text-gray-700">
                            {isCountdownEnabled ? "Countdown Enabled" : "Countdown Disabled"}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={isCountdownEnabled}
                                onChange={handleToggleCountdown}
                            />
                            <div
                                className={`w-10 h-6 rounded-full ${isCountdownEnabled ? 'bg-green-500' : 'bg-red-500'} transition`}/>
                            <div
                                className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform ${isCountdownEnabled ? 'translate-x-5' : 'translate-x-1'}`}/>
                        </label>
                    </div>


                    {/* Vendor Selection Modal */}
                    {showVendorModal && (
                        <VendorSelectionModal
                            isOpen={showVendorModal}
                            onClose={() => setShowVendorModal(false)}
                            fileUrl={selectedFileUrl}
                            vendors={vendors} // Pass the list of vendors here
                        />
                    )}
                    <RequestTable/>
                </div>
            </div>
        </div>
    );

}
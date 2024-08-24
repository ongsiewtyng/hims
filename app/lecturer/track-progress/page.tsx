'use client'
import React, {useEffect, useState} from 'react';
import ReqTable from '../../components/ReqTable';
import {onAuthStateChanged} from "@firebase/auth"; // Adjust the path if necessary
import {getAuth} from "firebase/auth";
import SidenavLecturer from "../../components/SidenavLecturer";


const TrackProgress: React.FC = () => {
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const [userID, setUserID] = useState<string | null>(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserID(user.uid);
            } else {
                setUserID(null);
                alert('User not authenticated.');
            }
        });

        // Cleanup the listener on component unmount
        return () => unsubscribe();
    }, []);


    return (
        <div className="min-h-screen bg-gray-50">
            <SidenavLecturer setIsSidenavOpen={setIsSidenavOpen}/>
            <div className={`flex-1 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <main className="flex-grow">
                    <div className="p-6">
                        <div className="p-6 rounded-lg">
                            <div className="flex items-center justify-between mb-6">
                                <h1 className="text-2xl font-bold text-black">Track Progress</h1>
                            </div>
                            {userID && <ReqTable userID={userID}/>}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TrackProgress;

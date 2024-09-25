'use client'
import RequestForm from '../../components/RequestForm';
import SidenavLecturer from "../../components/SidenavLecturer";
import {useEffect, useState} from "react";
import {database} from "../../services/firebase";
import {push, ref, set, onValue} from "@firebase/database";
import {getAuth} from "firebase/auth";
import { HiOutlinePencil } from "react-icons/hi";
import "../../lecturer/request-form/flipClock.css"


// Define the type for the countdown state
type Countdown = {
    days: number;
    hours: string;
    minutes: string;
    seconds: string;
};

export default function LecturerItemRequest() {
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // State for edit mode
    const [formKey, setFormKey] = useState(0); // Key to control Page remount
    const [showExcelData, setShowExcelData] = useState(false);

    const [sectionA, setSectionA] = useState<any[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [extractedValues, setExtractedValues] = useState<string[]>([]);
    const [sectionAHeaders, setSectionAHeaders] = useState<string[]>([]);
    const [downloadURL, setDownloadURL] = useState<string>('');
    const [isSubmittable, setIsSubmittable] = useState(false);
    const [isCountdownEnabled, setIsCountdownEnabled] = useState(false);


    // Define the countdown state as an object with `days`, `hours`, `minutes`, and `seconds`
    const [countdown, setCountdown] = useState<Countdown>({
        days: 0,
        hours: "00",
        minutes: "00",
        seconds: "00"
    });

    useEffect(() => {
        const countdownRef = ref(database, 'settings/countdownEnabled');
        onValue(countdownRef, (snapshot) => {
            const enabled = snapshot.val();
            setIsCountdownEnabled(enabled); // Update local state based on Firebase value
        });
    }, []);

    // Helper function to calculate the remaining time until the next Monday at 6 PM
    const calculateTimeUntilNextMonday = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const daysUntilNextMonday = (1 - dayOfWeek + 7) % 7 || 7; // How many days until next Monday
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilNextMonday);
        nextMonday.setHours(18, 0, 0, 0); // Set to 6 PM

        return nextMonday.getTime() - now.getTime(); // Time difference in milliseconds
    };

    // Helper function to calculate the remaining time until the next Monday
    const calculateTimeUntilNextWednesday = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const daysUntilNextWednesday = (3 - dayOfWeek + 7) % 7 || 7; // How many days until next Wednesday
        const nextWednesday = new Date(now);
        nextWednesday.setDate(now.getDate() + daysUntilNextWednesday);
        nextWednesday.setHours(18, 0, 0, 0); // Set to 6 PM

        return nextWednesday.getTime() - now.getTime(); // Time difference in milliseconds
    };

    const handleExcelDataChange = (sectionA: any[], header: string[], data: any[], extractedValues: any[], downloadURL: string) => {
        setSectionA(sectionA);
        setHeaders(header);
        setExcelData(data);
        setExtractedValues(extractedValues);
        setDownloadURL(downloadURL);

        const sectionAHeaderList = sectionA.map(row => row[0].replace(':', '').trim());
        setSectionAHeaders(sectionAHeaderList);

        setShowExcelData(true); // Show Excel data when data is available
    };

    const handleInputChange = (index: number, value: string) => {
        const updatedValues = [...extractedValues];
        updatedValues[index] = value;
        setExtractedValues(updatedValues);
    };

    const handleExcelInputChange = (rowIndex: number, colHeader: string, value: string) => {
        const updatedData = [...excelData];
        updatedData[rowIndex][colHeader] = value;
        setExcelData(updatedData);
    };


    // Format the time into days, hours, minutes, and seconds
    const formatTime = (timeInMilliseconds: number) => {
        const totalSeconds = Math.floor(timeInMilliseconds / 1000);
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return {
            days,
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0')
        };
    };

    useEffect(() => {
        if (!isCountdownEnabled) {
            setIsSubmittable(true); // If countdown is disabled, always allow submission
            return;
        }
        const checkSubmittable = () => {
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();

            const isWithinWeek = day >= 1 && day <= 3; // Monday to Wednesday
            const isBefore6PM = day < 3 || (day === 3 && hour < 18); // Before 6 PM on Wednesday

            setIsSubmittable(isWithinWeek && isBefore6PM);

            // Calculate the remaining time based on the countdown state
            const timeUntilNext = isCountdownEnabled ? calculateTimeUntilNextWednesday() : calculateTimeUntilNextMonday();
            setCountdown(formatTime(timeUntilNext));
        };

        checkSubmittable(); // Check initially

        const intervalId = setInterval(checkSubmittable, 1000); // Check every second

        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [isCountdownEnabled]); // Re-run effect when countdown state changes


    const handleSubmit = async () => {
        if (confirm('Do you want to submit the form?')) {
            try {
                const sanitizedExcelData = excelData.map(row =>
                    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? '']))
                );

                const auth = getAuth();
                const user = auth.currentUser;
                const userID = user ? user.uid : null;

                if (!userID) {
                    alert('User not found.');
                    return;
                }

                const newRequestRef = push(ref(database, 'requests'));
                await set(newRequestRef, {
                    sectionA,
                    excelData: sanitizedExcelData,
                    status: "Pending",
                    dateCreated: new Date().toISOString(),
                    downloadLink: downloadURL,
                    userID: userID
                });
                alert('Data submitted successfully.');
                setShowExcelData(false);
                // Change formKey to remount the Page component
                setFormKey(prevKey => prevKey + 1);

            } catch (e) {
                console.error('Error adding document: ', e);
                alert('Error adding document: ' + e.message);
            }
        }
    };

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
    };

    const flipClockClass = isSubmittable ? 'submittable' : 'not-submittable';

    return (
        <div className="min-h-screen bg-gray-50">
            <SidenavLecturer setIsSidenavOpen={setIsSidenavOpen}/>
            <div className={`flex-1 bg-gray-50 transition-all duration-300 ${isSidenavOpen ? 'ml-64' : 'ml-20'} p-8`}>
                <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center h-16 text-black">
                        <h1 className="text-2xl font-bold">Item Request</h1>
                    </div>

                    <div className="mt-4 text-center text-sm text-gray-700">
                        <p>You can submit the form from Monday to Wednesday.</p>
                        <p>Submission deadline: Wednesday, 6:00 PM</p>
                        <p className="mt-2">Time remaining:</p>
                    </div>

                    <div className={`flip-clock ${flipClockClass}`}>
                        <div className={`flip-unit-container ${isSubmittable ? 'submittable' : 'not-submittable'}`}>
                            <div className="flip-unit">
                                <span className="flip-top">{countdown.days}</span>
                                <span className="flip-bottom">{countdown.days}</span>
                            </div>
                            <span className="flip-label">days</span>
                        </div>

                        <div className="flip-separator">:</div>

                        <div className={`flip-unit-container ${isSubmittable ? 'submittable' : 'not-submittable'}`}>
                            <div className="flip-unit">
                                <span className="flip-top">{countdown.hours}</span>
                                <span className="flip-bottom">{countdown.hours}</span>
                            </div>
                            <span className="flip-label">hours</span>
                        </div>

                        <div className="flip-separator">:</div>

                        <div className={`flip-unit-container ${isSubmittable ? 'submittable' : 'not-submittable'}`}>
                            <div className="flip-unit">
                                <span className="flip-top">{countdown.minutes}</span>
                                <span className="flip-bottom">{countdown.minutes}</span>
                            </div>
                            <span className="flip-label">minutes</span>
                        </div>

                        <div className="flip-separator">:</div>

                        <div className={`flip-unit-container ${isSubmittable ? 'submittable' : 'not-submittable'}`}>
                            <div className="flip-unit">
                                <span className="flip-top">{countdown.seconds}</span>
                                <span className="flip-bottom">{countdown.seconds}</span>
                            </div>
                            <span className="flip-label">seconds</span>
                        </div>
                    </div>


                    {/* Only render the RequestForm and form contents if submission is allowed */}
                    {isSubmittable ? (
                        <>
                            {/* RequestForm is enabled */}
                            <RequestForm key={formKey} onExcelDataChange={handleExcelDataChange} />

                            {/* Excel data table with edit mode if allowed */}
                            {showExcelData && excelData.length > 0 && (
                                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full" style={{width: '90rem'}}>
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-2xl font-bold mb-4 text-gray-700">Section A</h2>
                                        <button onClick={toggleEditMode}>
                                            <HiOutlinePencil className="h-5 w-5 text-gray-500 mr-2"/>
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white shadow-md rounded-lg">
                                            <thead className="bg-gray-100 border-b">
                                            <tr>
                                                {sectionAHeaders.map((header, index) => (
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
                                            <tr>
                                                {extractedValues.map((value, index) => (
                                                    <td
                                                        key={index}
                                                        className="py-3 px-4 border-b text-sm text-gray-700"
                                                    >
                                                        {isEditMode ? (
                                                            <input
                                                                type="text"
                                                                value={value}
                                                                onChange={(e) => handleInputChange(index, e.target.value)}
                                                                className="w-full px-2 py-1 border rounded"
                                                            />
                                                        ) : (
                                                            value
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Section B */}
                                    <div className="mt-8">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-2xl font-bold mb-4 text-gray-700">Section B</h2>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white shadow-md rounded-lg">
                                                <thead className="bg-gray-100 border-b">
                                                <tr>
                                                    {headers.map((header, index) => (
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
                                                {excelData.map((row, rowIndex) => (
                                                    <tr key={rowIndex} className="even:bg-gray-50">
                                                        {headers.map((header, colIndex) => (
                                                            <td
                                                                key={colIndex}
                                                                className="py-3 px-4 border-b text-sm text-gray-700"
                                                            >
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        value={row[header] || ''}
                                                                        onChange={(e) => handleExcelInputChange(rowIndex, header, e.target.value)}
                                                                        className="w-full px-2 py-1 border rounded"
                                                                    />
                                                                ) : (
                                                                    row[header]
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                            onClick={handleSubmit}
                                            disabled={!isSubmittable}
                                        >
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-500 italic text-center py-8">
                            Submission is currently closed. You can only submit from Monday to Wednesday before 6 PM.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


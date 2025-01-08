'use client'
import RequestForm from '../../components/RequestForm';
import SidenavLecturer from "../../components/SidenavLecturer";
import React, {useEffect, useState} from "react";
import {database} from "../../services/firebase";
import {push, ref, set, onValue} from "@firebase/database";
import {getAuth} from "firebase/auth";
import {HiChevronLeft, HiChevronRight, HiOutlinePencil} from "react-icons/hi";
import "../../lecturer/request-form/flipClock.css"
import ReactPaginate from 'react-paginate';

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

    // Store data per file
    const [fileData, setFileData] = useState<any[]>([]); // Array for storing each file's data
    const [currentFileIndex, setCurrentFileIndex] = useState(0); // Tracks the current file being displayed

    const [sectionA, setSectionA] = useState<any[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [downloadURL, setDownloadURL] = useState<string>('');
    const [isSubmittable, setIsSubmittable] = useState(false);
    const [isCountdownEnabled, setIsCountdownEnabled] = useState(false);
    const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]); // State for selected week

    const handleWeekChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newSelectedWeeks = [...selectedWeeks];
        newSelectedWeeks[currentFileIndex] = Number(event.target.value);
        setSelectedWeeks(newSelectedWeeks);
    };

    const handlePageChange = (selectedItem: { selected: number }) => {
        setCurrentFileIndex(selectedItem.selected);
    };

    const currentData = fileData[currentFileIndex]?.data || [];
    const pageCount = fileData.length;

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

    // Helper function to calculate time until Wednesday 6 PM
    const calculateTimeUntilNextWednesday = () => {
        const now = new Date();
        const nextWednesday = new Date(now);
        nextWednesday.setDate(now.getDate() + ((3 - now.getDay() + 7) % 7)); // Get the next Wednesday
        nextWednesday.setHours(18, 0, 0, 0); // Set time to 6 PM

        return nextWednesday - now;
    };

// Helper function to calculate time until next Monday 12 AM
    const calculateTimeUntilNextMonday = () => {
        const now = new Date();
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7)); // Get the next Monday
        nextMonday.setHours(0, 0, 0, 0); // Set time to 12 AM

        return nextMonday - now;
    };

    // Handles new file data
    const handleExcelDataChange = (sectionA: any[], sectionAHeaders: string[], header: string[], data: any[], extractedValues: any[], downloadURL: string) => {

        const newFileData = {
            sectionA,
            sectionAHeaders,
            headers: header,
            data,
            extractedValues,
            downloadURL
        };

        setFileData(prevData => [...prevData, newFileData]);  // Store each file's data separately
        setCurrentFileIndex(fileData.length); // Switch to the newly added file
        setShowExcelData(true);
    };

    // Input change handlers remain the same
    const handleInputChange = (index: number, value: string) => {
        const updatedValues = [...fileData[currentFileIndex].extractedValues];
        updatedValues[index] = value;
        const updatedFileData = [...fileData];
        updatedFileData[currentFileIndex].extractedValues = updatedValues;
        setFileData(updatedFileData);
    };

    const handleExcelInputChange = (rowIndex: number, colHeader: string, value: string) => {
        const updatedData = [...fileData[currentFileIndex].data];
        updatedData[rowIndex][colHeader] = value;
        const updatedFileData = [...fileData];
        updatedFileData[currentFileIndex].data = updatedData;
        setFileData(updatedFileData);
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

            // Check if the current day is between Monday and Wednesday and before 6 PM
            const isWithinWeek = (day >= 1 && day < 3) || (day === 3 && hour < 18); // Monday to Wednesday before 6 PM

            setIsSubmittable(isWithinWeek);

            let timeUntilNext;

            // If it's before Wednesday 6 PM, countdown to Wednesday; otherwise, countdown to next Monday
            if (day < 3 || (day === 3 && hour < 18)) {
                timeUntilNext = calculateTimeUntilNextWednesday(); // Before 6 PM on Wednesday
            } else {
                timeUntilNext = calculateTimeUntilNextMonday(); // After 6 PM on Wednesday
            }

            setCountdown(formatTime(timeUntilNext));
        };

        checkSubmittable(); // Check initially

        const intervalId = setInterval(checkSubmittable, 1000); // Check every second

        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [isCountdownEnabled]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        if (confirm('Do you want to submit the form?')) {
            try {
                const auth = getAuth();
                const user = auth.currentUser;
                const userID = user ? user.uid : null;

                if (!userID) {
                    alert('User not found.');
                    return;
                }

                for (let i = 0; i < fileData.length; i++) {
                    const sanitizedExcelData = fileData[i].data.map((row: any) =>
                        Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value ?? '']))
                    );

                    const newRequestRef = push(ref(database, 'requests'));
                    await set(newRequestRef, {
                        sectionA: fileData[i].sectionA,
                        excelData: sanitizedExcelData,
                        status: "Pending",
                        dateCreated: new Date().toISOString(),
                        downloadLink: fileData[i].downloadURL,
                        userID: userID,
                        week: selectedWeeks[i] || 1 // Save the selected week for each file
                    });
                }

                alert('Data submitted successfully.');
                setShowExcelData(false);
                setFormKey(prevKey => prevKey + 1);

            } catch (e) {
                console.error('Error adding document: ', e);
                alert('Error adding document: ' + e.message);
            }
        }
    };

    const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (confirm('Do you want to cancel the submission?')) {
            setShowExcelData(false);
            setFormKey(prevKey => prevKey + 1); // Reset the form key to remount the RequestForm component
        }

        setFileData([]);
        setCurrentFileIndex(0);
        setSectionA([]);
        setExcelData([]);
        setDownloadURL('');
        setSelectedWeeks([]);

        // Check if the form should be submittable based on the countdown setting
        if (!isCountdownEnabled) {
            setIsSubmittable(true);
        } else {
            // Check if the form should be submittable based on the current time and day
            const now = new Date();
            const day = now.getDay();
            const hour = now.getHours();
            const isWithinWeek = (day >= 1 && day < 3) || (day === 3 && hour < 18); // Monday to Wednesday before 6 PM

            setIsSubmittable(isWithinWeek);
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
                            <RequestForm key={formKey} onExcelDataChange={handleExcelDataChange}/>

                            {/* Excel data table */}
                            {showExcelData && fileData.length > 0 && (
                                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full" style={{width: '90rem'}}>
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-2xl font-bold mb-4 text-gray-700">Section A</h2>
                                        <div className="flex items-center">
                                            <button
                                                className="ml-4 text-gray-700 py-2 px-4 rounded flex items-center"
                                                onClick={toggleEditMode}
                                            >
                                                <HiOutlinePencil className="w-5 h-5 mr-2"/>
                                                {isEditMode ? 'Save Changes' : 'Edit Data'}
                                            </button>
                                            <select
                                                value={selectedWeeks[currentFileIndex] || 1}
                                                onChange={handleWeekChange}
                                                className="text-black border border-gray-300 rounded-md p-2 ml-auto"
                                            >
                                                {Array.from({length: 14}, (_, i) => (
                                                    <option key={i + 1} value={i + 1}>
                                                        Week {i + 1}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {/* Section A Table */}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white shadow-md rounded-lg">
                                            <thead className="bg-gray-100 border-b">
                                            <tr>
                                                {fileData[currentFileIndex]?.sectionAHeaders.map((header: any, index: number) => (
                                                    <th key={index}
                                                        className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody>
                                            <tr>
                                                {fileData[currentFileIndex]?.extractedValues.map((value: string, index: number) => (
                                                    <td key={index}
                                                        className="py-3 px-4 border-b text-sm text-gray-700">
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

                                    {/* Section B Table */}
                                    <div className="mt-8">
                                        <h2 className="text-2xl font-bold mb-4 text-gray-700">Section B</h2>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white shadow-md rounded-lg">
                                                <thead className="bg-gray-100 border-b">
                                                <tr>
                                                    {fileData[currentFileIndex]?.headers.map((header: string, index: number) => (
                                                        <th key={index}
                                                            className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {currentData.map((row: any, rowIndex: number) => (
                                                    <tr key={rowIndex} className="even:bg-gray-50">
                                                        {fileData[currentFileIndex]?.headers.map((header: string, colIndex: number) => (
                                                            <td key={colIndex}
                                                                className="py-3 px-4 border-b text-sm text-gray-700">
                                                                {isEditMode ? (
                                                                    <input
                                                                        type="text"
                                                                        value={row[header]}
                                                                        onChange={(e) => handleExcelInputChange(rowIndex, header, e.target.value)}
                                                                        className="border border-gray-300 rounded-md p-2"
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

                                        {/* Pagination Controls */}
                                        <div className="mt-8 flex justify-center">
                                            <ReactPaginate
                                                previousLabel={
                                                    <div
                                                        className="flex items-center cursor-pointer text-gray-600 hover:text-gray-900">
                                                        <HiChevronLeft className="w-4 h-4"/>
                                                    </div>
                                                }
                                                nextLabel={
                                                    <div
                                                        className="flex items-center cursor-pointer text-gray-600 hover:text-gray-900">
                                                        <HiChevronRight className="w-4 h-4"/>
                                                    </div>
                                                }
                                                breakLabel={'...'}
                                                pageCount={pageCount}
                                                marginPagesDisplayed={1}
                                                pageRangeDisplayed={3}
                                                onPageChange={handlePageChange}
                                                containerClassName={'flex space-x-1 items-center'}
                                                pageClassName={'cursor-pointer text-sm text-gray-600 hover:text-gray-900 px-3 py-1'}
                                                activeClassName={'bg-blue-500 text-white rounded-full px-3 py-1'}
                                                disabledClassName={'text-gray-400 cursor-not-allowed'}
                                                previousClassName={'text-sm'}
                                                nextClassName={'text-sm'}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-between">
                                        <button
                                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                            onClick={handleCancel}
                                        >
                                            Cancel
                                        </button>
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
                        <div className="text-gray-500 italic text-center mt-4">Submission not allowed at this
                            time.</div>
                    )}
                </div>
            </div>
        </div>
    );
}


'use client'
import RequestForm from '../../components/RequestForm';
import SidenavLecturer from "../../components/SidenavLecturer";
import {useState} from "react";
import {database} from "../../services/firebase";
import {push, ref, set} from "firebase/database";
import {getAuth} from "firebase/auth";
import { HiOutlinePencil } from "react-icons/hi";

export default function ItemRequest() {
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

    return (
        <div className="min-h-screen bg-gray-50">
            <SidenavLecturer setIsSidenavOpen={setIsSidenavOpen}/>
            <div className="bg-white min-h-screen flex flex-col items-center justify-center">
                <div className="flex items-center justify-center h-16 text-black">
                    <h1 className="text-2xl font-bold">Item Request</h1>
                </div>
                {/* Use formKey as the key for Page */}
                <RequestForm key={formKey} onExcelDataChange={handleExcelDataChange} />
                {showExcelData && excelData.length > 0 && (
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full" style={{width: '90rem'}}>
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold mb-4 text-gray-700">Section A</h2>
                            <button onClick={toggleEditMode}>
                                <HiOutlinePencil className="h-5 w-5 text-gray-500 mr-2" />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white shadow-md rounded-lg">
                                <thead className="bg-gray-100 border-b">
                                <tr>
                                    {sectionAHeaders.length > 0 && sectionAHeaders.map((header, index) => (
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
                                    {extractedValues.length > 0 && extractedValues.map((value, index) => (
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
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                onClick={handleSubmit}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

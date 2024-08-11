'use client'
import RequestForm from '../../components/RequestForm';
import SidenavLecturer from "../../components/SidenavLecturer";
import {useEffect, useState} from "react";
import {database} from "../../services/firebase";
import {push, ref, set} from "firebase/database";
import {getAuth} from "firebase/auth";




export default function ItemRequest() {
    // fields for form
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);

    const [sectionA, setSectionA] = useState<any[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [extractedValues, setExtractedValues] = useState<string[]>([]);
    const [sectionAHeaders, setSectionAHeaders] = useState<string[]>([]);
    const [downloadURL, setDownloadURL] = useState<string>('');


    const handleExcelDataChange = (sectionA: any[], header: string[], data: any[], extractedValues: any[], downloadURL:string) => {
        setSectionA(sectionA);
        setHeaders(header);
        setExcelData(data);
        setExtractedValues(extractedValues);
        setDownloadURL(downloadURL);

        // Extract headers from sectionA
        const sectionAHeaderList = sectionA.map(row => row[0].replace(':', '').trim());
        setSectionAHeaders(sectionAHeaderList); // Update state with section A headers

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
            } catch (e) {
                console.error('Error adding document: ', e);
                alert('Error adding document: ' + e.message);
            }
        }
    };


    return (
        <div className="min-h-screen bg-gray-50">
            <SidenavLecturer setIsSidenavOpen={setIsSidenavOpen}/>
            <div className="bg-white min-h-screen flex flex-col items-center justify-center">
                <div className="flex items-center justify-center h-16 text-black">
                    <h1 className="text-2xl font-bold">Item Request</h1>
                </div>
                <RequestForm onExcelDataChange={handleExcelDataChange} />
                {excelData.length > 0 && (
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full" style={{width: '90rem'}}>
                        <div>
                            <h2 className="text-2xl font-bold mb-4 text-gray-700">Section A</h2>
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
                                                {value}
                                            </td>
                                        ))}
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="mt-8">
                            <h2 className="text-2xl font-bold mb-4 text-gray-700">Section B</h2>
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
                                                    {row[header]}
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
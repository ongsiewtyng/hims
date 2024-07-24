'use client'
import RequestForm from '../../components/RequestForm';
import SidenavLecturer from "../../components/SidenavLecturer";
import {useState} from "react";


export default function ItemRequest() {
    // fields for form
    const [isSidenavOpen, setIsSidenavOpen] = useState(false);

    const [sectionA, setSectionA] = useState<any[]>([]);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [extractedValues, setExtractedValues] = useState<string[]>([]);
    const [sectionAHeaders, setSectionAHeaders] = useState<string[]>([]);

    const handleExcelDataChange = (sectionA: any[], header: string[], data: any[], extractedValues: any[]) => {
        setSectionA(sectionA);
        setHeaders(header);
        setExcelData(data);
        setExtractedValues(extractedValues);

        // Extract headers from sectionA
        const sectionAHeaderList = sectionA.map(row => row[0].replace(':', '').trim());
        setSectionAHeaders(sectionAHeaderList); // Update state with section A headers

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
                    <div className="bg-white p-8 rounded-2xl shadow-2xl w-full" style={{ width: '90rem' }}>
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
                    </div>
                )}
            </div>
        </div>
    );
}
import React, { useEffect, useState } from 'react';
import { HiOutlinePencil } from "react-icons/hi";
import { database } from "../services/firebase";
import { ref, update } from "@firebase/database";

interface Request {
    sectionA?: any[];
    excelData?: any[];
    status: string;
    id: string;
}

interface DetailsModalProps {
    onClose: () => void;
    request: Request;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ onClose, request }) => {
    const [sectionAData, setSectionAData] = useState(request.sectionA || []);
    const [excelData, setExcelData] = useState(request.excelData || []);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setSectionAData(request.sectionA || []);
        setExcelData(request.excelData || []);
    }, [request]);

    const toTitleCase = (str: any) => {
        return typeof str === 'string'
            ? str.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            })
            : str;
    };

    const handleSectionAChange = (index: number, value: string) => {
        setSectionAData((prevData) => {
            const newData = [...prevData];
            newData[index][5] = value;
            return newData;
        });
    };

    const handleExcelDataChange = (rowIndex: number, header: string, value: string) => {
        setExcelData((prevData) => {
            const newData = [...prevData];
            newData[rowIndex][header] = value;
            return newData;
        });
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);

        try {
            const requestRef = ref(database, `requests/${request.id}`);
            const updatedData = {
                sectionA: sectionAData,
                excelData: excelData,
                status: 'Pending',
            };

            await update(requestRef, updatedData);
            alert("Request updated successfully!");

            setIsEditMode(false);
            onClose(); // Close the modal after successful submission
        } catch (error) {
            console.error("Error updating request:", error);
            alert("Failed to update request.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        console.log("Close button clicked");
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg z-10 w-full max-w-6xl mx-4 relative text-black">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Request Details</h2>
                </div>

                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="text-gray-600 hover:text-gray-900 flex items-center"
                    >
                        <HiOutlinePencil className="mr-2" />
                        {isEditMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
                    </button>
                </div>

                {/* Section A */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Section A</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {sectionAData.map((data, index) => (
                                    <th
                                        key={index}
                                        className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                                    >
                                        {data[0]}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            <tr className="even:bg-gray-50">
                                {sectionAData.map((data, index) => (
                                    <td
                                        key={index}
                                        className="py-3 px-4 border-b text-sm text-gray-700"
                                    >
                                        {isEditMode ? (
                                            <input
                                                type="text"
                                                value={data[5] || ''}
                                                onChange={(e) => handleSectionAChange(index, e.target.value)}
                                                className="w-full px-2 py-1 border rounded"
                                            />
                                        ) : (
                                            data[5]
                                        )}
                                    </td>
                                ))}
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section B (Excel Data) */}
                <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">Section B</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border-collapse">
                            <thead>
                            <tr className="bg-gray-100 border-b">
                                {excelData.length > 0 &&
                                    Object.keys(excelData[0]).map((header, index) => (
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
                            {excelData.length > 0 ? (
                                excelData.map((data, rowIndex) => (
                                    <tr key={rowIndex} className="even:bg-gray-50">
                                        {Object.keys(data).map((header, colIndex) => (
                                            <td key={colIndex} className="py-3 px-4 border-b text-sm text-gray-700">
                                                {isEditMode ? (
                                                    <input
                                                        type="text"
                                                        value={toTitleCase(data[header] || '')}
                                                        onChange={(e) => handleExcelDataChange(rowIndex, header, e.target.value)}
                                                        className="w-full px-2 py-1 border rounded"
                                                    />
                                                ) : (
                                                    toTitleCase(data[header])
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        className="py-3 px-4 text-sm text-gray-700"
                                        colSpan={Object.keys(excelData[0] || {}).length}
                                    >
                                        No Excel Data Available
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    {isEditMode && (
                        <button
                            onClick={handleSave}
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                    <button onClick={handleClose} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ml-2">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DetailsModal;

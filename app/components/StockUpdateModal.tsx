import React, { useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import StockUpdate from './StockUpdate';
import { database } from '../services/firebase'; // Ensure this is set up correctly

type StockUpdateModalProps = {
    stockUpdateModal: boolean;
    setStockUpdateModal: (value: boolean) => void;
};

const StockUpdateModal: React.FC<StockUpdateModalProps> = ({ stockUpdateModal, setStockUpdateModal }) => {
    const [extractedValues, setExtractedValues] = useState<{ description: string; quantity: number }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // Function to handle the change of extracted data
    const handlePDFDataChange = (data: { itemNo: number; description: string; quantity: number }[]) => {
        setExtractedValues(data);
    };

    // Function to close the modal with delay
    const closeModal = (delay: number) => {
        setTimeout(() => {
            setStockUpdateModal(false);
        }, delay);
    };

    // Handle modal close on button click
    const handleClose = () => {
        setStockUpdateModal(false);
    };

    return (
        stockUpdateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
                <div className="bg-white rounded-lg p-8 w-3/4 max-w-4xl mx-auto relative z-50 text-black">
                    <button
                        className="absolute top-4 right-4 text-2xl text-black cursor-pointer"
                        onClick={handleClose}
                    >
                        <HiXCircle />
                    </button>
                    <h2 className="text-black text-2xl font-bold mb-4">Stock Update</h2>

                    <div className="max-h-[70vh] overflow-y-auto">
                        {/* StockUpdate Component */}
                        <div className="mb-4">
                            <StockUpdate onPDFDataChange={handlePDFDataChange}/>
                        </div>

                        {/* Display extracted values in table */}
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Item No
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Quantity
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {extractedValues.length > 0 ? (
                                extractedValues.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.itemNo}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {isNaN(item.quantity) ? '1' : item.quantity} {/* Ensure quantity is not NaN */}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center"
                                    >
                                        No data available
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    );
};

export default StockUpdateModal;

import React, { useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import UploadItems from "./UploadItems";
import { get, push, ref, update, set } from "@firebase/database";
import { database } from "../services/firebase";

interface UploadItemsModalProps {
    uploadItemsModal: boolean;
    setUploadItemsModal: (value: boolean) => void;
}

interface VendorData {
    id?: string;
    vendor: string;
    name: string;
    category: string;
    foodName: string;
    stocks: string;
    unit: string;
    archive: boolean;
}

const UploadItemsModal: React.FC<UploadItemsModalProps> = ({ uploadItemsModal, setUploadItemsModal }) => {
    const [allVendorsData, setAllVendorsData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const getVendorId = async (vendor: string): Promise<string | null> => {
        try {
            const vendorsRef = await get(ref(database, 'vendors'));
            const vendorsData = vendorsRef.val();
            if (vendorsData) {
                for (const [vendorId, vendorData] of Object.entries<{ name: string }>(vendorsData)) {
                    if (vendorData.name === vendor) {
                        return vendorId;
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting vendor ID:', error);
            return null;
        }
    };

    const handleExcelDataChange = (data: any) => {
        setAllVendorsData(data);
        setActiveTab(Object.keys(data)[0]);
    };

    const handleTabClick = (vendor: string) => setActiveTab(vendor);

    const checkForDuplicates = async (): Promise<Record<string, string>> => {
        const snapshot = await get(ref(database, 'foodItems/'));
        const existingData = snapshot.val();
        const duplicateMap: Record<string, string> = {};
        if (existingData) {
            Object.entries(existingData).forEach(([key, item]: any) => {
                duplicateMap[item.foodName] = key;
            });
        }
        return duplicateMap;
    };

    const closeModal = (delay: number) => setTimeout(() => setUploadItemsModal(false), delay);

    const saveFoodItems = async (excelData: any) => {
        setLoading(true);
        setError(null);

        try {
            const updatePromises = [];
            const categoryPromises = [];
            const vendorPromises = [];
            const processedCategories = new Set<string>();

            const existingCategoriesSnapshot = await get(ref(database, 'categories/'));
            const existingCategories = existingCategoriesSnapshot.exists() ? existingCategoriesSnapshot.val() : {};

            const existingVendorsSnapshot = await get(ref(database, 'vendors/'));
            const existingVendors = existingVendorsSnapshot.exists() ? existingVendorsSnapshot.val() : {};

            const duplicateMap = await checkForDuplicates();

            for (const vendorName of Object.keys(excelData)) {
                const vendorData = excelData[vendorName].data;
                let currentCategory: string | null = null;

                const existingVendorKey = Object.keys(existingVendors).find(key => existingVendors[key].name === vendorName);

                if (!existingVendorKey) {
                    const newVendorKey = push(ref(database, 'vendors/')).key;
                    vendorPromises.push(set(ref(database, `vendors/${newVendorKey}`), {
                        id: newVendorKey,
                        name: vendorName,
                        email: "unknown@example.com",
                    }));
                }

                for (const item of vendorData) {
                    const foodName = item["Items"]?.trim();
                    const unit = item["Unit"]?.trim()?.toLowerCase() || "nos";
                    const stocks = parseFloat(item["Stocks"]) || 0;

                    if (!foodName || !unit) continue;

                    if (item.Category) currentCategory = item.Category;

                    const existingKey = duplicateMap[foodName];

                    if (existingKey) {
                        updatePromises.push(update(ref(database, `foodItems/${existingKey}`), {
                            stocks,
                            unit,
                            vendor: vendorName,
                            category: currentCategory || "Unknown",
                            dateUpdated: new Date().toISOString(),
                        }));
                    } else {
                        updatePromises.push(push(ref(database, 'foodItems/'), {
                            archive: false,
                            dateUpdated: new Date().toISOString(),
                            foodName,
                            stocks,
                            unit,
                            vendor: vendorName,
                            category: currentCategory || "Unknown",
                        }));
                    }

                    if (currentCategory && !processedCategories.has(currentCategory)) {
                        processedCategories.add(currentCategory);
                        const vendorId = await getVendorId(vendorName);

                        if (vendorId) {
                            const existingCategoryKey = Object.keys(existingCategories).find(
                                key => existingCategories[key].name === currentCategory && existingCategories[key].vendor === vendorName
                            );

                            if (!existingCategoryKey) {
                                const categoryKey = push(ref(database, 'categories/')).key;
                                categoryPromises.push(set(ref(database, `categories/${categoryKey}`), {
                                    id: vendorId,
                                    name: currentCategory,
                                    vendor: vendorName,
                                    dateUpdated: new Date().toISOString()
                                }));
                            }
                        }
                    }
                }
            }

            await Promise.all([...updatePromises, ...categoryPromises, ...vendorPromises]);
            setError('Items uploaded successfully');
        } catch (error) {
            console.error('Error saving food items:', error);
            setError('Error uploading items');
        } finally {
            setLoading(false);
            closeModal(3000);
        }
    };

    return (
        uploadItemsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
                <div className="bg-white rounded-lg p-8 w-3/4 max-w-4xl mx-auto relative z-50 text-black">
                    <h2 className="text-black text-2xl font-bold mb-4">Import Items</h2>

                    <div className="max-h-[70vh] overflow-y-auto">
                        <div className="mb-4">
                            <UploadItems onExcelDataChange={handleExcelDataChange} />
                        </div>

                        {allVendorsData && (
                            <div>
                                <div className="mb-4 flex border-b">
                                    {Object.keys(allVendorsData).map((vendor) => (
                                        <button
                                            key={vendor}
                                            onClick={() => handleTabClick(vendor)}
                                            className={`py-2 px-4 ${activeTab === vendor ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-600'}`}
                                        >
                                            {vendor}
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-4 overflow-x-auto">
                                    {activeTab !== null && allVendorsData[activeTab] && (
                                        <table className="min-w-full bg-white border">
                                            <thead>
                                            <tr>
                                                {allVendorsData[activeTab].header.map((header: string, index: number) => (
                                                    <th key={index} className="py-2 px-4 border-b text-left bg-gray-100">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {allVendorsData[activeTab].data.map((row: any, rowIndex: number) => (
                                                <tr key={rowIndex}>
                                                    {allVendorsData[activeTab].header.map((header: string, colIndex: number) => (
                                                        <td key={colIndex} className="py-2 px-4 border-b">
                                                            {row[header]}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between mt-4">
                        <button
                            onClick={() => setUploadItemsModal(false)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                        >
                            Cancel
                        </button>

                        {allVendorsData && Object.keys(allVendorsData).length > 0 && (
                            <button
                                onClick={() => saveFoodItems(allVendorsData)}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                disabled={loading}
                            >
                                {loading ? 'Uploading...' : 'Upload Items'}
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4 z-50">
                        {error.includes('successfully') ? (
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500" />
                        ) : (
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500" />
                        )}
                        <span>{error}</span>
                    </div>
                )}
            </div>
        )
    );
};

export default UploadItemsModal;

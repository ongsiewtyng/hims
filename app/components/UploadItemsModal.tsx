import React, { useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import UploadItems from "./UploadItems";
import {get, push, ref, update, set} from "@firebase/database";
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

    async function getVendorId(vendor: string): Promise<string | null> {
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
    }

    const handleExcelDataChange = (data: any) => {
        setAllVendorsData(data);
        setActiveTab(Object.keys(data)[0]); // Set the first vendor as the active tab by default
    };

    const handleTabClick = (vendor: string) => {
        setActiveTab(vendor);
    };

    const checkForDuplicates = async (foodName: string): Promise<{ isDuplicate: boolean, itemKey?: string }> => {
        try {
            const dataRef = ref(database, 'foodItems/');
            const snapshot = await get(dataRef);
            const existingData = snapshot.val();

            if (existingData) {
                const existingItems = Object.entries(existingData) as [string, VendorData][];
                for (const [key, item] of existingItems) {
                    if (item.foodName === foodName) {
                        return { isDuplicate: true, itemKey: key };
                    }
                }
            }

            return { isDuplicate: false };
        } catch (error) {
            console.error('Error checking for duplicates:', error);
            return { isDuplicate: false };
        }
    };


    const closeModal = (delay: number) => {
        setTimeout(() => {
            setUploadItemsModal(false);
        }, delay);
    }

    const saveFoodItems = async (excelData: any) => {
        setLoading(true);
        setError(null); // Clear previous error

        try {
            const updatePromises = [];
            const categoryPromises = [];
            const vendorPromises = [];

            const processedCategories = new Set<string>();

            // Retrieve existing categories and vendors from the database
            const existingCategoriesSnapshot = await get(ref(database, 'categories/'));
            const existingCategories = existingCategoriesSnapshot.exists()
                ? existingCategoriesSnapshot.val()
                : {};

            const existingVendorsSnapshot = await get(ref(database, 'vendors/'));
            const existingVendors = existingVendorsSnapshot.exists()
                ? existingVendorsSnapshot.val()
                : {};

            for (const vendorName of Object.keys(excelData)) {
                const vendorData = excelData[vendorName].data;
                let currentCategory: string | null = null;

                const existingVendorKey = Object.keys(existingVendors).find(key => existingVendors[key].name === vendorName);

                if (!existingVendorKey) {
                    const newVendorKey = push(ref(database, 'vendors/')).key;

                    const vendorSavePromise = set(ref(database, `vendors/${newVendorKey}`), {
                        id: newVendorKey,
                        name: vendorName,
                        email: "unknown@example.com",
                    });
                    vendorPromises.push(vendorSavePromise);
                }

                for (const item of vendorData) {
                    const foodName = item["Description of Item "]?.trim();
                    const unit = item["UOM (Unit, KG, Month, Job)"]?.trim()?.toLowerCase() || "nos";
                    const stocks = item["Quantity Left"] || "0";

                    if (foodName && unit) {
                        if (item.Category) {
                            currentCategory = item.Category;
                        }

                        const { isDuplicate, itemKey } = await checkForDuplicates(foodName);

                        if (isDuplicate && itemKey) {
                            const updatePromise = update(ref(database, `foodItems/${itemKey}`), {
                                stocks,
                                unit,
                                vendor: vendorName,
                                category: currentCategory || "Unknown",
                                dateUpdated: new Date().toISOString(),
                            });
                            updatePromises.push(updatePromise);
                        } else {
                            const savePromise = push(ref(database, 'foodItems/'), {
                                archive: false,
                                dateUpdated: new Date().toISOString(),
                                foodName,
                                stocks,
                                unit,
                                vendor: vendorName,
                                category: currentCategory || "Unknown",
                            });
                            updatePromises.push(savePromise);
                        }

                        // Ensure category processing occurs correctly
                        if (currentCategory && !processedCategories.has(currentCategory)) {
                            processedCategories.add(currentCategory);

                            const vendorId = await getVendorId(vendorName);

                            if (vendorId) {
                                const existingCategoryKey = Object.keys(existingCategories).find(
                                    key => existingCategories[key].name === currentCategory && existingCategories[key].vendor === vendorName
                                );

                                if (!existingCategoryKey) {
                                    const categoryKey = push(ref(database, 'categories/')).key;

                                    const categoryUpdatePromise = set(ref(database, `categories/${categoryKey}`), {
                                        id: vendorId, // Use vendorId as ID
                                        name: currentCategory,
                                        vendor: vendorName,
                                        dateUpdated: new Date().toISOString()
                                    });
                                    categoryPromises.push(categoryUpdatePromise);
                                }
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
            closeModal(3000); // Close the modal after 3 seconds
        }
    };




    return (
        uploadItemsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
                <div className="bg-white rounded-lg p-8 w-3/4 max-w-4xl mx-auto relative z-50 text-black">
                    <h2 className="text-black text-2xl font-bold mb-4">Stock Update</h2>

                    {/* Container for scrollable content */}
                    <div className="max-h-[70vh] overflow-y-auto">
                        {/* StockUpdate Component */}
                        <div className="mb-4">
                            <UploadItems onExcelDataChange={handleExcelDataChange} />
                        </div>

                        {/* Tab Navigation */}
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

                                {/* Tab Content */}
                                <div className="mb-4 overflow-x-auto">
                                    {activeTab !== null && allVendorsData[activeTab] && (
                                        <div>
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-between mt-4">
                        <button
                            onClick={closeModal}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                        >
                            Cancel
                        </button>

                        {allVendorsData && Object.keys(allVendorsData).length > 0 && (
                            <button
                                onClick={() => {
                                    if (allVendorsData) {
                                        saveFoodItems(allVendorsData);
                                    } else {
                                        setError('No items to upload');
                                    }
                                }}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                disabled={loading} // Disable the button while loading
                            >
                                {loading ? 'Uploading...' : 'Upload Items'}
                            </button>
                        )}
                    </div>
                </div>
                {error && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4 z-50">
                        {error.includes('successfully') ? (
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500"/>
                        ) : (
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500"/>
                        )}
                        <span>{error}</span>
                    </div>
                )}
            </div>
        )
    );
};

export default UploadItemsModal;

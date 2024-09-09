import React, { useState, useEffect } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import { ref, push, set, get, update } from '@firebase/database';
import { database } from '../services/firebase'; // Ensure to import your Firebase configuration

interface AddNEditVendorModalProps {
    vendorsModal: boolean;
    setVendorsModal: (isOpen: boolean) => void;
}

const AddNEditVendorModal: React.FC<AddNEditVendorModalProps> = ({ vendorsModal, setVendorsModal }) => {
    const [tab, setTab] = useState<'add' | 'edit'>('add'); // Manage active tab
    const [newVendor, setNewVendor] = useState('');
    const [email, setEmail] = useState('');
    const [selectedVendor, setSelectedVendor] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [vendorsList, setVendorsList] = useState<{ id: string, name: string, email: string }[]>([]);

    useEffect(() => {
        // Fetch the list of vendors when the modal opens
        if (vendorsModal) {
            fetchVendors();
        }
    }, [vendorsModal]);

    const fetchVendors = async () => {
        try {
            const vendorsRef = await get(ref(database, 'vendors'));
            const vendorsData = vendorsRef.val();
            if (vendorsData) {
                const vendorsArray = Object.entries(vendorsData).map(([id, vendorData]) => ({
                    id,
                    ...(vendorData as { name: string, email: string }),
                }));
                setVendorsList(vendorsArray);
            }
        } catch (error) {
            console.error('Error fetching vendors:', error);
            setError('Failed to load vendors. Please try again.');
        }
    };

    // Function to add a vendor
    const addVendor = async (newVendor: string) => {
        try {
            const newVendorRef = push(ref(database, `vendors`));
            const vendorId = newVendorRef.key;
            await set(newVendorRef, {
                name: newVendor,
                id: vendorId,
                email: email,
            });

            setError("Vendor added successfully!");
            resetForm();

        } catch (error) {
            console.error('Error adding vendor:', error);
            setError('Failed to add vendor. Please try again.');
        }
    };

    // Function to edit an existing vendor
    const editVendor = async () => {
        if (!selectedVendor) return;
        try {
            const vendorRef = ref(database, `vendors/${selectedVendor}`);
            await update(vendorRef, {
                name: newVendor,
                email: email,
            });

            setError("Vendor updated successfully!");
            resetForm();
        } catch (error) {
            console.error('Error editing vendor:', error);
            setError('Failed to update vendor. Please try again.');
        }
    };

    // Function to reset the form and error state
    const resetForm = () => {
        setNewVendor('');
        setEmail('');
        setSelectedVendor('');
        setTimeout(() => {
            setError(null);
            setVendorsModal(false);
        }, 3000);
    };

    // Handle vendor submission based on active tab
    const handleSubmit = async () => {
        if (newVendor.trim() && email.trim()) {
            if (tab === 'add') {
                await addVendor(newVendor);
            } else if (tab === 'edit') {
                await editVendor();
            }
        } else {
            setError('Please enter both vendor name and email.');
            setTimeout(() => setError(null), 2000);
        }
    };

    // Handle vendor selection for editing
    const handleVendorSelection = (vendorId: string) => {
        const vendor = vendorsList.find(v => v.id === vendorId);
        if (vendor) {
            setSelectedVendor(vendorId);
            setNewVendor(vendor.name);
            setEmail(vendor.email);
        }
    };

    return vendorsModal ? (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
            <div className="text-black bg-white rounded-lg p-8 w-1/2">
                <h2 className="text-black text-2xl font-bold mb-4">
                    {tab === 'add' ? 'Add Vendor' : 'Edit Vendor'}
                </h2>
                <div className="flex mb-6">
                    <button
                        onClick={() => setTab('add')}
                        className={`mr-4 px-4 py-2 rounded-t-lg ${
                            tab === 'add'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                        Add Vendor
                    </button>
                    <button
                        onClick={() => setTab('edit')}
                        className={`px-4 py-2 rounded-t-lg ${
                            tab === 'edit'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                        Edit Vendor
                    </button>
                </div>
                {tab === 'edit' && (
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendorList">
                            Select Vendor to Edit
                        </label>
                        <select
                            id="vendorList"
                            className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                            onChange={(e) => handleVendorSelection(e.target.value)}
                            value={selectedVendor}
                        >
                            <option value="" disabled>Select a vendor</option>
                            {vendorsList.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>
                                    {vendor.name} - {vendor.email}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="vendorName">
                        Vendor Name
                    </label>
                    <input
                        id="vendorName"
                        type="text"
                        value={newVendor}
                        onChange={(e) => setNewVendor(e.target.value)}
                        className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full"
                        placeholder="Vendor Name"
                    />
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 w-full mt-2"
                        placeholder="Email"
                    />
                </div>
                <div className="flex justify-between">
                    <button
                        onClick={handleSubmit}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        {tab === 'add' ? 'Add Vendor' : 'Update Vendor'}
                    </button>
                    <button
                        onClick={() => setVendorsModal(false)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded ml-4"
                    >
                        Cancel
                    </button>
                </div>
                {error && (
                    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-max bg-gray-800 text-white rounded-lg shadow-md flex items-center p-4">
                        {error.includes('successfully') ? (
                            <HiCheckCircle className="h-6 w-6 mr-2 text-green-500" />
                        ) : (
                            <HiXCircle className="h-6 w-6 mr-2 text-red-500" />
                        )}
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
    ) : null;
};

export default AddNEditVendorModal;

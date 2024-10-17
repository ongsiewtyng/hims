'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ref, get, update } from '@firebase/database';
import { database } from '../../services/firebase';

interface EditFormProps {
    id: string;
}

const EditForm: React.FC<EditFormProps> = ({ id }) => {
    const router = useRouter();
    const [request, setRequest] = useState<any>(null);

    useEffect(() => {
        if (id) {
            const requestRef = ref(database, `requests/${id}`);
            get(requestRef).then((snapshot) => {
                if (snapshot.exists()) {
                    setRequest(snapshot.val());
                } else {
                    console.error('Request not found');
                }
            }).catch((error) => {
                console.error('Error fetching request:', error);
            });
        }
    }, [id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRequest((prevRequest: any) => ({
            ...prevRequest,
            [name]: value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (id) {
            const requestRef = ref(database, `requests/${id}`);
            update(requestRef, { ...request, status: 'Pending' })
                .then(() => {
                    alert('Request updated successfully');
                    router.push('/lecturer/request-form'); // Navigate back to the previous page or any desired page
                })
                .catch((error) => {
                    console.error('Error updating request:', error);
                });
        }
    };

    if (!request) return <div>Loading...</div>;

    return (
        <div className="p-8 bg-white rounded-2xl shadow-2xl max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Edit Request</h1>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Requester</label>
                    <input
                        type="text"
                        name="requester"
                        value={request.sectionA?.['2'][5] || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">PIC & Contact Number</label>
                    <input
                        type="text"
                        name="picContact"
                        value={request.sectionA?.['3'][5] || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <input
                        type="text"
                        name="department"
                        value={request.sectionA?.['4'][5] || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Entity</label>
                    <input
                        type="text"
                        name="entity"
                        value={request.sectionA?.['5'][5] || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Save Changes
                </button>
            </form>
        </div>
    );
};

export default EditForm;


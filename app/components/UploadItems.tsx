'use client';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { HiOutlineDocumentAdd } from 'react-icons/hi';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import '../components/loader.css';

type UploadItemsProps = {
    onExcelDataChange: (allVendorsData: any) => void;
};

const UploadItems: React.FC<UploadItemsProps> = ({ onExcelDataChange }) => {
    const [message, setMessage] = useState('No Files Selected');
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [data, setData] = useState<any>({});
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            setSelectedFile(file);
            setMessage(`${file.name}, ${file.size} bytes`);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('dropzone--over');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('dropzone--over');
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dropzone--over');
        const file = e.dataTransfer.files?.[0] || null;
        if (file) {
            setSelectedFile(file);
            setMessage(`${file.name}, ${file.size} bytes`);
        }
    };

    const handleReset = () => {
        setMessage('No Files Selected');
        setSelectedFile(null);
        setData({});
        setIsFormVisible(true);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        const storage = getStorage();
        const timestamp = Date.now();
        const fileExtension = selectedFile.name.split('.').pop();
        const fileName = selectedFile.name.replace(`.${fileExtension}`, `_${timestamp}.${fileExtension}`);
        const storageRef = ref(storage, 'uploads/' + fileName);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        uploadTask.on(
            'state_changed',
            snapshot => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload ${progress.toFixed(0)}%`);
            },
            error => {
                console.error('Upload error:', error);
                setIsUploading(false);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then(url => {
                    fetchAndReadFile(url);
                    setIsFormVisible(false);
                    setIsUploading(false);
                });
            }
        );
    };

    const fetchAndReadFile = (downloadURL: string) => {
        fetch(downloadURL)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onload = e => {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const allVendorsData: any = {};

                    const headerMap: Record<string, string> = {
                        vendor: 'Vendor',
                        no: 'No',
                        items: 'Items',
                        unit: 'Unit',
                        qty_to_order: 'Stocks',
                    };

                    workbook.SheetNames.forEach(sheetName => {
                        const ws = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                        const rawHeaders = jsonData[0].map((h: string) =>
                            h?.toString().trim().toLowerCase().replace(/\s+/g, '_')
                        );

                        const mappedHeaders = rawHeaders.map((key: string) =>
                            headerMap[key] || key // fallback to raw if not mapped
                        );

                        const dataRows = jsonData
                            .slice(1)
                            .filter(row => row.some(cell => cell && cell.toString().trim() !== ""))
                            .map(row => {
                                const rowData: Record<string, any> = {};
                                mappedHeaders.forEach((finalKey, index) => {
                                    rowData[finalKey] = row[index] ?? "";
                                });
                                return rowData;
                            });

                        allVendorsData[sheetName] = {
                            header: mappedHeaders,
                            data: dataRows,
                        };
                    });

                    setData(allVendorsData);
                    onExcelDataChange(allVendorsData);
                    console.log("Formatted Vendor Data:", allVendorsData);
                };
                reader.readAsArrayBuffer(blob);
            })
            .catch(error => console.error('Fetch error:', error));
    };


    return (
        <div className="relative flex flex-col max-w-3xl w-full mx-auto mt-6">
            {isFormVisible && (
                <form
                    className="bg-white p-8 rounded-2xl shadow-md relative"
                    onSubmit={handleSubmit}
                    onReset={handleReset}
                >
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                            <div className="loader"></div>
                        </div>
                    )}
                    <h2 className="text-xl font-bold text-center mb-2">Upload Vendor Market List</h2>
                    <p className="text-gray-600 text-center mb-4">Drag and drop or click to select Excel file</p>

                    <div
                        className="border-2 border-dashed border-gray-400 rounded-xl p-6 text-center cursor-pointer relative hover:border-blue-500"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <HiOutlineDocumentAdd size={50} className="mx-auto text-gray-600 mb-2" />
                        <p className="text-gray-700 mb-2">Select a .xlsx file</p>
                        <input
                            type="file"
                            required
                            id="upload-file"
                            name="uploaded-file"
                            accept=".xlsx"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <p className="text-sm text-gray-500 mt-1">{message}</p>
                    </div>

                    <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                        <button
                            type="reset"
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-md"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default UploadItems;

'use client'
import React, {useEffect, useState} from 'react';
import * as XLSX from 'xlsx';
import { HiOutlineDocumentAdd } from "react-icons/hi";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import '../components/loader.css';

type RequestFormProps = {
    onExcelDataChange: (sectionA: any[], header: string[], data: any[], extractedValues: any[]) => void;
};

const RequestForm: React.FC<RequestFormProps> = ({ onExcelDataChange }) => {
    const [message, setMessage] = useState('No Files Selected');
    //const [excelData, setExcelData] = useState<any[]>([]);
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [previousExcelData, setPreviousExcelData] = useState<any[]>([]);
    const [header, setHeader] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [sectionA, setSectionA] = useState<any[]>([]);



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            updateDropzoneFileList(file);
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
        if (e.dataTransfer.files.length) {
            updateDropzoneFileList(e.dataTransfer.files[0]);
        }
    };

    const updateDropzoneFileList = (file: File) => {
        setMessage(`${file.name}, ${file.size} bytes`);
    };

    const handleReset = () => {
        setMessage('No Files Selected');
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const uploadFileElement = document.getElementById('upload-file') as HTMLInputElement;
        const file = uploadFileElement.files ? uploadFileElement.files[0] : null;
        if (file) {
            setIsUploading(true); // Show loader
            // Create a storage reference
            const storage = getStorage();
            const storageRef = ref(storage, 'uploads/' + file.name);

            // Upload the file
            const uploadTask = uploadBytesResumable(storageRef, file);

            // Get the download URL and read the file content
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Handle progress
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                    switch (snapshot.state) {
                        case 'paused':
                            console.log('Upload is paused');
                            break;
                        case 'running':
                            console.log('Upload is running');
                            break;
                    }
                },
                (error) => {
                    // Handle error
                    console.error('Upload error:', error);
                },
                () => {
                    // Handle successful upload
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        console.log('File available at', downloadURL);
                        fetchAndReadFile(downloadURL);
                        setIsFormVisible(false);
                        setIsUploading(false); // Hide loader

                    });
                }
            );
        } else {
            console.log('No file selected');
        }
    };

    const fetchAndReadFile = (downloadURL: string) => {
        fetch(downloadURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.blob();
            })
            .then(blob => {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    if (evt.target) {
                        const getData = evt.target.result as ArrayBuffer;
                        if (getData) {
                            const data = new Uint8Array(getData);
                            const wb = XLSX.read(data, { type: 'array' });
                            const ws_name = wb.SheetNames[0];
                            const ws = wb.Sheets[ws_name];
                            const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                            console.log('JSON Data:', jsonData); // Log the JSON data
                            const sectionA = jsonData.slice(5, 11);
                            const result = {};  // Create an empty object to store the key-value pairs
                            sectionA.forEach((row) => {
                                const header = row[0].replace(':', '').trim();
                                const value = row[row.length - 1];
                                result[header] = value;
                            });

                            // Collect only the values into an array
                            const extractedValues = Object.values(result).map(value => String(value));

                            const headerRow = jsonData[13];
                            const dataRows = jsonData.slice(14).map(row => {
                                let rowData = {};
                                headerRow.forEach((header, index) => {
                                    rowData[header] = row[index];
                                });
                                return rowData;
                            });

                            console.log('Section A:', sectionA);
                            console.log('Original Result:', result);
                            console.log('Extracted Values:', extractedValues);
                            console.log('Header:', headerRow); // Log the header row
                            console.log('Data Rows:', dataRows); // Log the data rows

                            setSectionA(sectionA);
                            setHeader(headerRow);
                            setData(dataRows);
                            onExcelDataChange(sectionA, headerRow, dataRows, extractedValues);
                        }
                    }
                };
                reader.readAsArrayBuffer(blob);
            })
            .catch(error => console.error('Fetch error:', error));
    };

    useEffect(() => {
        if (JSON.stringify(data) !== JSON.stringify(previousExcelData)) {
            setPreviousExcelData(data);
        }
    }, [data, previousExcelData]);

    return (
        <div className="relative flex flex-col max-w-xl w-full mt-4">
            {/* Form */}
            {isFormVisible && (
                <form
                    className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col max-w-xl w-full mt-4 relative"
                    onSubmit={handleSubmit}
                    onReset={handleReset}
                >
                    {/* Loader */}
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                            <div className="loader"></div>
                        </div>
                    )}

                    <h2 className="text-black text-2xl mb-2">Upload and attach files</h2>
                    <p className="text-black text-sm mb-4">Attach files</p>
                    <div
                        className="border-black relative mt-4 min-h-64 flex flex-col items-center justify-center border-2 border-dashed border-primary rounded-xl text-primary cursor-pointer p-4"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="text-stone-950 file-upload-icon mb-2">
                            <HiOutlineDocumentAdd size={60} />
                        </div>
                        <p className="text-black text-sm text-center">Click to upload or drag and drop</p>
                        <input
                            type="file"
                            required
                            id="upload-file"
                            name="uploaded-file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                        />
                        <p className="text-black message">{message}</p>
                    </div>
                    <div className="flex justify-between pt-6 mt-6 border-t border-gray-300 gap-4 flex-wrap">
                        <button
                            type="reset"
                            className="text-black flex-grow min-h-12 text-xl bg-transparent border border-gray-300 rounded-md p-2 text-primary cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            id="submit-button"
                            type="submit"
                            className="text-black flex-grow min-h-12 text-xl bg-primary border border-primary rounded-md p-2 cursor-pointer"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default RequestForm;


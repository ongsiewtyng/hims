'use client'
import React, {useEffect, useState} from 'react';
import * as XLSX from 'xlsx';
import { HiOutlineDocumentAdd } from "react-icons/hi";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import '../components/loader.css';

type UploadItemsProps = {
    onExcelDataChange: (allVendorsData: any) => void;
};

const UploadItems: React.FC<UploadItemsProps> = ({ onExcelDataChange }) => {
    const [message, setMessage] = useState('No Files Selected');
    //const [excelData, setExcelData] = useState<any[]>([]);
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [previousExcelData, setPreviousExcelData] = useState<any[]>([]);
    const [header, setHeader] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [sectionA, setSectionA] = useState<any[]>([]);
    const [downloadLink, setDownloadLink] = useState<string | null>(null);


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
            const timestamp = Date.now();
            const fileNameParts = file.name.split('.');
            const fileExtension = fileNameParts.pop();
            const fileName = fileNameParts.join('.') + `_${timestamp}.${fileExtension}`;

            const storageRef = ref(storage, 'uploads/' + fileName);

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

                            const allVendorsData = {};

                            wb.SheetNames.forEach((sheetName) => {
                                const ws = wb.Sheets[sheetName];
                                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                                const headerRow = jsonData[0];
                                const dataRows = jsonData.slice(1).map(row => {
                                    let rowData = {};
                                    headerRow.forEach((header, index) => {
                                        rowData[header] = row[index];
                                    });
                                    return rowData;
                                });

                                allVendorsData[sheetName] = {
                                    header: headerRow,
                                    data: dataRows,
                                };
                            });

                            console.log('All Vendors Data:', allVendorsData);

                            onExcelDataChange(allVendorsData);
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
        <div className="relative flex flex-col max-w-xl w-full mt-4 mx-auto">
            {/* Form */}
            {isFormVisible && (
                <form
                    className="bg-white p-8 rounded-2xl shadow flex flex-col max-w-xl w-full relative mx-auto"
                    onSubmit={handleSubmit}
                    onReset={handleReset}
                >
                    {/* Loader */}
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                            <div className="loader"></div>
                        </div>
                    )}

                    <h2 className="text-black text-2xl mb-2 text-center">Upload and attach files</h2>
                    <p className="text-black text-sm mb-4 text-center">Attach files</p>
                    <div
                        className="border-black relative mt-4 min-h-64 flex flex-col items-center justify-center border-2 border-dashed border-primary rounded-xl text-primary cursor-pointer p-4"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="text-stone-950 file-upload-icon mb-2">
                            <HiOutlineDocumentAdd size={60}/>
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

export default UploadItems;


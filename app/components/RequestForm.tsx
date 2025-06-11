'use client'
import React, { useEffect, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { HiOutlineDocumentAdd } from "react-icons/hi";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import '../components/loader.css';

type RequestFormProps = {
    onExcelDataChange: (sectionA: any[], header: string[], data: any[], extractedValues: any[], downloadURL: string) => void;
};

const RequestForm: React.FC<RequestFormProps> = ({ onExcelDataChange }) => {
    const [message, setMessage] = useState('No Files Selected');
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [allData, setAllData] = useState<any[][][]>([]);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.classList.add('dropzone--over');
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.classList.remove('dropzone--over');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        if (files.length > 0) {
            const invalidFiles = files.filter(file => !file.type.includes('excel') && !file.type.includes('spreadsheetml'));
            if (invalidFiles.length > 0) {
                alert('Only Excel files are allowed.');
                return;
            }
            updateDropzoneFileList(files);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const invalidFiles = files.filter(file => !file.type.includes('excel') && !file.type.includes('spreadsheetml'));
        if (invalidFiles.length > 0) {
            alert('Only Excel files are allowed.');
            return;
        }
        updateDropzoneFileList(files);
    };

    const updateDropzoneFileList = (files: File[]) => {
        setSelectedFiles(prevFiles => [...prevFiles, ...files]);
        setMessage(`${files.length} file(s) selected`);
    };

    const handleReset = () => {
        setMessage('No Files Selected');
        setSelectedFiles([]);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (selectedFiles.length > 0) {
            setIsUploading(true);
            const downloadURLs = await uploadFiles(selectedFiles);
            fetchAndReadFiles(downloadURLs);
            setIsUploading(false);
            setIsFormVisible(false);
        } else {
            alert('Please select one or more files.');
        }
    };

    const uploadFiles = async (files: File[]): Promise<string[]> => {
        const downloadURLs: string[] = [];
        const storage = getStorage();

        for (const file of files) {
            const timestamp = Date.now();
            const fileNameParts = file.name.split('.');
            const fileExtension = fileNameParts.pop();
            const fileName = fileNameParts.join('.') + `_${timestamp}.${fileExtension}`;
            console.log(`Uploading ${file.name} as ${fileName}`);

            const storageRef = ref(storage, 'uploads/' + fileName);
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload for ${file.name} is ${progress}% done`);
                    },
                    (error) => {
                        console.error('Upload error:', error);
                        reject(error);
                    },
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                            downloadURLs.push(downloadURL);
                            resolve();
                        });
                    }
                );
            });
        }
        return downloadURLs;
    };

    const fetchAndReadFiles = (downloadURLs: string[]) => {
        setAllData([]);
        downloadURLs.forEach((downloadURL, fileIndex) => {
            fetch(downloadURL)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.blob();
                })
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        if (evt.target) {
                            const getData = evt.target.result as ArrayBuffer;
                            if (getData) {
                                processExcelData(getData, fileIndex, downloadURL);
                            }
                        }
                    };
                    reader.readAsArrayBuffer(blob);
                })
                .catch(error => console.error('Fetch error:', error));
        });
    };


    const processExcelData = (data: ArrayBuffer, fileIndex: number, downloadURL: string) => {
        const excelDateToFormattedDate = (serial: number): string => {
            if (!serial) return "";
            const utcDays = Math.floor(serial - 25569);
            const date = new Date(utcDays * 86400 * 1000);
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        };

        const colIndexes = {
            no: 0,
            vendor: 1,
            description: 2,
            uom: 10,
            qty: 11,
            unitPrice: 12,
            subtotal: 13,
            sst: 14,
            total: 15,
        };

        const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        // Extract Section A (General Info)
        const sectionA = jsonData.slice(5, 13).map(row => ({
            header: row[0]?.replace(':', '').trim() || "",
            value: typeof row[5] === 'number' && row[0]?.toLowerCase().includes('date')
                ? excelDateToFormattedDate(row[5])
                : row[5] || "",

        }));
        const sectionAHeaders = sectionA.map(item => item.header);
        console.log(sectionAHeaders);
        const sectionAValues = sectionA.map(item => item.value);

        // Section B - Header row at row index 15
        const headerRowIndex = 15;
        const headerRow = jsonData[headerRowIndex].map((h: any) =>
            typeof h === 'string' ? h.trim() : h
        );
        const dataRows = jsonData.slice(headerRowIndex + 1);

        let lastVendor = "";
        const tableOfItems: { [key: string]: any }[] = [];

        for (const row of dataRows) {
            if (!row || row.length < colIndexes.description + 1) continue;

            const description = row[colIndexes.description];
            if (!description || description.toString().trim() === "") {
                continue; // ← Fix here!
            }

            const rowData: { [key: string]: any } = {};
            rowData["No"] = row[colIndexes.no] || tableOfItems.length + 1;

            let vendor = row[colIndexes.vendor];
            if (!vendor || vendor.toString().trim() === "") {
                vendor = lastVendor;
            } else {
                lastVendor = vendor;
            }
            rowData["Suggested Vendor"] = vendor;

            rowData["Description of Item"] = description;
            rowData["UOM (Unit, KG, Month, Job)"] = row[colIndexes.uom] && row[colIndexes.uom].toString().trim() !== ""
                ? row[colIndexes.uom]
                : "nos";
            rowData["Qty"] = row[colIndexes.qty] || 0;
            rowData["Unit Price"] = row[colIndexes.unitPrice] || 0;
            rowData["Subtotal"] = row[colIndexes.subtotal] || 0;
            rowData["SST 6%"] = row[colIndexes.sst] || 0;
            rowData["Total Amount"] = row[colIndexes.total] || 0;

            tableOfItems.push(rowData);
        }

        setAllData(prev => [...prev, tableOfItems]);
        onExcelDataChange(sectionA, sectionAHeaders, headerRow, tableOfItems, sectionAValues, downloadURL);
    };

    return (
        <div className="relative flex flex-col max-w-xl w-full mt-4">
            {isFormVisible && (
                <form
                    className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col max-w-xl w-full mt-4 relative"
                    onSubmit={handleSubmit}
                    onReset={handleReset}
                >
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
                            multiple
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
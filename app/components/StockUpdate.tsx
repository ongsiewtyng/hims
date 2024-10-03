"use client";
import React, { useState, useEffect } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';
import {usePDFJS} from "../hooks/usePDFJS";
import { HiOutlineDocumentAdd } from "react-icons/hi";
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';


type StockUpdateProps = {
    onPDFDataChange: (
        extractedValues: { itemNo: number; description: string; quantity: number }[]
    ) => void;
}

const StockUpdate: React.FC<StockUpdateProps> = ({ onPDFDataChange }) => {
    const [message, setMessage] = useState('No Files Selected');
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [previousExcelData, setPreviousExcelData] = useState<any[]>([]);
    const [header, setHeader] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [sectionA, setSectionA] = useState<any[]>([]);
    const [downloadLink, setDownloadLink] = useState<string | null>(null);

    // Hook to handle PDF processing
    usePDFJS(async (pdfjs) => {
        if (downloadLink) {
            const loadingTask = pdfjs.getDocument(downloadLink);
            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;
            console.log('Number of pages:', numPages);
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                console.log('Page text content:', textContent);
            }
        }
    }, [downloadLink]);

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
            const storage = getStorage();
            const storageRef = ref(storage, 'uploads/' + file.name);

            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                },
                (error) => {
                    console.error('Upload error:', error);
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        console.log('File available at', downloadURL);
                        fetchAndReadPDFFile(downloadURL);
                        setIsFormVisible(false);
                        setIsUploading(false); // Hide loader
                    });
                }
            );
        } else {
            console.log('No file selected');
        }
    };


    const fetchAndReadPDFFile = async (downloadURL: string) => {
        try {
            // Fetch the PDF file from the download URL
            const response = await fetch(downloadURL);
            if (!response.ok) throw new Error('Network response was not ok');

            // Convert the response to an ArrayBuffer
            const arrayBuffer = await response.arrayBuffer();

            // Load the PDF document
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;

            let textContent: string[] = [];

            // Helper function to handle OCR on a canvas blob
            const performOCR = (blob: Blob): Promise<string> => {
                return new Promise((resolve, reject) => {
                    if (!blob) reject('Blob is empty');

                    // Perform OCR using Tesseract.js
                    Tesseract.recognize(
                        blob,
                        'eng', // Language
                        { logger: info => console.log(info) } // Optional logger
                    )
                        .then(({ data: { text } }) => resolve(text))
                        .catch(err => reject(err));
                });
            };

            // Process each page
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);

                // Render page to canvas
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Failed to get canvas context');

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport }).promise;

                // Convert canvas to Blob and perform OCR
                const ocrText = await new Promise<string>((resolve, reject) => {
                    canvas.toBlob(async (blob) => {
                        if (blob) {
                            try {
                                const text = await performOCR(blob);
                                resolve(text);
                            } catch (error) {
                                reject(error);
                            }
                        } else {
                            reject('Failed to convert canvas to Blob');
                        }
                    });
                });

                textContent.push(ocrText);
            }

            // Join all page texts for overall content
            const fullText = textContent.join('\n');
            console.log('OCR text content:', fullText);

            // Extract specific information: No, Item, and Quantity
            const extractedData = extractItemData(fullText);
            console.log('Extracted Data:', extractedData);
            onPDFDataChange(extractedData.items);


        } catch (error) {
            console.error('PDF processing error:', error);
        }
    };

    // Function to extract item descriptions and quantities
    const extractItemData = (text: string) => {
        const lines = text.split('\n');
        const itemData = [];
        let totalQuantity = 0;
        let itemNo = 1;

        // Regex to match item lines
        const itemRegex = /^\s*(\d+)\s+([\w\s\/().,-]+?)\s+(\d+)\s*(KG|GM|PC|BTL|L)?$/i;

        lines.forEach(line => {
            const match = line.match(itemRegex);
            if (match) {
                const [, , description, quantity, , unit] = match;
                const quantityNum = parseFloat(quantity.replace(',', '')); // Remove any commas from quantity

                // Clean the description by trimming off extra details
                const cleanedDescription = description.replace(/(\d+)\s*([KG|GM|PC|BTL|L])/gi, '').trim(); // Remove any units or numbers after description
                totalQuantity += quantityNum;

                itemData.push({
                    itemNo: itemNo++,
                    description: cleanedDescription, // Only the cleaned description
                    quantity: quantityNum,
                    unit: unit ? unit.trim(): 'PC'
                });
            } else {
                // Handle lines that might not match the expected format
                const parts = line.split(/(\d+)/).filter(Boolean);
                if (parts.length >= 2) {
                    const quantity = parseFloat(parts[0].replace(',', '')); // First part as quantity
                    const description = parts.slice(1).join(' ').trim(); // Rest as description

                    itemData.push({
                        itemNo: itemNo++,
                        description: description.replace(/(\d+)\s*(KG|GM|PC|BTL|L)/gi, '').trim(), // Clean the description
                        quantity: quantity,
                        unit: null
                    });
                    totalQuantity += quantity;
                }
            }
        });

        return { items: itemData, totalQuantity };
    };


    // Hook to detect changes in data for comparison
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
                    className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col max-w-xl w-full relative mx-auto"
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

export default StockUpdate;
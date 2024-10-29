'use client'
import React, { useState } from 'react';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { usePDFJS } from '../hooks/usePDFJS';
import { HiOutlineDocumentAdd } from 'react-icons/hi';
import * as pdfjsLib from 'pdfjs-dist';
//import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import Tesseract from 'tesseract.js';

type StockUpdateProps = {
    onPDFDataChange: (
        extractedValues: { itemNo: number; description: string; quantity: number }[]
    ) => void;
};

const StockUpdate: React.FC<StockUpdateProps> = ({ onPDFDataChange }) => {
    const [message, setMessage] = useState('No Files Selected');
    const [isFormVisible, setIsFormVisible] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [extractedData, setExtractedData] = useState<{ itemNo: number; description: string; quantity: number; unit: string | null }[]>([]);
    const [editValues, setEditValues] = useState<{ itemNo: number; description: string; quantity: number; unit: string | null }[]>([]);
    const [downloadLink, setDownloadLink] = useState<string | null>(null);

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
            setIsUploading(true);
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
                        setIsUploading(false);
                    });
                }
            );
        } else {
            console.log('No file selected');
        }
    };

    const fetchAndReadPDFFile = async (downloadURL: string) => {
        try {
            const response = await fetch(downloadURL);
            if (!response.ok) throw new Error('Network response was not ok');
            const arrayBuffer = await response.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;

            let textContent: string[] = [];

            const performOCR = (blob: Blob): Promise<string> => {
                return new Promise((resolve, reject) => {
                    Tesseract.recognize(blob, 'eng', {
                        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz*',
                        logger: info => console.log(info)
                    })
                        .then(({ data: { text } }) => resolve(text))
                        .catch(err => reject(err));
                });
            };

            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Failed to get canvas context');

                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({ canvasContext: context, viewport }).promise;

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

            const fullText = textContent.join('\n');
            console.log('OCR text content:', fullText);

            const regex = /(\d+)\s+([A-Z0-9]+)\s+(.+?)\s+(\d+)\s+(\d+[A-Z]+)/g;
            const items = [];
            let match;

            while ((match = regex.exec(fullText)) !== null) {
                const item = {
                    itemNo: items.length + 1,
                    description: match[3].trim(),
                    quantity: match[4].trim(),
                    unit: match[5].trim()
                };
                items.push(item);
            }

            console.log('Extracted Items:', items);

            onPDFDataChange(items);
            setExtractedData(items);
            setEditValues(items);
            setIsFormVisible(false);

        } catch (error) {
            console.error('PDF processing error:', error);
        }
    };

    return (
        <div className="relative flex flex-col max-w-xl w-full mt-4 mx-auto">
            {isFormVisible && (
                <form
                    className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col w-full relative mx-auto"
                    onSubmit={handleSubmit}
                    onReset={handleReset}
                >
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
    )
};

export default StockUpdate;
"use client";
import { useEffect, useState } from "react";
import * as PDFJS from "pdfjs-dist/types/src/pdf";
import '@ungap/with-resolvers';

export const usePDFJS = (
    onLoad: (pdfjs: typeof PDFJS) => Promise<void>,
    deps: (string | number | boolean | undefined | null)[] = []
) => {
    const [pdfjs, setPDFJS] = useState<typeof PDFJS | null>(null);

    // Load the library once on mount (the webpack import automatically sets up the worker)
    useEffect(() => {
        import("pdfjs-dist/webpack.mjs").then(setPDFJS);
    }, []);

    // Execute the callback function whenever PDFJS loads (or when the dependency array updates)
    useEffect(() => {
        if (!pdfjs) return;
        (async () => await onLoad(pdfjs))();
    }, [pdfjs, ...deps]);
};

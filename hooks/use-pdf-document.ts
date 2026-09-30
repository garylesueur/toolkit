"use client";

import type { PDFDocument } from "pdf-lib";
import { useState, useMemo, useEffect } from "react";

import {
  createPdfDocumentLoader,
  emptyPdfState,
} from "@/lib/pdf/document-loader";
import { loadPdfFile } from "@/lib/pdf/load";
import { renderAllThumbnails } from "@/lib/pdf/thumbnails";

type UsePdfDocumentOptions = { renderThumbnails?: boolean };

export function usePdfDocument(options: UsePdfDocumentOptions = {}) {
  const renderThumbnails = options.renderThumbnails ?? true;
  const [state, setState] = useState(() => emptyPdfState<PDFDocument>());
  const loader = useMemo(
    () =>
      createPdfDocumentLoader({
        parse: async (file: File) => {
          const loaded = await loadPdfFile(file);
          return { ...loaded, pageCount: loaded.pdfDoc.getPageCount() };
        },
        thumbnails: (bytes, signal) =>
          renderThumbnails
            ? renderAllThumbnails(bytes, 0.4, signal)
            : Promise.resolve([]),
        publish: setState,
      }),
    [renderThumbnails],
  );
  useEffect(() => () => loader.cancel(), [loader]);
  return {
    ...state,
    loadFile: loader.loadFile,
    reset: loader.reset,
    captureDocument: loader.captureDocument,
  };
}

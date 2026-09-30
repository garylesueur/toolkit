export type PdfDocumentState<TDocument> = {
  pdfDoc: TDocument | null;
  pdfBytes: Uint8Array | null;
  pageCount: number;
  thumbnails: string[];
  fileName: string | null;
  loading: boolean;
  error: string | null;
  documentId: number;
};

export function emptyPdfState<TDocument>(
  documentId = 0,
): PdfDocumentState<TDocument> {
  return {
    pdfDoc: null,
    pdfBytes: null,
    pageCount: 0,
    thumbnails: [],
    fileName: null,
    loading: false,
    error: null,
    documentId,
  };
}

type LoaderOptions<TFile extends { name: string }, TDocument> = {
  parse: (
    file: TFile,
  ) => Promise<{ pdfDoc: TDocument; bytes: Uint8Array; pageCount: number }>;
  thumbnails: (bytes: Uint8Array, signal: AbortSignal) => Promise<string[]>;
  publish: (state: PdfDocumentState<TDocument>) => void;
};

/** Owns the complete request lifecycle, including stale failures and finalizers. */
export function createPdfDocumentLoader<
  TFile extends { name: string },
  TDocument,
>(options: LoaderOptions<TFile, TDocument>) {
  let generation = 0;
  let active: AbortController | null = null;
  const cancel = () => {
    generation++;
    active?.abort();
    active = null;
  };
  const reset = () => {
    cancel();
    options.publish(emptyPdfState(generation));
  };
  const loadFile = async (file: TFile) => {
    cancel();
    const documentId = generation;
    const controller = new AbortController();
    active = controller;
    const current = () =>
      generation === documentId && !controller.signal.aborted;
    let state = { ...emptyPdfState<TDocument>(documentId), loading: true };
    options.publish(state);
    try {
      const loaded = await options.parse(file);
      if (!current()) return;
      state = {
        ...state,
        pdfDoc: loaded.pdfDoc,
        pdfBytes: loaded.bytes,
        pageCount: loaded.pageCount,
        fileName: file.name,
      };
      options.publish(state);
      const thumbnails = await options.thumbnails(
        loaded.bytes,
        controller.signal,
      );
      if (!current()) return;
      state = { ...state, thumbnails };
    } catch (error) {
      if (!current()) return;
      state = {
        ...emptyPdfState<TDocument>(documentId),
        loading: true,
        error: error instanceof Error ? error.message : "Failed to load PDF.",
      };
    } finally {
      if (current()) {
        options.publish({ ...state, loading: false });
        active = null;
      }
    }
  };
  const captureDocument = () => {
    const documentId = generation;
    return () => documentId === generation;
  };
  return { loadFile, reset, cancel, captureDocument };
}

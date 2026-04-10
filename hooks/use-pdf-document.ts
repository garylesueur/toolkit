"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { PDFDocument } from "pdf-lib"
import { loadPdfFile } from "@/lib/pdf/load"
import { renderAllThumbnails } from "@/lib/pdf/thumbnails"

type UsePdfDocumentReturn = {
  pdfDoc: PDFDocument | null
  pdfBytes: Uint8Array | null
  pageCount: number
  thumbnails: string[]
  fileName: string | null
  loading: boolean
  error: string | null
  loadFile: (file: File) => Promise<void>
  reset: () => void
}

export function usePdfDocument(): UsePdfDocumentReturn {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setPdfDoc(null)
    setPdfBytes(null)
    setPageCount(0)
    setThumbnails([])
    setFileName(null)
    setLoading(false)
    setError(null)
  }, [])

  const loadFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setThumbnails([])

    try {
      const { pdfDoc: doc, bytes } = await loadPdfFile(file)
      if (!mountedRef.current) return

      setPdfDoc(doc)
      setPdfBytes(bytes)
      setPageCount(doc.getPageCount())
      setFileName(file.name)

      const thumbs = await renderAllThumbnails(bytes)
      if (!mountedRef.current) return
      setThumbnails(thumbs)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : "Failed to load PDF.")
      setPdfDoc(null)
      setPdfBytes(null)
      setPageCount(0)
      setFileName(null)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  return {
    pdfDoc,
    pdfBytes,
    pageCount,
    thumbnails,
    fileName,
    loading,
    error,
    loadFile,
    reset,
  }
}

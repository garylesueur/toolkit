Self-hosted browser OCR assets

- worker.min.js: tesseract.js 7.0.0 (Apache-2.0)
- core/*.wasm.js: tesseract.js-core 7.0.0 LSTM builds (Apache-2.0)
- lang/eng.traineddata.gz: tessdata_fast English model from the main branch
  downloaded 8 August 2026 (Apache-2.0)

These files are served as static assets. The OCR workflow points every worker,
core, and language-data path here so it does not contact a CDN.

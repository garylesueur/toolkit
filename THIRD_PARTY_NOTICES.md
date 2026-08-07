# Third-party notices

## pdfcpu 0.14.0

The browser PDF optimiser includes the official `pdfcpu` JavaScript/WebAssembly release.

- Project: <https://github.com/pdfcpu/pdfcpu>
- Licence: Apache License 2.0
- Vendored licence: [`public/vendor/pdfcpu/LICENSE.txt`](./public/vendor/pdfcpu/LICENSE.txt)
- Release archive checksum verified against the publisher's `checksums.txt` manifest.

## Go WebAssembly runtime 1.26.5

The `pdfcpu` WebAssembly binary uses Go's JavaScript runtime support.

- Project: <https://go.dev/>
- Licence: BSD 3-Clause
- Vendored licence: [`lib/pdf/vendor/GO_LICENSE.txt`](./lib/pdf/vendor/GO_LICENSE.txt)

## memfs 4.62.0

`memfs` supplies the temporary in-memory filesystem used by `pdfcpu` inside its Web Worker.

- Project: <https://github.com/streamich/memfs>
- Licence: Apache License 2.0

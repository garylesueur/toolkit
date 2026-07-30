import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * pdfmake resolves fonts and pdfkit internals through `require` at runtime,
   * which the bundler cannot trace. Leaving it external keeps the server build
   * working for the MCP route.
   */
  serverExternalPackages: ["pdfmake"],
};

export default nextConfig;

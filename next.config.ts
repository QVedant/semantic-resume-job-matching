import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The AI library uses native code (onnxruntime-node) that must be loaded by
  // Node.js at runtime, not bundled by Next.js.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;

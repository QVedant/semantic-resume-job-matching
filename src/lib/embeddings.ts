// Text -> 768-number embedding, using the all-mpnet-base-v2 model running
// locally through Transformers.js (no API key, no internet after download,
// resume text never leaves this machine). Server-side only.
import path from "node:path";
import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// The ONNX export of sentence-transformers/all-mpnet-base-v2 on Hugging Face.
export const EMBEDDING_MODEL = "Xenova/all-mpnet-base-v2";
// What we store in resume_embeddings.model_name / job_embeddings.model_name.
export const EMBEDDING_MODEL_NAME = "all-mpnet-base-v2";
export const EMBEDDING_DIMENSIONS = 768; // must match vector(768) in schema.sql

// Download the model once into <project>/.model-cache (git-ignored) and reuse it.
env.cacheDir = path.join(process.cwd(), ".model-cache");

// Loading the model takes a few seconds, so it is loaded once and kept on
// globalThis (so dev-mode reloads reuse it too).
const globalForModel = globalThis as unknown as {
  embedder?: Promise<FeatureExtractionPipeline>;
};

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!globalForModel.embedder) {
    // dtype "fp32" = the full-precision model (~420 MB), as chosen for this project.
    const loading = pipeline("feature-extraction", EMBEDDING_MODEL, {
      dtype: "fp32",
    }) as unknown as Promise<FeatureExtractionPipeline>;
    // If loading fails (e.g. no internet on first use), forget the failed
    // attempt so the next request can try again.
    globalForModel.embedder = loading.catch((error) => {
      globalForModel.embedder = undefined;
      throw error;
    });
  }
  return globalForModel.embedder;
}

// Loads (and on first use downloads) the model without embedding anything.
export async function loadModel(): Promise<void> {
  await getEmbedder();
}

// Converts text into its 768-number embedding.
//   pooling "mean" : the model gives one vector per word piece; averaging them
//                    gives one vector for the whole text (how this model was trained)
//   normalize true : scale the vector to length 1, so cosine similarity is a
//                    pure comparison of direction (meaning)
export async function embedText(text: string): Promise<number[]> {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("Cannot embed empty text.");

  const embedder = await getEmbedder();
  const output = await embedder(clean, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data as Float32Array);

  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} numbers from the model, got ${vector.length}.`);
  }
  return vector;
}

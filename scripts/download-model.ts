// One-time download of the embedding model (~420 MB) into .model-cache/.
//   npm run model:download
// After this, embedding works offline. Safe to run again: it reuses the cache.
import { EMBEDDING_MODEL, embedText, loadModel } from "../src/lib/embeddings";

async function main() {
  console.log(`Loading ${EMBEDDING_MODEL} (downloads on the first run, this can take a while)...`);
  const started = Date.now();
  await loadModel();
  console.log(`Model ready in ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const vector = await embedText("Built REST APIs in Node.js with PostgreSQL.");
  console.log(`Test embedding: ${vector.length} numbers, first three: ${vector.slice(0, 3).map((n) => n.toFixed(4)).join(", ")}`);
}

main().catch((error) => {
  console.error("Model download failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});

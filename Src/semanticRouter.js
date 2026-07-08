// semanticRouter.js
import * as webllm from '@mlc-ai/web-llm';

// We use a smaller, capable model that fits in browser cache.
// Llama-3-8B-Instruct is great, but for lower-end hardware, "Qwen1.5-1.8B" is a good fallback.
const MODEL_ID = "Llama-3-8B-Instruct-q4f16_1"; 

let engine = null;
let isLoading = false;

/**
 * Initializes the WebLLM engine. Downloads the model to the browser cache if not present.
 * @param {function} onProgress - Callback to report download/init progress to the UI.
 */
export async function initLocalModel(onProgress) {
  if (engine || isLoading) return engine;
  
  isLoading = true;
  try {
    engine = await webllm.CreateWebWorkerMLCEngine(
      // By using a Web Worker, we prevent the UI from freezing during inference
      new Worker(new URL('./llmWorker.js', import.meta.url), { type: 'module' }),
      MODEL_ID,
      {
        initProgressCallback: (progress) => {
          onProgress(progress.text, progress.progress);
        }
      }
    );
    isLoading = false;
    return engine;
  } catch (error) {
    isLoading = false;
    console.error("Failed to load local model:", error);
    throw error;
  }
}

/**
 * Checks if the local model is ready for use.
 */
export function isModelReady() {
  return engine !== null;
}

/**
 * Sends a prompt to the local LLM to generate an expansion or extract data.
 * @param {string} systemPrompt - The instructions (e.g., "You are a narrative extractor...")
 * @param {string} userPrompt - The raw note content or collision query
 * @returns {Promise<string>} The generated text
 */
export async function runLocalInference(systemPrompt, userPrompt) {
  if (!engine) {
    throw new Error("Model is not initialized. Call initLocalModel() first.");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  try {
    // We request JSON output if we are extracting concepts, or standard text if expanding
    const reply = await engine.chat.completions.create({
      messages: messages,
      temperature: 0.7, // High temperature for creative "collisions"
      // response_format: { type: "json_object" } // Uncomment if extracting strict JSON
    });

    return reply.choices[0].message.content;
  } catch (error) {
    console.error("Inference error:", error);
    throw error;
  }
    }

const axios = require("axios");

async function askOllama(promptText) {
  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "mistral:latest",
        prompt: promptText,
        stream: false,
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000, // 30 second timeout
      }
    );

    return response.data.response;
  } catch (error) {
    console.error("Error calling Ollama:", error.message);
    throw new Error(
      "Ollama model is unavailable. Please ensure Ollama is running and the mistral model is installed."
    );
  }
}

module.exports = { askOllama };

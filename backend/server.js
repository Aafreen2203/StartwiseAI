const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { askOllama } = require("./services/ollamaService");
const {
  EnhancedRAGService,
  searchStartups,
  constructContext,
  loadStartupData,
} = require("./services/ragService");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize enhanced RAG service
const ragService = new EnhancedRAGService();
let startupData = [];

const loadData = () => {
  try {
    startupData = loadStartupData();
    ragService.startupData = startupData; // Update RAG service data
    console.log(`✅ Loaded ${startupData.length} startup records`);
  } catch (error) {
    console.error("❌ Error loading startup data:", error);
    startupData = [];
  }
};

// Load data on server start
loadData();

// Enhanced RAG endpoint with hybrid approach
app.post("/api/rag-query", async (req, res) => {
  try {
    const { question, options = {} } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    console.log(`🔍 Processing query: "${question}"`);

    // Step 1: Enhanced search with intent detection
    const searchResult = ragService.searchStartups(question, options);
    console.log(
      `📊 Search strategy: ${searchResult.searchStrategy}, Found ${
        searchResult.startups?.length || 0
      } relevant startups`
    );

    // Step 2: Construct context based on search result
    const context = ragService.constructContext(searchResult, question);

    // Step 3: Send to Ollama for processing
    let answer;
    try {
      answer = await askOllama(context);
    } catch (ollamaError) {
      console.error("Ollama error:", ollamaError.message);

      // Enhanced fallback handling
      if (searchResult.searchStrategy === "hybrid_fallback") {
        answer = `I understand you're asking about "${question}". While this isn't directly related to startup analysis, here's what I can tell you: This query falls outside our startup database scope. Our system specializes in analyzing companies from Y Combinator, Crunchbase, and other startup sources. For general questions like this, I'd recommend consulting more general-purpose resources.`;
      } else if (searchResult.startups && searchResult.startups.length > 0) {
        // Provide structured fallback for startup queries
        answer = `Based on the available startup data, here are the most relevant companies:\n\n${searchResult.startups
          .map(
            (startup, i) =>
              `${i + 1}. **${startup.name}** (${startup.source}): ${
                startup.description
              }${
                startup.categories
                  ? `\n   Categories: ${startup.categories.join(", ")}`
                  : ""
              }`
          )
          .join("\n\n")}`;
      } else {
        answer = `I couldn't find any startups matching your query "${question}" in our current database. This might be because:
        
1. The topic is outside our startup focus areas
2. We don't have data on startups in this specific niche yet
3. The query might be too general or specific

Our database includes companies from Y Combinator, Crunchbase, and other sources. You might want to try rephrasing your question or asking about a different aspect of the startup ecosystem.`;
      }
    }

    // Step 4: Return enhanced structured response
    res.json({
      answer,
      context: searchResult.startups || [],
      metadata: {
        searchStrategy: searchResult.searchStrategy,
        totalMatches: searchResult.totalMatches || 0,
        confidence: searchResult.confidence || 0,
        intent: searchResult.intent,
        queryProcessingTime: Date.now(),
      },
    });
  } catch (error) {
    console.error("❌ Error in RAG query:", error);
    res.status(500).json({
      error: "Internal server error during query processing",
      details: error.message,
    });
  }
});

// Enhanced endpoint to reload data from all sources
app.get("/api/reload-data", async (req, res) => {
  try {
    console.log("🔄 Triggering data refresh from all sources...");

    // Run all scrapers
    const { spawn } = require("child_process");
    const scriptsToRun = [
      "enhanced_yc_scraper.js",
      "alternative_scraper.js",
      "enhanced_merge_data.js",
    ];

    // Execute scraping scripts
    for (const script of scriptsToRun) {
      try {
        await new Promise((resolve, reject) => {
          const process = spawn("node", [script], {
            cwd: path.join(__dirname, "startup_scraper"),
            stdio: "inherit",
          });
          process.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Script ${script} failed with code ${code}`));
          });
        });
      } catch (error) {
        console.error(`⚠️ Error running ${script}:`, error.message);
      }
    }

    // Reload data
    loadData();

    res.json({
      message: "Data refresh completed",
      count: startupData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error reloading data:", error);
    res.status(500).json({
      error: "Failed to reload data",
      details: error.message,
    });
  }
});

// New endpoint for category-based search
app.get("/api/categories", (req, res) => {
  try {
    const categories = {};

    startupData.forEach((startup) => {
      if (startup.categories) {
        startup.categories.forEach((category) => {
          categories[category] = (categories[category] || 0) + 1;
        });
      }
    });

    res.json({
      categories: Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {}),
      totalStartups: startupData.length,
    });
  } catch (error) {
    console.error("❌ Error getting categories:", error);
    res.status(500).json({ error: "Failed to get categories" });
  }
});

// New endpoint for filtered search
app.post("/api/search", (req, res) => {
  try {
    const { query = "", category = null, source = null, limit = 10 } = req.body;

    let results = startupData;

    // Apply filters
    if (category) {
      results = results.filter(
        (startup) => startup.categories && startup.categories.includes(category)
      );
    }

    if (source) {
      results = results.filter((startup) => startup.source === source);
    }

    // Apply search if query provided
    if (query) {
      const searchResult = ragService.searchStartups(query, {
        maxResults: limit,
        categoryFilter: category,
        sourceFilter: source,
      });
      results = searchResult.startups;
    } else {
      results = results.slice(0, limit);
    }

    res.json({
      results,
      total: results.length,
      filters: { category, source, limit },
    });
  } catch (error) {
    console.error("❌ Error in search:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    dataLoaded: startupData.length > 0,
    startupCount: startupData.length,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to see all loaded data
app.get("/api/debug/data", (req, res) => {
  res.json({
    totalStartups: startupData.length,
    sources: [...new Set(startupData.map((s) => s.source))],
    sampleData: startupData.slice(0, 3),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Startup Backend running on http://localhost:${PORT}`);
  console.log(
    `📊 Loaded ${startupData.length} startups from combined YC + Crunchbase data`
  );
  console.log(`🤖 Ready to process RAG queries with Ollama (mistral model)`);
});

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
const { AdvancedRAGService } = require("./services/advancedRAGService");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Initialize enhanced RAG service
const ragService = new EnhancedRAGService();
const advancedRAG = new AdvancedRAGService();
let startupData = [];

const loadData = () => {
  try {
    startupData = loadStartupData();
    ragService.startupData = startupData; // Update RAG service data
    advancedRAG.startupData = startupData; // Update advanced RAG service data
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

// 🔍 Advanced RAG Endpoints

// 1. Idea Differentiation Insights
app.post("/api/advanced/idea-differentiation", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`🔍 Analyzing idea differentiation: "${userIdea}"`);

    const result = await advancedRAG.generateIdeaDifferentiation(
      userIdea,
      options
    );

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in idea differentiation:", error);
    res.status(500).json({
      error: "Failed to analyze idea differentiation",
      details: error.message,
    });
  }
});

// 2. Target Market Suggestions
app.post("/api/advanced/target-market", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`🎯 Analyzing target market: "${userIdea}"`);

    const result = await advancedRAG.generateTargetMarketSuggestions(
      userIdea,
      options
    );

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in target market analysis:", error);
    res.status(500).json({
      error: "Failed to analyze target market",
      details: error.message,
    });
  }
});

// 3. Monetization Strategy Ideas
app.post("/api/advanced/monetization", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`💡 Analyzing monetization strategies: "${userIdea}"`);

    const result = await advancedRAG.generateMonetizationStrategies(
      userIdea,
      options
    );

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in monetization analysis:", error);
    res.status(500).json({
      error: "Failed to analyze monetization strategies",
      details: error.message,
    });
  }
});

// 4. Tech Stack Recommendations
app.post("/api/advanced/tech-stack", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`🧩 Analyzing tech stack: "${userIdea}"`);

    const result = await advancedRAG.generateTechStackSuggestions(
      userIdea,
      options
    );

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in tech stack analysis:", error);
    res.status(500).json({
      error: "Failed to analyze tech stack",
      details: error.message,
    });
  }
});

// 5. Market Viability Score
app.post("/api/advanced/viability-score", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`📊 Analyzing market viability: "${userIdea}"`);

    const result = await advancedRAG.generateViabilityScore(userIdea, options);

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in viability analysis:", error);
    res.status(500).json({
      error: "Failed to analyze market viability",
      details: error.message,
    });
  }
});

// 6. Competitor Analysis with Links
app.post("/api/advanced/competitors", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`🔗 Analyzing competitors: "${userIdea}"`);

    const result = await advancedRAG.generateCompetitorAnalysis(
      userIdea,
      options
    );

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in competitor analysis:", error);
    res.status(500).json({
      error: "Failed to analyze competitors",
      details: error.message,
    });
  }
});

// 7. Idea Refinement Suggestions
app.post("/api/advanced/refinement", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`🔁 Generating refinement suggestions: "${userIdea}"`);

    const result = await advancedRAG.generateRefinementSuggestions(
      userIdea,
      options
    );

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in refinement analysis:", error);
    res.status(500).json({
      error: "Failed to generate refinement suggestions",
      details: error.message,
    });
  }
});

// 8. Investor Pitch Draft Generator
app.post("/api/advanced/pitch-draft", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`📋 Generating pitch draft: "${userIdea}"`);

    const result = await advancedRAG.generatePitchDraft(userIdea, options);

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in pitch generation:", error);
    res.status(500).json({
      error: "Failed to generate pitch draft",
      details: error.message,
    });
  }
});

// 9. Regional Startup Gaps Analysis
app.post("/api/advanced/regional-gaps", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`🌍 Analyzing regional gaps: "${userIdea}"`);

    const result = await advancedRAG.generateRegionalGapAnalysis(
      userIdea,
      options
    );

    res.json({
      success: true,
      userIdea,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in regional analysis:", error);
    res.status(500).json({
      error: "Failed to analyze regional gaps",
      details: error.message,
    });
  }
});

// 10. Comprehensive Analysis (All-in-One)
app.post("/api/advanced/full-analysis", async (req, res) => {
  try {
    const { userIdea, options = {} } = req.body;

    if (!userIdea) {
      return res.status(400).json({ error: "User idea is required" });
    }

    console.log(`🚀 Running comprehensive analysis: "${userIdea}"`);

    const results = {};
    const errors = {};

    // Run all analyses in parallel for efficiency
    const analyses = [
      { key: "differentiation", method: "generateIdeaDifferentiation" },
      { key: "targetMarket", method: "generateTargetMarketSuggestions" },
      { key: "monetization", method: "generateMonetizationStrategies" },
      { key: "techStack", method: "generateTechStackSuggestions" },
      { key: "viability", method: "generateViabilityScore" },
      { key: "competitors", method: "generateCompetitorAnalysis" },
      { key: "refinement", method: "generateRefinementSuggestions" },
      { key: "pitch", method: "generatePitchDraft" },
      { key: "regionalGaps", method: "generateRegionalGapAnalysis" },
    ];

    const promises = analyses.map(async (analysis) => {
      try {
        const result = await advancedRAG[analysis.method](userIdea, options);
        results[analysis.key] = result;
      } catch (error) {
        console.error(`❌ Error in ${analysis.key}:`, error.message);
        errors[analysis.key] = error.message;
      }
    });

    await Promise.all(promises);

    res.json({
      success: true,
      userIdea,
      results,
      errors: Object.keys(errors).length > 0 ? errors : null,
      timestamp: new Date().toISOString(),
      summary: {
        completedAnalyses: Object.keys(results).length,
        totalAnalyses: analyses.length,
        successRate: `${Math.round(
          (Object.keys(results).length / analyses.length) * 100
        )}%`,
      },
    });
  } catch (error) {
    console.error("❌ Error in comprehensive analysis:", error);
    res.status(500).json({
      error: "Failed to run comprehensive analysis",
      details: error.message,
    });
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

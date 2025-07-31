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

// 🧠 Enhanced RAG Agent for Intelligent Startup Analysis
class IntelligentRAGAgent {
  constructor(startupData, ragService) {
    this.startupData = startupData;
    this.ragService = ragService;
  }

  // Step 1: Use Mistral to understand the startup idea
  async understandStartupIdea(userPrompt) {
    const understandingPrompt = `
Analyze this startup idea and extract key information:

User's Idea: "${userPrompt}"

Please identify:
1. Business Category (HealthTech, EdTech, FinTech, Food & Beverage, E-commerce, etc.)
2. Target Audience (Consumers, Businesses, Students, etc.)
3. Key Features mentioned
4. Business Model if clear (Marketplace, SaaS, E-commerce, etc.)
5. Core Problem being solved

Respond in this exact JSON format:
{
  "category": "identified category",
  "audience": "target audience", 
  "features": ["feature1", "feature2"],
  "businessModel": "model if clear",
  "problem": "core problem being solved",
  "searchTerms": ["term1", "term2", "term3"]
}
`;

    try {
      const response = await askOllama(understandingPrompt);
      // Parse the JSON response
      const cleanResponse = response.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error("Error understanding startup idea:", error);
      // Fallback to simple extraction
      return this.extractIntentFallback(userPrompt);
    }
  }

  // Fallback method for when Mistral parsing fails
  extractIntentFallback(userPrompt) {
    const lowerPrompt = userPrompt.toLowerCase();

    // Simple category detection
    let category = "Consumer Technology";
    if (
      lowerPrompt.includes("food") ||
      lowerPrompt.includes("delivery") ||
      lowerPrompt.includes("restaurant")
    ) {
      category = "Food & Beverage";
    } else if (
      lowerPrompt.includes("health") ||
      lowerPrompt.includes("medical")
    ) {
      category = "Healthcare & Medical";
    } else if (
      lowerPrompt.includes("education") ||
      lowerPrompt.includes("learning")
    ) {
      category = "Education Technology";
    } else if (
      lowerPrompt.includes("finance") ||
      lowerPrompt.includes("payment")
    ) {
      category = "Financial Technology";
    }

    return {
      category,
      audience: "Consumers",
      features: lowerPrompt.split(" ").filter((word) => word.length > 4),
      businessModel: "Platform",
      problem: "Improving user experience",
      searchTerms: [
        category.toLowerCase(),
        lowerPrompt.split(" ").slice(0, 3).join(" "),
      ],
    };
  }

  // Step 2: Smart Retrieval based on understanding
  async findSimilarStartupsBasedOnUnderstanding(understanding) {
    const searchResults = [];

    // Search using different strategies
    for (const term of understanding.searchTerms) {
      const result = this.ragService.searchStartups(term, {
        maxResults: 10,
        threshold: 0.2,
      });

      if (result.startups && result.startups.length > 0) {
        searchResults.push(...result.startups);
      }
    }

    // Also search by category
    const categoryResult = this.ragService.searchStartups(
      understanding.category,
      {
        maxResults: 8,
        threshold: 0.25,
      }
    );

    if (categoryResult.startups) {
      searchResults.push(...categoryResult.startups);
    }

    // Remove duplicates and score by relevance
    const uniqueStartups = this.deduplicateStartups(searchResults);
    const scoredStartups = this.scoreStartupRelevance(
      uniqueStartups,
      understanding
    );

    return scoredStartups.slice(0, 5); // Top 5 most relevant
  }

  deduplicateStartups(startups) {
    const seen = new Map();
    for (const startup of startups) {
      if (!seen.has(startup.name.toLowerCase())) {
        seen.set(startup.name.toLowerCase(), startup);
      }
    }
    return Array.from(seen.values());
  }

  scoreStartupRelevance(startups, understanding) {
    return startups
      .map((startup) => {
        let score = 1.0;

        // Category match
        if (
          startup.categories &&
          startup.categories.some((cat) =>
            cat
              .toLowerCase()
              .includes(understanding.category.toLowerCase().split(" ")[0])
          )
        ) {
          score += 2.0;
        }

        // Description relevance
        const descLower = startup.description.toLowerCase();
        const features = understanding.features || [];
        const featureMatches = features.filter((feature) =>
          descLower.includes(feature.toLowerCase())
        ).length;
        score += featureMatches * 0.5;

        return { ...startup, relevanceScore: score };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Step 3: Generate tailored insights using Mistral
  async generateStartupInsights(understanding, similarStartups) {
    const insightsPrompt = `
You are a startup mentor. Based on the user's business idea and similar startups found, provide structured analysis:

USER'S IDEA:
Category: ${understanding.category}
Audience: ${understanding.audience}
Problem: ${understanding.problem}
Features: ${understanding.features?.join(", ") || "Not specified"}

SIMILAR STARTUPS FOUND:
${similarStartups
  .map((s, i) => `${i + 1}. ${s.name}: ${s.description}`)
  .join("\n")}

Provide analysis in this exact JSON format:
{
  "uniquenessScore": 85,
  "marketSaturation": "Medium - Growing market with established players",
  "suggestedInvestors": ["Investor 1", "Investor 2", "Investor 3"],
  "elevatorPitch": "Your compelling 2-sentence elevator pitch here",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"]
}

Guidelines:
- Uniqueness Score: 1-100 (higher = more unique)
- Market Saturation: Brief assessment 
- Investors: Suggest 3 relevant VCs/accelerators for this category
- Elevator Pitch: Compelling, specific to this idea
- Key Insights: 3 actionable insights for the founder
`;

    try {
      const response = await askOllama(insightsPrompt);
      const cleanResponse = response.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error("Error generating insights:", error);
      return this.generateInsightsFallback(understanding, similarStartups);
    }
  }

  // Fallback insights generation
  generateInsightsFallback(understanding, similarStartups) {
    const competitorCount = similarStartups.length;
    let uniquenessScore = 90 - competitorCount * 15;
    uniquenessScore = Math.max(10, Math.min(100, uniquenessScore));

    const marketSaturation =
      competitorCount > 3
        ? "High - Mature market with many competitors"
        : competitorCount > 1
        ? "Medium - Growing market with some players"
        : "Low - Emerging market with few competitors";

    const categoryInvestors = {
      "Food & Beverage": [
        "Sequoia Capital",
        "Andreessen Horowitz",
        "Accel Partners",
      ],
      "Healthcare & Medical": [
        "Andreessen Horowitz Bio Fund",
        "GV (Google Ventures)",
        "Bessemer Venture Partners",
      ],
      "Education Technology": [
        "Reach Capital",
        "NewSchools Venture Fund",
        "GSV Ventures",
      ],
      "Financial Technology": [
        "Ribbit Capital",
        "QED Investors",
        "Anthemis Group",
      ],
      "E-commerce": [
        "Forerunner Ventures",
        "Bessemer Venture Partners",
        "FirstMark Capital",
      ],
    };

    return {
      uniquenessScore,
      marketSaturation,
      suggestedInvestors: categoryInvestors[understanding.category] || [
        "Sequoia Capital",
        "First Round Capital",
        "Techstars",
      ],
      elevatorPitch: `A ${understanding.category.toLowerCase()} solution that ${understanding.problem.toLowerCase()} for ${understanding.audience.toLowerCase()}.`,
      keyInsights: [
        `Focus on differentiation from ${
          similarStartups[0]?.name || "existing players"
        }`,
        `Target the ${understanding.audience.toLowerCase()} segment specifically`,
        `Consider the competitive landscape in ${understanding.category}`,
      ],
    };
  }

  // Main analysis function - Simple 3-step approach
  async analyzeStartupIdea(userPrompt) {
    console.log(`🧠 Starting simplified intelligent analysis...`);
    const startTime = Date.now();

    try {
      // Step 1: Understand the idea using Mistral
      console.log(`📝 Step 1: Understanding startup idea...`);
      const understanding = await this.understandStartupIdea(userPrompt);
      console.log(
        `✅ Understood as: ${understanding.category} for ${understanding.audience}`
      );

      // Step 2: Find similar startups based on understanding
      console.log(`🔍 Step 2: Finding similar startups...`);
      const similarStartups =
        await this.findSimilarStartupsBasedOnUnderstanding(understanding);
      console.log(`✅ Found ${similarStartups.length} similar startups`);

      // Step 3: Generate insights using Mistral
      console.log(`💡 Step 3: Generating tailored insights...`);
      const insights = await this.generateStartupInsights(
        understanding,
        similarStartups
      );
      console.log(
        `✅ Generated insights with uniqueness score: ${insights.uniquenessScore}`
      );

      // Step 4: Format final response
      const response = {
        intent: {
          industry: understanding.category,
          audience: understanding.audience,
          businessModel: understanding.businessModel,
          problem: understanding.problem,
          features: understanding.features,
          confidence: 0.9,
        },
        similarStartups: similarStartups.map((s) => ({
          name: s.name,
          description: s.description,
          source: s.source,
          relevanceScore: s.relevanceScore || 3.0,
          similarity: Math.round((s.relevanceScore || 3.0) * 20),
        })),
        uniquenessScore: insights.uniquenessScore,
        marketSaturation: 100 - insights.uniquenessScore,
        investors: insights.suggestedInvestors.map((name) => ({
          name: name,
          firm: name,
          focus: understanding.category,
          relevanceScore: 4.0,
        })),
        pitchData: {
          elevatorPitch: insights.elevatorPitch,
          keyMetrics: this.suggestKeyMetrics(understanding.category),
          swot: "",
        },
        marketIntelligence: {
          marketLandscape: insights.marketSaturation,
          keyInsights: insights.keyInsights,
          competitivePositioning: `Position against ${
            similarStartups[0]?.name || "competitors"
          } by focusing on unique features`,
        },
        metadata: {
          searchStrategy: "simplified_intelligent_rag_agent",
          totalMatches: similarStartups.length,
          confidence: 0.9,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };

      console.log(`🎉 Analysis completed in ${Date.now() - startTime}ms`);
      return response;
    } catch (error) {
      console.error("❌ Error in startup analysis:", error);
      throw error;
    }
  }

  // Simple key metrics based on category
  suggestKeyMetrics(category) {
    const categoryMetrics = {
      "Food & Beverage": [
        "Monthly Active Users",
        "Average Order Value",
        "Delivery Time",
        "Customer Retention Rate",
      ],
      "Healthcare & Medical": [
        "Patient Engagement Rate",
        "Health Outcomes",
        "Provider Adoption",
        "Compliance Score",
      ],
      "Education Technology": [
        "Course Completion Rate",
        "Student Engagement",
        "Learning Outcomes",
        "Teacher Satisfaction",
      ],
      "Financial Technology": [
        "Transaction Volume",
        "User Acquisition Cost",
        "Fraud Detection Rate",
        "Regulatory Compliance",
      ],
      "E-commerce": [
        "Conversion Rate",
        "Cart Abandonment Rate",
        "Customer Lifetime Value",
        "Return Rate",
      ],
    };

    return (
      categoryMetrics[category] || [
        "Monthly Active Users",
        "Customer Acquisition Cost",
        "Revenue Growth",
        "User Retention",
      ]
    );
  }

  // Step 1: Enhanced Intent Extraction with Deep Prompt Understanding (DEPRECATED)
  extractIntent(userPrompt) {
    const lowerPrompt = userPrompt.toLowerCase();
    const wordCount = userPrompt.trim().split(/\s+/).length;
    const sentences = userPrompt
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    // Enhanced vague detection with semantic analysis
    const vagueIndicators = [
      "startup idea",
      "business idea",
      "what should i build",
      "help me",
      "give me ideas",
      "ai app",
      "mobile app",
      "web app",
      "saas",
      "platform",
      "marketplace",
      "social media",
      "fintech",
      "edtech",
      "healthtech",
    ];

    const isVeryShort = wordCount <= 3;
    const hasVagueIndicators = vagueIndicators.some((indicator) =>
      lowerPrompt.includes(indicator)
    );
    const lacksSpecificity = !this.hasSpecificBusinessElements(userPrompt);
    const isGeneric =
      isVeryShort ||
      (hasVagueIndicators && userPrompt.length < 80) ||
      (wordCount < 8 && lacksSpecificity);

    if (isGeneric) {
      return {
        isVague: true,
        clarificationQuestions: this.generateContextualQuestions(userPrompt),
      };
    }

    // Extract core components with enhanced analysis
    const intent = {
      isVague: false,
      startup: this.extractStartupConcept(userPrompt),
      problem: this.extractProblemStatement(userPrompt),
      solution: this.extractSolutionApproach(userPrompt),
      targetIndustry: this.extractIndustryWithContext(userPrompt),
      targetAudience: this.extractAudienceWithDetails(userPrompt),
      businessModel: this.extractBusinessModelWithContext(userPrompt),
      technologyStack: this.extractTechnologyWithContext(userPrompt),
      valueProposition: this.extractValueProposition(userPrompt),
      marketSize: this.estimateMarketContext(userPrompt),
      confidence: this.calculateEnhancedConfidence(userPrompt),
      semanticKeywords: this.extractSemanticKeywords(userPrompt),
      businessComplexity: this.assessBusinessComplexity(userPrompt),
    };

    return intent;
  }

  // Helper method to check for specific business elements
  hasSpecificBusinessElements(prompt) {
    const specificElements = [
      "solves",
      "helps",
      "enables",
      "automates",
      "connects",
      "manages",
      "tracks",
      "customers",
      "users",
      "businesses",
      "companies",
      "market",
      "industry",
      "revenue",
      "subscription",
      "marketplace",
      "platform",
      "service",
      "product",
    ];
    return specificElements.some((element) =>
      prompt.toLowerCase().includes(element)
    );
  }

  // Generate contextual clarification questions
  generateContextualQuestions(prompt) {
    const baseQuestions = [
      "What specific problem are you trying to solve?",
      "Who is your target customer or user?",
      "What industry or market are you focusing on?",
      "How does your solution work differently from existing options?",
      "What's your planned business model (subscription, marketplace, etc.)?",
    ];

    // Add context-specific questions based on partial prompt
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("ai")) {
      baseQuestions.push(
        "What specific AI capabilities will your solution use?"
      );
    }
    if (lowerPrompt.includes("health")) {
      baseQuestions.push(
        "Are you targeting patients, healthcare providers, or both?"
      );
    }
    if (lowerPrompt.includes("social")) {
      baseQuestions.push(
        "What type of social interaction or community are you building?"
      );
    }

    return baseQuestions.slice(0, 5);
  }

  extractStartupConcept(prompt) {
    // Extract the main startup concept using keyword analysis
    const prompt_lower = prompt.toLowerCase();

    // Look for app/platform/service patterns
    const appPatterns = [
      /(\w+)\s+app/gi,
      /app\s+(?:that|for|to)\s+([^,.!?]+)/gi,
      /platform\s+(?:that|for|to)\s+([^,.!?]+)/gi,
      /service\s+(?:that|for|to)\s+([^,.!?]+)/gi,
    ];

    for (const pattern of appPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        return match[0].substring(0, 100);
      }
    }

    // Extract first sentence as concept
    const firstSentence = prompt.split(/[.!?]/)[0];
    return firstSentence.length > 10 ? firstSentence : prompt.substring(0, 100);
  }

  // Enhanced extraction methods for deeper prompt understanding

  extractProblemStatement(prompt) {
    const problemPatterns = [
      /(?:solves?|addressing|tackles?|fixes?|eliminates?)\s+([^.!?]+)/gi,
      /(?:problem|issue|challenge|pain\s+point)[\s:]*([^.!?]+)/gi,
      /(?:helps?|enables?|allows?)\s+([^.!?]+)/gi,
      /(?:struggling|difficult|hard|frustrating)[\s\w]*(?:to|with)\s+([^.!?]+)/gi,
    ];

    for (const pattern of problemPatterns) {
      const matches = prompt.match(pattern);
      if (matches && matches[0]) {
        return matches[0].substring(0, 150).trim();
      }
    }

    // Fallback: look for context clues
    if (
      prompt.toLowerCase().includes("wardrobe") ||
      prompt.toLowerCase().includes("closet")
    ) {
      return "Managing and organizing personal wardrobe efficiently";
    }
    if (
      prompt.toLowerCase().includes("schedule") ||
      prompt.toLowerCase().includes("calendar")
    ) {
      return "Optimizing time management and scheduling";
    }

    return "Improving user experience and solving daily challenges";
  }

  extractSolutionApproach(prompt) {
    const solutionPatterns = [
      /(?:using|leveraging|with|through)\s+([^.!?]+)/gi,
      /(?:platform|app|service|tool|system)\s+(?:that|which)\s+([^.!?]+)/gi,
      /(?:by|via)\s+([^.!?]+)/gi,
    ];

    for (const pattern of solutionPatterns) {
      const matches = prompt.match(pattern);
      if (matches && matches[0]) {
        return matches[0].substring(0, 100).trim();
      }
    }

    // Extract approach from technology mentions
    const techApproach = this.extractTechnologyWithContext(prompt);
    if (techApproach.length > 0) {
      return `Using ${techApproach.join(" and ")} technology`;
    }

    return "Innovative technology-driven approach";
  }

  extractValueProposition(prompt) {
    const valuePatterns = [
      /(?:unique|different|better|innovative|revolutionary)[\s\w]*(?:by|through|with)\s+([^.!?]+)/gi,
      /(?:unlike|compared to|vs)\s+([^.!?]+)/gi,
      /(?:advantage|benefit|value)[\s:]*([^.!?]+)/gi,
    ];

    for (const pattern of valuePatterns) {
      const matches = prompt.match(pattern);
      if (matches && matches[0]) {
        return matches[0].substring(0, 120).trim();
      }
    }

    return "Providing exceptional user experience and innovative solutions";
  }

  extractSemanticKeywords(prompt) {
    const words = prompt.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "that",
      "this",
      "is",
      "are",
      "was",
      "were",
    ]);

    return words
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .filter((word) => /^[a-zA-Z]+$/.test(word))
      .slice(0, 10);
  }

  assessBusinessComplexity(prompt) {
    let complexity = 1; // Low

    // Technology complexity indicators
    if (
      /ai|artificial intelligence|machine learning|blockchain|iot|ar|vr/.test(
        prompt.toLowerCase()
      )
    ) {
      complexity = Math.max(complexity, 3);
    }

    // Market complexity indicators
    if (
      /enterprise|b2b|healthcare|finance|regulated/.test(prompt.toLowerCase())
    ) {
      complexity = Math.max(complexity, 2);
    }

    // Multi-sided platforms
    if (/marketplace|platform|connects|network/.test(prompt.toLowerCase())) {
      complexity = Math.max(complexity, 2);
    }

    return complexity; // 1=Low, 2=Medium, 3=High
  }

  estimateMarketContext(prompt) {
    const marketIndicators = {
      large: ["global", "worldwide", "everyone", "massive", "billion"],
      medium: ["regional", "national", "industry", "sector", "segment"],
      niche: ["specific", "specialized", "particular", "targeted", "focused"],
    };

    const lowerPrompt = prompt.toLowerCase();

    for (const [size, indicators] of Object.entries(marketIndicators)) {
      if (indicators.some((indicator) => lowerPrompt.includes(indicator))) {
        return size;
      }
    }

    return "medium"; // Default assumption
  }

  calculateEnhancedConfidence(prompt) {
    let confidence = 0.3; // Base confidence

    // Length and structure bonus
    const wordCount = prompt.trim().split(/\s+/).length;
    if (wordCount > 15) confidence += 0.2;
    if (wordCount > 30) confidence += 0.1;
    if (wordCount > 50) confidence += 0.1;

    // Specific business elements
    const businessElements = [
      "problem",
      "solution",
      "market",
      "customer",
      "revenue",
      "business model",
    ];
    const elementCount = businessElements.filter((element) =>
      prompt.toLowerCase().includes(element)
    ).length;
    confidence += elementCount * 0.08;

    // Specificity indicators
    const specificityMarkers = [
      "specific",
      "particular",
      "focused",
      "targeting",
      "designed for",
    ];
    if (
      specificityMarkers.some((marker) => prompt.toLowerCase().includes(marker))
    ) {
      confidence += 0.15;
    }

    // Technology specificity
    const techStack = this.extractTechnologyWithContext(prompt);
    confidence += techStack.length * 0.05;

    return Math.min(confidence, 1.0);
  }

  extractIndustryWithContext(prompt) {
    const enhancedIndustryMap = {
      "AI & Machine Learning": {
        keywords: [
          "ai",
          "artificial intelligence",
          "machine learning",
          "ml",
          "neural",
          "deep learning",
          "nlp",
          "computer vision",
          "automation",
          "intelligent",
        ],
        context: ["smart", "predict", "analyze", "learn", "algorithm"],
        primaryBusinessIndicators: ["ai platform", "ml service", "ai solution"],
      },
      "Healthcare & Medical": {
        keywords: [
          "health",
          "medical",
          "healthcare",
          "doctor",
          "patient",
          "hospital",
          "clinic",
          "medicine",
          "treatment",
          "diagnosis",
        ],
        context: ["wellness", "fitness", "therapy", "prescription", "symptom"],
        primaryBusinessIndicators: [
          "health app",
          "medical platform",
          "healthcare service",
        ],
      },
      "Financial Technology": {
        keywords: [
          "finance",
          "fintech",
          "payment",
          "banking",
          "money",
          "credit",
          "loan",
          "investment",
          "crypto",
          "wallet",
        ],
        context: ["transaction", "currency", "trading", "portfolio", "budget"],
        primaryBusinessIndicators: [
          "fintech app",
          "payment platform",
          "financial service",
        ],
      },
      "Education Technology": {
        keywords: [
          "education",
          "learning",
          "teaching",
          "school",
          "student",
          "course",
          "training",
          "edtech",
          "university",
        ],
        context: ["skill", "knowledge", "curriculum", "assessment", "tutor"],
        primaryBusinessIndicators: [
          "edtech platform",
          "learning app",
          "education service",
        ],
      },
      "E-commerce & Retail": {
        keywords: [
          "ecommerce",
          "e-commerce",
          "shopping",
          "marketplace",
          "retail",
          "store",
          "buying",
          "selling",
          "purchase",
        ],
        context: ["product", "inventory", "catalog", "checkout", "delivery"],
        primaryBusinessIndicators: [
          "shopping app",
          "retail platform",
          "marketplace",
        ],
      },
      "Fashion & Beauty": {
        keywords: [
          "fashion",
          "clothing",
          "style",
          "beauty",
          "wardrobe",
          "outfit",
          "closet",
          "apparel",
          "cosmetics",
        ],
        context: ["trend", "design", "brand", "aesthetic", "look"],
        primaryBusinessIndicators: [
          "fashion app",
          "style platform",
          "beauty service",
        ],
      },
      "Food & Beverage": {
        keywords: [
          "food",
          "restaurant",
          "delivery",
          "cooking",
          "recipe",
          "dining",
          "eat",
          "meal",
          "meals",
          "kitchen",
          "chef",
          "order",
          "orders",
        ],
        context: ["nutrition", "ingredient", "cuisine", "taste", "order"],
        primaryBusinessIndicators: [
          "food delivery app",
          "food delivery",
          "restaurant app",
          "meal delivery",
          "food app",
          "delivery service",
          "order meals",
          "restaurant delivery",
        ],
      },
      "Real Estate & Property": {
        keywords: [
          "real estate",
          "property",
          "housing",
          "rent",
          "apartment",
          "home",
          "building",
          "lease",
        ],
        context: ["location", "neighborhood", "market", "listing", "broker"],
        primaryBusinessIndicators: [
          "real estate app",
          "property platform",
          "rental service",
        ],
      },
      "Transportation & Logistics": {
        keywords: [
          "transport",
          "travel",
          "car",
          "ride",
          "delivery",
          "logistics",
          "mobility",
          "shipping",
          "freight",
        ],
        context: ["route", "vehicle", "traffic", "cargo", "movement"],
        primaryBusinessIndicators: [
          "ride sharing",
          "transport app",
          "logistics platform",
        ],
      },
      "Social & Communication": {
        keywords: [
          "social",
          "community",
          "network",
          "connect",
          "friends",
          "messaging",
          "chat",
          "communication",
        ],
        context: ["relationship", "interaction", "sharing", "group", "profile"],
        primaryBusinessIndicators: [
          "social media",
          "social network",
          "messaging app",
          "communication platform",
        ],
      },
      "Entertainment & Media": {
        keywords: [
          "entertainment",
          "music",
          "video",
          "game",
          "streaming",
          "media",
          "content",
          "movie",
          "show",
        ],
        context: ["creator", "audience", "platform", "channel", "production"],
        primaryBusinessIndicators: [
          "streaming service",
          "media platform",
          "entertainment app",
        ],
      },
      "Productivity & Tools": {
        keywords: [
          "productivity",
          "tool",
          "workflow",
          "management",
          "organization",
          "efficiency",
          "automation",
        ],
        context: ["task", "project", "schedule", "collaborate", "optimize"],
        primaryBusinessIndicators: [
          "productivity app",
          "management tool",
          "workflow platform",
        ],
      },
    };

    const lowerPrompt = prompt.toLowerCase();
    let bestMatch = { industry: "Consumer Technology", score: 0 };

    for (const [industry, data] of Object.entries(enhancedIndustryMap)) {
      let score = 0;

      // Check for primary business indicators first (highest priority)
      const primaryMatches =
        data.primaryBusinessIndicators?.filter((indicator) =>
          lowerPrompt.includes(indicator.toLowerCase())
        ).length || 0;
      score += primaryMatches * 5; // Higher weight for primary business indicators

      // Primary keyword matches
      const keywordMatches = data.keywords.filter((keyword) =>
        lowerPrompt.includes(keyword)
      ).length;
      score += keywordMatches * 2;

      // Context keyword matches
      const contextMatches = data.context.filter((context) =>
        lowerPrompt.includes(context)
      ).length;
      score += contextMatches * 1;

      if (score > bestMatch.score) {
        bestMatch = { industry, score };
      }
    }

    return bestMatch.industry;
  }

  extractAudienceWithDetails(prompt) {
    const enhancedAudienceMap = {
      "Individual Consumers (B2C)": {
        keywords: [
          "users",
          "people",
          "consumers",
          "individuals",
          "personal",
          "anyone",
          "everyone",
          "customer",
        ],
        context: ["daily", "lifestyle", "home", "family", "personal"],
      },
      "Small & Medium Businesses": {
        keywords: [
          "small business",
          "smb",
          "local business",
          "entrepreneurs",
          "startups",
          "freelancers",
        ],
        context: ["owner", "team", "growth", "operations", "revenue"],
      },
      "Enterprise & Large Corporations": {
        keywords: [
          "enterprise",
          "companies",
          "corporations",
          "b2b",
          "organizations",
          "corporate",
        ],
        context: [
          "scale",
          "department",
          "workflow",
          "compliance",
          "integration",
        ],
      },
      "Healthcare Professionals": {
        keywords: [
          "doctors",
          "nurses",
          "healthcare professionals",
          "medical staff",
          "physicians",
          "practitioners",
        ],
        context: ["patient", "clinic", "hospital", "care", "treatment"],
      },
      "Educational Institutions": {
        keywords: [
          "students",
          "teachers",
          "educators",
          "schools",
          "universities",
          "learners",
          "faculty",
        ],
        context: [
          "classroom",
          "academic",
          "curriculum",
          "grade",
          "institution",
        ],
      },
      "Technology Professionals": {
        keywords: [
          "developers",
          "programmers",
          "engineers",
          "tech teams",
          "software teams",
          "IT",
        ],
        context: [
          "code",
          "development",
          "technical",
          "infrastructure",
          "system",
        ],
      },
      "Creative Professionals": {
        keywords: [
          "designers",
          "artists",
          "creators",
          "influencers",
          "content creators",
          "agencies",
        ],
        context: ["creative", "design", "content", "brand", "visual"],
      },
    };

    const lowerPrompt = prompt.toLowerCase();
    let bestMatch = { audience: "General Consumers", score: 0 };

    for (const [audience, data] of Object.entries(enhancedAudienceMap)) {
      let score = 0;

      const keywordMatches = data.keywords.filter((keyword) =>
        lowerPrompt.includes(keyword)
      ).length;
      score += keywordMatches * 2;

      const contextMatches = data.context.filter((context) =>
        lowerPrompt.includes(context)
      ).length;
      score += contextMatches * 1;

      if (score > bestMatch.score) {
        bestMatch = { audience, score };
      }
    }

    return bestMatch.audience;
  }

  extractBusinessModelWithContext(prompt) {
    const enhancedModelMap = {
      "SaaS (Software as a Service)": {
        keywords: [
          "subscription",
          "monthly",
          "saas",
          "recurring",
          "plan",
          "tier",
          "software",
        ],
        context: ["cloud", "access", "feature", "upgrade", "license"],
      },
      "Marketplace & Platform": {
        keywords: [
          "marketplace",
          "platform",
          "connects",
          "buyers and sellers",
          "commission",
          "network",
          "delivery",
          "order",
        ],
        context: [
          "transaction",
          "listing",
          "vendor",
          "seller",
          "buyer",
          "restaurant",
          "driver",
        ],
      },
      "E-commerce & Direct Sales": {
        keywords: [
          "selling",
          "products",
          "store",
          "shop",
          "purchase",
          "buy",
          "retail",
        ],
        context: ["inventory", "shipping", "customer", "order", "product"],
      },
      "Freemium & Premium": {
        keywords: [
          "free",
          "premium",
          "upgrade",
          "basic",
          "pro version",
          "freemium",
        ],
        context: ["limit", "feature", "unlock", "subscription", "tier"],
      },
      "Advertising & Sponsored Content": {
        keywords: ["ads", "advertising", "sponsored", "free app", "monetize"],
        context: ["impression", "click", "revenue", "advertiser", "content"],
      },
      "Transaction & Payment Processing": {
        keywords: [
          "fee",
          "transaction",
          "percentage",
          "payment processing",
          "commission",
        ],
        context: ["payment", "processing", "gateway", "merchant", "financial"],
      },
      "Consulting & Services": {
        keywords: ["consulting", "service", "professional", "agency", "custom"],
        context: ["hourly", "project", "client", "expertise", "solution"],
      },
    };

    const lowerPrompt = prompt.toLowerCase();
    let bestMatch = { model: "SaaS (Software as a Service)", score: 0 };

    for (const [model, data] of Object.entries(enhancedModelMap)) {
      let score = 0;

      const keywordMatches = data.keywords.filter((keyword) =>
        lowerPrompt.includes(keyword)
      ).length;
      score += keywordMatches * 2;

      const contextMatches = data.context.filter((context) =>
        lowerPrompt.includes(context)
      ).length;
      score += contextMatches * 1;

      if (score > bestMatch.score) {
        bestMatch = { model, score };
      }
    }

    return bestMatch.model;
  }

  extractTechnologyWithContext(prompt) {
    const techStack = [];
    const enhancedTechMap = {
      "AI/ML & Data Science": [
        "ai",
        "artificial intelligence",
        "machine learning",
        "neural",
        "deep learning",
        "data science",
        "analytics",
      ],
      "Mobile Development": [
        "mobile",
        "app",
        "ios",
        "android",
        "smartphone",
        "react native",
        "flutter",
      ],
      "Web Technologies": [
        "web",
        "website",
        "browser",
        "online platform",
        "react",
        "angular",
        "vue",
      ],
      "Cloud & Infrastructure": [
        "cloud",
        "aws",
        "azure",
        "scalable",
        "server",
        "hosting",
        "infrastructure",
      ],
      "Database & Storage": [
        "database",
        "data",
        "storage",
        "sql",
        "nosql",
        "analytics",
        "insights",
      ],
      "API & Integration": [
        "api",
        "integration",
        "connects to",
        "syncs with",
        "webhook",
        "third-party",
      ],
      "Blockchain & Crypto": [
        "blockchain",
        "crypto",
        "decentralized",
        "web3",
        "smart contract",
        "nft",
      ],
      "IoT & Hardware": [
        "iot",
        "hardware",
        "sensor",
        "device",
        "embedded",
        "microcontroller",
      ],
      "AR/VR & Immersive": [
        "ar",
        "vr",
        "augmented reality",
        "virtual reality",
        "3d",
        "immersive",
      ],
    };

    const lowerPrompt = prompt.toLowerCase();
    for (const [tech, keywords] of Object.entries(enhancedTechMap)) {
      if (keywords.some((keyword) => lowerPrompt.includes(keyword))) {
        techStack.push(tech);
      }
    }

    return techStack.length > 0
      ? techStack
      : ["Web Technologies", "Mobile Development"];
  }

  // Step 2a: Enhanced Similar Startups Discovery with Multi-Query Strategy
  async findSimilarStartups(intent, maxResults = 5) {
    // Generate multiple search queries with different strategies
    const searchStrategies = this.generateSearchStrategies(intent);
    let allResults = [];
    let searchMetadata = { strategies: [], totalQueries: 0 };

    for (const strategy of searchStrategies) {
      const result = this.ragService.searchStartups(strategy.query, {
        maxResults: 8,
        threshold: strategy.threshold,
      });

      searchMetadata.strategies.push({
        strategy: strategy.name,
        query: strategy.query,
        results: result.startups?.length || 0,
      });
      searchMetadata.totalQueries++;

      if (result.startups && result.startups.length > 0) {
        // Tag results with search strategy
        const taggedResults = result.startups.map((startup) => ({
          ...startup,
          discoveryStrategy: strategy.name,
          searchRelevance: strategy.weight,
        }));
        allResults = allResults.concat(taggedResults);
      }
    }

    // Enhanced deduplication and relevance scoring
    const uniqueStartups = this.deduplicateAndScore(allResults, intent);

    // Apply semantic filtering for better relevance
    const filteredStartups = this.applySemanticFiltering(
      uniqueStartups,
      intent
    );

    return {
      startups: filteredStartups.slice(0, maxResults),
      metadata: searchMetadata,
    };
  }

  generateSearchStrategies(intent) {
    const strategies = [];

    // Strategy 1: Direct concept match
    strategies.push({
      name: "direct_concept",
      query: intent.startup,
      threshold: 0.4,
      weight: 1.0,
    });

    // Strategy 2: Problem-solution approach
    if (intent.problem && intent.solution) {
      strategies.push({
        name: "problem_solution",
        query: `${intent.problem} ${intent.solution}`,
        threshold: 0.35,
        weight: 0.9,
      });
    }

    // Strategy 3: Industry + audience combination
    strategies.push({
      name: "industry_audience",
      query: `${intent.targetIndustry} ${intent.targetAudience}`,
      threshold: 0.3,
      weight: 0.8,
    });

    // Strategy 4: Technology stack focus
    if (intent.technologyStack.length > 0) {
      strategies.push({
        name: "technology_focus",
        query: `${intent.technologyStack.join(" ")} ${intent.targetIndustry}`,
        threshold: 0.3,
        weight: 0.7,
      });
    }

    // Strategy 5: Business model approach
    strategies.push({
      name: "business_model",
      query: `${intent.businessModel} ${intent.targetIndustry}`,
      threshold: 0.25,
      weight: 0.6,
    });

    // Strategy 6: Semantic keywords
    if (intent.semanticKeywords.length > 0) {
      strategies.push({
        name: "semantic_keywords",
        query: intent.semanticKeywords.slice(0, 4).join(" "),
        threshold: 0.25,
        weight: 0.5,
      });
    }

    return strategies;
  }

  deduplicateAndScore(allResults, intent) {
    const seenStartups = new Map();

    for (const startup of allResults) {
      const key = startup.name.toLowerCase();

      if (!seenStartups.has(key)) {
        seenStartups.set(key, {
          ...startup,
          relevanceScore: this.calculateEnhancedRelevance(startup, intent),
          discoveryStrategies: [startup.discoveryStrategy],
        });
      } else {
        // Merge discovery strategies
        const existing = seenStartups.get(key);
        existing.discoveryStrategies.push(startup.discoveryStrategy);
        // Boost relevance for multi-strategy matches
        existing.relevanceScore += 0.5;
      }
    }

    return Array.from(seenStartups.values()).sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );
  }

  calculateEnhancedRelevance(startup, intent) {
    let score = 1.0;

    // Industry alignment (high weight)
    if (startup.categories) {
      const industryMatch = this.calculateIndustryAlignment(
        startup.categories,
        intent.targetIndustry
      );
      score += industryMatch * 3.0;
    }

    // Audience alignment
    const audienceMatch = this.calculateAudienceAlignment(
      startup.description,
      intent.targetAudience
    );
    score += audienceMatch * 2.0;

    // Technology overlap
    const techMatch = this.calculateTechnologyOverlap(
      startup.description,
      intent.technologyStack
    );
    score += techMatch * 1.5;

    // Semantic keyword matching
    const semanticMatch = this.calculateSemanticMatch(
      startup.description,
      intent.semanticKeywords
    );
    score += semanticMatch * 1.0;

    // Business model similarity
    const modelMatch = this.calculateBusinessModelMatch(
      startup.description,
      intent.businessModel
    );
    score += modelMatch * 1.0;

    // Problem-solution alignment
    if (intent.problem && intent.solution) {
      const problemMatch = this.calculateProblemAlignment(
        startup.description,
        intent.problem
      );
      score += problemMatch * 2.0;
    }

    return score;
  }

  calculateIndustryAlignment(categories, targetIndustry) {
    const industryKeywords = targetIndustry.toLowerCase().split(/[\s&]+/);
    let alignment = 0;

    for (const category of categories) {
      const categoryLower = category.toLowerCase();
      for (const keyword of industryKeywords) {
        if (
          categoryLower.includes(keyword) ||
          keyword.includes(categoryLower)
        ) {
          alignment += 1;
        }
      }
    }

    return Math.min(alignment, 2.0); // Cap the score
  }

  calculateAudienceAlignment(description, targetAudience) {
    const audienceKeywords = {
      "individual consumers": [
        "consumer",
        "user",
        "personal",
        "individual",
        "people",
      ],
      "small & medium businesses": [
        "business",
        "company",
        "entrepreneur",
        "startup",
        "smb",
      ],
      enterprise: ["enterprise", "corporate", "organization", "large company"],
      healthcare: ["healthcare", "medical", "doctor", "patient", "clinical"],
      educational: ["education", "student", "teacher", "academic", "school"],
    };

    const descLower = description.toLowerCase();
    const audienceLower = targetAudience.toLowerCase();

    let maxAlignment = 0;
    for (const [audienceType, keywords] of Object.entries(audienceKeywords)) {
      if (audienceLower.includes(audienceType.split(" ")[0])) {
        const keywordMatches = keywords.filter((keyword) =>
          descLower.includes(keyword)
        ).length;
        maxAlignment = Math.max(maxAlignment, keywordMatches * 0.5);
      }
    }

    return maxAlignment;
  }

  calculateTechnologyOverlap(description, technologyStack) {
    const descLower = description.toLowerCase();
    let overlap = 0;

    for (const tech of technologyStack) {
      const techKeywords = tech.toLowerCase().split(/[\s/&]+/);
      for (const keyword of techKeywords) {
        if (descLower.includes(keyword)) {
          overlap += 0.5;
        }
      }
    }

    return Math.min(overlap, 2.0);
  }

  calculateSemanticMatch(description, semanticKeywords) {
    const descLower = description.toLowerCase();
    const matches = semanticKeywords.filter((keyword) =>
      descLower.includes(keyword.toLowerCase())
    ).length;

    return matches * 0.3;
  }

  calculateBusinessModelMatch(description, businessModel) {
    const modelKeywords = {
      saas: ["saas", "subscription", "software", "service", "platform"],
      marketplace: ["marketplace", "platform", "connects", "network"],
      ecommerce: ["ecommerce", "retail", "store", "shop", "selling"],
      freemium: ["free", "premium", "freemium", "tier"],
      advertising: ["advertising", "ads", "sponsored", "monetize"],
    };

    const descLower = description.toLowerCase();
    const modelLower = businessModel.toLowerCase();

    for (const [model, keywords] of Object.entries(modelKeywords)) {
      if (modelLower.includes(model)) {
        const keywordMatches = keywords.filter((keyword) =>
          descLower.includes(keyword)
        ).length;
        if (keywordMatches > 0) return keywordMatches * 0.4;
      }
    }

    return 0;
  }

  calculateProblemAlignment(description, problem) {
    const problemKeywords = problem
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const descLower = description.toLowerCase();
    const matches = problemKeywords.filter((keyword) =>
      descLower.includes(keyword)
    ).length;

    return matches * 0.3;
  }

  applySemanticFiltering(startups, intent) {
    // Filter out startups that are clearly not relevant
    return startups.filter((startup) => {
      // Must have minimum relevance score
      if (startup.relevanceScore < 1.5) return false;

      // Industry blacklist for specific cases
      if (this.isIndustryMismatch(startup, intent)) return false;

      return true;
    });
  }

  isIndustryMismatch(startup, intent) {
    // Define clear industry mismatches
    const mismatches = {
      "Fashion & Beauty": ["finance", "banking", "healthcare", "medical"],
      "Healthcare & Medical": ["fashion", "gaming", "entertainment"],
      "Financial Technology": ["healthcare", "fashion", "food", "gaming"],
    };

    const targetIndustry = intent.targetIndustry;
    if (mismatches[targetIndustry] && startup.categories) {
      const startupCategories = startup.categories.join(" ").toLowerCase();
      return mismatches[targetIndustry].some((forbidden) =>
        startupCategories.includes(forbidden)
      );
    }

    return false;
  }

  // Step 2b: Calculate Uniqueness Score
  scoreUniqueness(intent, similarStartups) {
    let uniquenessScore = 90; // Start high

    // Reduce score based on number of similar startups
    const directCompetitors = similarStartups.filter(
      (s) => s.relevanceScore > 3.0
    );
    uniquenessScore -= directCompetitors.length * 15;

    // Reduce score based on market saturation indicators
    const commonIndustries = ["SaaS", "Mobile App", "E-commerce", "Social"];
    if (
      commonIndustries.some((industry) =>
        intent.targetIndustry.includes(industry)
      )
    ) {
      uniquenessScore -= 10;
    }

    // Bonus for emerging tech
    const emergingTech = ["AI", "Blockchain", "AR/VR", "IoT"];
    if (
      intent.technologyStack.some((tech) =>
        emergingTech.some((emerging) => tech.includes(emerging))
      )
    ) {
      uniquenessScore += 10;
    }

    return Math.max(Math.min(uniquenessScore, 100), 10);
  }

  // Step 2c: Enhanced Domain-Specific Investor Recommendations
  recommendInvestors(intent, similarStartupsData) {
    const similarStartups = similarStartupsData.startups || similarStartupsData;

    // Get comprehensive investor database
    const investorDatabase = this.getEnhancedInvestorDatabase();

    // Score investors based on multiple factors
    const scoredInvestors = this.scoreInvestorsForIntent(
      investorDatabase,
      intent,
      similarStartups
    );

    // Add investors from similar startup patterns
    const patternInvestors = this.extractInvestorsFromSimilarStartups(
      similarStartups,
      intent
    );

    // Combine and deduplicate
    const allInvestors = [...scoredInvestors, ...patternInvestors];
    const uniqueInvestors = this.deduplicateInvestors(allInvestors);

    // Final ranking and selection
    return uniqueInvestors.slice(0, 5);
  }

  getEnhancedInvestorDatabase() {
    return {
      "AI & Machine Learning": [
        {
          name: "Andreessen Horowitz (a16z)",
          focus: "AI & Deep Tech",
          tickets: "$1M-$50M",
          portfolio: ["OpenAI", "Instacart", "Clubhouse", "Databricks"],
          stage: ["Seed", "Series A", "Series B"],
          expertise: ["AI/ML", "Enterprise Software", "Consumer Tech"],
          score: 0,
        },
        {
          name: "GV (Google Ventures)",
          focus: "AI & Machine Learning",
          tickets: "$500K-$25M",
          portfolio: ["DeepMind", "Uber", "Slack", "Nest"],
          stage: ["Seed", "Series A"],
          expertise: ["AI/ML", "Hardware", "Enterprise"],
          score: 0,
        },
        {
          name: "Intel Capital",
          focus: "AI Hardware & Software",
          tickets: "$250K-$10M",
          portfolio: ["SigOpt", "Nervana", "Movidius"],
          stage: ["Series A", "Series B"],
          expertise: ["AI/ML", "Hardware", "IoT"],
          score: 0,
        },
      ],
      "Healthcare & Medical": [
        {
          name: "Andreessen Horowitz Bio Fund",
          focus: "Digital Health & Biotech",
          tickets: "$1M-$25M",
          portfolio: ["Oscar Health", "23andMe", "Heal", "Devoted Health"],
          stage: ["Series A", "Series B"],
          expertise: ["Digital Health", "Biotech", "Medical Devices"],
          score: 0,
        },
        {
          name: "GV (Google Ventures)",
          focus: "Healthcare Innovation",
          tickets: "$500K-$15M",
          portfolio: ["Flatiron Health", "Foundation Medicine", "Livongo"],
          stage: ["Seed", "Series A"],
          expertise: ["Digital Health", "Medical Technology"],
          score: 0,
        },
        {
          name: "Bessemer Venture Partners",
          focus: "Healthcare IT & Digital Health",
          tickets: "$2M-$20M",
          portfolio: ["Veracyte", "MindMaze", "Doctor on Demand"],
          stage: ["Series A", "Series B", "Growth"],
          expertise: ["Healthcare IT", "Medical Software"],
          score: 0,
        },
      ],
      "Financial Technology": [
        {
          name: "Ribbit Capital",
          focus: "FinTech & Financial Services",
          tickets: "$500K-$50M",
          portfolio: ["Robinhood", "Credit Karma", "Coinbase", "Revolut"],
          stage: ["Seed", "Series A", "Series B", "Growth"],
          expertise: ["FinTech", "Digital Banking", "Crypto"],
          score: 0,
        },
        {
          name: "QED Investors",
          focus: "FinTech Innovation",
          tickets: "$1M-$25M",
          portfolio: ["Credit Karma", "SoFi", "ClearScore", "Nubank"],
          stage: ["Series A", "Series B"],
          expertise: ["Digital Banking", "Lending", "Payments"],
          score: 0,
        },
        {
          name: "Anthemis Group",
          focus: "Financial Innovation",
          tickets: "$250K-$10M",
          portfolio: ["Betterment", "Trov", "Simple", "MetroMile"],
          stage: ["Seed", "Series A"],
          expertise: ["InsurTech", "WealthTech", "Digital Banking"],
          score: 0,
        },
      ],
      "Education Technology": [
        {
          name: "Reach Capital",
          focus: "Education Technology",
          tickets: "$500K-$15M",
          portfolio: ["ClassDojo", "Newsela", "Remind", "Outschool"],
          stage: ["Seed", "Series A", "Series B"],
          expertise: [
            "K-12 Education",
            "Higher Education",
            "Corporate Training",
          ],
          score: 0,
        },
        {
          name: "NewSchools Venture Fund",
          focus: "Education Innovation",
          tickets: "$250K-$5M",
          portfolio: ["DreamBox", "Schoology", "Khan Academy"],
          stage: ["Seed", "Series A"],
          expertise: ["K-12 EdTech", "Learning Platforms"],
          score: 0,
        },
        {
          name: "GSV Ventures",
          focus: "Digital Learning & Workforce",
          tickets: "$1M-$20M",
          portfolio: ["Coursera", "MindTap", "Declara", "Degreed"],
          stage: ["Series A", "Series B", "Growth"],
          expertise: ["Corporate Learning", "Higher Education"],
          score: 0,
        },
      ],
      "E-commerce & Retail": [
        {
          name: "Bessemer Venture Partners",
          focus: "E-commerce & Marketplaces",
          tickets: "$2M-$25M",
          portfolio: ["Shopify", "PinPoint", "SendGrid", "Twilio"],
          stage: ["Series A", "Series B", "Growth"],
          expertise: ["E-commerce", "Marketplaces", "B2B Software"],
          score: 0,
        },
        {
          name: "Forerunner Ventures",
          focus: "E-commerce Brands & Platforms",
          tickets: "$500K-$10M",
          portfolio: ["Warby Parker", "Glossier", "Dollar Shave Club", "Hims"],
          stage: ["Seed", "Series A"],
          expertise: ["D2C Brands", "Consumer Products", "Retail Tech"],
          score: 0,
        },
        {
          name: "FirstMark Capital",
          focus: "E-commerce Innovation",
          tickets: "$1M-$15M",
          portfolio: ["Pinterest", "Shopify", "Airbnb", "Upwork"],
          stage: ["Series A", "Series B"],
          expertise: ["Marketplaces", "Consumer Internet", "B2B SaaS"],
          score: 0,
        },
      ],
      "Fashion & Beauty": [
        {
          name: "Forerunner Ventures",
          focus: "Fashion & Beauty Innovation",
          tickets: "$500K-$10M",
          portfolio: ["Glossier", "Warby Parker", "Bonobos", "Outdoor Voices"],
          stage: ["Seed", "Series A"],
          expertise: ["D2C Fashion", "Beauty Tech", "Retail Innovation"],
          score: 0,
        },
        {
          name: "Slow Ventures",
          focus: "Consumer & Lifestyle",
          tickets: "$250K-$5M",
          portfolio: ["Casper", "Outdoor Voices", "Parachute"],
          stage: ["Seed", "Series A"],
          expertise: ["Consumer Brands", "Lifestyle", "Fashion"],
          score: 0,
        },
      ],
      Default: [
        {
          name: "Sequoia Capital",
          focus: "Technology Startups",
          tickets: "$1M-$25M",
          portfolio: ["Apple", "Google", "WhatsApp", "Zoom"],
          stage: ["Series A", "Series B", "Growth"],
          expertise: ["Enterprise Software", "Consumer Internet", "Mobile"],
          score: 0,
        },
        {
          name: "First Round Capital",
          focus: "Early-stage Technology",
          tickets: "$250K-$10M",
          portfolio: ["Uber", "Square", "Warby Parker", "Notion"],
          stage: ["Seed", "Series A"],
          expertise: ["B2B SaaS", "Consumer Apps", "Marketplaces"],
          score: 0,
        },
        {
          name: "Techstars",
          focus: "Accelerator Program",
          tickets: "$20K-$250K",
          portfolio: ["SendGrid", "ClassPass", "PillPack", "DigitalOcean"],
          stage: ["Pre-Seed", "Seed"],
          expertise: ["Early Stage", "Mentorship", "Network"],
          score: 0,
        },
      ],
    };
  }

  scoreInvestorsForIntent(investorDatabase, intent, similarStartups) {
    const relevantInvestors =
      investorDatabase[intent.targetIndustry] || investorDatabase["Default"];

    return relevantInvestors
      .map((investor) => {
        let score = 1.0;

        // Industry focus alignment
        if (
          investor.focus
            .toLowerCase()
            .includes(intent.targetIndustry.toLowerCase().split(" ")[0])
        ) {
          score += 3.0;
        }

        // Technology stack alignment
        for (const tech of intent.technologyStack) {
          if (
            investor.expertise.some((exp) =>
              exp.toLowerCase().includes(tech.toLowerCase().split(" ")[0])
            )
          ) {
            score += 1.5;
          }
        }

        // Business model alignment
        const businessModelKeywords = {
          saas: ["software", "b2b", "enterprise"],
          marketplace: ["marketplace", "platform", "network"],
          ecommerce: ["retail", "consumer", "brands"],
          consumer: ["consumer", "lifestyle", "mobile"],
        };

        const modelLower = intent.businessModel.toLowerCase();
        for (const [model, keywords] of Object.entries(businessModelKeywords)) {
          if (modelLower.includes(model)) {
            const expertiseMatch = investor.expertise.some((exp) =>
              keywords.some((keyword) => exp.toLowerCase().includes(keyword))
            );
            if (expertiseMatch) score += 2.0;
          }
        }

        // Portfolio company similarity
        if (similarStartups.length > 0) {
          const portfolioRelevance = this.calculatePortfolioRelevance(
            investor.portfolio,
            similarStartups
          );
          score += portfolioRelevance;
        }

        // Business complexity and stage alignment
        const complexityMatch = this.getStageComplexityMatch(
          intent.businessComplexity,
          investor.stage
        );
        score += complexityMatch;

        return {
          ...investor,
          relevanceScore: score,
          matchReasons: this.generateMatchReasons(investor, intent, score),
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  calculatePortfolioRelevance(portfolio, similarStartups) {
    let relevance = 0;
    const similarNames = similarStartups.map((s) => s.name.toLowerCase());

    for (const portfolioCompany of portfolio) {
      if (
        similarNames.some(
          (name) =>
            name.includes(portfolioCompany.toLowerCase()) ||
            portfolioCompany.toLowerCase().includes(name)
        )
      ) {
        relevance += 1.0;
      }
    }

    return Math.min(relevance, 2.0); // Cap the bonus
  }

  getStageComplexityMatch(businessComplexity, investorStages) {
    const stageComplexityMap = {
      1: ["Pre-Seed", "Seed"], // Low complexity
      2: ["Seed", "Series A"], // Medium complexity
      3: ["Series A", "Series B"], // High complexity
    };

    const idealStages = stageComplexityMap[businessComplexity] || [
      "Seed",
      "Series A",
    ];
    const stageMatch = investorStages.some((stage) =>
      idealStages.includes(stage)
    );

    return stageMatch ? 1.0 : 0.0;
  }

  generateMatchReasons(investor, intent, score) {
    const reasons = [];

    if (score >= 5.0) {
      reasons.push(`Strong focus on ${intent.targetIndustry}`);
    }
    if (
      intent.technologyStack.some((tech) =>
        investor.expertise.some((exp) =>
          exp.toLowerCase().includes(tech.toLowerCase().split(" ")[0])
        )
      )
    ) {
      reasons.push(`Expertise in ${intent.technologyStack[0]}`);
    }
    if (investor.portfolio.length > 3) {
      reasons.push(`Extensive portfolio in related sectors`);
    }

    return reasons.slice(0, 2);
  }

  extractInvestorsFromSimilarStartups(similarStartups, intent) {
    const patternInvestors = [];

    // Generate hypothetical investors based on successful similar startups
    if (similarStartups.length > 0) {
      const topStartup = similarStartups[0];
      patternInvestors.push({
        name: `${topStartup.name} Investor Network`,
        focus: intent.targetIndustry,
        tickets: "Series A-B Range",
        portfolio: [topStartup.name, "Similar Portfolio"],
        stage: ["Series A", "Series B"],
        expertise: [intent.targetIndustry],
        relevanceScore: 2.5,
        matchReasons: [`Successfully invested in ${topStartup.name}`],
        isPattern: true,
      });
    }

    return patternInvestors;
  }

  deduplicateInvestors(investors) {
    const seen = new Map();

    for (const investor of investors) {
      const key = investor.name.toLowerCase();
      if (
        !seen.has(key) ||
        investor.relevanceScore > seen.get(key).relevanceScore
      ) {
        seen.set(key, investor);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );
  }

  // Step 2d: Generate Contextual and Compelling Elevator Pitch
  generateElevatorPitch(intent, similarStartupsData, uniquenessScore) {
    const similarStartups = similarStartupsData.startups || similarStartupsData;

    // Analyze competitive landscape for positioning
    const competitiveContext = this.analyzeCompetitiveContext(
      similarStartups,
      intent
    );

    // Generate pitch components
    const pitchComponents = {
      hook: this.generateHook(intent, uniquenessScore),
      problem: this.articulateProblem(intent),
      solution: this.articulateSolution(intent),
      market: this.articulateMarket(intent),
      differentiation: this.articulateDifferentiation(
        intent,
        competitiveContext
      ),
      traction: this.generateTractionHint(intent),
      ask: this.generateAsk(intent),
    };

    // Combine into compelling narrative
    return this.composePitch(pitchComponents, intent);
  }

  analyzeCompetitiveContext(similarStartups, intent) {
    if (similarStartups.length === 0) {
      return {
        type: "blue_ocean",
        message: "largely untapped market",
        competitors: [],
      };
    }

    const topCompetitors = similarStartups.slice(0, 3);
    const competitorNames = topCompetitors.map((s) => s.name);

    if (similarStartups.length <= 2) {
      return {
        type: "emerging_market",
        message: `emerging market with early players like ${competitorNames.join(
          " and "
        )}`,
        competitors: topCompetitors,
      };
    } else {
      return {
        type: "competitive_market",
        message: `competitive space including ${competitorNames
          .slice(0, 2)
          .join(" and ")}`,
        competitors: topCompetitors,
      };
    }
  }

  generateHook(intent, uniquenessScore) {
    const hooks = {
      high_uniqueness: [
        "We're pioneering a completely new approach to",
        "Imagine if you could revolutionize",
        "What if there was a way to fundamentally change",
      ],
      medium_uniqueness: [
        "We're transforming how people",
        "There's a better way to",
        "We're reimagining",
      ],
      low_uniqueness: [
        "We're building the next generation of",
        "Our mission is to improve",
        "We're creating a smarter way to",
      ],
    };

    const category =
      uniquenessScore > 80
        ? "high_uniqueness"
        : uniquenessScore > 60
        ? "medium_uniqueness"
        : "low_uniqueness";

    const selectedHooks = hooks[category];
    const randomHook =
      selectedHooks[Math.floor(Math.random() * selectedHooks.length)];

    return `${randomHook} ${this.extractCoreFunction(intent)}.`;
  }

  extractCoreFunction(intent) {
    // Extract the core function from the startup concept
    const concept = intent.startup.toLowerCase();

    if (concept.includes("manage") || concept.includes("organize")) {
      return "manage and organize personal assets";
    }
    if (concept.includes("connect") || concept.includes("network")) {
      return "connect people and communities";
    }
    if (concept.includes("automate") || concept.includes("streamline")) {
      return "automate complex workflows";
    }
    if (concept.includes("analyze") || concept.includes("insights")) {
      return "analyze data and generate insights";
    }

    return `solve problems in ${intent.targetIndustry.toLowerCase()}`;
  }

  articulateProblem(intent) {
    if (intent.problem && intent.problem.length > 20) {
      return `The problem: ${intent.problem.toLowerCase()}`;
    }

    // Generate problem statement based on industry
    const industryProblems = {
      "Fashion & Beauty":
        "people struggle to make the most of their wardrobe and personal style",
      "Healthcare & Medical":
        "patients and providers need better tools for health management",
      "Financial Technology":
        "individuals and businesses need smarter financial solutions",
      "Education Technology":
        "learners and educators need more effective learning tools",
    };

    return `The problem: ${
      industryProblems[intent.targetIndustry] ||
      "users face significant challenges in their daily workflows"
    }`;
  }

  articulateSolution(intent) {
    const solutionFramework =
      intent.solution ||
      `using ${intent.technologyStack.join(" and ")} technology`;
    return `Our solution leverages ${solutionFramework} to create an intuitive, powerful platform that ${this.extractCoreFunction(
      intent
    )}`;
  }

  articulateMarket(intent) {
    const marketSizes = {
      "AI & Machine Learning":
        "rapidly growing AI market expected to reach $190B by 2025",
      "Healthcare & Medical":
        "massive healthcare technology market worth over $350B globally",
      "Financial Technology":
        "global fintech market projected to reach $460B by 2025",
      "Fashion & Beauty": "fashion technology market growing at 15% annually",
      "Education Technology": "EdTech market expected to reach $377B by 2028",
    };

    const marketContext =
      marketSizes[intent.targetIndustry] ||
      "large and growing technology market";
    return `We're targeting the ${marketContext}, specifically serving ${intent.targetAudience.toLowerCase()}`;
  }

  articulateDifferentiation(intent, competitiveContext) {
    if (competitiveContext.type === "blue_ocean") {
      return "As first movers in this space, we have the opportunity to define the category and build strong network effects";
    }

    const differentiators = [];

    // Technology differentiation
    if (intent.technologyStack.includes("AI/ML & Data Science")) {
      differentiators.push("advanced AI capabilities");
    }

    // Business model differentiation
    if (intent.businessModel.includes("Marketplace")) {
      differentiators.push("network effects from our marketplace model");
    }

    // Target audience differentiation
    if (intent.targetAudience.includes("Enterprise")) {
      differentiators.push("enterprise-grade security and scalability");
    }

    const diffText =
      differentiators.length > 0
        ? differentiators.join(" and ")
        : "innovative approach and superior user experience";

    return `Unlike ${competitiveContext.competitors
      .map((c) => c.name)
      .slice(0, 2)
      .join(" and ")}, we offer ${diffText}`;
  }

  generateTractionHint(intent) {
    // Generate appropriate traction metrics based on business model
    const tractionHints = {
      SaaS: "early customer validation and strong product-market fit signals",
      Marketplace: "growing supply and demand on both sides of our platform",
      "E-commerce":
        "promising conversion rates and customer acquisition metrics",
      Freemium: "strong user engagement and conversion from free to paid tiers",
    };

    const modelKey =
      Object.keys(tractionHints).find((key) =>
        intent.businessModel.includes(key)
      ) || "SaaS";

    return tractionHints[modelKey];
  }

  generateAsk(intent) {
    const fundingRanges = {
      1: "$250K-$500K seed funding", // Low complexity
      2: "$500K-$2M Series A funding", // Medium complexity
      3: "$1M-$5M Series A funding", // High complexity
    };

    const fundingAsk =
      fundingRanges[intent.businessComplexity] || "$500K-$2M funding";
    return `We're seeking ${fundingAsk} to accelerate product development and market expansion`;
  }

  composePitch(components, intent) {
    // Create a flowing narrative
    const pitch = [
      components.hook,
      components.problem,
      components.solution,
      components.market,
      components.differentiation,
      `Early indicators show ${components.traction}`,
      components.ask,
    ].join(" ");

    return pitch;
  }

  // Step 2e: Enhanced Key Metrics Suggestions with Context
  suggestKeyMetrics(intent) {
    const baseMetrics = [
      "Monthly Active Users (MAU)",
      "Customer Acquisition Cost (CAC)",
      "Customer Lifetime Value (LTV)",
    ];

    // Get industry-specific metrics
    const industryMetrics = this.getIndustrySpecificMetrics(
      intent.targetIndustry
    );

    // Get business model-specific metrics
    const modelMetrics = this.getBusinessModelMetrics(intent.businessModel);

    // Get technology-specific metrics
    const techMetrics = this.getTechnologyMetrics(intent.technologyStack);

    // Combine and prioritize
    const allMetrics = [
      ...baseMetrics,
      ...industryMetrics,
      ...modelMetrics,
      ...techMetrics,
    ];
    const uniqueMetrics = [...new Set(allMetrics)];

    // Return top 7 most relevant metrics
    return uniqueMetrics.slice(0, 7);
  }

  getIndustrySpecificMetrics(industry) {
    const industryMetrics = {
      "AI & Machine Learning": [
        "Model Accuracy Rate (%)",
        "API Response Time (ms)",
        "Training Data Quality Score",
        "Prediction Confidence Level",
      ],
      "Healthcare & Medical": [
        "Patient Engagement Rate (%)",
        "Health Outcome Improvements",
        "Provider Adoption Rate (%)",
        "Clinical Efficiency Gains",
        "Compliance Score (%)",
      ],
      "Financial Technology": [
        "Transaction Volume ($)",
        "Average Transaction Value",
        "Fraud Detection Rate (%)",
        "Regulatory Compliance Score",
        "Financial Risk Score",
      ],
      "Education Technology": [
        "Course Completion Rate (%)",
        "Learning Outcome Score",
        "Student Engagement Time",
        "Knowledge Retention Rate (%)",
      ],
      "E-commerce & Retail": [
        "Conversion Rate (%)",
        "Average Order Value (AOV)",
        "Cart Abandonment Rate (%)",
        "Inventory Turnover Rate",
      ],
      "Fashion & Beauty": [
        "Style Match Accuracy (%)",
        "Wardrobe Utilization Rate",
        "Purchase Recommendation CTR",
        "Outfit Engagement Score",
      ],
    };

    return industryMetrics[industry] || [];
  }

  getBusinessModelMetrics(businessModel) {
    const modelMetrics = {
      SaaS: [
        "Monthly Recurring Revenue (MRR)",
        "Annual Recurring Revenue (ARR)",
        "Churn Rate (%)",
        "Net Revenue Retention (%)",
      ],
      Marketplace: [
        "Gross Merchandise Value (GMV)",
        "Take Rate (%)",
        "Vendor Retention Rate (%)",
        "Marketplace Liquidity",
      ],
      "E-commerce": [
        "Revenue per Visitor",
        "Return Customer Rate (%)",
        "Product Return Rate (%)",
      ],
      Freemium: [
        "Free-to-Paid Conversion Rate (%)",
        "Feature Adoption Rate (%)",
        "Premium User Engagement",
      ],
    };

    const modelKey = Object.keys(modelMetrics).find((key) =>
      businessModel.includes(key)
    );

    return modelKey ? modelMetrics[modelKey] : [];
  }

  getTechnologyMetrics(techStack) {
    const techMetrics = [];

    if (techStack.includes("AI/ML & Data Science")) {
      techMetrics.push("AI Model Performance Score", "Data Processing Speed");
    }
    if (techStack.includes("Mobile Development")) {
      techMetrics.push("App Store Rating", "Mobile Session Duration");
    }
    if (techStack.includes("Web Technologies")) {
      techMetrics.push("Page Load Speed (ms)", "Web Conversion Rate (%)");
    }

    return techMetrics;
  }

  // Enhanced Main Analysis Pipeline with Deep Insights
  async analyzeStartupIdea(userPrompt) {
    console.log(`🧠 Starting enhanced intelligent RAG analysis...`);
    const startTime = Date.now();

    // Step 1: Enhanced Intent Extraction
    const intent = this.extractIntent(userPrompt);
    console.log(
      `🎯 Enhanced Intent Analysis:`,
      JSON.stringify(intent, null, 2)
    );

    if (intent.isVague) {
      return {
        needsClarification: true,
        questions: intent.clarificationQuestions,
        suggestion:
          "Please provide more details about your startup idea to get comprehensive, personalized analysis.",
        analysisType: "clarification_needed",
      };
    }

    // Step 2: Enhanced Multi-Strategy Startup Discovery
    console.log(`🔍 Executing multi-strategy startup discovery...`);
    const similarStartupsResult = await this.findSimilarStartups(intent);
    console.log(
      `📊 Discovery Results: ${similarStartupsResult.startups.length} startups found using ${similarStartupsResult.metadata.totalQueries} search strategies`
    );

    // Step 3: Advanced Uniqueness Scoring
    const uniquenessAnalysis = this.calculateAdvancedUniqueness(
      intent,
      similarStartupsResult
    );
    console.log(
      `⭐ Uniqueness Score: ${uniquenessAnalysis.score}% (${uniquenessAnalysis.category})`
    );

    // Step 4: Intelligent Investor Matching
    console.log(`💰 Matching with domain-specific investors...`);
    const investors = this.recommendInvestors(intent, similarStartupsResult);
    console.log(
      `🎯 Found ${
        investors.length
      } relevant investors with average relevance: ${(
        investors.reduce((sum, inv) => sum + inv.relevanceScore, 0) /
        investors.length
      ).toFixed(1)}`
    );

    // Step 5: Contextual Elevator Pitch Generation
    const elevatorPitch = this.generateElevatorPitch(
      intent,
      similarStartupsResult,
      uniquenessAnalysis.score
    );

    // Step 6: Strategic Key Metrics
    const keyMetrics = this.suggestKeyMetrics(intent);

    // Step 7: Market Intelligence Summary
    const marketIntelligence = this.generateMarketIntelligence(
      intent,
      similarStartupsResult,
      uniquenessAnalysis
    );

    const processingTime = Date.now() - startTime;
    console.log(
      `✅ Enhanced analysis completed in ${processingTime}ms - ${similarStartupsResult.startups.length} similar startups analyzed`
    );

    return {
      needsClarification: false,
      intent,
      similarStartups: similarStartupsResult.startups,
      uniquenessScore: uniquenessAnalysis.score,
      uniquenessAnalysis,
      investors,
      elevatorPitch,
      keyMetrics,
      marketIntelligence,
      analysis: {
        marketSaturation: Math.max(100 - uniquenessAnalysis.score, 0),
        competitorCount: similarStartupsResult.startups.length,
        confidenceLevel: intent.confidence,
        processingTime,
        searchMetadata: similarStartupsResult.metadata,
        analysisDepth: "comprehensive",
      },
    };
  }

  // Advanced uniqueness calculation with multiple factors
  calculateAdvancedUniqueness(intent, similarStartupsResult) {
    let uniquenessScore = 85; // Start with base high score
    const factors = [];

    // Factor 1: Direct competitor density
    const directCompetitors = similarStartupsResult.startups.filter(
      (s) => s.relevanceScore > 4.0
    );
    const competitorPenalty = Math.min(directCompetitors.length * 12, 40);
    uniquenessScore -= competitorPenalty;
    if (competitorPenalty > 0) {
      factors.push(
        `${directCompetitors.length} direct competitors (-${competitorPenalty})`
      );
    }

    // Factor 2: Market saturation by industry
    const industryMaturity = this.getIndustryMaturityScore(
      intent.targetIndustry
    );
    uniquenessScore -= industryMaturity;
    factors.push(`Industry maturity (-${industryMaturity})`);

    // Factor 3: Technology novelty bonus
    const techNoveltBonus = this.calculateTechnologyNoveltyBonus(
      intent.technologyStack
    );
    uniquenessScore += techNoveltBonus;
    if (techNoveltBonus > 0) {
      factors.push(`Technology innovation (+${techNoveltBonus})`);
    }

    // Factor 4: Business model innovation
    const modelInnovation = this.calculateBusinessModelInnovation(
      intent.businessModel,
      intent.targetIndustry
    );
    uniquenessScore += modelInnovation;
    if (modelInnovation > 0) {
      factors.push(`Business model innovation (+${modelInnovation})`);
    }

    // Factor 5: Target audience specificity
    const audienceSpecificity = this.calculateAudienceSpecificityBonus(
      intent.targetAudience
    );
    uniquenessScore += audienceSpecificity;
    if (audienceSpecificity > 0) {
      factors.push(`Audience specificity (+${audienceSpecificity})`);
    }

    // Ensure score stays within bounds
    const finalScore = Math.max(Math.min(uniquenessScore, 95), 15);

    // Categorize uniqueness
    let category;
    if (finalScore >= 80) category = "Highly Unique";
    else if (finalScore >= 60) category = "Moderately Unique";
    else if (finalScore >= 40) category = "Somewhat Unique";
    else category = "Highly Competitive";

    return {
      score: finalScore,
      category,
      factors,
      breakdown: {
        baseScore: 85,
        competitorPenalty: -competitorPenalty,
        industryMaturity: -industryMaturity,
        technologyBonus: techNoveltBonus,
        modelInnovation,
        audienceSpecificity,
      },
    };
  }

  getIndustryMaturityScore(industry) {
    const maturityScores = {
      "AI & Machine Learning": 15, // Emerging but competitive
      "Healthcare & Medical": 10, // Regulated but innovative
      "Financial Technology": 20, // Very competitive
      "Education Technology": 15, // Competitive but evolving
      "E-commerce & Retail": 25, // Highly mature
      "Fashion & Beauty": 20, // Mature but room for innovation
      "Social & Communication": 25, // Very mature
      "Transportation & Logistics": 15, // Evolving with tech
    };

    return maturityScores[industry] || 15;
  }

  calculateTechnologyNoveltyBonus(techStack) {
    let bonus = 0;
    const noveltyScores = {
      "AI/ML & Data Science": 8,
      "Blockchain & Crypto": 10,
      "AR/VR & Immersive": 12,
      "IoT & Hardware": 6,
      "Web Technologies": 2,
      "Mobile Development": 3,
    };

    for (const tech of techStack) {
      bonus += noveltyScores[tech] || 0;
    }

    return Math.min(bonus, 15); // Cap the bonus
  }

  calculateBusinessModelInnovation(businessModel, industry) {
    // Bonus for innovative model-industry combinations
    const innovativeCombinations = {
      "Marketplace & Platform": [
        "Healthcare & Medical",
        "Education Technology",
      ],
      "Freemium & Premium": ["AI & Machine Learning", "Productivity & Tools"],
      SaaS: ["Fashion & Beauty", "Real Estate & Property"],
    };

    for (const [model, industries] of Object.entries(innovativeCombinations)) {
      if (
        businessModel.includes(model.split(" ")[0]) &&
        industries.some((ind) => industry.includes(ind.split(" ")[0]))
      ) {
        return 8;
      }
    }

    return 0;
  }

  calculateAudienceSpecificityBonus(targetAudience) {
    const specificityScores = {
      "Healthcare Professionals": 8,
      "Technology Professionals": 6,
      "Creative Professionals": 6,
      "Educational Institutions": 7,
      "Small & Medium Businesses": 5,
      "Individual Consumers": 2,
      Enterprise: 4,
    };

    return specificityScores[targetAudience] || 0;
  }

  generateMarketIntelligence(
    intent,
    similarStartupsResult,
    uniquenessAnalysis
  ) {
    return {
      marketLandscape: this.analyzeMarketLandscape(
        similarStartupsResult.startups,
        intent
      ),
      competitivePositioning: this.suggestCompetitivePositioning(
        intent,
        uniquenessAnalysis
      ),
      marketOpportunities: this.identifyMarketOpportunities(
        intent,
        similarStartupsResult
      ),
      riskFactors: this.identifyRiskFactors(intent, similarStartupsResult),
      goToMarketSuggestions: this.generateGoToMarketSuggestions(intent),
    };
  }

  analyzeMarketLandscape(similarStartups, intent) {
    if (similarStartups.length === 0) {
      return "Blue ocean opportunity with no direct competitors identified. This presents both significant opportunity and risk - you'll need to validate market demand.";
    }

    const topCompetitors = similarStartups.slice(0, 3);
    const avgRelevance =
      topCompetitors.reduce((sum, s) => sum + s.relevanceScore, 0) /
      topCompetitors.length;

    if (avgRelevance > 5.0) {
      return `Highly competitive market with strong players like ${topCompetitors
        .map((s) => s.name)
        .join(
          ", "
        )}. Success will require clear differentiation and superior execution.`;
    } else if (avgRelevance > 3.0) {
      return `Moderately competitive market with emerging players. Good opportunity for a well-differentiated solution.`;
    } else {
      return `Emerging market with indirect competitors. Strong potential for market leadership with proper execution.`;
    }
  }

  suggestCompetitivePositioning(intent, uniquenessAnalysis) {
    if (uniquenessAnalysis.score > 80) {
      return "Position as the category creator and first-mover in this space. Focus on defining the market and building network effects.";
    } else if (uniquenessAnalysis.score > 60) {
      return "Position as the innovative challenger with a differentiated approach. Emphasize your unique value proposition and superior user experience.";
    } else {
      return "Position as the better alternative by focusing on specific customer segments or use cases where you can excel.";
    }
  }

  identifyMarketOpportunities(intent, similarStartupsResult) {
    const opportunities = [];

    // Geographic opportunities
    if (similarStartupsResult.startups.length > 0) {
      opportunities.push("Geographic expansion to underserved markets");
    }

    // Vertical specialization
    opportunities.push(
      `Vertical specialization within ${intent.targetIndustry}`
    );

    // Technology integration
    if (intent.technologyStack.includes("AI/ML & Data Science")) {
      opportunities.push("AI-powered automation and personalization");
    }

    // Business model innovation
    opportunities.push("Alternative business models or pricing strategies");

    return opportunities.slice(0, 3);
  }

  identifyRiskFactors(intent, similarStartupsResult) {
    const risks = [];

    if (similarStartupsResult.startups.length > 5) {
      risks.push(
        "High competition may lead to pricing pressure and customer acquisition challenges"
      );
    }

    if (intent.businessComplexity === 3) {
      risks.push(
        "High technical complexity may require significant capital and talent"
      );
    }

    if (
      intent.targetIndustry.includes("Healthcare") ||
      intent.targetIndustry.includes("Financial")
    ) {
      risks.push(
        "Regulatory compliance requirements may slow development and increase costs"
      );
    }

    if (intent.businessModel.includes("Marketplace")) {
      risks.push(
        "Chicken-and-egg problem requires simultaneous growth of supply and demand"
      );
    }

    return risks.slice(0, 3);
  }

  generateGoToMarketSuggestions(intent) {
    const suggestions = [];

    // Channel suggestions based on audience
    if (intent.targetAudience.includes("Individual Consumers")) {
      suggestions.push(
        "Digital marketing, social media, and influencer partnerships"
      );
    } else if (intent.targetAudience.includes("Enterprise")) {
      suggestions.push(
        "Direct sales, partner channels, and industry conferences"
      );
    } else {
      suggestions.push(
        "Content marketing, community building, and referral programs"
      );
    }

    // Timing suggestions
    suggestions.push(
      "Start with a focused MVP and iterate based on user feedback"
    );

    // Partnership suggestions
    suggestions.push(
      `Strategic partnerships with established players in ${intent.targetIndustry}`
    );

    return suggestions;
  }
}

// Enhanced structured validation endpoint with RAG Agent
app.post("/api/validate-startup", async (req, res) => {
  try {
    const { idea } = req.body;

    if (!idea) {
      return res.status(400).json({ error: "Startup idea is required" });
    }

    console.log(`\n🎯 === INTELLIGENT STARTUP ANALYSIS ===`);
    console.log(`💡 Idea: "${idea}"`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    // Initialize RAG Agent
    const ragAgent = new IntelligentRAGAgent(startupData, ragService);

    // Perform intelligent analysis
    const analysis = await ragAgent.analyzeStartupIdea(idea);

    if (analysis.needsClarification) {
      console.log(`❓ Idea needs clarification - returning questions`);
      return res.json({
        needsClarification: true,
        questions: analysis.questions,
        suggestion: analysis.suggestion,
      });
    }

    if (analysis.needsClarification) {
      console.log(`❓ Idea needs clarification - returning questions`);
      return res.json({
        needsClarification: true,
        questions: analysis.questions,
        suggestion: analysis.suggestion,
      });
    }

    // Extract results from enhanced RAG analysis
    const {
      intent,
      similarStartups,
      uniquenessScore,
      uniquenessAnalysis,
      investors,
      elevatorPitch,
      keyMetrics,
      marketIntelligence,
      analysis: analysisData,
    } = analysis;

    // Format similar startups with enhanced data
    const formattedSimilarStartups = similarStartups.map((startup, index) => ({
      name: startup.name,
      description: startup.description,
      funding: startup.funding || "Unknown",
      stage: startup.batch || startup.source || "Unknown stage",
      similarity: Math.max(85 - index * 8, 25),
      url: startup.website,
      relevanceScore: startup.relevanceScore || 0,
      discoveryStrategies: startup.discoveryStrategies || [],
      categories: startup.categories || [],
    }));

    // Format investors with enhanced information
    const formattedInvestors = investors.map((investor) => ({
      name: investor.name,
      firm: investor.name,
      focus: investor.focus,
      tickets: investor.tickets,
      portfolio: investor.portfolio,
      relevanceScore: investor.relevanceScore || 0,
      matchReasons: investor.matchReasons || [],
      expertise: investor.expertise || [],
      stage: investor.stage || [],
    }));

    // Generate enhanced SWOT analysis using RAG insights
    const swotAnalysis = generateEnhancedSWOT(
      intent,
      similarStartups,
      uniquenessScore
    );

    // Create comprehensive structured response
    const response = {
      idea,
      uniquenessScore,
      uniquenessAnalysis,
      marketSaturation: analysisData.marketSaturation,
      similarStartups: formattedSimilarStartups,
      investors: formattedInvestors,
      pitchData: {
        elevatorPitch,
        swot: swotAnalysis,
        keyMetrics,
      },
      marketIntelligence,
      intent: {
        startup: intent.startup,
        problem: intent.problem,
        solution: intent.solution,
        industry: intent.targetIndustry,
        audience: intent.targetAudience,
        businessModel: intent.businessModel,
        technologyStack: intent.technologyStack,
        valueProposition: intent.valueProposition,
        confidence: intent.confidence,
        semanticKeywords: intent.semanticKeywords,
        businessComplexity: intent.businessComplexity,
      },
      metadata: {
        searchStrategy: "enhanced_intelligent_rag_agent",
        totalMatches: similarStartups.length,
        confidence: analysisData.confidenceLevel,
        processingTime: analysisData.processingTime,
        searchMetadata: analysisData.searchMetadata,
        analysisDepth: analysisData.analysisDepth,
        timestamp: new Date().toISOString(),
      },
    };

    // Enhanced logging
    console.log(`\n🎯 INTELLIGENT STARTUP ANALYSIS RESULTS:`);
    console.log(`💡 Idea: "${idea}"`);
    console.log(`🏭 Industry: ${intent.targetIndustry}`);
    console.log(`👥 Target Audience: ${intent.targetAudience}`);
    console.log(`💼 Business Model: ${intent.businessModel}`);
    console.log(`🛠️ Technology Stack: ${intent.technologyStack.join(", ")}`);
    console.log(`⭐ Uniqueness Score: ${uniquenessScore}%`);
    console.log(`📊 Market Saturation: ${analysisData.marketSaturation}%`);
    console.log(
      `🏢 Similar Startups Found: ${formattedSimilarStartups.length}`
    );

    if (formattedSimilarStartups.length > 0) {
      console.log(`\n📋 === TOP SIMILAR STARTUPS ===`);
      formattedSimilarStartups.slice(0, 3).forEach((startup, i) => {
        console.log(
          `   ${i + 1}. ${startup.name} (${startup.similarity}% similar)`
        );
        console.log(`      📝 ${startup.description}`);
        console.log(`      💰 Funding: ${startup.funding}`);
        console.log(
          `      🎯 Relevance Score: ${startup.relevanceScore.toFixed(2)}`
        );
      });
    }

    console.log(`\n💰 RECOMMENDED INVESTORS: ${formattedInvestors.length}`);
    formattedInvestors.forEach((investor, i) => {
      console.log(`   ${i + 1}. ${investor.firm} (${investor.focus})`);
      console.log(`      💵 Ticket Size: ${investor.tickets}`);
      console.log(
        `      📊 Portfolio: ${investor.portfolio.slice(0, 3).join(", ")}`
      );
    });

    console.log(`\n🚀 ELEVATOR PITCH:`);
    console.log(`   "${elevatorPitch}"`);

    console.log(`\n📈 KEY METRICS TO TRACK:`);
    keyMetrics.forEach((metric, i) => {
      console.log(`   ${i + 1}. ${metric}`);
    });

    console.log(
      `\n🎯 Intent Confidence: ${(intent.confidence * 100).toFixed(1)}%`
    );
    console.log(`✅ Intelligent analysis completed successfully!\n`);

    res.json(response);
  } catch (error) {
    console.error("❌ Error in intelligent startup analysis:", error);
    res.status(500).json({
      error: "Internal server error during intelligent analysis",
      details: error.message,
    });
  }
});

// Enhanced SWOT Analysis Generator
function generateEnhancedSWOT(intent, similarStartups, uniquenessScore) {
  const strengths = [
    uniquenessScore > 70
      ? "High market uniqueness with first-mover advantage"
      : "Differentiated approach in established market",
    `Strong technology foundation with ${intent.technologyStack.join(" and ")}`,
    `Clear target market: ${intent.targetAudience}`,
    `Scalable ${intent.businessModel} business model`,
  ];

  const weaknesses = [
    "Early-stage company requiring market validation",
    intent.confidence < 0.7
      ? "Concept needs further refinement and focus"
      : "Limited initial resources for rapid scaling",
    "Need to establish brand recognition and user trust",
    similarStartups.length > 5
      ? "Highly competitive market with established players"
      : "Market education may be required",
  ];

  const opportunities = [
    `Growing ${intent.targetIndustry.toLowerCase()} market trends`,
    similarStartups.length > 0
      ? `Market validation through existing players like ${similarStartups[0].name}`
      : "Untapped market opportunity",
    `Potential partnerships with ${intent.targetAudience.toLowerCase()}`,
    "Emerging technology trends supporting the solution",
  ];

  const threats = [
    similarStartups.length > 3
      ? `Strong competition from ${similarStartups
          .slice(0, 2)
          .map((s) => s.name)
          .join(" and ")}`
      : "Potential entry of larger competitors",
    "Economic uncertainties affecting customer spending",
    `Regulatory changes in ${intent.targetIndustry.toLowerCase()}`,
    "Technology disruption or platform dependency risks",
  ];

  return { strengths, weaknesses, opportunities, threats };
}

// New endpoint for handling clarification questions
app.post("/api/clarify-startup", async (req, res) => {
  try {
    const { originalIdea, answers } = req.body;

    if (!originalIdea || !answers) {
      return res
        .status(400)
        .json({ error: "Original idea and answers are required" });
    }

    console.log(`\n🔍 === PROCESSING CLARIFICATION ===`);
    console.log(`💡 Original Idea: "${originalIdea}"`);
    console.log(`📝 User Answers: ${JSON.stringify(answers, null, 2)}`);

    // Combine original idea with clarification answers
    const enhancedIdea = `${originalIdea}. Additional context: ${Object.values(
      answers
    ).join(". ")}.`;

    // Re-run the analysis with enhanced prompt
    const ragAgent = new IntelligentRAGAgent(startupData, ragService);
    const analysis = await ragAgent.analyzeStartupIdea(enhancedIdea);

    if (analysis.needsClarification) {
      return res.json({
        needsClarification: true,
        questions: analysis.questions,
        suggestion:
          "Please provide more specific details to generate accurate analysis.",
      });
    }

    // Format response similar to main validation endpoint
    const {
      intent,
      similarStartups,
      uniquenessScore,
      investors,
      elevatorPitch,
      keyMetrics,
      analysis: analysisData,
    } = analysis;

    const response = {
      idea: originalIdea,
      enhancedIdea,
      uniquenessScore,
      marketSaturation: analysisData.marketSaturation,
      similarStartups: similarStartups.map((startup, index) => ({
        name: startup.name,
        description: startup.description,
        funding: startup.funding || "Unknown",
        stage: startup.batch || startup.source || "Unknown stage",
        similarity: Math.max(85 - index * 8, 25),
        url: startup.website,
        relevanceScore: startup.relevanceScore || 0,
      })),
      investors: investors.map((investor) => ({
        name:
          investor.name.split(" ")[0] +
          " " +
          (investor.name.split(" ")[1] || ""),
        firm: investor.name,
        focus: investor.focus,
        tickets: investor.tickets,
        portfolio: investor.portfolio,
      })),
      pitchData: {
        elevatorPitch,
        swot: generateEnhancedSWOT(intent, similarStartups, uniquenessScore),
        keyMetrics,
      },
      intent: {
        industry: intent.targetIndustry,
        audience: intent.targetAudience,
        businessModel: intent.businessModel,
        technologyStack: intent.technologyStack,
        confidence: intent.confidence,
      },
      metadata: {
        searchStrategy: "intelligent_rag_agent_clarified",
        totalMatches: similarStartups.length,
        confidence: analysisData.confidenceLevel,
        processingTime: Date.now(),
      },
    };

    console.log(`✅ Clarification analysis completed successfully!`);
    res.json(response);
  } catch (error) {
    console.error("❌ Error in clarification analysis:", error);
    res.status(500).json({
      error: "Internal server error during clarification analysis",
      details: error.message,
    });
  }
});

// Legacy helper functions (kept for backward compatibility)
function calculateUniquenessScore(similarStartups) {
  if (!similarStartups || similarStartups.length === 0) return 92;
  const count = similarStartups.length;
  if (count <= 2) return Math.floor(80 + Math.random() * 15);
  if (count <= 5) return Math.floor(65 + Math.random() * 20);
  if (count <= 10) return Math.floor(45 + Math.random() * 25);
  return Math.floor(20 + Math.random() * 30);
}

function calculateMarketSaturation(similarStartups) {
  if (!similarStartups || similarStartups.length === 0) return 25;
  const count = similarStartups.length;
  if (count <= 2) return Math.floor(20 + Math.random() * 25);
  if (count <= 5) return Math.floor(40 + Math.random() * 25);
  if (count <= 10) return Math.floor(60 + Math.random() * 25);
  return Math.floor(75 + Math.random() * 20);
}

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

// Export for testing
module.exports = { IntelligentRAGAgent };

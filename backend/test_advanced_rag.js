const axios = require("axios");

// Test configuration
const BASE_URL = "http://localhost:5000";
const TEST_IDEA =
  "An AI-powered personal finance advisor that helps users optimize their spending and investment strategies";

// Test helper function
async function testEndpoint(endpoint, data, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`📡 Endpoint: ${endpoint}`);

  try {
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}${endpoint}`, data, {
      timeout: 60000, // 1 minute timeout for AI processing
    });
    const endTime = Date.now();

    console.log(`✅ Success (${endTime - startTime}ms)`);
    console.log(`📊 Response Preview:`);

    // Show a preview of the response
    if (response.data.analysis) {
      console.log(
        `   Analysis: ${response.data.analysis.substring(0, 200)}...`
      );
    }
    if (response.data.similarStartups) {
      console.log(
        `   Found ${response.data.similarStartups.length} similar startups`
      );
    }
    if (response.data.competitors) {
      console.log(`   Found ${response.data.competitors.length} competitors`);
    }
    if (response.data.confidence) {
      console.log(
        `   Confidence: ${(response.data.confidence * 100).toFixed(1)}%`
      );
    }

    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response?.data) {
      console.log(`   Details: ${error.response.data.error}`);
    }
    return null;
  }
}

// Main test function
async function runAdvancedRAGTests() {
  console.log("🚀 Starting Advanced RAG System Tests");
  console.log(`💡 Test Idea: "${TEST_IDEA}"`);

  // Test 1: Idea Differentiation
  await testEndpoint(
    "/api/advanced/idea-differentiation",
    { userIdea: TEST_IDEA },
    "Idea Differentiation Analysis"
  );

  // Test 2: Target Market Analysis
  await testEndpoint(
    "/api/advanced/target-market",
    {
      userIdea: TEST_IDEA,
      options: { industry: "FinTech", userLocation: "United States" },
    },
    "Target Market Suggestions"
  );

  // Test 3: Monetization Strategies
  await testEndpoint(
    "/api/advanced/monetization",
    {
      userIdea: TEST_IDEA,
      options: { targetMarket: "B2C", industry: "FinTech" },
    },
    "Monetization Strategy Analysis"
  );

  // Test 4: Tech Stack Recommendations
  await testEndpoint(
    "/api/advanced/tech-stack",
    {
      userIdea: TEST_IDEA,
      options: { stage: "MVP", budget: "Limited", team_size: "Small" },
    },
    "Tech Stack Recommendations"
  );

  // Test 5: Market Viability Score
  await testEndpoint(
    "/api/advanced/viability-score",
    {
      userIdea: TEST_IDEA,
      options: { industry: "FinTech", timeline: "2025" },
    },
    "Market Viability Analysis"
  );

  // Test 6: Competitor Analysis
  await testEndpoint(
    "/api/advanced/competitors",
    {
      userIdea: TEST_IDEA,
      options: { includeIndirect: true, maxCompetitors: 6 },
    },
    "Competitor Analysis with Links"
  );

  // Test 7: Idea Refinement
  await testEndpoint(
    "/api/advanced/refinement",
    {
      userIdea: TEST_IDEA,
      options: { currentStage: "Idea" },
    },
    "Idea Refinement Suggestions"
  );

  // Test 8: Pitch Draft
  await testEndpoint(
    "/api/advanced/pitch-draft",
    {
      userIdea: TEST_IDEA,
      options: {
        targetMarket: "B2C",
        businessModel: "Freemium",
        teamSize: 2,
        fundingStage: "Pre-seed",
      },
    },
    "Investor Pitch Draft Generation"
  );

  // Test 9: Regional Gaps
  await testEndpoint(
    "/api/advanced/regional-gaps",
    {
      userIdea: TEST_IDEA,
      options: {
        userCountry: "United States",
        userCity: "San Francisco",
        languages: ["English"],
      },
    },
    "Regional Market Gaps Analysis"
  );

  console.log("\n🏁 All individual tests completed!");
  console.log("\n🚀 Running Comprehensive Analysis...");

  // Test 10: Comprehensive Analysis (All-in-One)
  const comprehensiveResult = await testEndpoint(
    "/api/advanced/full-analysis",
    {
      userIdea: TEST_IDEA,
      options: {
        industry: "FinTech",
        targetMarket: "B2C",
        userLocation: "United States",
        stage: "MVP",
        fundingStage: "Pre-seed",
      },
    },
    "Comprehensive Analysis (All Features)"
  );

  if (comprehensiveResult) {
    console.log("\n📈 Comprehensive Analysis Summary:");
    console.log(
      `   Completed Analyses: ${
        comprehensiveResult.summary?.completedAnalyses || 0
      }`
    );
    console.log(
      `   Success Rate: ${comprehensiveResult.summary?.successRate || "N/A"}`
    );

    if (comprehensiveResult.results) {
      console.log("   Available Results:");
      Object.keys(comprehensiveResult.results).forEach((key) => {
        console.log(`   ✓ ${key}`);
      });
    }

    if (comprehensiveResult.errors) {
      console.log("   Errors:");
      Object.entries(comprehensiveResult.errors).forEach(([key, error]) => {
        console.log(`   ❌ ${key}: ${error}`);
      });
    }
  }

  console.log("\n🎉 Advanced RAG System Testing Complete!");
  console.log("\n📋 Next Steps:");
  console.log("   1. Review the API responses above");
  console.log("   2. Check the server logs for detailed processing info");
  console.log("   3. Test with your own startup ideas");
  console.log("   4. Integrate these endpoints into your frontend");
}

// Health check first
async function checkHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log("✅ Server Health Check Passed");
    console.log(`   Startup Count: ${response.data.startupCount}`);
    console.log(`   Data Loaded: ${response.data.dataLoaded}`);
    return true;
  } catch (error) {
    console.log("❌ Server Health Check Failed");
    console.log(`   Error: ${error.message}`);
    console.log("   Make sure the server is running on http://localhost:5000");
    return false;
  }
}

// Run tests
async function main() {
  console.log("🔍 StartwiseAI Advanced RAG System - Test Suite");
  console.log("================================================");

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.log(
      "\n🛑 Cannot proceed with tests. Please start the server first."
    );
    return;
  }

  await runAdvancedRAGTests();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testEndpoint, runAdvancedRAGTests, checkHealth };

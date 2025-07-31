const express = require("express");
const path = require("path");
const { IntelligentRAGAgent } = require("./server.js");
const { EnhancedRAGService } = require("./services/ragService");

// Load startup data
const startupData = [
  ...require(path.join(__dirname, "./startup_scraper/yc_startups.json")),
  ...require(path.join(
    __dirname,
    "./startup_scraper/crunchbase_startups.json"
  )),
];

// Simple test to verify the RAG agent is working correctly
async function testRAGAgent() {
  console.log("🧪 Starting RAG Agent Test...\n");

  // Initialize RAG service
  const ragService = new EnhancedRAGService();
  ragService.startupData = startupData;

  const agent = new IntelligentRAGAgent(startupData, ragService);

  // Test 1: Vague prompt should return clarification questions
  console.log("📝 Test 1: Vague prompt");
  const vagueResult = await agent.analyzeStartupIdea("AI app");
  console.log("Vague result type:", typeof vagueResult);
  console.log("Has needsClarification?", vagueResult.needsClarification);

  // Test 2: Detailed prompt should return full analysis
  console.log("\n📝 Test 2: Detailed prompt");
  const detailedResult = await agent.analyzeStartupIdea(
    "An AI-powered virtual wardrobe assistant that helps users organize their closet, suggest outfits based on weather and occasions, and recommend new purchases to fill gaps in their wardrobe"
  );
  console.log("Detailed result keys:", Object.keys(detailedResult));
  console.log(
    "Similar startups found:",
    detailedResult.similarStartups?.length || 0
  );

  if (detailedResult.similarStartups?.length > 0) {
    console.log(
      "First similar startup:",
      detailedResult.similarStartups[0].name
    );
  }
}

testRAGAgent().catch(console.error);

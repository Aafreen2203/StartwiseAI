// Test script to demonstrate the enhanced RAG agent capabilities

const testIdeas = [
  {
    name: "Vague Prompt",
    idea: "AI app",
  },
  {
    name: "Fashion Tech",
    idea: "An AI-powered virtual wardrobe assistant that helps users organize their closet, suggest outfits based on weather and occasions, and recommend new purchases to fill gaps in their wardrobe using computer vision and machine learning",
  },
  {
    name: "Healthcare SaaS",
    idea: "A B2B SaaS platform for healthcare providers to manage patient scheduling, billing, and electronic health records with automated insurance verification",
  },
  {
    name: "EdTech Platform",
    idea: "A personalized learning platform that uses AI to adapt curriculum based on student learning patterns, helping teachers identify knowledge gaps and recommend targeted interventions for K-12 students",
  },
];

async function testEnhancedRAG() {
  console.log("🧪 Testing Enhanced RAG Agent Capabilities\n");

  for (const test of testIdeas) {
    console.log(`\n📝 Testing: ${test.name}`);
    console.log(`💭 Idea: "${test.idea}"`);
    console.log("=" * 80);

    try {
      const response = await fetch(
        "http://localhost:5000/api/validate-startup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idea: test.idea }),
        }
      );

      const result = await response.json();

      if (result.needsClarification) {
        console.log("❓ CLARIFICATION NEEDED");
        console.log("Questions:", result.questions.slice(0, 3).join(", "));
      } else {
        console.log(`⭐ Uniqueness Score: ${result.uniquenessScore}%`);
        console.log(`🏭 Industry: ${result.intent.industry}`);
        console.log(`👥 Audience: ${result.intent.audience}`);
        console.log(`💼 Business Model: ${result.intent.businessModel}`);
        console.log(
          `🛠️  Technology: ${result.intent.technologyStack.join(", ")}`
        );
        console.log(`🏢 Similar Startups: ${result.similarStartups.length}`);
        if (result.similarStartups.length > 0) {
          console.log(
            `   Top Match: ${result.similarStartups[0].name} (${result.similarStartups[0].similarity}% similar)`
          );
        }
        console.log(`💰 Investors Found: ${result.investors.length}`);
        if (result.investors.length > 0) {
          console.log(
            `   Top Investor: ${result.investors[0].firm} (${result.investors[0].focus})`
          );
        }
        console.log(
          `📊 Key Metrics: ${result.pitchData.keyMetrics
            .slice(0, 3)
            .join(", ")}`
        );

        if (result.marketIntelligence) {
          console.log(`🎯 Market Intelligence Available: Yes`);
        }
      }
    } catch (error) {
      console.error(`❌ Error testing ${test.name}:`, error.message);
    }
  }

  console.log("\n✅ Enhanced RAG Agent testing completed!");
}

// If running in Node.js environment
if (typeof require !== "undefined") {
  const fetch = require("node-fetch");
  testEnhancedRAG().catch(console.error);
} else {
  // If running in browser, just export the function
  window.testEnhancedRAG = testEnhancedRAG;
}

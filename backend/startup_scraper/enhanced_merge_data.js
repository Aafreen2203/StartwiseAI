const fs = require("fs");
const path = require("path");

// Enhanced data merger with deduplication and validation
function mergeStartupData() {
  console.log("🔄 Starting enhanced data merge process...");

  const dataSources = [
    { file: "./yc_startups.json", name: "Y Combinator" },
    { file: "./crunchbase_startups.json", name: "Crunchbase" },
    { file: "./alternative_startups.json", name: "Alternative Sources" },
  ];

  let allStartups = [];
  let sourceStats = {};

  // Load data from all sources
  dataSources.forEach(({ file, name }) => {
    try {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        allStartups = allStartups.concat(data);
        sourceStats[name] = data.length;
        console.log(`✅ Loaded ${data.length} startups from ${name}`);
      } else {
        console.log(`⚠️ ${file} not found, skipping ${name}`);
        sourceStats[name] = 0;
      }
    } catch (error) {
      console.error(`❌ Error loading ${file}:`, error.message);
      sourceStats[name] = 0;
    }
  });

  // Enhanced deduplication
  const uniqueStartups = deduplicateStartups(allStartups);

  // Validate and clean data
  const cleanedStartups = validateAndCleanData(uniqueStartups);

  // Add metadata
  const finalData = cleanedStartups.map((startup) => ({
    ...startup,
    id: generateId(startup.name),
    timestamp: new Date().toISOString(),
    categories: inferCategories(startup.name, startup.description),
  }));

  // Save merged data to multiple locations
  const outputPaths = [
    "./startups.json",
    "../startups.json",
    "../data/startups.json",
  ];

  outputPaths.forEach((outputPath) => {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2));
    } catch (error) {
      console.error(`❌ Error saving to ${outputPath}:`, error.message);
    }
  });

  // Generate report
  const report = {
    totalStartups: finalData.length,
    sourceBreakdown: sourceStats,
    duplicatesRemoved: allStartups.length - uniqueStartups.length,
    invalidRemoved: uniqueStartups.length - cleanedStartups.length,
    categories: getCategoryStats(finalData),
    lastUpdated: new Date().toISOString(),
  };

  fs.writeFileSync("./merge_report.json", JSON.stringify(report, null, 2));

  console.log("📊 Merge Report:");
  console.log(`- Total startups: ${report.totalStartups}`);
  console.log(`- Duplicates removed: ${report.duplicatesRemoved}`);
  console.log(`- Invalid entries removed: ${report.invalidRemoved}`);
  console.log(
    `- Sources: ${Object.entries(sourceStats)
      .map(([k, v]) => `${k} (${v})`)
      .join(", ")}`
  );
  console.log("✅ Enhanced merge completed successfully!");

  return finalData;
}

// Advanced deduplication using multiple matching strategies
function deduplicateStartups(startups) {
  const seen = new Map();
  const duplicates = [];

  const unique = startups.filter((startup) => {
    // Normalize name for comparison
    const normalizedName = startup.name
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Check for exact matches first
    if (seen.has(normalizedName)) {
      duplicates.push({
        original: seen.get(normalizedName),
        duplicate: startup,
      });
      return false;
    }

    // Check for similar names (Levenshtein distance < 3)
    for (const [existingName, existingStartup] of seen.entries()) {
      if (
        calculateLevenshteinDistance(normalizedName, existingName) < 3 &&
        normalizedName.length > 3 &&
        existingName.length > 3
      ) {
        duplicates.push({ original: existingStartup, duplicate: startup });
        return false;
      }
    }

    seen.set(normalizedName, startup);
    return true;
  });

  if (duplicates.length > 0) {
    console.log(`🔍 Found ${duplicates.length} potential duplicates`);
    // Save duplicates report for manual review
    fs.writeFileSync(
      "./duplicates_report.json",
      JSON.stringify(duplicates, null, 2)
    );
  }

  return unique;
}

// Validate and clean startup data
function validateAndCleanData(startups) {
  return startups
    .filter((startup) => {
      // Must have name and description
      if (!startup.name || !startup.description) return false;

      // Name must be reasonable length
      if (startup.name.length < 2 || startup.name.length > 100) return false;

      // Description must be reasonable length
      if (startup.description.length < 10 || startup.description.length > 1000)
        return false;

      // Must have source
      if (!startup.source) return false;

      return true;
    })
    .map((startup) => ({
      ...startup,
      name: startup.name.trim(),
      description: startup.description.trim(),
      source: startup.source.trim(),
    }));
}

// Generate unique ID for each startup
function generateId(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

// Infer categories based on name and description
function inferCategories(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const categories = [];

  const categoryKeywords = {
    "AI/ML": [
      "ai",
      "artificial intelligence",
      "machine learning",
      "neural",
      "deep learning",
      "nlp",
      "computer vision",
    ],
    FinTech: [
      "payment",
      "financial",
      "banking",
      "crypto",
      "blockchain",
      "finance",
      "fintech",
    ],
    HealthTech: [
      "health",
      "medical",
      "healthcare",
      "biotech",
      "pharma",
      "medicine",
    ],
    "E-commerce": [
      "marketplace",
      "e-commerce",
      "ecommerce",
      "retail",
      "shopping",
      "store",
    ],
    SaaS: ["software", "platform", "saas", "service", "management", "tool"],
    EdTech: [
      "education",
      "learning",
      "teaching",
      "school",
      "course",
      "training",
    ],
    Mobility: [
      "transportation",
      "mobility",
      "vehicle",
      "automotive",
      "ride",
      "delivery",
    ],
    DevTools: [
      "developer",
      "development",
      "coding",
      "programming",
      "api",
      "infrastructure",
    ],
    Analytics: [
      "analytics",
      "data",
      "intelligence",
      "insights",
      "metrics",
      "tracking",
    ],
    Social: ["social", "community", "networking", "communication", "messaging"],
    Climate: [
      "climate",
      "sustainability",
      "green",
      "renewable",
      "carbon",
      "environment",
    ],
  };

  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    if (keywords.some((keyword) => text.includes(keyword))) {
      categories.push(category);
    }
  });

  return categories.length > 0 ? categories : ["Other"];
}

// Get category statistics
function getCategoryStats(startups) {
  const stats = {};
  startups.forEach((startup) => {
    startup.categories.forEach((category) => {
      stats[category] = (stats[category] || 0) + 1;
    });
  });
  return stats;
}

// Calculate Levenshtein distance for fuzzy matching
function calculateLevenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Main execution
if (require.main === module) {
  mergeStartupData();
}

module.exports = { mergeStartupData };

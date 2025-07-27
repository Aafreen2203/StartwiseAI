const fs = require("fs");
const path = require("path");

// Enhanced RAG service with hybrid approach
class EnhancedRAGService {
  constructor() {
    this.startupData = [];
    this.intentClassifier = new IntentClassifier();
  }

  // Load startup data with error handling
  loadStartupData() {
    try {
      const dataPath = path.join(__dirname, "..", "startups.json");
      const rawData = fs.readFileSync(dataPath, "utf8");
      this.startupData = JSON.parse(rawData);
      return this.startupData;
    } catch (error) {
      console.error("Error loading startup data:", error);
      return [];
    }
  }

  // Enhanced search with semantic similarity and intent detection
  searchStartups(query, options = {}) {
    const {
      maxResults = 5,
      threshold = 1.0, // Increased from 0.1 to 1.0 for better filtering
      categoryFilter = null,
      sourceFilter = null,
    } = options;

    // Detect query intent with enhanced classification
    const intent = this.intentClassifier.classifyIntent(query);

    // Enhanced handling for non-startup queries
    if (intent.type === "non_startup") {
      return {
        startups: [],
        intent,
        searchStrategy: "hybrid_fallback",
        confidence: intent.confidence,
        reason: "Query not related to startup analysis",
      };
    }

    // Handle impossible/sci-fi queries
    if (intent.type === "impossible") {
      return {
        startups: [],
        intent,
        searchStrategy: "hybrid_fallback",
        confidence: intent.confidence,
        reason: "Query about fictional/impossible technology",
      };
    }

    // Extract keywords with improved processing
    const keywords = this.extractKeywords(query);

    // Score and rank startups
    const scored = this.startupData.map((startup) => {
      let score = this.calculateRelevanceScore(startup, keywords, query);

      // Apply category boost if intent suggests specific category
      if (intent.suggestedCategories && startup.categories) {
        const categoryMatch = intent.suggestedCategories.some((cat) =>
          startup.categories.includes(cat)
        );
        if (categoryMatch) score *= 1.5;
      }

      return { ...startup, score };
    });

    // Enhanced filtering with higher threshold
    let results = scored
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score);

    // Apply filters if specified
    if (categoryFilter) {
      results = results.filter(
        (startup) =>
          startup.categories && startup.categories.includes(categoryFilter)
      );
    }

    if (sourceFilter) {
      results = results.filter((startup) => startup.source === sourceFilter);
    }

    // Enhanced "No Results" handling - route weak matches to hybrid fallback
    if (
      results.length === 0 ||
      (results.length > 0 && results[0].score < 2.0)
    ) {
      // Check if this might be a real startup name that's not in our database
      const possibleStartupName = this.detectPossibleStartupName(query);

      if (possibleStartupName) {
        return {
          startups: [],
          intent: {
            ...intent,
            type: "known_startup_missing",
            detectedCompany: possibleStartupName,
          },
          searchStrategy: "hybrid_fallback",
          confidence: 0.2,
          reason: `"${possibleStartupName}" appears to be a real startup, but it's not in our current database. Our database contains primarily Y Combinator and Crunchbase companies, but may not include all existing startups.`,
          totalMatches: 0,
        };
      }

      return {
        startups: [],
        intent: {
          ...intent,
          type: "startup_related_no_matches",
        },
        searchStrategy: "hybrid_fallback",
        confidence: 0.1,
        reason: `No relevant startups found in database for: "${query}". This appears to be a valid startup-related query, but we don't have data on this specific topic.`,
        totalMatches: 0,
      };
    } // Return top results
    const topResults = results
      .slice(0, maxResults)
      .map(({ score, ...startup }) => startup);

    return {
      startups: topResults,
      intent,
      searchStrategy: "startup_focused",
      totalMatches: results.length,
      confidence: this.calculateSearchConfidence(topResults, query),
    };
  }

  // Detect if query contains a possible real startup name not in our database
  detectPossibleStartupName(query) {
    const queryLower = query.toLowerCase();

    // Common patterns that suggest a specific company name
    const companyIndicators = [
      /^(.+?)\s+startup$/i,
      /^(.+?)\s+company$/i,
      /^(.+?)\s+app$/i,
      /^(.+?)\s+platform$/i,
      /^(.+?)\s+tool$/i,
      /^(.+?)\s+service$/i,
      /what is (.+?)[\s\?]/i,
      /tell me about (.+?)[\s\?]/i,
      /(.+?)\s+funding/i,
      /(.+?)\s+valuation/i,
    ];

    // Known startup name patterns (proper nouns)
    const knownStartupPatterns = [
      // Tech companies that might not be in limited datasets
      /\b(figma|canva|miro|airtable|monday|clickup|todoist)\b/i,
      /\b(zoom|slack|teams|asana|trello|jira)\b/i,
      /\b(shopify|woocommerce|bigcommerce|squarespace)\b/i,
      /\b(twilio|sendgrid|mailchimp|hubspot)\b/i,
      /\b(datadog|newrelic|splunk|elastic)\b/i,
      /\b(vercel|netlify|heroku|digitalocean)\b/i,
      /\b(stripe|square|paypal|klarna)\b/i,
      /\b(spotify|netflix|tiktok|snapchat)\b/i,
      /\b(coinbase|binance|robinhood|revolut)\b/i,
      /\b(instacart|doordash|grubhub|postmates)\b/i,
    ];

    // Check for company indicators first
    for (const pattern of companyIndicators) {
      const match = queryLower.match(pattern);
      if (match && match[1]) {
        const companyName = match[1].trim();
        // Skip if it's too generic
        if (companyName.length > 2 && !this.isGenericTerm(companyName)) {
          return this.formatCompanyName(companyName);
        }
      }
    }

    // Check for known startup patterns
    for (const pattern of knownStartupPatterns) {
      const match = queryLower.match(pattern);
      if (match && match[1]) {
        return this.formatCompanyName(match[1]);
      }
    }

    // Check if query is likely a single company name
    const words = queryLower.replace(/[^\w\s]/g, "").split(/\s+/);
    if (
      words.length === 1 &&
      words[0].length > 3 &&
      !this.isGenericTerm(words[0])
    ) {
      // Could be a company name
      return this.formatCompanyName(words[0]);
    }

    return null;
  }

  // Check if term is too generic to be a company name
  isGenericTerm(term) {
    const genericTerms = [
      "startup",
      "company",
      "business",
      "service",
      "platform",
      "app",
      "tool",
      "software",
      "website",
      "system",
      "solution",
      "product",
      "technology",
      "artificial",
      "intelligence",
      "machine",
      "learning",
      "blockchain",
      "cryptocurrency",
      "fintech",
      "healthtech",
      "edtech",
      "saas",
    ];
    return genericTerms.includes(term.toLowerCase());
  }

  // Format company name properly
  formatCompanyName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  // Extract and normalize keywords
  extractKeywords(query) {
    const stopWords = new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "has",
      "he",
      "in",
      "is",
      "it",
      "its",
      "of",
      "on",
      "that",
      "the",
      "to",
      "was",
      "will",
      "with",
      "about",
      "what",
      "tell",
      "me",
      "show",
    ]);

    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .map((word) => {
        // Handle common variations
        const synonyms = {
          ai: ["artificial intelligence", "machine learning", "ml"],
          fintech: ["financial", "finance", "payment"],
          healthcare: ["health", "medical", "biotech"],
          saas: ["software", "platform", "service"],
        };

        return [word, ...(synonyms[word] || [])];
      })
      .flat();
  }

  // Enhanced relevance scoring with more aggressive filtering
  calculateRelevanceScore(startup, keywords, originalQuery) {
    const name = startup.name.toLowerCase();
    const description = startup.description.toLowerCase();
    const categories = (startup.categories || []).join(" ").toLowerCase();

    let score = 0;
    let exactMatches = 0;
    let relevantKeywordMatches = 0;
    let genericMatches = 0;

    // Define generic terms that shouldn't contribute much to score
    const genericTerms = [
      "startup",
      "company",
      "business",
      "service",
      "platform",
      "software",
      "app",
      "tool",
    ];

    keywords.forEach((keyword) => {
      let keywordFound = false;
      const isGeneric = genericTerms.includes(keyword.toLowerCase());

      // Exact name match (highest weight)
      if (name.includes(keyword)) {
        score += isGeneric ? 2 : 8; // Reduced score for generic terms in name
        exactMatches++;
        keywordFound = true;
      }

      // Name partial match (word boundaries)
      if (name.split(" ").some((word) => word.startsWith(keyword))) {
        score += isGeneric ? 1 : 5; // Reduced score for generic terms
        keywordFound = true;
      }

      // Description exact match
      if (description.includes(keyword)) {
        score += isGeneric ? 0.5 : 3; // Heavily reduced score for generic terms in description
        keywordFound = true;
        if (isGeneric) genericMatches++;
      }

      // Category match (high weight for accurate categorization)
      if (categories.includes(keyword)) {
        score += isGeneric ? 1 : 4;
        keywordFound = true;
      }

      // Fuzzy matching for typos (reduced weight)
      if (
        this.fuzzyMatch(keyword, name) ||
        this.fuzzyMatch(keyword, description)
      ) {
        score += isGeneric ? 0.1 : 0.5;
        keywordFound = true;
      }

      if (keywordFound) {
        relevantKeywordMatches++;
      }
    });

    // Boost for phrase matches (exact query match)
    const originalLower = originalQuery.toLowerCase();
    if (name.includes(originalLower) || description.includes(originalLower)) {
      score += 10; // Increased from 3
      exactMatches++;
    }

    // Heavy penalty for matches that are mostly generic terms
    if (genericMatches > 0 && genericMatches >= keywords.length * 0.7) {
      score *= 0.1; // Massive penalty for mostly generic matches
    }

    // Penalty for matches with very few relevant keywords
    if (keywords.length > 2 && relevantKeywordMatches < keywords.length * 0.3) {
      score *= 0.3; // Significant penalty for weak matches
    }

    // Bonus for multiple exact matches
    if (exactMatches > 1) {
      score *= 1.3;
    }

    // Quality threshold - if no exact matches and score is low, heavily penalize
    if (exactMatches === 0 && score < 2) {
      score *= 0.1; // Make very weak matches nearly impossible to pass threshold
    }

    // Additional penalty for single-word matches against generic descriptions
    if (keywords.length === 1 && exactMatches === 0 && score < 1) {
      score *= 0.05; // Almost eliminate weak single-word matches
    }

    return score;
  }

  // Simple fuzzy matching
  fuzzyMatch(keyword, text) {
    const words = text.split(" ");
    return words.some((word) => {
      if (Math.abs(word.length - keyword.length) > 2) return false;

      let differences = 0;
      const minLength = Math.min(word.length, keyword.length);

      for (let i = 0; i < minLength; i++) {
        if (word[i] !== keyword[i]) differences++;
        if (differences > 1) return false;
      }

      return differences <= 1;
    });
  }

  // Enhanced search confidence calculation
  calculateSearchConfidence(results, query) {
    if (results.length === 0) return 0;

    // Get average score with weighted emphasis on top results
    const scores = results.map((r) => r.score || 0);
    const weightedAvgScore =
      scores.length > 0
        ? (scores[0] * 0.5 + scores.slice(1).reduce((a, b) => a + b, 0) * 0.5) /
          scores.length
        : 0;

    const queryComplexity = query.split(" ").length;
    const maxScore = Math.max(...scores);

    // More aggressive confidence calculation
    let confidence = 0;

    // High confidence for exact matches (score > 8)
    if (maxScore >= 8) {
      confidence = 0.9;
    }
    // Medium confidence for good matches (score 4-8)
    else if (maxScore >= 4) {
      confidence = 0.6 + (maxScore - 4) * 0.075;
    }
    // Low confidence for weak matches (score 1-4)
    else if (maxScore >= 1) {
      confidence = 0.2 + (maxScore - 1) * 0.13;
    }
    // Very low confidence for barely passing matches
    else {
      confidence = maxScore * 0.2;
    }

    // Bonus for multiple good results
    const goodResults = results.filter((r) => (r.score || 0) >= 3).length;
    if (goodResults > 1) {
      confidence += 0.1;
    }

    // Penalty for complex queries with simple matches
    if (queryComplexity > 3 && maxScore < 3) {
      confidence *= 0.5;
    }

    return Math.min(confidence, 1);
  }

  // Enhanced context construction with better formatting
  constructContext(searchResult, query) {
    const { startups, intent, searchStrategy, confidence, reason } =
      searchResult;

    if (searchStrategy === "hybrid_fallback") {
      return this.constructHybridContext(query, intent, reason);
    }

    if (startups.length === 0) {
      return this.constructNoResultsContext(query, intent, reason);
    }

    // Build rich context for valid matches
    let context = `Based on the startup database, here are the most relevant companies for your query: "${query}"\n\n`;

    context += `RELEVANT STARTUPS:\n`;
    startups.forEach((startup, index) => {
      context += `${index + 1}. **${startup.name}** (${startup.source})\n`;
      context += `   Description: ${startup.description}\n`;
      if (startup.categories && startup.categories.length > 0) {
        context += `   Categories: ${startup.categories.join(", ")}\n`;
      }
      context += "\n";
    });

    // Add analysis guidance with enhanced confidence assessment
    context += `ANALYSIS CONTEXT:\n`;
    context += `- Found ${startups.length} relevant startups from the database\n`;

    // Enhanced confidence interpretation
    if (confidence >= 0.8) {
      context += `- Search confidence: ${(confidence * 100).toFixed(
        0
      )}% (High - Strong matches found)\n`;
    } else if (confidence >= 0.5) {
      context += `- Search confidence: ${(confidence * 100).toFixed(
        0
      )}% (Medium - Good matches found)\n`;
    } else {
      context += `- Search confidence: ${(confidence * 100).toFixed(
        0
      )}% (Low - Matches may be loosely related)\n`;
    }

    if (intent.suggestedCategories) {
      context += `- Detected categories: ${intent.suggestedCategories.join(
        ", "
      )}\n`;
    }

    context += `\nPlease provide insights based on this startup data and answer the user's question comprehensively.`;

    return context;
  }

  // Enhanced context for non-startup queries
  constructHybridContext(query, intent, reason) {
    // Handle known startup missing case specially
    if (intent.type === "known_startup_missing" && intent.detectedCompany) {
      return (
        `The user asked about: "${query}"\n\n` +
        `It appears you're asking about "${intent.detectedCompany}", which seems to be a real startup company. ` +
        `However, this company is not currently in our database.\n\n` +
        `${reason}\n\n` +
        `Please provide general information about this company if you know about it, and discuss its potential ` +
        `market position, business model, or competitive landscape. If you're not familiar with this specific company, ` +
        `please provide insights about the industry or market segment it might operate in.`
      );
    }

    return (
      `The user asked: "${query}"\n\n` +
      `${reason || intent.reasoning}.\n` +
      `Since this is not directly related to startup analysis, please provide a helpful general business/entrepreneurship perspective on this question.\n\n` +
      `Note: Our startup database contains information about companies from Y Combinator, Crunchbase, and other sources, but this query falls outside that scope.`
    );
  }

  // Enhanced context when no startups found
  constructNoResultsContext(query, intent, reason) {
    return (
      `No startups in our database match the query: "${query}"\n\n` +
      `${
        reason ||
        "Our database contains companies from Y Combinator, Crunchbase, and other startup sources."
      }\n` +
      `${intent.reasoning}\n\n` +
      `Please provide general business insights about this topic, and suggest what types of startups might be relevant or what opportunities might exist in this space.`
    );
  }
}

// Intent classification for hybrid RAG
class IntentClassifier {
  classifyIntent(query) {
    const queryLower = query.toLowerCase();

    // Startup-related patterns
    const startupPatterns = [
      /startup/i,
      /company/i,
      /business/i,
      /firm/i,
      /venture/i,
      /yc/i,
      /y combinator/i,
      /crunchbase/i,
      /funding/i,
      /investment/i,
      /entrepreneur/i,
      /founder/i,
      /unicorn/i,
      /valuation/i,
    ];

    // Technology category patterns
    const techPatterns = {
      "AI/ML": [
        /ai/i,
        /artificial intelligence/i,
        /machine learning/i,
        /ml/i,
        /neural/i,
      ],
      FinTech: [/fintech/i, /financial/i, /payment/i, /banking/i, /crypto/i],
      HealthTech: [/health/i, /medical/i, /biotech/i, /healthcare/i],
      "E-commerce": [/ecommerce/i, /marketplace/i, /retail/i, /shopping/i],
      SaaS: [/saas/i, /software/i, /platform/i, /service/i],
      EdTech: [/education/i, /learning/i, /teaching/i, /edtech/i],
    };

    // Impossible/sci-fi technology patterns
    const impossiblePatterns = [
      /teleport/i,
      /time travel/i,
      /time machine/i,
      /teleportation/i,
      /mind reading/i,
      /telepathy/i,
      /invisibility/i,
      /immortality/i,
      /anti.*gravity/i,
      /warp drive/i,
      /faster.*than.*light/i,
      /perpetual motion/i,
      /cold fusion/i,
      /unlimited energy/i,
      /magic/i,
      /spell/i,
      /potion/i,
      /wizardry/i,
    ];

    // Highly specific/niche patterns that likely have no matches
    const verySpecificPatterns = [
      /underwater.*agriculture/i,
      /holographic.*pet/i,
      /pet.*hologram/i,
      /quantum.*pet/i,
      /solar.*powered.*shoes/i,
      /edible.*phone/i,
      /singing.*furniture/i,
      /dancing.*robot.*chef/i,
      /telepathic.*plant/i,
    ];

    // Non-startup patterns
    const nonStartupPatterns = [
      /pizza/i,
      /restaurant/i,
      /recipe/i,
      /cooking/i,
      /weather/i,
      /movie/i,
      /music/i,
      /sports/i,
      /game/i,
      /travel/i,
      /tourism/i,
      /personal/i,
      /relationship/i,
      /dating/i,
    ];

    // Check for impossible/sci-fi queries first
    if (impossiblePatterns.some((pattern) => pattern.test(queryLower))) {
      return {
        type: "impossible",
        confidence: 0.9,
        reasoning:
          "asking about fictional or scientifically impossible technology",
      };
    }

    // Check for very specific niche queries with likely no matches
    if (verySpecificPatterns.some((pattern) => pattern.test(queryLower))) {
      return {
        type: "startup_related_no_matches",
        confidence: 0.8,
        reasoning:
          "very specific niche that likely has no matching startups in database",
      };
    }

    // Check for non-startup intent
    if (nonStartupPatterns.some((pattern) => pattern.test(queryLower))) {
      return {
        type: "non_startup",
        confidence: 0.8,
        reasoning: "not related to startup or business analysis",
      };
    }

    // Check for startup intent
    const isStartupRelated = startupPatterns.some((pattern) =>
      pattern.test(queryLower)
    );

    // Detect suggested categories
    const suggestedCategories = [];
    Object.entries(techPatterns).forEach(([category, patterns]) => {
      if (patterns.some((pattern) => pattern.test(queryLower))) {
        suggestedCategories.push(category);
      }
    });

    if (isStartupRelated || suggestedCategories.length > 0) {
      return {
        type: "startup_related",
        confidence: 0.9,
        suggestedCategories,
        reasoning: "appears to be asking about startups or business analysis",
      };
    }

    // Ambiguous queries
    return {
      type: "ambiguous",
      confidence: 0.5,
      reasoning: "could be business-related but unclear from context",
    };
  }
}

// Legacy function wrappers for backward compatibility
function searchStartups(startups, query) {
  const ragService = new EnhancedRAGService();
  ragService.startupData = startups;

  const result = ragService.searchStartups(query);
  return result.startups; // Return just startups for backward compatibility
}

function constructContext(relevantStartups, query) {
  const ragService = new EnhancedRAGService();

  const searchResult = {
    startups: relevantStartups,
    intent: { type: "startup_related", confidence: 0.8 },
    searchStrategy: "startup_focused",
    confidence: 0.8,
  };

  return ragService.constructContext(searchResult, query);
}

function loadStartupData() {
  const ragService = new EnhancedRAGService();
  return ragService.loadStartupData();
}

module.exports = {
  EnhancedRAGService,
  IntentClassifier,
  searchStartups,
  constructContext,
  loadStartupData,
};

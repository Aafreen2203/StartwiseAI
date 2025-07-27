const fs = require("fs");
const path = require("path");
const { askOllama } = require("./ollamaService");

// Advanced RAG service with AI-driven features
class AdvancedRAGService {
  constructor() {
    this.startupData = [];
    this.loadStartupData();
  }

  // Load startup data
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

  // 🔍 Idea Differentiation Insights
  async generateIdeaDifferentiation(userIdea, options = {}) {
    try {
      // Find similar startups
      const similarStartups = this.findSimilarStartups(userIdea, {
        maxResults: 5,
      });

      if (similarStartups.length === 0) {
        return {
          uniqueness: "High",
          insights:
            "No similar startups found in our database. This could indicate a unique opportunity or an unexplored market.",
          suggestions: [
            "Validate market demand",
            "Research indirect competitors",
            "Consider adjacent markets",
          ],
          confidence: 0.7,
        };
      }

      // Create context for differentiation analysis
      const context = this.buildDifferentiationContext(
        userIdea,
        similarStartups
      );

      const prompt = `${context}

Based on the similar startups above, analyze what makes the user's idea unique or identify gaps they could exploit:

USER'S IDEA: "${userIdea}"

Please provide:
1. UNIQUENESS SCORE (Low/Medium/High) with reasoning
2. KEY DIFFERENTIATORS: What sets this idea apart
3. MARKET GAPS: What opportunities exist that competitors aren't addressing
4. STRATEGIC SUGGESTIONS: How to position uniquely in the market
5. COMPETITIVE ADVANTAGES: Potential strengths vs existing players

Format your response as a structured analysis focusing on actionable insights.`;

      const response = await askOllama(prompt);

      return {
        similarStartups: similarStartups.map((s) => ({
          name: s.name,
          description: s.description,
          categories: s.categories,
          website: s.website || null,
        })),
        analysis: response,
        confidence: this.calculateConfidence(similarStartups, userIdea),
      };
    } catch (error) {
      console.error("Error in idea differentiation:", error);
      throw error;
    }
  }

  // 🎯 Target Market Suggestions
  async generateTargetMarketSuggestions(userIdea, options = {}) {
    try {
      const { industry, userLocation = "Global" } = options;

      // Find startups in similar categories
      const relevantStartups = this.findSimilarStartups(userIdea, {
        maxResults: 8,
      });

      const context = this.buildMarketContext(
        userIdea,
        relevantStartups,
        industry
      );

      const prompt = `${context}

Based on successful startups in similar spaces and the user's idea, suggest ideal target markets:

USER'S IDEA: "${userIdea}"
USER LOCATION: ${userLocation}

Provide detailed target market analysis:

1. PRIMARY TARGET SEGMENTS:
   - Demographics (age, income, profession)
   - Psychographics (interests, behaviors, pain points)
   - Market size and accessibility

2. SECONDARY MARKETS:
   - Adjacent opportunities
   - Expansion possibilities

3. USER PERSONAS:
   - 2-3 detailed user personas with names, backgrounds, and specific needs

4. MARKET ENTRY STRATEGY:
   - Which segment to target first and why
   - Go-to-market approach

5. REGIONAL CONSIDERATIONS:
   - Market opportunities in ${userLocation}
   - Cultural/regulatory factors to consider

Focus on actionable insights with specific examples.`;

      const response = await askOllama(prompt);

      return {
        relevantStartups: relevantStartups.slice(0, 5),
        marketAnalysis: response,
        confidence: this.calculateConfidence(relevantStartups, userIdea),
      };
    } catch (error) {
      console.error("Error in target market analysis:", error);
      throw error;
    }
  }

  // 💡 Monetization Strategy Ideas
  async generateMonetizationStrategies(userIdea, options = {}) {
    try {
      const { targetMarket = "B2C", industry } = options;

      // Find startups with similar business models
      const relevantStartups = this.findSimilarStartups(userIdea, {
        maxResults: 10,
      });

      // Categorize by business model patterns
      const businessModels = this.analyzeBusinessModels(relevantStartups);

      const context = this.buildMonetizationContext(
        userIdea,
        relevantStartups,
        businessModels
      );

      const prompt = `${context}

Generate comprehensive monetization strategies for this idea:

USER'S IDEA: "${userIdea}"
TARGET MARKET: ${targetMarket}
INDUSTRY: ${industry || "General"}

Provide detailed monetization analysis:

1. PRIMARY REVENUE MODELS:
   - Most suitable model(s) with reasoning
   - Revenue potential and scalability
   - Implementation complexity

2. SECONDARY REVENUE STREAMS:
   - Additional income opportunities
   - Cross-selling/upselling potential

3. PRICING STRATEGIES:
   - Suggested pricing models (freemium, subscription, one-time, usage-based)
   - Price point recommendations
   - Competitive pricing analysis

4. REVENUE OPTIMIZATION:
   - Customer lifetime value strategies
   - Revenue growth tactics
   - Conversion optimization ideas

5. MARKET-SPECIFIC CONSIDERATIONS:
   - ${targetMarket} monetization best practices
   - Industry-specific revenue patterns

6. IMPLEMENTATION ROADMAP:
   - Phase 1: Initial monetization
   - Phase 2: Revenue diversification
   - Phase 3: Advanced monetization

Include specific examples from similar successful startups.`;

      const response = await askOllama(prompt);

      return {
        businessModelExamples: businessModels,
        relevantStartups: relevantStartups.slice(0, 6),
        monetizationAnalysis: response,
        confidence: this.calculateConfidence(relevantStartups, userIdea),
      };
    } catch (error) {
      console.error("Error in monetization analysis:", error);
      throw error;
    }
  }

  // 🧩 Potential Tech Stack Recommendations
  async generateTechStackSuggestions(userIdea, options = {}) {
    try {
      const {
        stage = "MVP",
        budget = "Limited",
        team_size = "Small",
      } = options;

      // Categorize the idea to determine tech requirements
      const category = this.categorizeIdea(userIdea);
      const relevantStartups = this.findSimilarStartups(userIdea, {
        maxResults: 8,
      });

      const context = this.buildTechStackContext(
        userIdea,
        category,
        relevantStartups
      );

      const prompt = `${context}

Recommend comprehensive tech stack for this startup idea:

USER'S IDEA: "${userIdea}"
DETECTED CATEGORY: ${category}
DEVELOPMENT STAGE: ${stage}
BUDGET: ${budget}
TEAM SIZE: ${team_size}

Provide detailed tech stack recommendations:

1. FRONTEND TECHNOLOGIES:
   - Framework recommendations (React, Vue, Angular, etc.)
   - UI/UX libraries and tools
   - Mobile app considerations

2. BACKEND TECHNOLOGIES:
   - Server framework (Node.js, Python/Django, Ruby/Rails, etc.)
   - Database choices (SQL vs NoSQL)
   - API architecture (REST, GraphQL)

3. CLOUD & INFRASTRUCTURE:
   - Cloud provider recommendations (AWS, GCP, Azure)
   - Hosting solutions
   - CDN and performance optimization

4. THIRD-PARTY INTEGRATIONS:
   - Essential APIs and services
   - Payment processing
   - Analytics and monitoring

5. DEVELOPMENT TOOLS:
   - Version control and CI/CD
   - Testing frameworks
   - Development environment

6. CATEGORY-SPECIFIC TOOLS:
   - Specialized tools for ${category}
   - Industry-standard integrations

7. COST ANALYSIS:
   - Estimated monthly costs for different scales
   - Free tier maximization strategies
   - Budget-friendly alternatives

8. SCALING CONSIDERATIONS:
   - Architecture for growth
   - Performance bottlenecks to avoid

Prioritize cost-effectiveness and rapid development for ${stage} stage.`;

      const response = await askOllama(prompt);

      return {
        detectedCategory: category,
        relevantStartups: relevantStartups.slice(0, 5),
        techStackAnalysis: response,
        confidence: 0.8,
      };
    } catch (error) {
      console.error("Error in tech stack analysis:", error);
      throw error;
    }
  }

  // 📊 Market Trends & Viability Score
  async generateViabilityScore(userIdea, options = {}) {
    try {
      const { industry, timeline = "2025" } = options;

      const relevantStartups = this.findSimilarStartups(userIdea, {
        maxResults: 10,
      });
      const marketData = this.analyzeMarketTrends(relevantStartups, userIdea);

      const context = this.buildViabilityContext(
        userIdea,
        relevantStartups,
        marketData
      );

      const prompt = `${context}

Analyze market viability and generate a comprehensive viability score:

USER'S IDEA: "${userIdea}"
ANALYSIS YEAR: ${timeline}
INDUSTRY: ${industry || "Detected from idea"}

Provide detailed viability analysis:

1. VIABILITY SCORE: X/10 with detailed reasoning

2. MARKET TRENDS ANALYSIS:
   - Current market trends affecting this idea
   - Growth trajectories in this space
   - Emerging opportunities and threats

3. COMPETITIVE LANDSCAPE:
   - Market saturation level
   - Barrier to entry assessment
   - Competitive intensity

4. TIMING ANALYSIS:
   - Market readiness for this solution
   - Technology maturity
   - Consumer adoption trends

5. RISK FACTORS:
   - High, medium, and low-risk factors
   - Mitigation strategies

6. SUCCESS FACTORS:
   - Key elements needed for success
   - Critical milestones to achieve

7. MARKET OPPORTUNITIES:
   - Underserved segments
   - Geographic expansion potential
   - Partnership opportunities

8. RECOMMENDATIONS:
   - Go/No-go recommendation with reasoning
   - Strategic adjustments to improve viability
   - Timeline for market entry

Be specific about ${timeline} market conditions and include data-driven insights.`;

      const response = await askOllama(prompt);

      return {
        marketData,
        relevantStartups: relevantStartups.slice(0, 6),
        viabilityAnalysis: response,
        confidence: this.calculateConfidence(relevantStartups, userIdea),
      };
    } catch (error) {
      console.error("Error in viability analysis:", error);
      throw error;
    }
  }

  // 🔗 Enhanced Competitor Analysis with Links
  async generateCompetitorAnalysis(userIdea, options = {}) {
    try {
      const { includeIndirect = true, maxCompetitors = 8 } = options;

      const competitors = this.findSimilarStartups(userIdea, {
        maxResults: maxCompetitors,
        threshold: 0.5,
      });

      // Enhance competitors with additional data
      const enhancedCompetitors = competitors.map((startup) => ({
        ...startup,
        website: startup.website || this.generateWebsiteUrl(startup.name),
        crunchbaseUrl: this.generateCrunchbaseUrl(startup.name),
        ycUrl:
          startup.source === "YC" ? this.generateYCUrl(startup.name) : null,
        competitorType: this.determineCompetitorType(startup, userIdea),
      }));

      const context = this.buildCompetitorContext(
        userIdea,
        enhancedCompetitors
      );

      const prompt = `${context}

Provide comprehensive competitor analysis:

USER'S IDEA: "${userIdea}"

Analyze each competitor and provide:

1. COMPETITIVE LANDSCAPE OVERVIEW:
   - Market positioning of each competitor
   - Competitive intensity assessment
   - Market gaps and opportunities

2. DETAILED COMPETITOR ANALYSIS:
   For each competitor, provide:
   - Strengths and weaknesses
   - Business model analysis
   - Target market focus
   - Differentiation factors

3. COMPETITIVE ADVANTAGES:
   - How user's idea can differentiate
   - Unique value propositions to pursue
   - Market positioning strategies

4. THREAT ASSESSMENT:
   - Direct vs indirect competition
   - Competitive risks to monitor
   - Defensive strategies needed

5. MARKET POSITIONING:
   - Best positioning strategy vs competitors
   - Messaging differentiation
   - Brand positioning recommendations

6. COMPETITIVE INTELLIGENCE:
   - Key metrics to track from competitors
   - Competitive monitoring strategy
   - Learning opportunities

Focus on actionable competitive insights and strategic recommendations.`;

      const response = await askOllama(prompt);

      return {
        competitors: enhancedCompetitors,
        competitorAnalysis: response,
        confidence: this.calculateConfidence(competitors, userIdea),
      };
    } catch (error) {
      console.error("Error in competitor analysis:", error);
      throw error;
    }
  }

  // 🔁 Idea Refinement Suggestions
  async generateRefinementSuggestions(userIdea, options = {}) {
    try {
      const { currentStage = "Idea", previousFeedback = null } = options;

      const similarStartups = this.findSimilarStartups(userIdea, {
        maxResults: 6,
      });
      const context = this.buildRefinementContext(
        userIdea,
        similarStartups,
        previousFeedback
      );

      const prompt = `${context}

Help refine and improve this startup idea through strategic questioning and suggestions:

USER'S IDEA: "${userIdea}"
CURRENT STAGE: ${currentStage}
${previousFeedback ? `PREVIOUS FEEDBACK: ${previousFeedback}` : ""}

Provide comprehensive idea refinement:

1. CLARIFYING QUESTIONS:
   - Key questions to sharpen the idea
   - Problem-solution fit questions
   - Market validation questions

2. IDEA ENHANCEMENT SUGGESTIONS:
   - Ways to make the idea more compelling
   - Additional features or services to consider
   - Market expansion opportunities

3. BUSINESS MODEL REFINEMENT:
   - B2B vs B2C considerations
   - Revenue model optimization
   - Scaling potential improvements

4. VALUE PROPOSITION STRENGTHENING:
   - Core value proposition assessment
   - Unique selling point development
   - Customer benefit articulation

5. PROBLEM-SOLUTION FIT:
   - Problem definition sharpening
   - Solution validation approach
   - Customer pain point analysis

6. DIFFERENTIATION ENHANCEMENT:
   - Ways to stand out from competition
   - Innovation opportunities
   - Unique angle development

7. EXECUTION ROADMAP:
   - Next steps for idea development
   - Validation experiments to run
   - Milestone planning

8. PIVOT CONSIDERATIONS:
   - Alternative angles to explore
   - Adjacent market opportunities
   - Business model variations

Focus on actionable refinement suggestions with specific next steps.`;

      const response = await askOllama(prompt);

      return {
        similarStartups: similarStartups.slice(0, 5),
        refinementAnalysis: response,
        confidence: 0.9,
      };
    } catch (error) {
      console.error("Error in idea refinement:", error);
      throw error;
    }
  }

  // 📋 Investor Pitch Draft Generator
  async generatePitchDraft(userIdea, options = {}) {
    try {
      const {
        targetMarket = "TBD",
        businessModel = "TBD",
        teamSize = 1,
        fundingStage = "Pre-seed",
      } = options;

      const relevantStartups = this.findSimilarStartups(userIdea, {
        maxResults: 8,
      });
      const context = this.buildPitchContext(
        userIdea,
        relevantStartups,
        options
      );

      const prompt = `${context}

Create a compelling investor pitch deck outline:

USER'S IDEA: "${userIdea}"
TARGET MARKET: ${targetMarket}
BUSINESS MODEL: ${businessModel}
TEAM SIZE: ${teamSize}
FUNDING STAGE: ${fundingStage}

Generate a complete pitch deck outline:

1. PROBLEM SLIDE:
   - Clear problem statement
   - Market pain points
   - Problem validation data

2. SOLUTION SLIDE:
   - Your unique solution
   - Key features and benefits
   - Solution differentiation

3. MARKET OPPORTUNITY:
   - Total Addressable Market (TAM)
   - Serviceable Addressable Market (SAM)
   - Market growth trends

4. BUSINESS MODEL:
   - Revenue model
   - Pricing strategy
   - Revenue projections

5. COMPETITIVE ANALYSIS:
   - Key competitors
   - Competitive advantages
   - Market positioning

6. TRACTION SLIDE:
   - Current progress/metrics
   - Customer validation
   - Growth indicators

7. MARKETING & SALES:
   - Go-to-market strategy
   - Customer acquisition plan
   - Sales funnel

8. FINANCIAL PROJECTIONS:
   - 3-year revenue forecast
   - Key financial metrics
   - Unit economics

9. TEAM SLIDE:
   - Founder backgrounds
   - Key team members
   - Advisory board

10. FUNDING ASK:
    - Funding amount needed
    - Use of funds breakdown
    - Milestones to achieve

11. APPENDIX:
    - Additional supporting data
    - Detailed financials
    - Product demos/screenshots

Include specific talking points and data suggestions for each slide.`;

      const response = await askOllama(prompt);

      return {
        relevantStartups: relevantStartups.slice(0, 5),
        pitchDeckOutline: response,
        confidence: 0.8,
      };
    } catch (error) {
      console.error("Error in pitch generation:", error);
      throw error;
    }
  }

  // 🌍 Regional Startup Gaps Analysis
  async generateRegionalGapAnalysis(userIdea, options = {}) {
    try {
      const {
        userCountry = "Global",
        userCity = null,
        languages = ["English"],
      } = options;

      const globalStartups = this.findSimilarStartups(userIdea, {
        maxResults: 10,
      });
      const context = this.buildRegionalContext(
        userIdea,
        globalStartups,
        userCountry,
        userCity
      );

      const prompt = `${context}

Analyze regional opportunities and market gaps:

USER'S IDEA: "${userIdea}"
USER LOCATION: ${userCountry}${userCity ? `, ${userCity}` : ""}
LANGUAGES: ${languages.join(", ")}

Provide comprehensive regional analysis:

1. REGIONAL MARKET GAPS:
   - Underserved markets in ${userCountry}
   - Local variations of global solutions needed
   - Cultural adaptation opportunities

2. LOCALIZATION OPPORTUNITIES:
   - Local market specific needs
   - Cultural customization requirements
   - Language and communication preferences

3. REGULATORY LANDSCAPE:
   - Local regulations affecting the idea
   - Compliance requirements
   - Regulatory advantages/challenges

4. COMPETITIVE LANDSCAPE:
   - Local competitors analysis
   - International players in the market
   - Market entry barriers

5. PARTNERSHIP OPPORTUNITIES:
   - Local business partnerships
   - Government initiatives alignment
   - Industry association connections

6. FUNDING ECOSYSTEM:
   - Local investor landscape
   - Government grants and support
   - Accelerator programs available

7. TALENT AVAILABILITY:
   - Local skill availability
   - Remote work considerations
   - Hiring challenges and opportunities

8. GO-TO-MARKET STRATEGY:
   - Local marketing channels
   - Customer acquisition strategies
   - Brand positioning for local market

9. SCALING OPPORTUNITIES:
   - Regional expansion potential
   - Similar markets for expansion
   - Cross-border opportunities

10. SUCCESS FACTORS:
    - Key factors for local success
    - Cultural considerations
    - Local market best practices

Focus on actionable insights specific to ${userCountry} market conditions.`;

      const response = await askOllama(prompt);

      return {
        globalStartups: globalStartups.slice(0, 6),
        regionalAnalysis: response,
        confidence: 0.7,
      };
    } catch (error) {
      console.error("Error in regional analysis:", error);
      throw error;
    }
  }

  // Helper Methods

  findSimilarStartups(query, options = {}) {
    const { maxResults = 5, threshold = 1.0 } = options;

    const keywords = this.extractKeywords(query);
    const scored = this.startupData.map((startup) => {
      const score = this.calculateRelevanceScore(startup, keywords, query);
      return { ...startup, score };
    });

    return scored
      .filter((item) => item.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

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
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  calculateRelevanceScore(startup, keywords, originalQuery) {
    const name = startup.name.toLowerCase();
    const description = startup.description.toLowerCase();
    const categories = (startup.categories || []).join(" ").toLowerCase();

    let score = 0;

    keywords.forEach((keyword) => {
      if (name.includes(keyword)) score += 8;
      if (description.includes(keyword)) score += 3;
      if (categories.includes(keyword)) score += 4;
    });

    // Boost for phrase matches
    if (
      name.includes(originalQuery.toLowerCase()) ||
      description.includes(originalQuery.toLowerCase())
    ) {
      score += 10;
    }

    return score;
  }

  calculateConfidence(startups, query) {
    if (startups.length === 0) return 0.1;

    const avgScore =
      startups.reduce((sum, s) => sum + (s.score || 0), 0) / startups.length;
    return Math.min(avgScore / 10, 1);
  }

  categorizeIdea(idea) {
    const categories = {
      "AI/ML": [
        "ai",
        "artificial intelligence",
        "machine learning",
        "ml",
        "neural",
        "nlp",
      ],
      FinTech: [
        "financial",
        "finance",
        "payment",
        "banking",
        "crypto",
        "money",
        "investment",
      ],
      HealthTech: [
        "health",
        "medical",
        "healthcare",
        "biotech",
        "wellness",
        "fitness",
      ],
      EdTech: [
        "education",
        "learning",
        "teaching",
        "training",
        "course",
        "school",
      ],
      "E-commerce": [
        "ecommerce",
        "marketplace",
        "retail",
        "shopping",
        "store",
        "commerce",
      ],
      SaaS: ["saas", "software", "platform", "service", "tool", "app"],
      Social: ["social", "community", "networking", "chat", "messaging"],
      IoT: ["iot", "internet of things", "sensors", "smart home", "connected"],
      Blockchain: ["blockchain", "crypto", "decentralized", "web3"],
      Sustainability: [
        "green",
        "sustainable",
        "environment",
        "climate",
        "renewable",
      ],
    };

    const ideaLower = idea.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => ideaLower.includes(keyword))) {
        return category;
      }
    }

    return "General Tech";
  }

  analyzeBusinessModels(startups) {
    const models = {};

    startups.forEach((startup) => {
      const description = startup.description.toLowerCase();

      if (
        description.includes("subscription") ||
        description.includes("saas")
      ) {
        models["Subscription/SaaS"] = (models["Subscription/SaaS"] || 0) + 1;
      }
      if (
        description.includes("marketplace") ||
        description.includes("platform")
      ) {
        models["Marketplace/Platform"] =
          (models["Marketplace/Platform"] || 0) + 1;
      }
      if (description.includes("freemium") || description.includes("free")) {
        models["Freemium"] = (models["Freemium"] || 0) + 1;
      }
      if (description.includes("advertising") || description.includes("ads")) {
        models["Advertising"] = (models["Advertising"] || 0) + 1;
      }
      if (
        description.includes("transaction") ||
        description.includes("commission")
      ) {
        models["Transaction-based"] = (models["Transaction-based"] || 0) + 1;
      }
    });

    return models;
  }

  analyzeMarketTrends(startups, idea) {
    const currentYear = new Date().getFullYear();
    const recentStartups = startups.filter((s) => {
      // Assuming newer startups if they have higher IDs or more recent data
      return true; // Placeholder - would need actual founding dates
    });

    return {
      totalRelevantStartups: startups.length,
      recentEntrants: recentStartups.length,
      categories: this.getStartupCategories(startups),
      competitiveIntensity:
        startups.length > 10 ? "High" : startups.length > 5 ? "Medium" : "Low",
    };
  }

  getStartupCategories(startups) {
    const categories = {};
    startups.forEach((startup) => {
      if (startup.categories) {
        startup.categories.forEach((cat) => {
          categories[cat] = (categories[cat] || 0) + 1;
        });
      }
    });
    return categories;
  }

  generateWebsiteUrl(name) {
    return `https://${name.toLowerCase().replace(/\s+/g, "")}.com`;
  }

  generateCrunchbaseUrl(name) {
    return `https://www.crunchbase.com/organization/${name
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  }

  generateYCUrl(name) {
    return `https://www.ycombinator.com/companies/${name
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  }

  determineCompetitorType(startup, userIdea) {
    const similarity = this.calculateRelevanceScore(
      startup,
      this.extractKeywords(userIdea),
      userIdea
    );
    return similarity > 8 ? "Direct" : similarity > 4 ? "Indirect" : "Adjacent";
  }

  // Context builders for different analyses
  buildDifferentiationContext(userIdea, similarStartups) {
    let context = `STARTUP DIFFERENTIATION ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n\n`;
    context += `SIMILAR STARTUPS IN DATABASE:\n`;

    similarStartups.forEach((startup, index) => {
      context += `${index + 1}. **${startup.name}** (${startup.source})\n`;
      context += `   Description: ${startup.description}\n`;
      if (startup.categories) {
        context += `   Categories: ${startup.categories.join(", ")}\n`;
      }
      context += `\n`;
    });

    return context;
  }

  buildMarketContext(userIdea, relevantStartups, industry) {
    let context = `TARGET MARKET ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n`;
    if (industry) context += `INDUSTRY: ${industry}\n`;
    context += `\nRELEVANT STARTUPS FOR MARKET INSIGHTS:\n`;

    relevantStartups.forEach((startup, index) => {
      context += `${index + 1}. ${startup.name}: ${startup.description}\n`;
    });

    return context;
  }

  buildMonetizationContext(userIdea, relevantStartups, businessModels) {
    let context = `MONETIZATION STRATEGY ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n\n`;
    context += `BUSINESS MODEL PATTERNS IN SIMILAR STARTUPS:\n`;

    Object.entries(businessModels).forEach(([model, count]) => {
      context += `- ${model}: ${count} companies\n`;
    });

    context += `\nRELEVANT STARTUPS:\n`;
    relevantStartups.forEach((startup, index) => {
      context += `${index + 1}. ${startup.name}: ${startup.description}\n`;
    });

    return context;
  }

  buildTechStackContext(userIdea, category, relevantStartups) {
    let context = `TECH STACK RECOMMENDATION ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n`;
    context += `DETECTED CATEGORY: ${category}\n\n`;
    context += `SIMILAR STARTUPS FOR TECH INSIGHTS:\n`;

    relevantStartups.forEach((startup, index) => {
      context += `${index + 1}. ${startup.name} (${startup.source}): ${
        startup.description
      }\n`;
    });

    return context;
  }

  buildViabilityContext(userIdea, relevantStartups, marketData) {
    let context = `MARKET VIABILITY ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n\n`;
    context += `MARKET DATA:\n`;
    context += `- Total relevant startups: ${marketData.totalRelevantStartups}\n`;
    context += `- Competitive intensity: ${marketData.competitiveIntensity}\n`;
    context += `- Top categories: ${Object.keys(marketData.categories)
      .slice(0, 3)
      .join(", ")}\n\n`;
    context += `RELEVANT STARTUPS:\n`;

    relevantStartups.forEach((startup, index) => {
      context += `${index + 1}. ${startup.name}: ${startup.description}\n`;
    });

    return context;
  }

  buildCompetitorContext(userIdea, enhancedCompetitors) {
    let context = `COMPETITOR ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n\n`;
    context += `IDENTIFIED COMPETITORS:\n`;

    enhancedCompetitors.forEach((competitor, index) => {
      context += `${index + 1}. **${competitor.name}** (${
        competitor.competitorType
      } Competitor)\n`;
      context += `   Description: ${competitor.description}\n`;
      context += `   Source: ${competitor.source}\n`;
      if (competitor.website) context += `   Website: ${competitor.website}\n`;
      if (competitor.crunchbaseUrl)
        context += `   Crunchbase: ${competitor.crunchbaseUrl}\n`;
      if (competitor.ycUrl) context += `   Y Combinator: ${competitor.ycUrl}\n`;
      context += `\n`;
    });

    return context;
  }

  buildRefinementContext(userIdea, similarStartups, previousFeedback) {
    let context = `IDEA REFINEMENT ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n`;
    if (previousFeedback) context += `PREVIOUS FEEDBACK: ${previousFeedback}\n`;
    context += `\nSIMILAR STARTUPS FOR REFERENCE:\n`;

    similarStartups.forEach((startup, index) => {
      context += `${index + 1}. ${startup.name}: ${startup.description}\n`;
    });

    return context;
  }

  buildPitchContext(userIdea, relevantStartups, options) {
    let context = `INVESTOR PITCH DEVELOPMENT\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n`;
    context += `FUNDING STAGE: ${options.fundingStage}\n`;
    context += `TARGET MARKET: ${options.targetMarket}\n\n`;
    context += `RELEVANT STARTUPS FOR REFERENCE:\n`;

    relevantStartups.forEach((startup, index) => {
      context += `${index + 1}. ${startup.name}: ${startup.description}\n`;
    });

    return context;
  }

  buildRegionalContext(userIdea, globalStartups, userCountry, userCity) {
    let context = `REGIONAL MARKET ANALYSIS\n\n`;
    context += `USER'S IDEA: "${userIdea}"\n`;
    context += `TARGET REGION: ${userCountry}${
      userCity ? `, ${userCity}` : ""
    }\n\n`;
    context += `GLOBAL STARTUPS IN SIMILAR SPACE:\n`;

    globalStartups.forEach((startup, index) => {
      context += `${index + 1}. ${startup.name}: ${startup.description}\n`;
    });

    return context;
  }
}

module.exports = { AdvancedRAGService };

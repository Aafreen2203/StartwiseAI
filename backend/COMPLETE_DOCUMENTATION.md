# 📚 StartwiseAI Backend - Complete Documentation

**Advanced RAG + AI-Driven Startup Analysis Platform**  
_Comprehensive Documentation & User Guide_

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features & Capabilities](#features--capabilities)
3. [Quick Start Guide](#quick-start-guide)
4. [Project Structure](#project-structure)
5. [API Documentation](#api-documentation)
6. [Advanced RAG Endpoints](#advanced-rag-endpoints)
7. [Enhancement History](#enhancement-history)
8. [Cleanup & Maintenance](#cleanup--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Development Guide](#development-guide)

---

## 🎯 Overview

StartwiseAI is a comprehensive Node.js backend that provides advanced RAG (Retrieval-Augmented Generation) functionality for startup analysis. The system combines a curated database of Y Combinator and Crunchbase startups with AI-powered analysis using local Ollama models to deliver actionable insights for entrepreneurs and investors.

### 🚀 Key Technologies

- **Backend**: Node.js + Express
- **AI Engine**: Ollama (Mistral model)
- **Data Sources**: Y Combinator, Crunchbase, Product Hunt, AngelList, TechCrunch
- **Architecture**: RAG (Retrieval-Augmented Generation)
- **Database**: JSON-based startup repository (66+ companies)

---

## ✨ Features & Capabilities

### 🔍 **Core RAG Features**

- ✅ **Smart Startup Search**: Advanced keyword-based relevance scoring
- ✅ **AI-Powered Analysis**: Natural language query processing with Ollama
- ✅ **Hybrid Search Strategy**: Combines exact matching with semantic understanding
- ✅ **Multi-Source Data**: Integrated data from 5+ startup platforms
- ✅ **Real-time Processing**: Dynamic context construction for AI analysis

### 🧠 **Advanced AI-Driven Features** (10 Endpoints)

#### 1. 🔍 **Idea Differentiation Insights**

- Analyzes uniqueness vs competitors
- Provides strategic positioning recommendations
- Identifies market gaps and opportunities

#### 2. 🎯 **Target Market Suggestions**

- AI-powered customer persona analysis
- Market sizing and accessibility assessment
- Regional targeting strategies

#### 3. 💡 **Monetization Strategy Ideas**

- Revenue model recommendations based on similar startups
- Pricing strategy suggestions
- Implementation roadmaps (3-phase approach)

#### 4. 🧩 **Tech Stack Recommendations**

- Category-specific technology suggestions
- Budget-conscious alternatives
- Scaling considerations and cost analysis

#### 5. 📊 **Market Viability Score**

- Comprehensive 1-10 scoring with detailed rationale
- Market trend analysis and timing assessment
- Risk factor identification and mitigation strategies

#### 6. 🔗 **Enhanced Competitor Analysis**

- Direct links to Crunchbase/YC profiles
- Competitive positioning analysis
- Threat assessment and defensive strategies

#### 7. 🔁 **Idea Refinement Suggestions**

- Strategic improvement recommendations
- Problem-solution fit optimization
- Business model refinement guidance

#### 8. 📋 **Investor Pitch Draft Generator**

- Complete 10-slide pitch deck outlines
- Talking points and data suggestions
- Funding stage-specific customization

#### 9. 🌍 **Regional Startup Gaps Analysis**

- Location-based opportunity identification
- Cultural adaptation requirements
- Local market regulatory considerations

#### 10. 🚀 **Comprehensive Analysis**

- All-in-one endpoint running all analyses in parallel
- Success rate tracking and error handling
- Complete startup idea evaluation

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** 18+ installed
- **Ollama** installed and running locally
- **Mistral model** in Ollama: `ollama pull mistral`

### Installation & Setup

```bash
# 1. Navigate to backend directory
cd StartwiseAI/backend

# 2. Install dependencies
npm install

# 3. Start Ollama (in separate terminal)
ollama serve

# 4. Generate/refresh startup data
npm run scrape

# 5. Start the server
npm start
```

### Quick Test

```bash
# Test basic functionality
npm test

# Test individual advanced feature
curl -X POST http://localhost:5000/api/advanced/idea-differentiation \
  -H "Content-Type: application/json" \
  -d '{"userIdea": "AI-powered fitness app", "options": {}}'
```

---

## 📁 Project Structure

```
backend/
├── 🔧 Core Files
│   ├── server.js                    # Main Express server with all endpoints
│   ├── package.json                 # Dependencies and scripts
│   ├── startups.json               # Primary startup database (66 companies)
│   └── test_advanced_rag.js        # Comprehensive test suite
│
├── 🧠 Services
│   ├── advancedRAGService.js       # Advanced AI-driven analysis features
│   ├── ragService.js               # Enhanced RAG with hybrid search
│   └── ollamaService.js            # Ollama AI model integration
│
├── 📊 Data Pipeline
│   ├── enhanced_yc_scraper.js      # Y Combinator data scraper
│   ├── alternative_scraper.js      # Multi-platform data scraper
│   ├── enhanced_merge_data.js      # Advanced merge with deduplication
│   ├── yc_startups.json           # YC data (35 companies)
│   ├── crunchbase_startups.json   # Crunchbase data (15 companies)
│   ├── alternative_startups.json  # Alternative sources (17 companies)
│   ├── merge_report.json          # Merge statistics
│   └── duplicates_report.json     # Deduplication analysis
│
└── 📚 Documentation
    └── COMPLETE_DOCUMENTATION.md  # This comprehensive guide
```

### 🗑️ Cleaned Up Files

- ❌ `data/startups.json` (duplicate removed)
- ❌ `startup_scraper/startups.json` (duplicate removed)
- ❌ `data/` directory (empty, removed)

---

## 🌐 API Documentation

### Base URL

```
http://localhost:5000
```

### Authentication

No authentication required for current endpoints.

---

## 🔍 Advanced RAG Endpoints

### 1. Idea Differentiation Insights

**Endpoint:** `POST /api/advanced/idea-differentiation`

**Purpose:** Analyzes what makes your startup idea unique compared to similar existing startups.

**Request Body:**

```json
{
  "userIdea": "An AI-powered fitness app that creates personalized workout plans",
  "options": {
    "includeIndirect": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "userIdea": "An AI-powered fitness app...",
  "similarStartups": [
    {
      "name": "MyFitnessPal",
      "description": "Calorie counting and nutrition tracking app",
      "categories": ["Health", "Fitness"],
      "website": "https://myfitnesspal.com"
    }
  ],
  "analysis": "1. Uniqueness Score (Medium): While there are several fitness apps...",
  "confidence": 0.85,
  "timestamp": "2025-07-27T..."
}
```

### 2. Target Market Suggestions

**Endpoint:** `POST /api/advanced/target-market`

**Purpose:** Suggests ideal target audiences and user personas based on successful similar startups.

**Request Body:**

```json
{
  "userIdea": "A blockchain-based supply chain tracking system",
  "options": {
    "industry": "Supply Chain",
    "userLocation": "United States"
  }
}
```

### 3. Monetization Strategy Ideas

**Endpoint:** `POST /api/advanced/monetization`

**Purpose:** Recommends revenue models and pricing strategies based on similar successful startups.

**Request Body:**

```json
{
  "userIdea": "A SaaS platform for project management",
  "options": {
    "targetMarket": "B2B",
    "industry": "SaaS"
  }
}
```

### 4. Tech Stack Recommendations

**Endpoint:** `POST /api/advanced/tech-stack`

**Purpose:** Suggests appropriate technology stack based on startup category and requirements.

**Request Body:**

```json
{
  "userIdea": "A real-time chat application for teams",
  "options": {
    "stage": "MVP",
    "budget": "Limited",
    "team_size": "Small"
  }
}
```

### 5. Market Viability Score

**Endpoint:** `POST /api/advanced/viability-score`

**Purpose:** Generates a comprehensive market viability score (1-10) with detailed analysis.

**Request Body:**

```json
{
  "userIdea": "An AI-powered legal document review service",
  "options": {
    "industry": "LegalTech",
    "timeline": "2025"
  }
}
```

### 6. Competitor Analysis with Links

**Endpoint:** `POST /api/advanced/competitors`

**Purpose:** Provides detailed competitor analysis with direct links to competitor websites and profiles.

**Request Body:**

```json
{
  "userIdea": "A food delivery app focused on healthy meals",
  "options": {
    "includeIndirect": true,
    "maxCompetitors": 8
  }
}
```

### 7. Idea Refinement Suggestions

**Endpoint:** `POST /api/advanced/refinement`

**Purpose:** Helps refine and improve your startup idea through strategic questions and suggestions.

**Request Body:**

```json
{
  "userIdea": "A social media platform for professionals",
  "options": {
    "currentStage": "Idea",
    "previousFeedback": "Users want more privacy features"
  }
}
```

### 8. Investor Pitch Draft Generator

**Endpoint:** `POST /api/advanced/pitch-draft`

**Purpose:** Creates a comprehensive investor pitch deck outline with talking points.

**Request Body:**

```json
{
  "userIdea": "An IoT-based smart home security system",
  "options": {
    "targetMarket": "B2C",
    "businessModel": "Subscription",
    "teamSize": 3,
    "fundingStage": "Seed"
  }
}
```

### 9. Regional Startup Gaps Analysis

**Endpoint:** `POST /api/advanced/regional-gaps`

**Purpose:** Identifies regional market opportunities and gaps based on user location.

**Request Body:**

```json
{
  "userIdea": "A ride-sharing app for rural areas",
  "options": {
    "userCountry": "India",
    "userCity": "Bangalore",
    "languages": ["English", "Hindi"]
  }
}
```

### 10. Comprehensive Analysis (All-in-One)

**Endpoint:** `POST /api/advanced/full-analysis`

**Purpose:** Runs all analyses in parallel for a complete startup idea evaluation.

**Request Body:**

```json
{
  "userIdea": "An AI-powered mental health chatbot",
  "options": {
    "industry": "HealthTech",
    "targetMarket": "B2C",
    "userLocation": "United States",
    "stage": "MVP",
    "fundingStage": "Pre-seed"
  }
}
```

**Response:**

```json
{
  "success": true,
  "userIdea": "An AI-powered mental health chatbot",
  "results": {
    "differentiation": {...},
    "targetMarket": {...},
    "monetization": {...},
    "techStack": {...},
    "viability": {...},
    "competitors": {...},
    "refinement": {...},
    "pitch": {...},
    "regionalGaps": {...}
  },
  "errors": null,
  "summary": {
    "completedAnalyses": 9,
    "totalAnalyses": 9,
    "successRate": "100%"
  },
  "timestamp": "2025-07-27T..."
}
```

---

## 📊 Basic Endpoints

### Basic RAG Query

**Endpoint:** `POST /api/rag-query`
Basic startup analysis and question answering.

### Search Startups

**Endpoint:** `POST /api/search`
Filter and search through the startup database.

### Get Categories

**Endpoint:** `GET /api/categories`
Returns all available startup categories with counts.

### Health Check

**Endpoint:** `GET /api/health`
Returns system health status and data statistics.

### Reload Data

**Endpoint:** `GET /api/reload-data`
Triggers a refresh of startup data from all sources.

---

## 🔧 Enhancement History

### ✅ Latest Enhancements (July 2025)

#### **Advanced RAG System Implementation**

- **10 new AI-driven endpoints** for comprehensive startup analysis
- **Parallel processing** for full analysis endpoint
- **Enhanced error handling** with graceful fallbacks
- **Confidence scoring** for all analyses
- **Contextual prompting** for improved AI responses

#### **Technical Improvements**

- **Advanced RAG Service** (`advancedRAGService.js`) with 1000+ lines of logic
- **Comprehensive test suite** (`test_advanced_rag.js`) with automated testing
- **Enhanced documentation** with complete API reference
- **Modular architecture** for easy maintenance and scaling

#### **Data Pipeline Enhancements**

- **Multi-source integration** (YC, Crunchbase, Product Hunt, AngelList, TechCrunch)
- **Advanced deduplication** with fuzzy matching algorithms
- **Enhanced merge reporting** with detailed statistics
- **Data quality validation** and integrity checks

---

## 🧹 Cleanup & Maintenance

### ✅ Recent Cleanup (July 2025)

#### **Duplicate Files Removed:**

1. `backend/data/startups.json` - Duplicate removed (16.8 KB saved)
2. `startup_scraper/startups.json` - Duplicate removed (16.8 KB saved)
3. `data/` directory - Empty directory removed

#### **Hash Verification:**

- All duplicate files verified with MD5 hash comparison
- Primary `startups.json` file preserved and functional
- System integrity maintained throughout cleanup

#### **Current Clean Structure:**

- **1 primary data file**: `backend/startups.json`
- **3 service files**: Core RAG functionality
- **5 documentation files**: Comprehensive guides
- **8 scraper files**: Data pipeline components

---

## ⚡ NPM Scripts

```bash
# Core Operations
npm start                    # Start the backend server
npm test                     # Run comprehensive test suite

# Data Pipeline
npm run scrape              # Run all scrapers and merge data
npm run scrape:yc           # YC scraper only
npm run scrape:alternatives # Alternative sources only
npm run merge               # Merge data only
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. **Ollama Connection Issues**

```bash
# Ensure Ollama is running
ollama serve

# Check if Mistral model is installed
ollama list
ollama pull mistral  # If not installed
```

#### 2. **No Startup Data**

```bash
# Regenerate startup data
npm run scrape

# Check data file exists
ls -la startups.json
```

#### 3. **Slow AI Responses**

- AI analysis can take 10-30 seconds depending on query complexity
- Ensure adequate system memory (4GB+ recommended)
- Consider using lighter AI models for faster responses

#### 4. **Memory Issues**

```bash
# Increase Node.js heap size if needed
node --max-old-space-size=4096 server.js
```

#### 5. **Port Conflicts**

- Default port: 5000
- Ollama default port: 11434
- Ensure both ports are available

---

## 🛠️ Development Guide

### Adding New Advanced Features

1. **Update `advancedRAGService.js`:**

   ```javascript
   async generateNewFeature(userIdea, options = {}) {
     // Your feature logic here
   }
   ```

2. **Add endpoint in `server.js`:**

   ```javascript
   app.post("/api/advanced/new-feature", async (req, res) => {
     // Endpoint logic here
   });
   ```

3. **Update documentation** in this file

4. **Add tests** in `test_advanced_rag.js`

### Code Structure Guidelines

- **Services**: Business logic and AI processing
- **Server**: HTTP endpoints and routing
- **Scrapers**: Data collection and processing
- **Tests**: Comprehensive coverage of all features

### Best Practices

- Always include error handling
- Add confidence scoring for AI responses
- Use contextual prompting for better AI results
- Implement proper input validation
- Document all new endpoints

---

## 📈 Current System Status

**✅ System Health:** All systems operational  
**✅ Data Integrity:** 66 startup records loaded and verified  
**✅ AI Engine:** Ollama + Mistral model active  
**✅ API Endpoints:** 15 total endpoints (10 advanced + 5 basic)  
**✅ Documentation:** Complete and up-to-date  
**✅ Test Coverage:** Comprehensive test suite available

---

## 🎯 Future Enhancements

### Planned Features

- **Rate limiting and authentication** for production use
- **Caching system** for faster response times
- **Multiple AI model support** (GPT, Claude, etc.)
- **Real-time data updates** from startup platforms
- **Export functionality** for analysis results
- **Advanced analytics dashboard**
- **Integration with external APIs** (funding data, market research)

### Scalability Considerations

- Database migration from JSON to PostgreSQL/MongoDB
- Microservices architecture for high availability
- Load balancing for multiple server instances
- CI/CD pipeline for automated deployments

---

## 📞 Support & Contact

For technical support, feature requests, or bug reports:

- **Repository**: [StartwiseAI](https://github.com/Aafreen2203/StartwiseAI)
- **Issues**: Create GitHub issues for bug reports
- **Documentation**: This comprehensive guide covers all features

---

## 📄 License & Usage

This project is developed for educational and commercial use. Please ensure proper attribution when using or extending this codebase.

**Last Updated:** July 27, 2025  
**Version:** 2.0 (Advanced RAG Implementation)  
**Total Lines of Code:** 3000+ lines across all components

---

_🚀 StartwiseAI - Empowering entrepreneurs with AI-driven startup insights_

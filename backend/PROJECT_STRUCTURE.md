# Backend Project Structure - Latest Version

## 🚀 Active Files (Latest Working Versions)

### Core Backend

- `server.js` - Main Express server with enhanced RAG endpoints
- `package.json` - Updated with latest scripts
- `startups.json` - Combined startup data (66 companies)

### Services

- `services/ragService.js` - Enhanced RAG service with hybrid approach
- `services/ollamaService.js` - Ollama integration service

### Data Scrapers (Latest Enhanced Versions)

- `startup_scraper/enhanced_yc_scraper.js` - Advanced YC scraper with multiple strategies
- `startup_scraper/alternative_scraper.js` - Alternative data sources (Product Hunt, AngelList, TechCrunch)
- `startup_scraper/enhanced_merge_data.js` - Advanced merge with deduplication

### Data Files

- `startup_scraper/yc_startups.json` - YC company data (35 companies)
- `startup_scraper/crunchbase_startups.json` - Crunchbase alternative data (15 companies)
- `startup_scraper/alternative_startups.json` - Alternative sources data (17 companies)
- `startup_scraper/startups.json` - Merged data
- `startup_scraper/merge_report.json` - Merge statistics
- `startup_scraper/duplicates_report.json` - Duplicate detection report

## 🗑️ Deleted Outdated Files

- ❌ `yc_scraper.js` (replaced by enhanced version)
- ❌ `merge_data.js` (replaced by enhanced version)
- ❌ `crunchbase_scraper.js` (replaced by alternative scraper)
- ❌ `routes/analyze.js` (functionality moved to server.js)
- ❌ `routes/` directory (empty, removed)

## 📜 Available NPM Scripts

```bash
npm start                # Start the server
npm run scrape          # Run all scrapers and merge data
npm run scrape:yc       # Run only YC scraper
npm run scrape:alternatives # Run only alternative sources scraper
npm run merge           # Run only the merge process
```

## 🔗 Available API Endpoints

- POST `/api/rag-query` - Enhanced RAG with hybrid approach
- GET `/api/categories` - Browse startups by category
- POST `/api/search` - Filtered search with advanced options
- GET `/api/reload-data` - Refresh data from all sources
- GET `/api/health` - System health check
- GET `/api/debug/data` - Development debugging

## 📊 Current Data Stats

- **Total Companies**: 66 unique startups
- **Sources**: Y Combinator, Crunchbase alternatives, Product Hunt, AngelList, TechCrunch
- **Categories**: 11 different categories (SaaS, AI/ML, FinTech, etc.)
- **Duplicates Removed**: Advanced deduplication with fuzzy matching

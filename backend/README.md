# AI Startup Backend with RAG

A Node.js backend that provides RAG (Retrieval-Augmented Generation) functionality for startup data scraped from Y Combinator and Crunchbase. The system combines keyword-based search with local Ollama AI model processing to answer natural language questions about startups.

## Features

✅ **Data Loading**: Automatically loads startup data from `./startups.json` on server start  
✅ **Data Reloading**: `/api/reload-data` endpoint to refresh data without restarting  
✅ **RAG Query System**: `/api/rag-query` endpoint for natural language startup questions  
✅ **Keyword Matching**: Smart keyword-based relevance scoring for startup search  
✅ **Ollama Integration**: Uses local Ollama with mistral model for AI responses  
✅ **Error Handling**: Graceful fallbacks when Ollama is unavailable  
✅ **CORS Support**: Ready for frontend integration

## Project Structure

```
ai-startup-backend/
├── server.js                 # Main Express server with RAG endpoints
├── services/
│   ├── ollamaService.js      # Ollama API integration (mistral model)
│   └── ragService.js         # Keyword search and context construction
├── startup_scraper/
│   ├── yc_scraper.js         # Y Combinator startup scraper
│   ├── crunchbase_scraper.js # Crunchbase startup data (sample)
│   ├── merge_data.js         # Combines YC + Crunchbase data
│   └── startups.json         # Generated combined startup data
├── data/
│   └── startups.json         # Copy of startup data for compatibility
└── startups.json             # Main startup data file
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- [Ollama](https://ollama.ai/) installed and running locally
- Mistral model installed in Ollama: `ollama pull mistral`

### Installation

1. **Clone and install dependencies:**

   ```bash
   cd ai-startup-backend
   npm install
   ```

2. **Generate startup data:**

   ```bash
   cd startup_scraper
   node yc_scraper.js
   node crunchbase_scraper.js
   node merge_data.js
   ```

3. **Start Ollama (in separate terminal):**

   ```bash
   ollama serve
   ```

4. **Pull the mistral model:**

   ```bash
   ollama pull mistral
   ```

5. **Start the backend server:**
   ```bash
   npm start
   # or
   node server.js
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### 1. Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "dataLoaded": true,
  "startupCount": 35,
  "timestamp": "2025-07-27T12:32:39.937Z"
}
```

### 2. RAG Query (Main Endpoint)

```http
POST /api/rag-query
Content-Type: application/json

{
  "question": "What are the top AI startups in healthcare?"
}
```

**Response:**

```json
{
  "answer": "Based on the available data, here are the most relevant AI startups in healthcare: ...",
  "context": [
    {
      "name": "Tempus",
      "description": "AI-driven precision medicine platform for cancer and healthcare",
      "source": "Crunchbase"
    },
    {
      "name": "OpenAI",
      "description": "AI research and deployment company focused on ensuring AI benefits humanity",
      "source": "YC"
    }
  ]
}
```

### 3. Reload Data

```http
GET /api/reload-data
```

**Response:**

```json
{
  "message": "Data reloaded successfully",
  "count": 35
}
```

### 4. Debug Data (Development)

```http
GET /api/debug/data
```

**Response:**

```json
{
  "totalStartups": 35,
  "sources": ["YC", "Crunchbase"],
  "sampleData": [...]
}
```

## How RAG Works

1. **Query Processing**: User submits natural language question
2. **Keyword Extraction**: System extracts keywords from the question
3. **Relevance Scoring**: Startups are scored based on keyword matches in name/description
4. **Context Construction**: Top 5 most relevant startups are formatted into context
5. **AI Processing**: Context + question sent to Ollama (mistral model)
6. **Response Generation**: AI generates human-readable answer
7. **Structured Return**: Both AI answer and context startups returned

## Sample Queries

- "What are AI startups focused on healthcare?"
- "Show me fintech companies from Y Combinator"
- "Which startups work on autonomous vehicles?"
- "What are the top payment processing startups?"
- "Find startups working on developer tools"

## Error Handling

- **Ollama Unavailable**: Falls back to basic startup list without AI processing
- **No Relevant Data**: Returns message indicating no matches found
- **JSON Parsing Errors**: Gracefully handled with error messages
- **Invalid Requests**: Returns 400 status with error details

## Data Sources

- **Y Combinator**: 20 major YC startups (with fallback sample data)
- **Crunchbase**: 15 AI-focused startups (sample data)
- **Combined**: 35 total startup records

## Development

To add more data sources:

1. Create new scraper in `startup_scraper/`
2. Update `merge_data.js` to include new source
3. Run `npm run reload-data` or restart server

## Technologies Used

- **Backend**: Node.js, Express.js
- **AI Model**: Ollama (mistral)
- **HTTP Client**: Axios
- **Data Processing**: Native JavaScript
- **Scraping**: Cheerio (for HTML parsing)

## Notes

- The system uses keyword-based search (not semantic embeddings) for simplicity
- Ollama must be running locally on port 11434
- Data is loaded into memory for fast access
- CORS is enabled for frontend integration

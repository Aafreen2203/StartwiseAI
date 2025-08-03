# 🚀 StartwiseAI - AI-Powered Startup Evaluation Platform

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
- [Backend Architecture](#backend-architecture)
- [Flowise API Integration](#flowise-api-integration)
- [Usage Guide](#usage-guide)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🌟 Overview

**StartwiseAI** is an advanced startup idea evaluation platform that provides comprehensive analysis using RAG (Retrieval-Augmented Generation) and AI-powered insights. Unlike simple pitch deck generators, StartwiseAI evaluates your startup from multiple angles to give you actionable, data-driven recommendations.

### Key Value Propositions:

- **Comprehensive Analysis**: 6-section evaluation framework covering all aspects of startup viability
- **AI-Powered Insights**: Uses advanced Flowise API integration for intelligent analysis
- **RAG Technology**: Retrieval-Augmented Generation for context-aware evaluations
- **Professional Output**: Investor-ready pitch generation and market analysis
- **Real-time Processing**: Fast evaluation with robust error handling and fallback systems

## ✨ Features

### 🎯 Core Features

- **Startup Idea Evaluation**: Comprehensive analysis of business concepts
- **Uniqueness Assessment**: Competitor analysis and market differentiation
- **Tech Stack Recommendations**: Technology choices based on project requirements
- **Pitch Generation**: Professional elevator pitches for investors
- **Market Analysis**: Similar startups analysis and improvement suggestions
- **Success Probability**: Data-driven market statistics and risk assessment

### 🔧 Technical Features

- **Flowise API Integration**: Custom endpoint for AI processing
- **File Upload Support**: Attach documents for enhanced analysis
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Error Handling**: Robust fallback systems and user feedback
- **Real-time Loading**: Smooth user experience with loading states
- **Content Cleaning**: Removes AI artifacts and formats responses

## 💻 Technology Stack

### Frontend

- **React 18**: Modern UI library with hooks and context
- **TypeScript**: Type-safe development experience
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful and accessible component library
- **GSAP**: High-performance animations
- **Vite**: Fast build tool and dev server

### Backend Integration

- **Flowise API**: Custom AI agent endpoint
- **REST API**: HTTP communication with JSON payloads
- **File Processing**: Base64 encoding for file uploads
- **Error Recovery**: Fallback response generation

### Development Tools

- **ESLint**: Code linting and formatting
- **PostCSS**: CSS processing and optimization
- **Bun**: Fast package manager and runtime

## 🏗️ Project Architecture

### Data Flow Overview

```
User Input → Frontend Validation → Service Layer → HTTP Request → Flowise API → AI Agent → RAG Processing → Response → Content Cleaning → Section Parsing → UI Display
```

### Core Components

1. **Frontend Interface** (`src/pages/Index.tsx`)
2. **Service Layer** (`src/services/flowiseApi.ts`)
3. **UI Components** (`src/components/`)
4. **Flowise Integration** (Custom API endpoint)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun package manager
- Flowise API endpoint running locally

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-pitch-builder

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
bun dev
```

### Environment Setup

1. **Flowise API**: Ensure your Flowise API is running on `http://localhost:3000`
2. **API Endpoint**: The application uses endpoint `ef70d4dd-adea-47c3-9e1c-217214805adc`
3. **CORS**: Configure Flowise to allow requests from your frontend domain

## 🔧 Backend Architecture

### Service Layer (`src/services/flowiseApi.ts`)

#### Core Methods:

- **`generatePitchDeck()`**: Main evaluation orchestration
- **`formatEvaluationPrompt()`**: AI prompt engineering
- **`cleanResponse()`**: Content cleaning and formatting
- **`formatSections()`**: Section parsing and organization
- **`fileToBase64()`**: File upload processing
- **`getFallbackEvaluationResponse()`**: Error recovery

#### Evaluation Framework:

1. **Uniqueness Check**: Competitor analysis and differentiation
2. **Tech Stack Recommendation**: Technology choices and architecture
3. **Pitch Generation**: Investor-ready presentations
4. **Similar Startups**: Market landscape analysis
5. **Improvement Suggestions**: Enhancement recommendations
6. **Success Probability**: Market statistics and risk assessment

### Response Processing Pipeline:

```typescript
Raw API Response → Content Extraction → Artifact Removal → Section Parsing → Formatted Output
```

## 🌐 Flowise API Integration

### API Configuration

```typescript
const FLOWISE_API_URL =
  "http://localhost:3000/api/v1/prediction/ef70d4dd-adea-47c3-9e1c-217214805adc";
```

### Request Format

```json
{
  "question": "Structured evaluation prompt...",
  "uploads": ["base64_encoded_file"] // Optional
}
```

### Response Processing

- **Multi-field Support**: Handles `text`, `message`, `data` response fields
- **Content Cleaning**: Removes thinking processes and system messages
- **Section Parsing**: Organizes content into structured sections
- **Error Handling**: Graceful degradation with fallback responses

## 📖 Usage Guide

### Basic Evaluation

1. Enter your startup idea in the main form
2. Optionally specify industry and target audience
3. Upload relevant documents (optional)
4. Click "Evaluate Startup" to generate analysis
5. Review the 6-section comprehensive report

### Advanced Features

- **File Uploads**: Attach pitch decks, business plans, or market research
- **Industry Context**: Specify your target industry for relevant insights
- **Audience Targeting**: Define your target audience for focused analysis

### Expected Output Sections

1. **Uniqueness Check**: Market differentiation analysis
2. **Tech Stack**: Technology recommendations
3. **Pitch**: Investor-ready elevator pitch
4. **Competitors**: Similar startups analysis
5. **Improvements**: Enhancement suggestions
6. **Success Metrics**: Market statistics and probability

## 📁 Project Structure

```
ai-pitch-builder/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── HeroSection.tsx # Landing page hero
│   │   ├── PitchForm.tsx   # Evaluation form
│   │   └── PitchResults.tsx # Results display
│   ├── pages/
│   │   ├── Index.tsx       # Main application page
│   │   └── NotFound.tsx    # 404 error page
│   ├── services/
│   │   └── flowiseApi.ts   # Flowise API integration
│   ├── lib/
│   │   └── utils.ts        # Utility functions
│   └── hooks/              # Custom React hooks
├── public/                 # Static assets
├── components.json         # shadcn/ui configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── vite.config.ts          # Vite build configuration
└── package.json           # Dependencies and scripts
```

## 🔄 Development Workflow

### Local Development

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Quality

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Automated code linting and formatting
- **Component Architecture**: Modular, reusable React components
- **Service Layer**: Clean separation of API logic

## 🛠️ Troubleshooting

### Common Issues

#### Flowise API Connection

- **Issue**: API requests failing
- **Solution**: Ensure Flowise is running on `http://localhost:3000`
- **Check**: CORS settings in Flowise configuration

#### Response Parsing

- **Issue**: Malformed or incomplete responses
- **Solution**: Check Flowise agent configuration and prompt structure
- **Fallback**: System provides fallback responses for API failures

#### File Upload Errors

- **Issue**: File uploads not working
- **Solution**: Check file size limits and Base64 encoding
- **Supported**: Common document formats (PDF, DOC, TXT)

### Debugging Tools

- **Console Logging**: Detailed logs at each processing step
- **Error Boundaries**: React error handling for UI failures
- **Network Monitoring**: Browser dev tools for API debugging

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow TypeScript and React best practices
2. **Component Design**: Use shadcn/ui components for consistency
3. **API Integration**: Maintain service layer abstraction
4. **Testing**: Ensure all features work with Flowise API
5. **Documentation**: Update README for significant changes

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Implement changes with proper testing
4. Update documentation as needed
5. Submit pull request with clear description

---

**Built with ❤️ using React, TypeScript, Tailwind CSS, and Flowise AI**

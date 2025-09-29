# Blog Editor UI

A React-based blog writing application with AI-powered suggestions and real-time editing capabilities.

## Features

- **Authentication**: Amazon Cognito integration
- **Real-time Editing**: Auto-save functionality with debouncing
- **AI Suggestions**: Visual highlighting with one-click accept/reject workflow
- **Post Management**: Draft, review, and finalize workflow
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **TanStack Query** for server state management
- **AWS Amplify** for Cognito authentication

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your AWS Cognito configuration.

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard components
│   ├── editor/         # Editor components
│   └── common/         # Shared components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── pages/              # Page components
├── services/           # API services
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Suggestion Types

The application supports different types of suggestions with distinct visual styling:

- **LLM**: Blue highlighting - AI-generated content suggestions
- **Brand**: Purple highlighting - Brand guideline compliance
- **Fact**: Orange highlighting - Fact-checking suggestions
- **Grammar**: Green highlighting - Grammar corrections
- **Spelling**: Red highlighting - Spelling corrections

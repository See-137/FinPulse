# FinPulse Monorepo

A comprehensive financial portfolio tracking and analysis platform.

## Repository Structure

```
finpulse/
├── finpulse-app/     # Frontend React application
├── finpulse-infra/   # Infrastructure (AWS Lambda, CloudFormation, etc.)
└── README.md         # This file
```

## Components

### `/finpulse-app` - Frontend Application
React/Vite application for portfolio tracking, market analysis, and AI-powered insights.

- **Tech Stack:** React 19, TypeScript, Vite, Zustand
- **Features:** Portfolio tracking, whale alerts, sentiment analysis, AI chat
- **[App Documentation](./finpulse-app/README.md)**

### `/finpulse-infra` - Infrastructure
AWS infrastructure including Lambda functions, API Gateway, and CloudFormation templates.

- **[Infrastructure Documentation](./finpulse-infra/README.md)**

## Getting Started

### Frontend Development
```bash
cd finpulse-app
npm install
npm run dev
```

### Infrastructure Deployment
```bash
cd finpulse-infra
# See finpulse-infra/README.md for deployment instructions
```

## Contributing

See [CONTRIBUTING.md](./finpulse-app/CONTRIBUTING.md) for development guidelines.

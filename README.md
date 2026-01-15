# FinPulse Monorepo

A comprehensive financial portfolio tracking and analysis platform.

## Repository Structure

```
FinPulse/
├── app/          # Frontend React application
├── infra/        # Infrastructure (AWS Lambda, CloudFormation, etc.)
└── README.md     # This file
```

## Components

### `/app` - Frontend Application
React/Vite application for portfolio tracking, market analysis, and AI-powered insights.

- **Tech Stack:** React 19, TypeScript, Vite, Zustand
- **Features:** Portfolio tracking, whale alerts, sentiment analysis, AI chat
- **[App Documentation](./app/README.md)**

### `/infra` - Infrastructure
AWS infrastructure including Lambda functions, API Gateway, and CloudFormation templates.

- **[Infrastructure Documentation](./infra/README.md)**

## Getting Started

### Frontend Development
```bash
cd app
npm install
npm run dev
```

### Infrastructure Deployment
```bash
cd infra
# See infra/README.md for deployment instructions
```

## Contributing

See [CONTRIBUTING.md](./app/CONTRIBUTING.md) for development guidelines.

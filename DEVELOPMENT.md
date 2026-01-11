# FinPulse Development Guide

Complete guide for setting up and developing the FinPulse application with both traditional development tools and Claude Code.

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Environment Setup](#environment-setup)
- [Development with VS Code](#development-with-vs-code)
- [Development with Claude Code](#development-with-claude-code)
- [Seamless Transitions](#seamless-transitions)
- [Project Architecture](#project-architecture)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Check versions
node --version    # Should be v18+
npm --version     # Should be v9+
git --version     # Latest recommended
```

### Installation

```bash
# 1. Clone repositories
git clone https://github.com/See-137/FinPulse.git
git clone https://github.com/See-137/finpulse-infrastructure.git

# 2. Setup frontend
cd FinPulse
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start development server
npm run dev
```

🎉 **Done!** Visit http://localhost:3000

---

## ⚙️ Environment Setup

### Environment Variables

Create `.env` file in `FinPulse/` directory:

```bash
# API Configuration
VITE_API_URL=https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod

# AWS Cognito Authentication
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1

# Gemini AI (Optional - can use backend proxy)
VITE_GEMINI_API_KEY=your_api_key_here

# Feature Flags
VITE_ENABLE_AI=true
VITE_ENABLE_COMMUNITY=true
VITE_ENABLE_NEWS=true

# Development Settings
VITE_TOKEN_STORAGE_MODE=localStorage  # or 'cookie' for production
```

**⚠️ IMPORTANT**: Never commit `.env` files to git!

### Configuration Files

#### `vite.config.ts` - Build Configuration
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com'
    }
  }
});
```

#### `tsconfig.json` - TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "jsx": "react-jsx"
  }
}
```

---

## 💻 Development with VS Code

### Recommended Extensions

Install these VS Code extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",           // ESLint
    "esbenp.prettier-vscode",           // Prettier
    "bradlc.vscode-tailwindcss",        // Tailwind CSS IntelliSense
    "ms-vscode.vscode-typescript-next", // TypeScript
    "usernamehw.errorlens",             // Error highlighting
    "streetsidesoftware.code-spell-checker" // Spell checker
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

### Development Workflow

```bash
# Terminal 1: Frontend dev server
cd FinPulse
npm run dev

# Terminal 2: Run tests in watch mode
npm run test:watch

# Terminal 3: Type checking
npm run type-check -- --watch
```

### Debugging

**Launch Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/FinPulse"
    }
  ]
}
```

**Usage**:
1. Set breakpoints in VS Code
2. Press F5 or click "Run and Debug"
3. Chrome opens with debugger attached

---

## 🤖 Development with Claude Code

### What is Claude Code?

Claude Code is an AI-powered development assistant that can:
- ✅ Review code and find bugs
- ✅ Implement features autonomously
- ✅ Refactor complex components
- ✅ Write tests
- ✅ Fix security vulnerabilities
- ✅ Create documentation

### Getting Started with Claude Code

1. **Install Claude Code** (if not already installed)
   ```bash
   npm install -g @anthropic/claude-code
   ```

2. **Navigate to Project**
   ```bash
   cd C:\Users\olegh\Desktop\FinPulse-client
   ```

3. **Start Claude Code**
   ```bash
   claude-code
   ```

### Common Claude Code Tasks

#### Code Review
```
"Review the PortfolioView component and suggest improvements"
"Check the authService for security vulnerabilities"
"Analyze the codebase for performance issues"
```

#### Feature Implementation
```
"Add a dark mode toggle to the settings page"
"Implement CSV export for portfolio data"
"Create a dashboard widget for top performing assets"
```

#### Bug Fixes
```
"Fix the login redirect loop issue"
"Debug why the market prices aren't updating"
"Resolve the TypeScript errors in components/"
```

#### Refactoring
```
"Extract shared utility functions from PortfolioView"
"Refactor App.tsx - it's too large (771 lines)"
"Split the mega-component into smaller focused components"
```

#### Testing
```
"Add unit tests for the authentication service"
"Create E2E tests for the login flow"
"Increase test coverage for portfolio operations"
```

### Claude Code Best Practices

1. **Be Specific**
   ```
   ❌ "Make the app better"
   ✅ "Add error handling to the portfolio API calls with user-friendly messages"
   ```

2. **Review the Plan**
   - Claude enters "plan mode" for complex tasks
   - Review the approach before approving
   - Ask clarifying questions

3. **Verify Changes**
   ```bash
   # After Claude makes changes:
   npm run lint
   npm run type-check
   npm run test
   npm run dev  # Test in browser
   ```

4. **Commit Regularly**
   ```
   "Commit these changes with a descriptive message"
   # Claude will create a well-formatted commit
   ```

### Claude Code Commands

```bash
# In chat interface:
/help                 # Show available commands
/clear                # Clear conversation history
/tasks                # View background tasks
/settings             # View configuration

# Let Claude handle git operations:
"Show me what changed"
"Commit these security fixes"
"Create a pull request for this feature"
"Check the git status"
```

---

## 🔄 Seamless Transitions

### Workflow: VS Code → Claude Code

**1. Save Your Work**
```bash
# In VS Code terminal or Git GUI
git add .
git commit -m "wip: [description of current progress]"
git push
```

**2. Document Context**
Create a quick note in `WORK_LOG.md`:
```markdown
## 2026-01-11 - 15:30
Working on portfolio analytics feature:
- ✅ Created PremiumAnalytics component
- ⏳ Need to add chart visualizations
- ⏳ Need to implement data calculations
- 🔴 Blocked: waiting on API endpoint for historical data
```

**3. Start Claude Code**
```bash
cd FinPulse
claude-code
```

**4. Give Context to Claude**
```
"I was working on the portfolio analytics feature.
Check WORK_LOG.md for current status.
Continue where I left off - need to add chart visualizations."
```

### Workflow: Claude Code → VS Code

**1. Let Claude Commit**
```
"Commit all changes with descriptive messages"
"Push to GitHub"
```

**2. Update Work Log**
```
"Update WORK_LOG.md with what was completed"
```

**3. Switch to VS Code**
```bash
# In VS Code terminal:
git pull
npm install  # In case dependencies changed
npm run dev  # Verify everything works
```

### Work Log Template

Create `WORK_LOG.md` in project root:

```markdown
# FinPulse Development Work Log

## 2026-01-11

### Morning Session (VS Code)
- ✅ Fixed XSS vulnerability in MarkdownRenderer
- ✅ Added ErrorBoundary component
- ⏳ Started portfolio analytics feature

**Next Steps**:
- Add chart visualizations
- Implement data aggregation
- Write unit tests

### Afternoon Session (Claude Code)
- ✅ Completed chart visualizations with Recharts
- ✅ Implemented performance calculations
- ✅ Added unit tests (85% coverage)

**Handoff Notes**:
- Charts are working but need styling polish
- Consider adding export to PDF feature
```

### Sync Checklist

**Before Every Session**:
- [ ] Pull latest changes: `git pull`
- [ ] Install dependencies: `npm install`
- [ ] Check work log for context
- [ ] Run tests: `npm run test`

**After Every Session**:
- [ ] Commit all changes
- [ ] Push to GitHub
- [ ] Update work log
- [ ] Document any blockers

---

## 🏗️ Project Architecture

### Frontend Structure

```
FinPulse/
├── components/              # React components
│   ├── LandingPage.tsx     # Marketing page
│   ├── LoginPage.tsx       # Authentication
│   ├── PortfolioView.tsx   # Main dashboard
│   ├── AIAssistant.tsx     # AI chat
│   ├── ErrorBoundary.tsx   # Error handling
│   └── ...
├── services/                # Business logic & API
│   ├── apiService.ts       # HTTP client
│   ├── authService.ts      # Authentication
│   ├── portfolioService.ts # Portfolio CRUD
│   ├── geminiService.ts    # AI integration
│   └── ...
├── store/                   # State management
│   └── portfolioStore.ts   # Zustand store
├── hooks/                   # Custom React hooks
│   └── useMarketData.ts    # Market data hook
├── types/                   # TypeScript types
│   └── index.ts
├── utils/                   # Utility functions
└── App.tsx                 # Main app component
```

### Backend Structure (Lambda Functions)

```
finpulse-infrastructure/lambda-code/
├── auth/                    # Authentication
├── portfolio/               # Portfolio management
├── market-data/             # Price data
├── ai/                      # Gemini AI proxy
├── community/               # Social features
├── admin/                   # Admin functions
└── fx/                      # Foreign exchange rates
```

### Data Flow

```
Component
  ↓ (uses)
Custom Hook (usePortfolio)
  ↓ (calls)
Service Layer (portfolioService)
  ↓ (HTTP)
API Client (apiService)
  ↓ (AWS)
API Gateway
  ↓ (triggers)
Lambda Function
  ↓ (reads/writes)
DynamoDB
```

---

## 🛠️ Common Tasks

### Adding a New Component

```bash
# 1. Create component file
touch FinPulse/components/NewFeature.tsx

# 2. Create test file
touch FinPulse/src/components/NewFeature.test.tsx

# 3. Implement component
# See CONTRIBUTING.md for code standards

# 4. Add to exports
echo "export { NewFeature } from './NewFeature';" >> FinPulse/components/index.ts

# 5. Write tests
npm run test:watch

# 6. Use in app
# Import and use in App.tsx or other components
```

### Adding a New API Endpoint

```bash
# 1. Update Lambda function
vim finpulse-infrastructure/lambda-code/portfolio/index.js

# 2. Add route handler
# Follow existing patterns

# 3. Update Terraform (if new endpoint)
vim finpulse-infrastructure/modules/api-gateway/main.tf

# 4. Deploy to staging
cd finpulse-infrastructure
terraform workspace select staging
terraform apply

# 5. Test endpoint
curl -X GET https://staging-api.finpulse.me/portfolio/test

# 6. Deploy to production
terraform workspace select prod
terraform apply
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update <package-name>

# Update all (careful!)
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Test after updates
npm run test:all
npm run build
```

### Running Production Build Locally

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Visit http://localhost:3000
```

---

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or change port in vite.config.ts
server: { port: 3001 }
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.vite
rm -rf dist

# Restart TypeScript server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

#### Git Conflicts

```bash
# Abort merge
git merge --abort

# Or resolve conflicts manually
# 1. Open conflicted files
# 2. Choose which changes to keep
# 3. Remove conflict markers (<<<<, ====, >>>>)
# 4. Stage resolved files
git add .
git commit -m "Resolve merge conflicts"
```

#### Environment Variables Not Working

```bash
# Vite requires VITE_ prefix
VITE_API_URL=...  # ✅ Works
API_URL=...       # ❌ Won't work

# Restart dev server after .env changes
# Vite only reads .env on startup
```

---

## 📚 Additional Resources

### Documentation
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [SECURITY_FIXES_REPORT.md](./SECURITY_FIXES_REPORT.md) - Security audit
- [DEPLOYMENT_READINESS.md](./DEPLOYMENT_READINESS.md) - Production status

### External Docs
- [React Docs](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Redux DevTools](https://chrome.google.com/webstore/detail/redux-devtools/)
- [AWS CloudWatch](https://console.aws.amazon.com/cloudwatch/)

---

## 🎯 Next Steps

1. ✅ Complete initial setup
2. ✅ Review project architecture
3. ⏳ Try making a small change
4. ⏳ Run tests and verify
5. ⏳ Commit and push to GitHub
6. ⏳ Try transitioning between VS Code and Claude Code

---

**Happy Coding!** 🚀

For questions or help, see [CONTRIBUTING.md](./CONTRIBUTING.md#-getting-help)

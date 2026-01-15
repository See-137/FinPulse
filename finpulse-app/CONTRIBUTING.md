# Contributing to FinPulse

Thank you for considering contributing to FinPulse! This document provides guidelines for contributing to the project.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Working with Claude Code](#working-with-claude-code)
- [Testing Requirements](#testing-requirements)
- [Security Guidelines](#security-guidelines)
- [Pull Request Process](#pull-request-process)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Git**: Latest version
- **AWS CLI**: For infrastructure deployment
- **Terraform**: v1.5+ for infrastructure changes

### Repository Structure

```
FinPulse-client/
├── FinPulse/                      # React frontend application
│   ├── components/                # React components
│   ├── services/                  # API & business logic
│   ├── store/                     # Zustand state management
│   ├── hooks/                     # Custom React hooks
│   └── types/                     # TypeScript type definitions
│
├── finpulse-infrastructure/       # AWS infrastructure (Terraform)
│   ├── lambda-code/               # Lambda function source code
│   ├── modules/                   # Reusable Terraform modules
│   └── .github/workflows/         # CI/CD pipelines
│
├── SECURITY_FIXES_REPORT.md       # Security audit & fixes
├── DEPLOYMENT_READINESS.md        # Production deployment status
└── CONTRIBUTING.md                # This file
```

### Initial Setup

```bash
# Clone the repositories
git clone https://github.com/See-137/FinPulse.git
git clone https://github.com/See-137/finpulse-infrastructure.git

# Setup frontend
cd FinPulse
npm install
cp .env.example .env    # Configure your environment variables
npm run dev             # Start development server

# Setup infrastructure (optional)
cd ../finpulse-infrastructure
terraform init
```

---

## 🔄 Development Workflow

### Daily Workflow

1. **Start Your Day**
   ```bash
   git pull origin main
   npm install  # In case dependencies changed
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-number-description
   ```

3. **Make Changes & Test**
   ```bash
   npm run dev          # Development server
   npm run test         # Run unit tests
   npm run lint         # Check code style
   npm run type-check   # TypeScript validation
   ```

4. **Commit Often**
   ```bash
   git add .
   git commit -m "feat: Add user authentication"
   git push origin feature/your-feature-name
   ```

### Switching Between VS Code and Claude Code

**Before Switching from VS Code:**
```bash
# Save and commit your work
git add .
git commit -m "wip: [description of current work]"
git push
```

**When Starting in Claude Code:**
```bash
# Claude Code will automatically pull latest changes
# Or manually: git pull origin main
```

**Pro Tip**: Use descriptive WIP (Work In Progress) commits that can be squashed later:
```bash
git commit -m "wip: implementing portfolio analytics - 50% done"
```

---

## 📝 Coding Standards

### TypeScript

- **Strict Mode**: Enable `strict: true` in `tsconfig.json`
- **No `any` Types**: Use proper types or `unknown` + type guards
- **Explicit Return Types**: Always declare function return types
- **Interface over Type**: Prefer `interface` for object shapes

```typescript
// ✅ Good
interface User {
  id: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function getUser(id: any): any {
  // ...
}
```

### React Components

- **Functional Components**: Use hooks, no class components
- **TypeScript Props**: Always type component props
- **Naming**: PascalCase for components, camelCase for utilities
- **File Organization**: One component per file

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
};

// ❌ Bad
export const Button = (props: any) => {
  return <button {...props} />;
};
```

### Error Handling

- **Never Silent Catch**: Always log errors
- **User Feedback**: Show user-friendly error messages
- **Error Boundaries**: Wrap components in ErrorBoundary

```typescript
// ✅ Good
try {
  await apiCall();
} catch (error) {
  console.error('API call failed:', error);
  showUserError('Unable to load data. Please try again.');
  throw error; // Re-throw if needed
}

// ❌ Bad
try {
  await apiCall();
} catch {}  // Silent failure
```

### Security Best Practices

1. **Never Hardcode Secrets**: Use environment variables
2. **Sanitize User Input**: Use DOMPurify for HTML, validate all inputs
3. **Secure API Calls**: Always include authentication headers
4. **CORS Configuration**: Restrict to `https://finpulse.me`
5. **XSS Prevention**: Use `marked` + `DOMPurify` for markdown

---

## 🌿 Git Workflow

### Branch Naming Convention

```
feature/add-portfolio-analytics       # New features
bugfix/fix-login-redirect            # Bug fixes
security/fix-xss-vulnerability       # Security patches
refactor/extract-auth-service        # Code refactoring
docs/update-contributing-guide       # Documentation
test/add-portfolio-tests             # Test additions
chore/update-dependencies            # Maintenance
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `security`: Security fix
- `refactor`: Code refactoring
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Maintenance
- `perf`: Performance improvement

**Examples:**

```bash
# Simple commit
git commit -m "feat: Add portfolio export to CSV"

# Detailed commit
git commit -m "fix(auth): Resolve OAuth redirect loop

- Added proper state validation
- Fixed token refresh logic
- Added error logging for debugging

Fixes #123"

# Breaking change
git commit -m "feat!: Migrate to httpOnly cookies

BREAKING CHANGE: Token storage moved from localStorage to cookies.
Users will need to re-authenticate."
```

### Merging Strategy

1. **Rebase Before Merge** (Keep history clean)
   ```bash
   git checkout main
   git pull
   git checkout feature/your-feature
   git rebase main
   ```

2. **Squash WIP Commits**
   ```bash
   git rebase -i main
   # Mark commits as 'squash' or 'fixup'
   ```

3. **Create Pull Request**
   - Provide clear description
   - Link related issues
   - Add screenshots if UI changes
   - Request review from team members

---

## 🤖 Working with Claude Code

### Best Practices

1. **Start with Clear Instructions**
   ```
   "Review the authentication service and identify security vulnerabilities"
   "Add error handling to the portfolio API calls"
   "Refactor PortfolioView component - it's too large"
   ```

2. **Review Claude's Plan**
   - Claude will enter plan mode for complex tasks
   - Review the plan before approving
   - Ask questions if anything is unclear

3. **Check Generated Code**
   - Always review code changes
   - Run tests: `npm run test`
   - Check linting: `npm run lint`
   - Verify in browser: `npm run dev`

4. **Commit Claude's Changes**
   - Claude adds Co-Authored-By footer automatically
   - Review the commit message
   - Edit if needed before pushing

### Claude Code Commands

```bash
# In Claude Code chat:
/help                    # Show available commands
/clear                   # Clear conversation
/tasks                   # View background tasks

# Let Claude handle git:
"Commit these changes with a descriptive message"
"Create a pull request for this feature"
"Show me what files changed"
```

### Transition Checklist

**Before Handing Off to Claude:**
- [ ] Commit current work or stash changes
- [ ] Push to GitHub
- [ ] Document what you were working on
- [ ] Note any blockers or questions

**When Taking Over from Claude:**
- [ ] Pull latest changes: `git pull`
- [ ] Review recent commits: `git log -5`
- [ ] Read any new documentation
- [ ] Run tests to verify everything works

---

## 🧪 Testing Requirements

### Required Tests

All code must include appropriate tests:

- **Unit Tests**: For utility functions and hooks
- **Component Tests**: For React components
- **Integration Tests**: For API interactions
- **E2E Tests**: For critical user flows

### Running Tests

```bash
# Unit tests
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# E2E tests
npm run test:e2e          # Headless
npm run test:e2e:ui       # Interactive UI
npm run test:e2e:headed   # Headed browser

# All tests
npm run test:all
```

### Test Coverage Requirements

- **Minimum**: 50% overall coverage
- **Critical Paths**: 80%+ coverage
  - Authentication flows
  - Portfolio CRUD operations
  - Payment processing
  - Admin functions

### Writing Tests

```typescript
// Component test example
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should render with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vitest.fn();
    render(<Button label="Click me" onClick={handleClick} />);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🔒 Security Guidelines

### Security Review Checklist

Before submitting code, ensure:

- [ ] No hardcoded credentials or API keys
- [ ] User input is validated and sanitized
- [ ] Authentication tokens are secure (httpOnly cookies)
- [ ] CORS is properly configured
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies are up to date (`npm audit`)
- [ ] SQL/NoSQL injection prevention
- [ ] XSS prevention (use DOMPurify)

### Sensitive Data

**Never Commit:**
- `.env` files (use `.env.example` templates)
- AWS credentials
- API keys
- Private keys
- User data or PII

**Use Environment Variables:**
```typescript
// ✅ Good
const apiKey = import.meta.env.VITE_API_KEY;

// ❌ Bad
const apiKey = 'sk-1234567890abcdef';
```

### Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

Instead:
1. Email: security@finpulse.me
2. Include: Description, reproduction steps, impact
3. Wait for confirmation before disclosure

---

## 🔀 Pull Request Process

### Before Creating PR

1. **Update from main**
   ```bash
   git checkout main
   git pull
   git checkout your-branch
   git rebase main
   ```

2. **Run All Checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run build  # Ensure it builds
   ```

3. **Update Documentation**
   - Update README if needed
   - Add to CHANGELOG.md
   - Document new environment variables

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Commented complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally

## Screenshots (if applicable)

## Related Issues
Fixes #123
```

### Review Process

1. **Create PR** with clear title and description
2. **Request Review** from at least one team member
3. **Address Feedback** promptly
4. **Squash Commits** if needed
5. **Merge** only after approval + passing CI

### CI/CD Pipeline

All PRs must pass:
- ✅ ESLint checks
- ✅ TypeScript compilation
- ✅ Unit tests
- ✅ Build succeeds
- ✅ No critical security vulnerabilities

---

## 📚 Additional Resources

### Documentation
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup guide
- [SECURITY_FIXES_REPORT.md](./SECURITY_FIXES_REPORT.md) - Recent security audit
- [DEPLOYMENT_READINESS.md](./DEPLOYMENT_READINESS.md) - Production status

### External Resources
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

### Tools
- [VS Code](https://code.visualstudio.com/) - Recommended IDE
- [Claude Code](https://claude.ai/code) - AI-powered development
- [Postman](https://www.postman.com/) - API testing

---

## 💬 Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create a GitHub Issue
- **Chat**: Join our Discord server
- **Email**: dev@finpulse.me

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to FinPulse!** 🚀

Your contributions help make financial portfolio management accessible to everyone.

# FinPulse AI Assistant Instructions

## Memory System (claude-mem)
This project uses claude-mem MCP for persistent memory across sessions.

### Triggers - ALWAYS recognize these:
- `<<` or `<< [topic]` = Query claude-mem for context, run: `mcp_claude-mem_chroma_query_documents` on collection "finpulse-memories"
- `>>` or `>> [summary]` = Save to claude-mem collection "finpulse-memories"  
- `><` = Show memory status via `mcp_claude-mem_chroma_get_collection_info`

### On session start:
If user says "<<" or asks for context, query the finpulse-memories collection and summarize relevant memories.

### On session end:
If user says ">>" save a summary of the session's work to finpulse-memories.

## Project Context
- **Project**: FinPulse - Financial portfolio tracking SaaS
- **Start Date**: January 2, 2026
- **Production URL**: https://finpulse.me
- **Tech Stack**: React 19, TypeScript, Vite 6, AWS (Cognito, Lambda, DynamoDB, API Gateway)

## Key Files
- `finpulse-app/` - Frontend React application
- `finpulse-infra/` - Terraform infrastructure code
- `finpulse-app/services/authService.ts` - Authentication logic
- `finpulse-app/store/portfolioStore.ts` - State management

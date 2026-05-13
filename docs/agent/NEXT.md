# Next-Session Pickup Notes

> Read this first when starting a new agent session on FinPulse.
> Last updated: 2026-05-13 (after backlog execution sweep)

This file is the **pointer** to what to do next. Full historical context lives in `MEMORY.md`. Decisions live in `DECISIONS.md`. Operational procedures live in `RUNBOOK.md`.

---

## 0. First-30-seconds checklist

```bash
git checkout main && git pull origin main
git log --oneline -5
git status --short
gh pr list --state open
```

If anything in `git status` shows uncommitted work that wasn't yours, **stop and ask the operator** before doing anything else.

---

## 1. Project state as of 2026-05-13 EOD

- **Production is current.** Frontend bumps merged: `@types/node 25`, `lucide-react 1.14`, `@sentry/react 10`. Lambda bumps: `zod 4.4.3`, `archiver 8`. GitHub Actions group bumped via #78.
- **8 PRs opened during this sweep**, classified by gate level below.
- **Dependabot tracking issue [#83](https://github.com/see-137/finpulse/issues/83)** updated with merged/closed/pending state.

### Open PRs awaiting operator action (priority order)

| PR | Title | Gate | Blocking on |
|---|---|---|---|
| [#87](https://github.com/see-137/finpulse/pull/87) | deps(terraform): aws ~> 6.44 (root + 6 modules) | **C — Hard Stop** | Operator must (a) patch `modules/secrets/main.tf` (permission-restricted from agent), (b) run `terraform plan` + apply |
| [#88](https://github.com/see-137/finpulse/pull/88) | infra(oidc): GitHub Actions OIDC + workflow migration | **C — Hard Stop** | #87 must apply first; then operator applies OIDC + sets GH variables `AWS_OIDC_ROLE_DEPLOY` / `AWS_OIDC_ROLE_TERRAFORM` |
| [#85](https://github.com/see-137/finpulse/pull/85) | infra(terraform): extract backend config to prod.tfbackend | **B** | Operator runs local `terraform init -reconfigure -backend-config=prod.tfbackend` + `state list` matches before merge |
| [#90](https://github.com/see-137/finpulse/pull/90) | chore(infra): close 3 open-debt items (Cognito ADR, payments throttle, WAF closure) | **B** | Operator runs `terraform plan` to confirm exactly 2 new method_settings creates, no replacements |
| [#89](https://github.com/see-137/finpulse/pull/89) | backend(admin): paginate DynamoDB scans + GDPR scope | **A** | CI green → admin-merge → redeploy admin Lambda |
| [#84](https://github.com/see-137/finpulse/pull/84) | ci(terraform): build Lambda layer zip in plan/apply | **A** | CI green → admin-merge |
| [#86](https://github.com/see-137/finpulse/pull/86) | chore(dependabot): fix testing/vite group patterns | **A** | CI green → admin-merge |
| [#51](https://github.com/see-137/finpulse/pull/51) | deps(frontend): bump react group (19.2.4 → 19.2.6) | **A** + smoke | Operator runs `preview_start`, renders /portfolio /community /legal, then admin-merge |
| [#52](https://github.com/see-137/finpulse/pull/52) | deps(frontend): bump vite group (plugin-react 5→6) | **A** + smoke | Same as #51. `vite.config.ts` uses `react()` with no Babel options → plugin-react 6.0 Babel removal does not affect us |

### Closed during sweep (do not reopen)
- #54 testing-group (peer-dep block — re-issue blocked by #86 config fix; new Dependabot PR will come next Monday)
- #55 linting-group ESLint 10 (peer-dep blocked by `eslint-plugin-react-hooks@7.0.1`)
- #57 typescript 6 (peer-dep blocked by `@typescript-eslint/eslint-plugin@8.x`)
- #76 superseded by #87

---

## 2. Top of the backlog (after closing PRs above)

### 2.1 — Trim OIDC role IAM policies (follow-up to #88)
**Why:** PR #88 attaches `AdministratorAccess` to both OIDC roles as a parity-preserving placeholder. This defeats the least-privilege intent of the migration.

**Approach:**
- `github-actions-finpulse-deploy`: needs S3 PutObject + sync (frontend bucket), CloudFront CreateInvalidation, Lambda UpdateFunctionCode + GetFunction, basic CloudWatch Logs
- `github-actions-finpulse-terraform`: needs broad read for plan + write for apply against ALL resource types Terraform manages. Hardest to trim; consider split into `terraform-plan` (read-only) and `terraform-apply` (write).

**Effort:** medium (~2 hours). **Gate:** Level C (IAM policy changes).

### 2.2 — Add GSIs for admin endpoints (follow-up to #89)
**Why:** PR #89 paginates the Scans but doesn't address the underlying inefficiency. `getRecentUsers` still has no way to do a true "recent" sort; `getAIUsage` still scans the whole ai-queries table to filter by date.

**Approach:**
- GSI on `users.createdAt` (with a sparse partition key like `user-by-date`) — enables `Query` instead of paginated `Scan`
- GSI on `ai-queries.timestamp` — same pattern

**Effort:** medium (~3 hours including FE response-shape coordination). **Gate:** Level B (DynamoDB schema change).

### 2.3 — Vitest infrastructure for `lambda-code/`
**Why:** No Lambda code in this repo has unit tests. PR #89's `paginatedScan` and `listUsers` would benefit from cursor edge-case tests. Repo currently has no test runner for `lambda-code/`.

**Approach:** Add `vitest.config.ts` at `finpulse-infra/lambda-code/`, devDependencies (vitest, `@aws-sdk/client-dynamodb`, `aws-sdk-client-mock`), add a smoke test per Lambda, wire into the `Lambda` CI job.

**Effort:** medium (~3 hours). **Gate:** Level A.

### 2.4 — M5 admin Scan pagination follow-up
Status: PR #89 handles this. Once merged + deployed, this item is closed.

---

## 3. Gotchas — verify before touching anything

- **Permission boundary on `finpulse-infra/modules/secrets/main.tf`:** the file is not readable to the agent. Operator must patch this file by hand for any module-wide provider bump (proven during the AWS v6 sweep — PR #87 finding).
- **`@vitest/coverage-v8` peer-dep:** the testing-group `vitest*` pattern in `.github/dependabot.yml` does NOT match `@vitest/coverage-v8` (scoped package). PR #86 fixes this. Until #86 merges, any vitest major bump will fail in CI.
- **Lambda-layer zip path is gitignored** at `finpulse-infra/.gitignore:52` (`lambda-layers/shared-utils.zip`). CI plan/apply jobs need PR #84 merged to rebuild it.
- **Dependabot doesn't recurse into child-module `required_providers`:** for any provider major bump, expect to update the root `main.tf` AND every child module's `required_providers` block (7 places for the AWS provider). See PR #87.
- **`terraform.tfvars` is already clean** (no `enable_staging_environment`).
- **`vite.config.ts` calls `react()` with no Babel options** — plugin-react 6.0's Babel removal is therefore moot for this codebase (relevant when smoke-checking #52).
- **Self-approval rejected.** GitHub MCP authenticates as See-137. Do not call `pull_request_review_write` with `event: APPROVE` — use `gh pr merge --admin` directly.

---

## 4. Files to read for full context

| File | What it covers |
|---|---|
| `docs/agent/MEMORY.md` | Stable project facts, commands, conventions, session summaries |
| `docs/agent/DECISIONS.md` | ADR-style decisions with rationale (now through ADR-021) |
| `docs/agent/RUNBOOK.md` | Deployment, rollback, incident procedures |
| `CLAUDE.md` | Operating manual: autonomy levels, Terraform rules, repo discipline |
| `~/.claude/plans/plan-properly-how-to-zazzy-cerf.md` | Backlog execution plan that produced this PR set |

---

## 5. After current PRs land — what changes for this file

- Strike out PRs #84, #85, #86, #89, #90 from §1 table after merge
- Strike out #87, #88 after operator authorization + apply
- Move §2.1 (trim OIDC policies) to top once OIDC migration completes
- Update §1 to note "no long-lived AWS credentials in GitHub Secrets" once #88 ships + secrets are deleted

# Next-Session Pickup Notes

> Read this first when starting a new agent session on FinPulse.
> Last updated: 2026-04-29 (after Stage A–D security review delivery)

This file is the **pointer** to what to do next. Full historical context lives in `MEMORY.md`. Decisions live in `DECISIONS.md`. Operational procedures live in `RUNBOOK.md`.

---

## 0. First-30-seconds checklist

```bash
# Sync local with remote main
git checkout main && git pull origin main

# Confirm latest commits match expectations
git log --oneline -5

# Verify clean tree
git status --short
```

If anything in `git status` shows uncommitted work that wasn't yours, **stop and ask the operator** before doing anything else — the §17 rule about not assuming state still applies.

---

## 1. Project state as of 2026-04-29 EOD

- **Production is current** with all Critical + High security review fixes from the local-vs-remote review (PRs #63, #65, #66, #67, #68, #69, #70, #71, #72).
- **GSI in use:** `finpulse-subscriptions.lemonSqueezySubscriptionId-index` is ACTIVE and queried by the payments Lambda.
- **Deploy gates removed:** push-to-main → auto-deploy. No manual approval step in `deploy.yml` or `deploy-lambdas.yml`.
- **Auto-merge convention:** the agent uses `mcp__github__merge_pull_request` (admin override) after CI green. Do not auto-merge before required checks complete — see MEMORY.md §"Direct admin-merge".

---

## 2. Top of the backlog (priority order)

These are the next items worth picking up. All require operator authorization for AWS apply (CLAUDE.md §2.4).

### 2.1 — Lambda-layer zip build step in `terraform.yml` (unblocks CI apply)

**Why:** the only thing standing between us and fully CI-driven `terraform apply` is that `lambda-layers/shared-utils.zip` is gitignored (build artifact). CI's plan job hits `filebase64sha256("...")` and errors. Fixing this means Stage E and F can ship via CI without local apply.

**Approach:** add a step in `terraform.yml`'s `validate` and `plan` jobs that does:
```yaml
- name: Build Lambda layer zip
  run: |
    cd finpulse-infra/lambda-layers/shared-utils/nodejs
    npm ci --omit=dev
    cd ../..
    zip -r shared-utils.zip shared-utils/nodejs
```
Test on a no-op infra PR before relying on it.

**Effort:** small (~30 mins). **Gate:** Level A (workflow-only).

### 2.2 — Stage E: H1 OIDC migration

**Why:** AWS auth in `deploy.yml`, `deploy-lambdas.yml`, `terraform.yml` uses long-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` GH Secrets. Industry-standard fix is OIDC + assume-role for short-lived STS tokens.

**Multi-step:**
1. Terraform: create OIDC provider + IAM role with trust policy locked to `repo:see-137/finpulse:*`
2. `terraform apply` (operator authorization required — Hard Stop)
3. Verify role exists via `aws sts assume-role-with-web-identity` test
4. Update workflows: replace `aws-access-key-id`/`aws-secret-access-key` with `role-to-assume`
5. Verify a deploy works with the new auth
6. Rotate (delete) the old IAM user keys

**Effort:** medium (~2 hours of work + apply gates). **Gate:** Level C (Terraform apply + IAM mutation).

### 2.3 — Stage F: H4 backend `.tfbackend` file

**Why:** `finpulse-infra/main.tf` line ~19 hardcodes `bucket = "finpulse-terraform-state-383349724213"`. Account id baked into code; can't reuse the module elsewhere.

**Approach:** move backend config to a separate `prod.tfbackend` file passed via `terraform init -backend-config=prod.tfbackend`. CI workflow needs the same flag.

**Effort:** small (~30 mins). **Gate:** Level B — touches state backend wiring; needs deliberate `terraform init -reconfigure`.

### 2.4 — M5 admin Scan pagination + GDPR scope

**Why:** `lambda-code/admin/index.js` has 5 list-style Scans (`getStats`, `getRecentUsers`, `getPlanDistribution`, `getAIUsage`, scan-by-userId in community endpoints). They scale linearly and `getRecentUsers` returns full email + plan + timestamps with no pagination — GDPR-relevant if these endpoints are ever exposed beyond admin.

**Approach:** introduce LastEvaluatedKey-based pagination, `ProjectionExpression` to fetch only needed fields, and explicit `Limit` defaults. May involve API Gateway response shape changes — check FE callers in admin portal.

**Effort:** medium (~3 hours). **Gate:** Level B (admin behavior change, touches FE coordination).

---

## 3. Gotchas — verify before touching anything

- **Operator's local `terraform.tfvars` still has `enable_staging_environment = false`.** That variable was deleted in PR #69. Terraform warns but doesn't error. Suggest the operator strips the line if it bothers them.
- **Lambda-layer zip path is gitignored** (`finpulse-infra/.gitignore` line 16: `lambda-layers/shared-utils.zip`). Do not commit the zip; build it.
- **CI plan workflow** runs against the operator's intended config thanks to `prod.auto.tfvars` (PR #70). If you see drift in plan output that doesn't match operator intent, suspect the tfvars file is missing a value rather than reaching for state surgery.
- **NAT/EIP state surgery (2026-04-29)** has been done. State now matches AWS. If a future plan suggests creating a NAT gateway, **STOP** — that's a regression of this work. Verify against `aws ec2 describe-nat-gateways`.
- **Self-approval is rejected.** GitHub MCP authenticates as See-137 (the repo owner). Do not call `pull_request_review_write` with `event: APPROVE` — it'll error. Use `merge_pull_request` directly (admin override).

---

## 4. Files to read for full context

| File | What it covers |
|---|---|
| `docs/agent/MEMORY.md` | Stable project facts, commands, conventions, session summaries |
| `docs/agent/DECISIONS.md` | ADR-style decisions with rationale |
| `docs/agent/RUNBOOK.md` | Deployment, rollback, incident procedures |
| `CLAUDE.md` | Operating manual: autonomy levels, Terraform rules, repo discipline |

---

## 5. After Stage E/F land — what changes for this file

- Strike out 2.1 and 2.2 from the priority list (or move under "Done").
- Add the Medium/Low backlog items as new top-3.
- Update §1 to note OIDC is in use and there are no long-lived AWS credentials in GitHub Secrets.

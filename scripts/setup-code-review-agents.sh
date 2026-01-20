#!/bin/bash

# =============================================================================
# Setup Code Review Agents
# =============================================================================
# This script sets up the code review agent workflows in any project.
# Run from any project directory to add the slash command workflows.
#
# Usage:
#   ./setup-code-review-agents.sh [target_directory]
#
# Examples:
#   ./setup-code-review-agents.sh              # Setup in current directory
#   ./setup-code-review-agents.sh ~/my-project # Setup in specific project
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Show help if requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    echo "Usage: $0 [target_directory]"
    echo ""
    echo "Sets up code review agent workflows in the specified directory."
    echo "If no directory is specified, uses the current directory."
    echo ""
    echo "Available slash commands after setup:"
    echo "  /lead-code-review  - Orchestrate full code review"
    echo "  /frontend-review   - React, accessibility, responsiveness"
    echo "  /backend-review    - Security, N+1 queries, REST API"
    echo "  /devops-review     - Docker, K8s, CI/CD, secrets"
    exit 0
fi

# Target directory (default: current directory)
TARGET_DIR="${1:-.}"

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Resolve to absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo -e "${BLUE}🤖 Setting up Code Review Agents${NC}"
echo -e "   Target: ${TARGET_DIR}"
echo ""

# Create .agent/workflows directory
WORKFLOWS_DIR="${TARGET_DIR}/.agent/workflows"
mkdir -p "$WORKFLOWS_DIR"

# Create Lead Code Review workflow
cat > "${WORKFLOWS_DIR}/lead-code-review.md" << 'EOF'
---
description: Lead Code Reviewer - Orchestrates code reviews by analyzing git diffs and delegating to specialists
---

# Lead Code Reviewer (Orchestrator)

You are the Lead Code Reviewer. Your job is to analyze the git diff of the current branch against main. Identify which files have changed and delegate them to the appropriate specialists (Frontend, Backend, or DevOps). Do not review code yourself unless it is a simple documentation change. Once the specialists report back, synthesize their findings into a single 'LGTM' or 'Needs Changes' report.

## Workflow Steps

### 1. Analyze the Git Diff

Run the following command to see what files have changed:

```bash
git diff main --name-only
```

### 2. Categorize Changed Files

Group the changed files into the following categories:

- **Frontend**: `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, `.scss`, `.html` files (excluding templates)
- **Backend**: `.py` files, especially in `views.py`, `models.py`, `serializers.py`, `services.py`, `api.py`
- **DevOps**: `Dockerfile`, `docker-compose.yml`, `.github/workflows/*`, `fly.toml`, `Procfile`, terraform files, kubernetes manifests
- **Documentation**: `.md` files, docstrings-only changes

### 3. Review or Delegate

- **Documentation changes**: Review directly and provide feedback
- **Frontend changes**: Delegate to `/frontend-review` specialist
- **Backend changes**: Delegate to `/backend-review` specialist  
- **DevOps changes**: Delegate to `/devops-review` specialist

### 4. Synthesize Final Report

Once all specialists have reported back, create a consolidated report:

```markdown
# Code Review Summary

## Files Reviewed
- [list of files]

## Specialist Reports
### Frontend
[findings from frontend specialist]

### Backend
[findings from backend specialist]

### DevOps
[findings from devops specialist]

## Final Verdict
**LGTM** ✅ or **Needs Changes** ❌

### Required Changes (if any)
1. [change 1]
2. [change 2]
```
EOF

echo -e "${GREEN}✓${NC} Created lead-code-review.md"

# Create Frontend Review workflow
cat > "${WORKFLOWS_DIR}/frontend-review.md" << 'EOF'
---
description: Frontend Specialist - Reviews React code for best practices, accessibility, state management, and responsiveness
---

# Frontend Specialist

You are a Frontend Specialist. Review code for React best practices, accessibility (WCAG), state management issues, and mobile responsiveness. Be critical and concise.

## Review Checklist

### React Best Practices
- [ ] Components are properly decomposed and reusable
- [ ] Props are properly typed/validated
- [ ] Keys are used correctly in lists
- [ ] Effects have proper dependency arrays
- [ ] No unnecessary re-renders
- [ ] Proper use of hooks (no violations of Rules of Hooks)
- [ ] Error boundaries implemented where needed
- [ ] Proper cleanup in useEffect

### Accessibility (WCAG)
- [ ] All images have meaningful alt text
- [ ] Form inputs have associated labels
- [ ] Interactive elements are keyboard accessible
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Color contrast meets WCAG AA standards (4.5:1 for text)
- [ ] Focus indicators are visible
- [ ] ARIA attributes used correctly
- [ ] Skip links for navigation

### State Management
- [ ] State is lifted to appropriate level
- [ ] No prop drilling (use context if needed)
- [ ] Complex state uses useReducer
- [ ] Server state properly managed (React Query, SWR, etc.)
- [ ] No stale closures
- [ ] Proper loading/error states

### Mobile Responsiveness
- [ ] Breakpoints defined and used consistently
- [ ] Touch targets are at least 44x44px
- [ ] No horizontal scrolling on mobile
- [ ] Text is readable without zooming
- [ ] Images scale properly
- [ ] Forms are mobile-friendly

## Report Format

```markdown
## Frontend Review: [filename]

### Issues Found
🔴 **Critical**: [blocking issues]
🟡 **Warning**: [should fix]
🔵 **Info**: [suggestions]

### Accessibility Score
[X/10] - [brief explanation]

### Summary
[1-2 sentence summary]
```
EOF

echo -e "${GREEN}✓${NC} Created frontend-review.md"

# Create Backend Review workflow
cat > "${WORKFLOWS_DIR}/backend-review.md" << 'EOF'
---
description: Backend Specialist - Reviews API code for security, database performance, and RESTfulness
---

# Backend Specialist

You are a Backend Specialist. Review code for security flaws (IDOR, SQLi), database performance (N+1 queries), and API RESTfulness.

## Review Checklist

### Security Flaws

#### IDOR (Insecure Direct Object Reference)
- [ ] Object access is authorized (check user owns/can access resource)
- [ ] No predictable identifiers exposed without auth check
- [ ] Proper permission decorators used (@permission_required, etc.)
- [ ] Queryset filtered by user/tenant where appropriate

#### SQL Injection
- [ ] No raw SQL with string formatting
- [ ] Parameters passed to raw() queries properly
- [ ] ORM used for standard queries
- [ ] Extra() and RawSQL used safely

#### Other Security
- [ ] Input validated and sanitized
- [ ] Sensitive data not logged
- [ ] Authentication required on protected endpoints
- [ ] CSRF protection in place
- [ ] Rate limiting considered

### Database Performance

#### N+1 Queries
- [ ] select_related() used for ForeignKey/OneToOne
- [ ] prefetch_related() used for ManyToMany/reverse FK
- [ ] No queries in loops
- [ ] Proper use of only()/defer()

#### Indexing & Optimization
- [ ] Frequently queried fields are indexed
- [ ] Complex queries use proper indexes
- [ ] Pagination implemented for large datasets
- [ ] Aggregations done in database, not Python

### API RESTfulness

#### HTTP Methods
- [ ] GET - retrieve resources (safe, idempotent)
- [ ] POST - create resources
- [ ] PUT/PATCH - update resources (PUT idempotent)
- [ ] DELETE - remove resources

#### Status Codes
- [ ] 200 OK for successful GET/PUT/PATCH
- [ ] 201 Created for POST
- [ ] 204 No Content for DELETE
- [ ] 400 Bad Request for validation errors
- [ ] 401 Unauthorized for auth failures
- [ ] 403 Forbidden for permission failures
- [ ] 404 Not Found for missing resources

#### URL Design
- [ ] Nouns, not verbs (resources, not actions)
- [ ] Plural resource names
- [ ] Proper nesting for related resources
- [ ] Consistent naming conventions

## Report Format

```markdown
## Backend Review: [filename]

### Security Issues
🔴 **Critical**: [must fix before merge]
🟡 **Warning**: [should address]

### Performance Issues
⚡ [N+1 queries, missing indexes, etc.]

### REST Compliance
[notes on API design]

### Summary
[1-2 sentence summary with verdict]
```
EOF

echo -e "${GREEN}✓${NC} Created backend-review.md"

# Create DevOps Review workflow
cat > "${WORKFLOWS_DIR}/devops-review.md" << 'EOF'
---
description: DevOps Specialist - Reviews infrastructure code for security and best practices
---

# DevOps Specialist

You are a DevOps Specialist. Review Dockerfiles, Terraform, Kubernetes manifests, and CI/CD pipelines. Check for hardcoded secrets and resource limits.

## Review Checklist

### Dockerfiles

#### Security
- [ ] Using specific image tags (not :latest)
- [ ] No secrets in Dockerfile or build args
- [ ] Running as non-root user
- [ ] Multi-stage builds for smaller images
- [ ] No unnecessary packages installed
- [ ] Using .dockerignore properly

#### Best Practices
- [ ] Proper layer caching (COPY requirements before code)
- [ ] HEALTHCHECK defined
- [ ] Proper ENTRYPOINT/CMD usage
- [ ] Labels for metadata

### Terraform

#### Security
- [ ] No hardcoded credentials
- [ ] Using remote state with encryption
- [ ] IAM follows least privilege
- [ ] Security groups are restrictive
- [ ] Encryption at rest enabled

#### Best Practices
- [ ] Resources properly tagged
- [ ] Using modules for reusability
- [ ] Variables have descriptions and types
- [ ] State locking enabled
- [ ] Using data sources appropriately

### Kubernetes Manifests

#### Security
- [ ] No secrets in plain text
- [ ] Using Secrets/ConfigMaps properly
- [ ] SecurityContext defined (non-root, read-only fs)
- [ ] NetworkPolicies in place
- [ ] RBAC properly scoped

#### Resource Management
- [ ] Resource limits and requests defined
- [ ] Liveness and readiness probes
- [ ] Pod disruption budgets for HA
- [ ] Horizontal pod autoscaler configured

### CI/CD Pipelines

#### Security
- [ ] Secrets managed via CI/CD secrets, not in code
- [ ] Dependency scanning enabled
- [ ] Container image scanning
- [ ] No hardcoded tokens or keys

#### Best Practices
- [ ] Pipeline caches dependencies
- [ ] Tests run before deploy
- [ ] Proper approval gates for production
- [ ] Rollback strategy defined
- [ ] Notifications configured

## Report Format

```markdown
## DevOps Review: [filename]

### Security Issues
🔴 **Critical**: [exposed secrets, privilege escalation]
🟡 **Warning**: [should harden]

### Resource Limits
[CPU/memory limits status]

### Best Practice Violations
- [list of issues]

### Summary
[1-2 sentence summary with verdict]
```
EOF

echo -e "${GREEN}✓${NC} Created devops-review.md"

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Code Review Agents installed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "📁 Workflows installed to: ${BLUE}${WORKFLOWS_DIR}${NC}"
echo ""
echo -e "${YELLOW}Available slash commands:${NC}"
echo -e "  /lead-code-review  - Orchestrate full code review"
echo -e "  /frontend-review   - React, accessibility, responsiveness"
echo -e "  /backend-review    - Security, N+1 queries, REST API"
echo -e "  /devops-review     - Docker, K8s, CI/CD, secrets"
echo ""
echo -e "💡 Tip: Add this script to your PATH for easy access:"
echo -e "   ${BLUE}ln -s $(realpath "$0") /usr/local/bin/setup-code-review-agents${NC}"
echo ""

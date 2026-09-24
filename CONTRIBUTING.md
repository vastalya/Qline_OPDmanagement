# Contributing To Qline

Thanks for contributing to Qline.

## Before You Start

- Read the main [README.md](README.md) for the project overview
- Use the detailed documents in [`docs/detailed documents`](docs/detailed%20documents/README.md) when you need architecture, API, database, or workflow context
- Keep changes scoped and avoid mixing unrelated refactors with bug fixes or features

## Local Setup

```bash
cd backend && npm install
cd ../frontend && npm install
```

Required environment setup is documented in [README.md](README.md).

## Development Expectations

- Keep backend and frontend changes aligned with the existing role model: `patient`, `doctor`, `admin`
- Prefer small, reviewable pull requests
- Update documentation when routes, models, workflows, or deployment details change
- Preserve existing behavior unless the change intentionally modifies it
- Do not commit secrets, `.env` files, or production credentials

## Suggested Workflow

1. Create a branch for your change.
2. Make the smallest change that fully solves the problem.
3. Run the relevant app or test command locally.
4. Update affected docs if behavior or setup changed.
5. Open a pull request with a clear summary, screenshots if UI changed, and any migration notes.

## Pull Request Checklist

- The change is focused and understandable
- The code follows the project structure already used in the repo
- API, schema, or role changes are documented
- New UI states are covered for loading, success, and error handling when relevant
- Manual verification steps are included in the PR description

## Documentation Rule

If you change any of the following, update the matching document in `docs/detailed documents`:

- API endpoints
- role permissions
- page routes
- database schema
- core workflow behavior
- deployment or live links

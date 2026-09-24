# Security Policy

## Supported Codebase

This repository is maintained as an active academic/project submission codebase. Security-sensitive fixes should be applied to the current default branch.

## Reporting A Vulnerability

- Do not open a public issue for a security vulnerability.
- Report the issue privately to the repository owner or project maintainer through the approved submission or contact channel.
- Include the affected area, impact, reproduction steps, and any suggested mitigation if available.

## What To Include

- Vulnerability type
- Exact endpoint, page, or module affected
- Reproduction steps
- Expected impact
- Screenshots, logs, or proof-of-concept details if helpful

## Response Guidance

When a valid report is received, the project should:

- confirm receipt
- assess severity and exposure
- prepare a fix
- document any required environment or deployment changes

## Good Security Hygiene For Contributors

- Never commit secrets or tokens
- Use environment variables for credentials
- Keep JWT secrets and encryption keys unique per environment
- Validate inputs on both client and server where appropriate
- Review auth and role checks whenever adding new routes

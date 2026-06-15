# Security Policy

## Supported Versions

Security fixes target the latest commit on `main` until the project starts
publishing versioned Chrome Web Store releases.

## Reporting a Vulnerability

Please do not report vulnerabilities through public GitHub issues.

Open a private vulnerability report on GitHub:

https://github.com/cupcakedev/ai-usage-extension/security/advisories/new

Include:

- Affected version or commit
- Browser and operating system
- Steps to reproduce
- Expected impact
- Any relevant logs or screenshots with personal account data removed

The extension reads usage data from authenticated Claude and OpenAI browser
sessions and stores snapshots locally through Chrome extension storage. Reports
about unintended network disclosure, host permission scope, token exposure, or
cross-site data leakage are especially useful.

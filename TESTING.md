# Testing

This project currently uses Node.js built-in test tooling only. No external
packages are required.

## Commands

On Windows PowerShell, use `npm.cmd` because `npm.ps1` may be blocked by the
local execution policy.

```powershell
npm.cmd run check
npm.cmd test
```

## Current Scope

- `npm.cmd run check` verifies JavaScript syntax for the extension scripts.
- `npm.cmd test` verifies:
  - `manifest.json` references existing content scripts.
  - Chrome i18n locale files are valid message JSON.
  - content-script startup behavior with mocked `chrome.*` and DOM APIs.
  - popup-to-content toggle message compatibility.

The content-script tests describe the expected healthy behavior and guard the
v2.3 regression points identified during the repair work.

## Manual Chrome Verification

Use [docs/manual-chrome-extension-verification.md](docs/manual-chrome-extension-verification.md)
for manual checks that require loading the unpacked extension in Chrome.

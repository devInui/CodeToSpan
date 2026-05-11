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

The content-script tests intentionally describe the expected healthy behavior.
They fail on the current refactor branch and identify the v2.3 regression points
that need to be fixed next.

# Development

This project currently uses Node.js built-in test tooling only. No external
packages are required.

## Verification Commands

On Windows PowerShell, use `npm.cmd` because `npm.ps1` may be blocked by the
local execution policy.

```powershell
npm.cmd run check
npm.cmd test
```

## Chrome Web Store Package

Create the upload zip with:

```powershell
npm.cmd run package:extension
```

The zip is written to `dist/codetospan-v<manifest version>.zip`.
It includes only the extension runtime files referenced by `manifest.json`,
popup/options HTML, CSS, JavaScript, icons, `src/`, and `_locales/`.
It intentionally excludes docs, tests, README files, and local AI workspace
files.

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

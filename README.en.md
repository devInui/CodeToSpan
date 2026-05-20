# CodeToSpan for Translation

[日本語](README.md) | English

CodeToSpan for Translation is a Chrome extension that reduces translation and layout issues caused by inline code when reading programming documentation through browser translation.

## Overview

Programming documentation often contains inline `<code>` elements, keywords, and short code fragments. Machine translation can treat these fragments differently from normal text, causing awkward translations or layout distortion.

CodeToSpan reduces these issues by converting eligible `<code>` elements into `<span>` elements before translation.

The main audience is Japanese learners and developers who read English programming documentation through machine translation.

## Features

- Converts eligible `<code>` elements into `<span>` elements.
- Provides a popup `RUN` / `STOP` toggle.
- Shows reload-required notifications in the popup and with an `R` badge on the extension icon.
- Lets you check the current tab hostname with `Check Domain`.
- Lets you add the current hostname to `Exclude Domains` from the popup.
- Provides Options for page language checks, code element rules, `translate="no"` attributes, excluded domains, and automatic reload behavior.
- Excludes registered hostnames from processing.

## Usage

1. Install the extension from the Chrome Web Store.
2. Open a programming documentation page.
3. Turn CodeToSpan `RUN` from the popup.
4. Use browser translation on the page.
5. If the `R` badge or `Outdated Settings Detected.` appears after changing settings, reload the target tab.
6. To exclude a page, use `Show More` > `Check Domain` and add the hostname to `Exclude Domains`.

## Options

The Options page groups settings by purpose.

- `Page Language`: Skip pages whose language appears to match the browser language.
- `Code Element Rules`: Choose which parent elements are processed.
- `Translate Attributes`: Add `translate="no"` to elements that should be excluded from machine translation.
- `Settings Management`: Configure automatic reload behavior after RUN / STOP changes.
- `Exclude Domains`: Manage hostnames excluded from processing.

## Reload Required

CodeToSpan starts processing with the settings available when the page loads.

After changing settings from the popup or Options page, already open target tabs may need to be reloaded before the latest settings are applied.

When reload is required:

- The popup shows `Outdated Settings Detected.`
- The extension icon shows an `R` badge.

When `RUN` / `STOP` is changed, CodeToSpan asks whether to reload the current tab. Automatic reload can be enabled in Options.

## Exclude Domains

`Exclude Domains` uses exact hostname matching.

Examples:

- `example.com` matches `example.com`.
- `example.com` does not match `sub.example.com`.
- Register hostnames such as `example.com`, not full URLs like `https://example.com/path`.

v2.3 does not support subdomain matching or URL path based exclusions.

## Important Notes

- Target tabs need reload after installation or settings changes.
- Dynamic web apps that generate code elements or hydrate server-rendered HTML may behave unexpectedly.
- If buttons or links become unresponsive, turn CodeToSpan `STOP` for that page or add the hostname to `Exclude Domains`, then reload the page.

## Links

- [Chrome Web Store](https://chromewebstore.google.com/detail/codetospan-for-translatio/ebnohmjaodacnofjhknnjjnchanjleng?utm_source=github&utm_medium=repository&utm_campaign=codetospan_readme)
- [Release Notes](RELEASE.md)
- [Q&A](docs/user-facing-qa.md)

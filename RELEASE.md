# CodeToSpan Release Notes

## CodeToSpan 2.3.0 - Release Date: 2026/05/20

### New Features

- Added reload-required detection for already open tabs.
- Added an `R` badge on the extension icon when the active tab needs reload.
- Added `Outdated Settings Detected.` details in the popup.
- Added `Check Domain` in the popup.
- Added a popup flow to add the current hostname to `Exclude Domains`.
- Added an automatic reload option for `RUN` / `STOP` changes.
- Added `RUN` / `STOP` control to the Options page.

### Improvements

- Refreshed the popup layout and moved Options / Check Domain under Show More.
- Reorganized the Options page by setting purpose.
- Improved Exclude Domains row controls and input behavior.
- Kept excluded pages from showing unnecessary reload warnings.
- Synchronized open Options pages when settings are changed from the popup.

### Bug Fixes

- Fixed stale reload warning and `R` badge states after popup and Options changes.
- Fixed Options page form submission that appended query parameters such as `?excludePre=on`.
- Fixed cases where unrelated Exclude Domains changes triggered unnecessary reload warnings.
- Fixed default settings consistency across content script, popup, and Options.

### Internal

- Shared reload-required decision logic between popup and background through an ES module.
- Added automated tests for popup, background, Options, default settings, and extension smoke checks.
- Removed internal debug console output for detected hostnames.

## CodeToSpan 2.2 - Release Date: 2023/12/05

### New Features

- Introduced the `RELEASE.md` file, providing detailed release notes and changelog directly within the project repository.

### Bug Fixes

- Fixed a bug where translation failed when encountering elements with the 'notranslate' class.

## CodeToSpan 2.1 - Release Date: 2023/12/04

### Bug Fixes

- Resolved an issue where styles were not being inherited properly.
- Addressed various minor bugs.

## CodeToSpan 2.0 - Release Date: 2023/11/21

### New Features

- Added an options page for enhanced customization.
- Enhanced the store page descriptions with Japanese language support.
- Introduced a new [Privacy Policy](https://sites.google.com/view/privacy-policy-for-codetospan).

### Bug Fixes

- Modified the handling of original 'code' elements from deletion to hiding, to improve web page integrity.
- Improved the replacement of 'code' elements to more accurately retain the original layout.
- Fixed various minor bugs.

## CodeToSpan 1.0 - Release Date: 2023/05/21

- Launched on the Chrome Web Store.

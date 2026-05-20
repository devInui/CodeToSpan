# Manual Chrome Extension Verification

Use this checklist after automated tests pass, or when a behavior needs the real Chrome extension runtime.

Japanese version: [manual-chrome-extension-verification.ja.md](manual-chrome-extension-verification.ja.md)

## Load the Unpacked Extension

1. Open `chrome://extensions` in Chrome.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the repository root directory that contains `manifest.json`.
5. Confirm that `CodeToSpan for Translation` appears without extension errors.

## Open Options and Popup

1. Open `Extension options` from the extension details page.
2. Confirm that the Options page loads and displays the settings.
3. Toggle checkboxes on the Options page and confirm the URL does not gain query strings such as `?excludePre=on`.
4. Add a domain from the Exclude Domains input and confirm the input is cleared after a successful add.
5. Confirm that empty input or duplicate domains leave the input value in place.
6. Confirm that Exclude Domains remove buttons appear to the left of the domain text and use the quiet icon-only style.
7. Pin or click the extension icon and open the popup.
8. Confirm that the popup shows the RUN/STOP toggle and Show More button.
9. Click Show More.
10. Confirm that Options and Check Domain are shown.
11. Confirm that the popup Options button opens the same Options page.

## Prepare a Small Test Page

Use `manual-test-pages/inline-code.html`, or use an existing programming documentation page that contains inline `<code>` elements.

```html
<!doctype html>
<html lang="en">
  <body>
    <p>Inline code: <code>const value = 1;</code></p>
    <pre><code>function demo() { return true; }</code></pre>
  </body>
</html>
```

Open the file in Chrome. If the content script does not run on a local file, enable `Allow access to file URLs` from the extension details page in `chrome://extensions`, or use a public programming documentation page.

## Verify code-to-span Conversion

1. Confirm that the extension is `RUN` in the popup.
2. Use a page whose `lang` differs from the browser language. If this is difficult, temporarily disable language detection in Options.
3. Reload the test page.
4. Inspect an inline `<code>` element with Chrome DevTools.
5. Confirm that the eligible inline code is replaced with a `<span>` element.
6. Confirm that code inside default excluded parent tags such as `<pre>` is not converted.
7. If the `translate="no"` option is enabled, confirm that `<pre>` blocks receive `translate="no"`.

## Verify Outdated Settings Detected

1. Keep the test page open.
2. Change a setting that affects page processing from the Options page.
3. Activate the test page tab before reloading it.
4. Confirm that the extension icon shows an `R` badge. If it does not appear, switch to another tab and then back to the test page.
5. Open the popup on the still-unreloaded test page.
6. Confirm that the popup shows `Outdated Settings Detected.` and the Reload button.
7. Click Reload and confirm that the active tab reloads.
8. Open the popup again and confirm the warning is gone when the page uses the latest settings.
9. Confirm that the `R` badge disappears after reload.

## Verify Reload on RUN/STOP Changes

1. Open the popup on the test page.
2. Switch from `RUN` to `STOP`.
3. Confirm that a dialog asks whether to reload the current tab.
4. Choose OK and confirm that the active tab reloads.
5. After reload, confirm that code elements are not converted while STOP is active.
6. Switch from `STOP` back to `RUN`.
7. Choose Cancel in the confirmation dialog.
8. Confirm that the current tab does not reload.
9. Confirm that `Outdated Settings Detected.` appears in the popup without reopening the popup.
10. Confirm that the extension icon shows an `R` badge.
11. Reload the tab manually.
12. Confirm that the `R` badge disappears and eligible code elements are converted again.

## Verify Automatic Reload Setting

1. Check `Settings Management` on the Options page.
2. Enable `Reload automatically after RUN/STOP changes`.
3. Open the popup on the test page.
4. Toggle RUN/STOP.
5. Confirm that the current tab reloads without a confirmation dialog.
6. Disable the setting again from the Options page.

## Verify Check Domain

1. Open the popup on a normal `http` or `https` page.
2. Click Show More.
3. Click Check Domain.
4. Confirm that the popup displays only the page hostname. It must not include protocol, path, or query. Confirm it matches `window.location.hostname` in DevTools.
5. Confirm that long hostnames scroll horizontally inside the hostname field without widening the popup.
6. Click Add.
7. Confirm that the domain is added to Exclude Domains.
8. Confirm that the button changes to Added and becomes disabled.
9. Confirm that a reload confirmation appears after adding the domain.
10. If Cancel is selected, confirm that the current tab does not reload and the extension icon shows an `R` badge.
11. Repeat the same flow and choose OK. Confirm that the current tab reloads and the `R` badge does not remain.
12. Open the popup on `chrome://extensions` and confirm that Check Domain shows `Domain unavailable`.

## Verify Reload Warning on Excluded Pages

1. Open a page that is skipped because language detection is enabled and the page language matches the browser language.
2. Change a setting that only affects already-converted code elements.
3. Open the popup on the still-unreloaded page.
4. Confirm that `Outdated Settings Detected.` is not shown.
5. Confirm that the extension icon does not show an `R` badge.
6. Change Exclude Domains so the current page changes from included to excluded, or from excluded to included.
7. Activate the still-unreloaded page tab.
8. Because the page processing scope changed, confirm that the extension icon shows an `R` badge.
9. Open the popup and confirm that `Outdated Settings Detected.` is shown.

## Verify Language Settings and Defaults

1. Run Reset Settings from the Options page.
2. Confirm the defaults:
   - enabled: `true`
   - excluded parent tags: `<pre>` only
   - language detection: enabled
   - protect sized code elements: disabled
   - add `translate="no"` to `<pre>`: enabled
   - automatic reload after RUN/STOP changes: disabled
   - excluded domains: empty on a fresh install or new Chrome profile
3. Existing excluded domains are not removed by Reset Settings. Delete them manually if needed, or verify the empty default in a fresh install or new Chrome profile.
4. With language detection enabled, confirm that a page whose `lang` differs from the browser language is processed.
5. Confirm that a page whose `lang` matches the browser language is skipped.
6. Disable language detection in Options, reload the test page, and confirm it is processed regardless of page language.

## Record

Record the following:

- Chrome version
- OS
- Test page URL
- Settings used
- Pass/fail result for each item
- Console errors from the page or extension popup

# Manual Chrome Extension Verification

Use this checklist after automated tests pass, or when validating behavior that
requires a real Chrome extension runtime.

## Load the Unpacked Extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select the repository root directory, which contains `manifest.json`.
5. Confirm `CodeToSpan for Translation` appears without extension errors.

## Open Options and Popup

1. Click `Details` for the extension and open `Extension options`.
2. Confirm the options page loads and shows the settings controls.
3. Pin or open the extension action, then open the popup.
4. Confirm the popup opens and shows the Run/Stop toggle and Show More button.
5. Click Show More.
6. Confirm Options and Check Domain are shown.
7. Use the Options button in the popup and confirm it opens the same options page.

## Prepare a Small Test Page

Save this as a local HTML file outside the repository, or use an existing
programming documentation page with inline `<code>` elements.

```html
<!doctype html>
<html lang="en">
  <body>
    <p>Inline code: <code>const value = 1;</code></p>
    <pre><code>function demo() { return true; }</code></pre>
  </body>
</html>
```

Open the file in Chrome. If Chrome does not run extension content scripts on
local files, enable `Allow access to file URLs` for the extension from
`chrome://extensions`, or use a public programming documentation page instead.

## Verify Code-to-Span Behavior

1. Make sure the extension is set to `RUN` in the popup.
2. Use a page whose `lang` differs from the browser language, or temporarily
   disable language detection in options. The default language detection setting
   skips processing when the page language matches the browser language.
3. Reload the test page.
4. Inspect the inline `<code>` element in Chrome DevTools.
5. Confirm eligible inline code is replaced with a `<span>` element.
6. Confirm code inside excluded parent tags, such as `<pre>` by default, is not
   converted.
7. Confirm `<pre>` blocks receive `translate="no"` when that option is enabled.

## Verify Outdated-Settings Warning

1. Open the test page and leave it loaded.
2. Open the options page and change a setting that affects page processing.
3. Open the popup on the still-loaded test page.
4. Confirm the popup shows the outdated-settings warning with a Reload button.
5. Confirm the extension icon shows an `R` badge for the current tab.
6. Click Reload and confirm the active tab reloads.
7. Reopen the popup and confirm the warning is cleared when the page is using
   the latest settings.
8. Confirm the `R` badge is cleared after reload.

## Verify Run/Stop Toggle Reload

1. Open the popup on the test page.
2. Switch from `RUN` to `STOP`.
3. Confirm the browser asks whether to reload the current tab.
4. Choose OK and confirm the active tab reloads.
5. Inspect the page after reload and confirm code elements are not converted
   while stopped.
6. Switch from `STOP` back to `RUN`.
7. Choose Cancel when asked to reload.
8. Confirm the current tab is not reloaded and the extension icon shows an `R`
   badge.
9. Reload the tab manually.
10. Confirm the `R` badge is cleared and eligible code elements are converted
   again.

## Verify Check Domain

1. Open the popup on a normal `http` or `https` page.
2. Click Show More.
3. Click Check Domain.
4. Confirm the popup shows only the page hostname, without protocol, path, or
   query string.
5. Confirm a long hostname scrolls inside the hostname field without widening
   the popup.
6. Click Add.
7. Confirm the domain is added to Exclude Domains.
8. Confirm the button changes to Added and is disabled.
9. Confirm a reload prompt is shown after adding the domain.
10. Open `chrome://extensions`, open the popup, and confirm Check Domain shows
    Domain unavailable.

## Verify Excluded-Page Reload Warning

1. Open a page that is skipped because the page language matches the browser
   language while language checking is enabled.
2. Change a setting that would only affect converted code elements.
3. Open the popup on the still-loaded page.
4. Confirm the outdated-settings warning is not shown.
5. Change Exclude Domains so the current page changes from included to excluded,
   or from excluded to included.
6. Open the popup on the still-loaded page.
7. Confirm the outdated-settings warning is shown because the page scope changed.

## Verify Language and Default Settings

1. Reset settings from the options page.
2. Confirm the default settings are:
   - enabled: `true`
   - excluded parent tags: `<pre>` only
   - language detection: enabled
   - skip styled code tags: disabled
   - add `translate="no"` to `<pre>`: enabled
   - automatic reload after RUN/STOP changes: disabled
   - excluded domains: empty on a fresh install or fresh Chrome profile
3. Existing excluded domains are not reset by the options reset action. Manually
   clear them before this check, or verify the empty excluded-domains default
   only on a fresh install or fresh Chrome profile.
4. With language detection enabled, use a page whose `lang` differs from the
   browser language and confirm processing runs.
5. Use a page whose `lang` matches the browser language and confirm processing
   is skipped.
6. Disable language detection in options, reload the test page, and confirm
   processing runs regardless of the page language.

## Notes to Record

Record the Chrome version, operating system, test page URL, settings used,
pass/fail results, and any console errors from the page or extension popup.

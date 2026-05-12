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
4. Confirm the popup opens and shows the Run/Stop toggle and Options link.
5. Use the Options link in the popup and confirm it opens the same options page.

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
5. Click Reload and confirm the active tab reloads.
6. Reopen the popup and confirm the warning is cleared when the page is using
   the latest settings.

## Verify Run/Stop Toggle Reload

1. Open the popup on the test page.
2. Switch from `RUN` to `STOP`.
3. Confirm the active tab reloads.
4. Inspect the page after reload and confirm code elements are not converted
   while stopped.
5. Switch from `STOP` back to `RUN`.
6. Confirm the active tab reloads and eligible code elements are converted
   again.

## Verify Language and Default Settings

1. Reset settings from the options page.
2. Confirm the default settings are:
   - enabled: `true`
   - excluded parent tags: `<pre>` only
   - language detection: enabled
   - skip styled code tags: disabled
   - add `translate="no"` to `<pre>`: enabled
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

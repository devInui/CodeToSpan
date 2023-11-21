# Code Tag Translator Extension for Chrome

## Overview
This Chrome extension is designed for programming learners who are more comfortable in their native language than in English, especially when reading programming documentation. It aims to improve the accuracy and layout of translated programming documentation by modifying HTML code tags.

## Features
- **Tag Replacement:** Automatically replaces code tags with span tags to correct layout distortions and translation inaccuracies on programming documentation web pages.
- **Integration with Translation Services:** Works in conjunction with standard web page translation services to make understanding programming documentation easier.
- **Toggle Feature:** Users can enable or disable the tag replacement feature from the extension's popup.
- **Customizable Options:** Settings can be adjusted to minimize layout disruptions on web pages with special notations.

## Usage
1. **Automatic Tag Replacement:** Upon enabling the extension, it automatically replaces code tags with span tags when the page loads or changes.
2. **Manual Control:** Use the extension’s popup to toggle the execution/stop of the tag replacement feature.
3. **Options Adjustment:** Customize settings on the options page to handle pages with special notations or to register exclusion domains.

## Important Notes
- **Page Reloading:** After installing the extension or changing option settings, it’s necessary to reload the tab.
- **Run/Stop Toggle:** Switching between Run/Stop will automatically reload the page.
- **Performance Impact:** Web pages that automatically add code tags (e.g., using natural language generation AI) might experience performance issues or instability.
- **Hydration Errors:** The extension may cause errors in the hydration process due to inconsistencies between server-side and client-side HTML structures, potentially leading to unresponsiveness in button clicks or links.

## Troubleshooting
If you experience any unresponsiveness with button clicks or links, disable the extension and reload the page.

## Additional Information
For more details, please visit our [Chrome Web Store page](https://chrome.google.com/webstore/detail/ebnohmjaodacnofjhknnjjnchanjleng).

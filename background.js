const RELOAD_BADGE_TEXT = "R";
const RELOAD_BADGE_COLOR = "#f57c00";

function setReloadBadge(tabId, reloadRequired) {
  if (!Number.isInteger(tabId)) return;

  chrome.action.setBadgeText({
    tabId,
    text: reloadRequired ? RELOAD_BADGE_TEXT : "",
  });

  if (reloadRequired) {
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: RELOAD_BADGE_COLOR,
    });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "updateReloadBadge") {
    return false;
  }

  setReloadBadge(message.tabId, !!message.reloadRequired);
  sendResponse({ success: true });
  return false;
});

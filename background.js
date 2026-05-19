const RELOAD_BADGE_TEXT = "R";
const RELOAD_BADGE_COLOR = "#f57c00";
const DEFAULT_SETTINGS = {
  enabled: true,
  excludedTags: { a: false, div: false, pre: true, span: false },
  isLanguageCheckEnabled: true,
  skipStyledCodeTags: false,
  addTranslateNo: true,
  autoReloadOnRunStop: false,
  excludedDomains: [],
};

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

function refreshReloadBadge(tabId) {
  if (!Number.isInteger(tabId)) return;

  chrome.tabs.sendMessage(tabId, { action: "checkSettings" }, (response) => {
    if (chrome.runtime.lastError || !response || response.success === false) {
      setReloadBadge(tabId, false);
      return;
    }

    chrome.storage.sync.get(DEFAULT_SETTINGS, (latestSettings) => {
      const differences = getReloadRequiredDifferences(response, latestSettings);
      setReloadBadge(tabId, differences.length > 0);
    });
  });
}

function getSettingDifferences(current, latest) {
  const diffs = [];

  if (current.enabled !== latest.enabled) diffs.push("enabled");
  if (
    JSON.stringify(current.excludedTags) !== JSON.stringify(latest.excludedTags)
  ) {
    diffs.push("excludedTags");
  }
  if (current.isLanguageCheckEnabled !== latest.isLanguageCheckEnabled) {
    diffs.push("isLanguageCheckEnabled");
  }
  if (current.skipStyledCodeTags !== latest.skipStyledCodeTags) {
    diffs.push("skipStyledCodeTags");
  }
  if (current.addTranslateNo !== latest.addTranslateNo) {
    diffs.push("addTranslateNo");
  }
  if (
    JSON.stringify(current.excludedDomains) !==
    JSON.stringify(latest.excludedDomains)
  ) {
    diffs.push("excludedDomains");
  }

  return diffs;
}

function getReloadRequiredDifferences(current, latest) {
  let differences = getSettingDifferences(current, latest);
  if (differences.length === 0 || !hasPageContext(current)) {
    return differences;
  }

  const currentApplies = shouldSettingsApplyToPage(current, current);
  const latestApplies = shouldSettingsApplyToPage(latest, current);

  if (!currentApplies && !latestApplies) {
    return [];
  }

  if (currentApplies === latestApplies) {
    differences = differences.filter(
      (difference) => difference !== "excludedDomains",
    );
  }

  return differences;
}

function hasPageContext(current) {
  return (
    typeof current.hostname === "string" &&
    typeof current.isBrowserAndPageLanguageDifferent === "boolean"
  );
}

function shouldSettingsApplyToPage(settings, pageContext) {
  if (settings.excludedDomains.includes(pageContext.hostname)) {
    return false;
  }
  if (!settings.isLanguageCheckEnabled) {
    return true;
  }
  return pageContext.isBrowserAndPageLanguageDifferent;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "updateReloadBadge") {
    return false;
  }

  setReloadBadge(message.tabId, !!message.reloadRequired);
  sendResponse({ success: true });
  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    setReloadBadge(tabId, false);
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  refreshReloadBadge(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    refreshReloadBadge(tabId);
  }
});

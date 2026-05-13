// ボタンがクリックされたときに実行される関数
function toggleExtension() {
  chrome.storage.sync.get({ enabled: true }, function (data) {
    if (chrome.runtime.lastError) {
      console.error(
        "[CodeToSpan] Failed to get storage:",
        chrome.runtime.lastError,
      );
      return;
    }

    const newEnabledState = !data.enabled;

    chrome.storage.sync.set({ enabled: newEnabledState }, function () {
      if (chrome.runtime.lastError) {
        console.error(
          "[CodeToSpan] Failed to set storage:",
          chrome.runtime.lastError,
        );
        return;
      }

      updateToggleButtonState(newEnabledState);

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (chrome.runtime.lastError) {
          console.error(
            "[CodeToSpan] Failed to query tabs:",
            chrome.runtime.lastError,
          );
          return;
        }
        if (tabs.length > 0) {
          confirmReloadCurrentTab(tabs[0].id);
        }
      });
    });
  });
}

function confirmReloadCurrentTab(tabId) {
  chrome.storage.sync.get({ autoReloadOnRunStop: false }, function (data) {
    if (
      data.autoReloadOnRunStop ||
      confirm("Reload current tab to apply this change?")
    ) {
      updateReloadBadge(tabId, false);
      chrome.tabs.reload(tabId);
      window.close();
      return;
    }

    updateReloadBadge(tabId, true);
  });
}

function updateToggleButtonState(enabled) {
  const toggleButton = document.getElementById("toggle");
  toggleButton.checked = enabled;
  toggleButton.textContent = enabled ? "Disable Extension" : "Enable Extension";
  switchLayoutText(enabled);
}

// 初期化処理
chrome.storage.sync.get({ enabled: true }, function (data) {
  const toggleButton = document.getElementById("toggle");
  toggleButton.checked = data.enabled;
  toggleButton.textContent = data.enabled
    ? "Disable Extension"
    : "Enable Extension";

  // テキストレイアウトの初期化
  switchLayoutText(toggleButton.checked);

  // ボタンがクリックされたときの処理を設定
  toggleButton.addEventListener("click", toggleExtension);
});

function switchLayoutText(toggleState) {
  const stop = document.getElementById("stop");
  const run = document.getElementById("run");
  if (toggleState) {
    // 有効状態のスタイル
    stop.style.fontWeight = "normal";
    run.style.fontWeight = "bold";
  } else {
    // 無効状態のスタイル
    stop.style.fontWeight = "bold";
    run.style.fontWeight = "normal";
  }
}

function setMoreActionsExpanded(expanded) {
  const moreActions = document.getElementById("more-actions");
  const showMoreLabel = document.getElementById("show-more-label");
  const showMoreIcon = document.getElementById("show-more-icon");

  if (expanded) {
    moreActions.classList.add("visible");
  } else {
    moreActions.classList.remove("visible");
  }
  showMoreLabel.textContent = expanded ? "Show Less" : "Show More";
  showMoreIcon.classList.remove(expanded ? "down" : "up");
  showMoreIcon.classList.add(expanded ? "up" : "down");
}

chrome.storage.local.get({ popupShowMoreExpanded: false }, function (data) {
  setMoreActionsExpanded(data.popupShowMoreExpanded);
});

document
  .getElementById("show-more-toggle")
  .addEventListener("click", function () {
    const moreActions = document.getElementById("more-actions");
    const expanded = !moreActions.classList.contains("visible");
    setMoreActionsExpanded(expanded);
    chrome.storage.local.set({ popupShowMoreExpanded: expanded });
  });

document
  .getElementById("openOptionsPage")
  .addEventListener("click", function (event) {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });

let currentDomainForAdd = "";

function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (chrome.runtime.lastError || tabs.length === 0) {
      callback(null);
      return;
    }
    callback(tabs[0]);
  });
}

function getHostnameFromTab(tab) {
  if (!tab || !tab.url) return "";

  try {
    const url = new URL(tab.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.hostname;
  } catch (_error) {
    return "";
  }
}

function showDomainUnavailable() {
  currentDomainForAdd = "";
  const domainCheck = document.getElementById("domain-check");
  const currentDomain = document.getElementById("current-domain");
  const addButton = document.getElementById("add-current-domain");

  domainCheck.classList.add("visible", "unavailable");
  currentDomain.textContent = "Domain unavailable";
  addButton.disabled = true;
  addButton.textContent = "Add";
}

function showDomainCheck(hostname, domains) {
  currentDomainForAdd = hostname;
  const domainCheck = document.getElementById("domain-check");
  const currentDomain = document.getElementById("current-domain");
  const addButton = document.getElementById("add-current-domain");
  const isAdded = domains.includes(hostname);

  domainCheck.classList.add("visible");
  domainCheck.classList.remove("unavailable");
  currentDomain.textContent = hostname;
  addButton.disabled = isAdded;
  addButton.textContent = isAdded ? "Added" : "Add";
}

function checkCurrentDomain() {
  getActiveTab(function (tab) {
    const hostname = getHostnameFromTab(tab);
    if (!hostname) {
      showDomainUnavailable();
      return;
    }

    chrome.storage.sync.get({ excludedDomains: [] }, function (data) {
      showDomainCheck(hostname, data.excludedDomains);
    });
  });
}

function addCurrentDomain() {
  if (!currentDomainForAdd) return;

  chrome.storage.sync.get({ excludedDomains: [] }, function (data) {
    const domains = data.excludedDomains;
    if (domains.includes(currentDomainForAdd)) {
      showDomainCheck(currentDomainForAdd, domains);
      return;
    }

    const updatedDomains = domains.concat(currentDomainForAdd);
    chrome.storage.sync.set({ excludedDomains: updatedDomains }, function () {
      showDomainCheck(currentDomainForAdd, updatedDomains);
      if (confirm("Domain added. Reload current tab?")) {
        getActiveTab(function (tab) {
          if (tab) {
            chrome.tabs.reload(tab.id);
            window.close();
          }
        });
      }
    });
  });
}

document
  .getElementById("check-domain")
  .addEventListener("click", checkCurrentDomain);

document
  .getElementById("add-current-domain")
  .addEventListener("click", addCurrentDomain);

function updateReloadBadge(tabId, reloadRequired) {
  chrome.runtime.sendMessage(
    { action: "updateReloadBadge", tabId, reloadRequired },
    function () {
      if (chrome.runtime.lastError) {
        console.log(
          "[CodeToSpan] Could not update reload badge:",
          chrome.runtime.lastError,
        );
      }
    },
  );
}

// 設定の変更を検知
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length === 0) return;
  const activeTabId = tabs[0].id;
  chrome.tabs.sendMessage(
    activeTabId,
    { action: "checkSettings" },
    (response) => {
      console.log(
        "[CodeToSpan] Received settings from content script:",
        response,
      );

      if (chrome.runtime.lastError) {
        console.log(
          "[CodeToSpan] Error sending message:",
          chrome.runtime.lastError,
        );
        updateReloadBadge(activeTabId, false);
        return;
      }

      if (!response) {
        console.log(
          "[CodeToSpan] Error: No response received from content script.",
        );
        updateReloadBadge(activeTabId, false);
        return;
      }

      if (response.success === false) {
        console.log(
          "[CodeToSpan] Content script could not provide settings:",
          response.error,
        );
        updateReloadBadge(activeTabId, false);
        return;
      }

      chrome.storage.sync.get(
        {
          enabled: true,
          excludedTags: { a: false, div: false, pre: true, span: false },
          isLanguageCheckEnabled: true,
          skipStyledCodeTags: false,
          addTranslateNo: true,
          autoReloadOnRunStop: false,
          excludedDomains: [],
        },
        (latestSettings) => {
          console.log("[CodeToSpan] Latest storage settings:", latestSettings);

          let differences = getReloadRequiredDifferences(
            response,
            latestSettings,
          );

          if (differences.length > 0) {
            console.log("[CodeToSpan] Detected differences:", differences);
            displaySettingWarning(differences);
          }
          updateReloadBadge(activeTabId, differences.length > 0);
        },
      );
    },
  );
});

function getSettingDifferences(current, latest) {
  const diffs = [];

  if (current.enabled !== latest.enabled) {
    diffs.push({
      category: "Extension Status",
      text: `Status: ${formatEnabled(current.enabled)} -> ${formatEnabled(
        latest.enabled,
      )}`,
    });
  }
  if (
    JSON.stringify(current.excludedTags) !== JSON.stringify(latest.excludedTags)
  ) {
    diffs.push({
      category: "Code Element Rules",
      text: `Parent tags: ${formatParentTags(
        current.excludedTags,
      )} -> ${formatParentTags(latest.excludedTags)}`,
    });
  }
  if (current.isLanguageCheckEnabled !== latest.isLanguageCheckEnabled) {
    diffs.push({
      category: "Page Language",
      text: `Another language only: ${formatOnOff(
        current.isLanguageCheckEnabled,
      )} -> ${formatOnOff(latest.isLanguageCheckEnabled)}`,
    });
  }
  if (current.skipStyledCodeTags !== latest.skipStyledCodeTags) {
    diffs.push({
      category: "Code Element Rules",
      text: `Sized code blocks: ${formatOnOff(
        current.skipStyledCodeTags,
      )} -> ${formatOnOff(latest.skipStyledCodeTags)}`,
    });
  }
  if (current.addTranslateNo !== latest.addTranslateNo) {
    diffs.push({
      category: "Translate Attributes",
      text: `translate="no": ${formatOnOff(
        current.addTranslateNo,
      )} -> ${formatOnOff(latest.addTranslateNo)}`,
    });
  }
  if (
    JSON.stringify(current.excludedDomains) !==
    JSON.stringify(latest.excludedDomains)
  ) {
    diffs.push({
      category: "Exclude Domains",
      text: "Domain list changed",
    });
  }

  return diffs;
}

function getReloadRequiredDifferences(current, latest) {
  const differences = getSettingDifferences(current, latest);
  if (differences.length === 0 || !hasPageContext(current)) {
    return differences;
  }

  const currentApplies = shouldSettingsApplyToPage(current, current);
  const latestApplies = shouldSettingsApplyToPage(latest, current);

  if (!currentApplies && !latestApplies) {
    return [];
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

function formatEnabled(enabled) {
  return enabled ? "RUN" : "STOP";
}

function formatOnOff(enabled) {
  return enabled ? "ON" : "OFF";
}

function formatParentTags(excludedTags) {
  const tags = ["pre", "div", "a", "span"].filter((tag) => excludedTags[tag]);
  return tags.length > 0 ? tags.join(", ") : "none";
}

function displaySettingWarning(differences) {
  const warningDiv = document.getElementById("settings-warning");
  const diffList = document.getElementById("settings-diff");
  const reloadButton = document.getElementById("reload-page");

  diffList.innerHTML = "";

  if (differences.length === 0) {
    // 変更点がない場合は警告を非表示にする
    warningDiv.classList.remove("visible");
    return;
  }

  let categorizedChanges = {};

  // 各変更をカテゴリごとに整理
  differences.forEach((diff) => {
    if (!categorizedChanges[diff.category]) {
      categorizedChanges[diff.category] = [];
    }
    categorizedChanges[diff.category].push(diff.text);
  });

  // カテゴリごとにリスト表示
  for (const category in categorizedChanges) {
    let categoryTitle = document.createElement("div");
    categoryTitle.classList.add("settings-category");
    categoryTitle.textContent = category;
    diffList.appendChild(categoryTitle);

    categorizedChanges[category].forEach((change) => {
      let li = document.createElement("li");
      li.textContent = change;
      diffList.appendChild(li);
    });
  }

  // メッセージの表示制御
  if (differences.length > 0) {
    warningDiv.classList.add("visible");
  } else {
    warningDiv.classList.remove("visible");
  }
}

// Reloadボタンのクリックイベントリスナー
document.getElementById("reload-page").addEventListener("click", function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      chrome.tabs.reload(tabs[0].id);
      window.close(); // ポップアップを閉じる
    }
  });
});

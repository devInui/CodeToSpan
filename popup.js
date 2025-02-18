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
          chrome.tabs.sendMessage(tabs[0].id, {
            command: "toggle",
            enabled: newEnabledState,
          });
        }
      });
    });
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

document
  .getElementById("openOptionsPage")
  .addEventListener("click", function () {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });

// 設定の変更を検知
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length === 0) return;
  chrome.tabs.sendMessage(
    tabs[0].id,
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
        return;
      }

      if (!response) {
        console.log(
          "[CodeToSpan] Error: No response received from content script.",
        );
        return;
      }
      chrome.storage.sync.get(
        {
          enabled: true,
          excludedTags: { a: false, div: false, pre: true, span: false },
          isLanguageCheckEnabled: true,
          skipStyledCodeTags: false,
          addTranslateNo: false,
          excludedDomains: [],
        },
        (latestSettings) => {
          console.log("[CodeToSpan] Latest storage settings:", latestSettings);

          let differences = getSettingDifferences(response, latestSettings);

          if (differences.length > 0) {
            console.log("[CodeToSpan] Detected differences:", differences);
            displaySettingWarning(differences);
          }
        },
      );
    },
  );
});

function getSettingDifferences(current, latest) {
  let diffs = [];

  if (current.enabled !== latest.enabled) {
    diffs.push(`Extension was ${latest.enabled ? "enabled" : "disabled"}`);
  }
  if (
    JSON.stringify(current.excludedTags) !== JSON.stringify(latest.excludedTags)
  ) {
    const changes = [];
    for (const tag in latest.excludedTags) {
      if (current.excludedTags[tag] !== latest.excludedTags[tag]) {
        changes.push(
          `${tag}: ${current.excludedTags[tag]} → ${latest.excludedTags[tag]}`,
        );
      }
    }
    diffs.push(`Exclude Tags changed: ${changes.join(", ")}`);
  }
  if (current.isLanguageCheckEnabled !== latest.isLanguageCheckEnabled) {
    diffs.push(
      `Language-Based Control: ${current.isLanguageCheckEnabled} → ${latest.isLanguageCheckEnabled}`,
    );
  }
  if (current.skipStyledCodeTags !== latest.skipStyledCodeTags) {
    diffs.push(
      `Skip Styled Code Tags: ${current.skipStyledCodeTags} → ${latest.skipStyledCodeTags}`,
    );
  }
  if (current.addTranslateNo !== latest.addTranslateNo) {
    diffs.push(
      `Add translate="no" setting: ${current.addTranslateNo} → ${latest.addTranslateNo}`,
    );
  }
  if (
    JSON.stringify(current.excludedDomains) !==
    JSON.stringify(latest.excludedDomains)
  ) {
    diffs.push("Excluded Domains list changed");
  }

  return diffs;
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

  // カテゴリ分類
  const categories = {
    "Extension was": "🛠️ Extension Status",
    "Exclude Tags changed": "🏷️ Excluded Tags",
    "Language-Based Control": "🈵 Language Control",
    "Skip Styled Code Tags": "🎨 Skip Styled Code",
    'Add translate="no" setting': "🌍 Translate Attribute",
    "Excluded Domains list changed": "🌐 Excluded Domains",
  };

  let categorizedChanges = {};

  // 各変更をカテゴリごとに整理
  differences.forEach((diff) => {
    let foundCategory = null;

    // カテゴリのキーに部分一致するものを検索
    for (const key in categories) {
      if (diff.startsWith(key)) {
        foundCategory = key;
        break;
      }
    }

    if (foundCategory) {
      if (!categorizedChanges[foundCategory]) {
        categorizedChanges[foundCategory] = [];
      }

      if (foundCategory === "Extension was") {
        // RUN → STOP 形式に変更
        const wasEnabled = diff.includes("enabled");
        categorizedChanges[foundCategory].push(
          wasEnabled ? "RUN → STOP" : "STOP → RUN",
        );
      } else if (foundCategory === "Exclude Tags changed") {
        // `Exclude Tags changed` の場合、タグごとに改行
        let tagChanges = diff.replace(foundCategory + ": ", "").split(", ");
        tagChanges.forEach((tagChange) => {
          categorizedChanges[foundCategory].push(tagChange);
        });
      } else {
        categorizedChanges[foundCategory].push(
          diff.replace(foundCategory + ": ", ""),
        );
      }
    } else {
      // 該当しないものは "Other" カテゴリに
      if (!categorizedChanges["Other"]) {
        categorizedChanges["Other"] = [];
      }
      categorizedChanges["Other"].push(diff);
    }
  });

  // カテゴリごとにリスト表示
  for (const category in categorizedChanges) {
    let categoryTitle = document.createElement("div");
    categoryTitle.classList.add("settings-category");
    categoryTitle.textContent = categories[category] || category;
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
  reloadButton.onclick = () => {
    chrome.tabs.reload(() => {
      chrome.tabs.reload();
    });
  };
}

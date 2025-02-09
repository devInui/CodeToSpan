// ボタンがクリックされたときに実行される関数
function toggleExtension() {
  chrome.storage.sync.get({ enabled: true }, function (data) {
    const newEnabledState = !data.enabled;
    // 拡張機能の有効/無効の状態を切り替える
    chrome.storage.sync.set({ enabled: newEnabledState }, function () {
      const toggleButton = document.getElementById("toggle");
      toggleButton.checked = newEnabledState;
      toggleButton.textContent = newEnabledState
        ? "Disable Extension"
        : "Enable Extension";
      // テキストレイアウトの変更
      switchLayoutText(toggleButton.checked);
      // メッセージ送信
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const id = tabs[0].id;
        chrome.tabs.sendMessage(id, {
          command: "toggle",
          enabled: newEnabledState,
        });
      });
    });
  });
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
        console.error(
          "[CodeToSpan] Error sending message:",
          chrome.runtime.lastError,
        );
        return;
      }

      if (!response) {
        console.error(
          "[CodeToSpan] Error: No response received from content script.",
        );
        return;
      }
      chrome.storage.sync.get(null, (latestSettings) => {
        console.log("[CodeToSpan] Latest storage settings:", latestSettings);

        let differences = getSettingDifferences(response, latestSettings);

        if (differences.length > 0) {
          console.log("[CodeToSpan] Detected differences:", differences);
          displaySettingWarning(differences);
        }
      });
    },
  );
});

function getSettingDifferences(current, latest) {
  let diffs = [];

  if (current.enable !== latest.enable) {
    diffs.push("enabled have changed.");
  }
  if (
    JSON.stringify(current.excludedTags) !==
    JSON.stringify(
      latest.excludedTags || { a: false, div: false, pre: true, span: false },
    )
  ) {
    diffs.push("Excluded Tags have changed.");
  }
  if (current.skipStyledCodeTags !== (latest.skipStyledCodeTags || false)) {
    diffs.push("Skip Styled Code Tags setting has changed.");
  }
  if (current.addTranslateNo !== latest.addTranslateNo || false) {
    diffs.push("Add translate='no' setting has changed.");
  }
  if (
    JSON.stringify(current.excludedDomains) !==
    JSON.stringify(latest.excludedDomains || [])
  ) {
    diffs.push("Excluded Domains list has changed.");
  }

  console.log("[CodeToSpan] Comparison results:", diffs);

  return diffs;
}

function displaySettingWarning(differences) {
  const warningDiv = document.getElementById("settings-warning");
  const diffList = document.getElementById("settings-diff");
  const reloadButton = document.getElementById("reload-page");

  diffList.innerHTML = "";
  differences.forEach((diff) => {
    let li = document.createElement("li");
    li.textContent = diff;
    diffList.appendChild(li);
  });

  warningDiv.style.display = "block";

  reloadButton.onclick = () => {
    chrome.tabs.reload();
  };
}

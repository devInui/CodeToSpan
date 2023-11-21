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

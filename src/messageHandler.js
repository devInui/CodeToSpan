// CodeToSpan拡張機能の状態管理
let codeToSpanState = {
  enabled: true,
  settings: null,
  observer: null,
};

// CodeToSpan拡張機能の初期化と監視の開始
function initializeCodeToSpan() {
  initializeCodeToSpanSettings((settings) => {
    codeToSpanState.settings = settings;
    if (settings.enabled && shouldApplyCodeToSpan(settings)) {
      codeToSpanState.observer = observeDOMChanges(settings);
    }
  });
}

// CodeToSpanメッセージハンドラーの設定
function setupCodeToSpanMessageHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggle") {
      handleExtensionToggle();
      sendResponse({ success: true });
      return false;
    }

    if (message.action === "checkSettings") {
      handleSettingsCheck((response) => {
        sendResponse(response);
      });
      return true; // 非同期レスポンスのために必要
    }

    console.warn("[CodeToSpan] Unknown message action:", message.action);
    sendResponse({ success: false, error: "Unknown action" });
    return false;
  });
}

// CodeToSpan拡張機能の有効/無効切り替え
function handleExtensionToggle() {
  codeToSpanState.enabled = !codeToSpanState.enabled;
  location.reload();
}

// CodeToSpan設定の状態チェック
function handleSettingsCheck(callback) {
  if (!codeToSpanState.settings) {
    console.log("[CodeToSpan] Settings not initialized");
    callback({ success: false, error: "Settings not initialized" });
    return;
  }

  callback({
    success: true,
    enabled: codeToSpanState.enabled,
    ...codeToSpanState.settings,
  });
}

// CodeToSpanエラーハンドラーの設定
function setupCodeToSpanErrorHandler() {
  window.addEventListener("error", (event) => {
    console.error("[CodeToSpan] Error:", event.error);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[CodeToSpan] Unhandled Promise Rejection:", event.reason);
  });
}

// 初期化
initializeCodeToSpan();
setupCodeToSpanMessageHandlers();
setupCodeToSpanErrorHandler();

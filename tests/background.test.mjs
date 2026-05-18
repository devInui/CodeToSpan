import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const rootDir = path.resolve(import.meta.dirname, "..");

async function runBackground({
  currentSettings,
  latestSettings = {},
  sendMessageLastError = null,
} = {}) {
  const listeners = [];
  const tabUpdateListeners = [];
  const tabActivationListeners = [];
  const badgeTextCalls = [];
  const badgeColorCalls = [];
  const tabMessages = [];

  const context = {
    chrome: {
      action: {
        setBadgeBackgroundColor(details) {
          badgeColorCalls.push(structuredClone(details));
        },
        setBadgeText(details) {
          badgeTextCalls.push(structuredClone(details));
        },
      },
      runtime: {
        lastError: null,
        onMessage: {
          addListener(listener) {
            listeners.push(listener);
          },
        },
      },
      storage: {
        sync: {
          get(defaults, callback) {
            callback({ ...defaults, ...latestSettings });
          },
        },
      },
      tabs: {
        sendMessage(tabId, message, callback) {
          tabMessages.push({ tabId, message: structuredClone(message) });
          context.chrome.runtime.lastError = sendMessageLastError;
          callback(currentSettings);
          context.chrome.runtime.lastError = null;
        },
        onActivated: {
          addListener(listener) {
            tabActivationListeners.push(listener);
          },
        },
        onUpdated: {
          addListener(listener) {
            tabUpdateListeners.push(listener);
          },
        },
      },
    },
  };

  vm.createContext(context);
  const code = await readFile(path.join(rootDir, "background.js"), "utf8");
  vm.runInContext(code, context, { filename: "background.js" });

  function sendMessage(message) {
    const responses = [];
    for (const listener of listeners) {
      listener(message, {}, (response) =>
        responses.push(structuredClone(response)),
      );
    }
    return responses;
  }

  function updateTab(tabId, changeInfo) {
    for (const listener of tabUpdateListeners) {
      listener(tabId, changeInfo, { active: false });
    }
  }

  function updateActiveTab(tabId, changeInfo) {
    for (const listener of tabUpdateListeners) {
      listener(tabId, changeInfo, { active: true });
    }
  }

  function activateTab(tabId) {
    for (const listener of tabActivationListeners) {
      listener({ tabId });
    }
  }

  return {
    badgeColorCalls,
    badgeTextCalls,
    listeners,
    tabActivationListeners,
    tabMessages,
    tabUpdateListeners,
    activateTab,
    sendMessage,
    updateActiveTab,
    updateTab,
  };
}

test("background applies and clears the reload badge per tab", async () => {
  const runtime = await runBackground();

  assert.equal(runtime.listeners.length, 1);
  assert.equal(runtime.tabUpdateListeners.length, 2);
  assert.equal(runtime.tabActivationListeners.length, 1);
  assert.deepEqual(
    runtime.sendMessage({
      action: "updateReloadBadge",
      tabId: 123,
      reloadRequired: true,
    }),
    [{ success: true }],
  );
  assert.deepEqual(runtime.badgeTextCalls, [{ tabId: 123, text: "R" }]);
  assert.deepEqual(runtime.badgeColorCalls, [
    { tabId: 123, color: "#f57c00" },
  ]);

  runtime.sendMessage({
    action: "updateReloadBadge",
    tabId: 123,
    reloadRequired: false,
  });
  assert.deepEqual(runtime.badgeTextCalls.at(-1), { tabId: 123, text: "" });
});

test("background clears the reload badge when a tab starts loading", async () => {
  const runtime = await runBackground();

  runtime.updateTab(123, { status: "loading" });

  assert.deepEqual(runtime.badgeTextCalls, [{ tabId: 123, text: "" }]);
  assert.deepEqual(runtime.badgeColorCalls, []);
});

test("background refreshes the active tab badge when a tab is activated", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };
  const runtime = await runBackground({
    currentSettings: { ...latestSettings, enabled: false },
    latestSettings,
  });

  runtime.activateTab(123);

  assert.deepEqual(runtime.tabMessages, [
    { tabId: 123, message: { action: "checkSettings" } },
  ]);
  assert.deepEqual(runtime.badgeTextCalls, [{ tabId: 123, text: "R" }]);
});

test("background refreshes only active tabs after loading completes", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };
  const runtime = await runBackground({
    currentSettings: { ...latestSettings, enabled: false },
    latestSettings,
  });

  runtime.updateTab(123, { status: "complete" });
  runtime.updateActiveTab(456, { status: "complete" });

  assert.deepEqual(runtime.tabMessages, [
    { tabId: 456, message: { action: "checkSettings" } },
  ]);
  assert.deepEqual(runtime.badgeTextCalls, [{ tabId: 456, text: "R" }]);
});

test("background clears the badge when active-tab content script is unavailable", async () => {
  const runtime = await runBackground({
    sendMessageLastError: {
      message: "Could not establish connection. Receiving end does not exist.",
    },
  });

  runtime.activateTab(123);

  assert.deepEqual(runtime.badgeTextCalls, [{ tabId: 123, text: "" }]);
  assert.deepEqual(runtime.badgeColorCalls, []);
});

test("background keeps excluded pages clear using popup reload rules", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: true, div: true, pre: true, span: true },
    hostname: "example.com",
    isBrowserAndPageLanguageDifferent: false,
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: true,
    addTranslateNo: true,
    excludedDomains: [],
  };
  const runtime = await runBackground({
    currentSettings: {
      ...latestSettings,
      excludedTags: { a: false, div: false, pre: true, span: false },
      skipStyledCodeTags: false,
    },
    latestSettings,
  });

  runtime.activateTab(123);

  assert.deepEqual(runtime.badgeTextCalls, [{ tabId: 123, text: "" }]);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const rootDir = path.resolve(import.meta.dirname, "..");

async function runBackground() {
  const listeners = [];
  const tabUpdateListeners = [];
  const badgeTextCalls = [];
  const badgeColorCalls = [];

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
        onMessage: {
          addListener(listener) {
            listeners.push(listener);
          },
        },
      },
      tabs: {
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
      listener(tabId, changeInfo);
    }
  }

  return {
    badgeColorCalls,
    badgeTextCalls,
    listeners,
    tabUpdateListeners,
    sendMessage,
    updateTab,
  };
}

test("background applies and clears the reload badge per tab", async () => {
  const runtime = await runBackground();

  assert.equal(runtime.listeners.length, 1);
  assert.equal(runtime.tabUpdateListeners.length, 1);
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

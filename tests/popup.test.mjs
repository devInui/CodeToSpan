import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const rootDir = path.resolve(import.meta.dirname, "..");

class TestElement {
  constructor(id = "", tagName = "div") {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.checked = false;
    this.listeners = {};
    this.style = {};
    this._classNames = new Set();
    this._textContent = "";
  }

  get classList() {
    return {
      add: (...names) => names.forEach((name) => this._classNames.add(name)),
      contains: (name) => this._classNames.has(name),
      remove: (...names) =>
        names.forEach((name) => this._classNames.delete(name)),
    };
  }

  get innerHTML() {
    return "";
  }

  set innerHTML(value) {
    if (value === "") {
      this.children = [];
    }
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = value;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  appendChild(child) {
    this.children.push(child);
  }
}

async function runPopup({
  currentSettings,
  latestSettings,
  initialStorage = { enabled: true },
  sendMessageLastError = null,
} = {}) {
  const html = await readFile(path.join(rootDir, "popup.html"), "utf8");
  const elements = new Map();
  let sentCheckSettingsRequest = false;

  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    elements.set(id, new TestElement(id));
  }

  const document = {
    createElement(tagName) {
      return new TestElement("", tagName);
    },
    getElementById(id) {
      return elements.get(id) ?? null;
    },
  };

  const context = {
    chrome: {
      i18n: {
        getMessage(key) {
          return key;
        },
      },
      runtime: {
        lastError: null,
        openOptionsPage() {},
      },
      storage: {
        sync: {
          get(defaults, callback) {
            const values =
              Object.keys(defaults).length === 1 && "enabled" in defaults
                ? { ...defaults, ...initialStorage }
                : { ...defaults, ...latestSettings };
            callback(values);
          },
        },
      },
      tabs: {
        query(_queryInfo, callback) {
          callback([{ id: 123 }]);
        },
        reload() {},
        sendMessage(tabId, message, callback) {
          assert.equal(tabId, 123);
          assert.deepEqual(Object.keys(message), ["action"]);
          assert.equal(message.action, "checkSettings");
          sentCheckSettingsRequest = true;
          context.chrome.runtime.lastError = sendMessageLastError;
          callback(currentSettings);
          context.chrome.runtime.lastError = null;
        },
      },
    },
    console: {
      error() {},
      log() {},
    },
    document,
    event: {
      preventDefault() {},
    },
    window: {
      close() {},
    },
  };

  vm.createContext(context);
  const popupCode = await readFile(path.join(rootDir, "popup.js"), "utf8");
  vm.runInContext(popupCode, context, { filename: "popup.js" });

  return { elements, sentCheckSettingsRequest };
}

test("shows outdated-settings warning when current tab settings differ from latest storage settings", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };
  const currentSettings = {
    ...latestSettings,
    enabled: false,
  };

  const { elements, sentCheckSettingsRequest } = await runPopup({
    currentSettings,
    latestSettings,
  });

  const warning = elements.get("settings-warning");
  const diffList = elements.get("settings-diff");

  assert.equal(sentCheckSettingsRequest, true);
  assert.equal(warning.classList.contains("visible"), true);
  assert.equal(diffList.children.length, 2);
  assert.match(diffList.children[0].textContent, /Extension Status$/);
  assert.match(diffList.children[1].textContent, /^OFF/);
  assert.match(diffList.children[1].textContent, /ON$/);
});

test("does not show outdated-settings warning when content script reports settings failure", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { elements, sentCheckSettingsRequest } = await runPopup({
    currentSettings: { success: false, error: "Settings not initialized" },
    latestSettings,
  });

  const warning = elements.get("settings-warning");
  const diffList = elements.get("settings-diff");

  assert.equal(sentCheckSettingsRequest, true);
  assert.equal(warning.classList.contains("visible"), false);
  assert.equal(diffList.children.length, 0);
});

test("does not show outdated-settings warning when content script sends no response", async () => {
  const { elements, sentCheckSettingsRequest } = await runPopup({
    currentSettings: undefined,
  });

  const warning = elements.get("settings-warning");
  const diffList = elements.get("settings-diff");

  assert.equal(sentCheckSettingsRequest, true);
  assert.equal(warning.classList.contains("visible"), false);
  assert.equal(diffList.children.length, 0);
});

test("does not show outdated-settings warning when content script is unavailable", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { elements, sentCheckSettingsRequest } = await runPopup({
    currentSettings: {
      ...latestSettings,
      enabled: false,
    },
    latestSettings,
    sendMessageLastError: {
      message: "Could not establish connection. Receiving end does not exist.",
    },
  });

  const warning = elements.get("settings-warning");
  const diffList = elements.get("settings-diff");

  assert.equal(sentCheckSettingsRequest, true);
  assert.equal(warning.classList.contains("visible"), false);
  assert.equal(diffList.children.length, 0);
});

test("outdated-settings warning does not reserve popup space while hidden", async () => {
  const css = await readFile(path.join(rootDir, "popup.css"), "utf8");
  const hiddenRule = css.match(/#settings-warning\s*\{(?<body>[^}]*)\}/u);
  const visibleRule = css.match(
    /#settings-warning\.visible\s*\{(?<body>[^}]*)\}/u,
  );

  assert.ok(hiddenRule, "missing #settings-warning rule");
  assert.ok(visibleRule, "missing #settings-warning.visible rule");
  assert.match(hiddenRule.groups.body, /display:\s*none;/u);
  assert.match(visibleRule.groups.body, /display:\s*block;/u);
});

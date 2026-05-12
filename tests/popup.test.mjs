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
  initialLocalStorage = { popupShowMoreExpanded: false },
  activeTabUrl = "https://example.com/article",
  confirmReload = false,
  sendMessageLastError = null,
} = {}) {
  const html = await readFile(path.join(rootDir, "popup.html"), "utf8");
  const elements = new Map();
  let sentCheckSettingsRequest = false;
  const confirmMessages = [];
  const runtimeMessages = [];
  const reloadedTabs = [];
  let syncValues = { ...latestSettings };

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
        sendMessage(message, callback) {
          runtimeMessages.push(structuredClone(message));
          callback?.({ success: true });
        },
      },
      storage: {
        local: {
          values: { ...initialLocalStorage },
          get(defaults, callback) {
            callback({ ...defaults, ...this.values });
          },
          set(values) {
            this.values = { ...this.values, ...values };
          },
        },
        sync: {
          get(defaults, callback) {
            const values =
              Object.keys(defaults).length === 1 && "enabled" in defaults
                ? { ...defaults, ...initialStorage }
                : { ...defaults, ...syncValues };
            callback(values);
          },
          set(values, callback) {
            syncValues = { ...syncValues, ...values };
            callback?.();
          },
        },
      },
      tabs: {
        query(_queryInfo, callback) {
          callback([{ id: 123, url: activeTabUrl }]);
        },
        reload(tabId) {
          reloadedTabs.push(tabId);
        },
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
    confirm(message) {
      confirmMessages.push(message);
      return confirmReload;
    },
    document,
    event: {
      preventDefault() {},
    },
    URL,
    window: {
      close() {},
    },
  };

  vm.createContext(context);
  const popupCode = await readFile(path.join(rootDir, "popup.js"), "utf8");
  vm.runInContext(popupCode, context, { filename: "popup.js" });

  return {
    confirmMessages,
    elements,
    reloadedTabs,
    runtimeMessages,
    sentCheckSettingsRequest,
  };
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

  const { elements, runtimeMessages, sentCheckSettingsRequest } = await runPopup({
    currentSettings,
    latestSettings,
  });

  const warning = elements.get("settings-warning");
  const diffList = elements.get("settings-diff");

  assert.equal(sentCheckSettingsRequest, true);
  assert.equal(warning.classList.contains("visible"), true);
  assert.equal(diffList.children.length, 2);
  assert.match(diffList.children[0].textContent, /Extension Status$/);
  assert.equal(diffList.children[1].textContent, "Status: STOP -> RUN");
  assert.deepEqual(runtimeMessages, [
    { action: "updateReloadBadge", tabId: 123, reloadRequired: true },
  ]);
});

test("outdated-settings warning uses concise v2.3 category labels", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: true, div: true, pre: true, span: true },
    isLanguageCheckEnabled: false,
    skipStyledCodeTags: true,
    addTranslateNo: true,
    excludedDomains: ["example.com"],
  };
  const currentSettings = {
    enabled: false,
    excludedTags: { a: false, div: false, pre: false, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: false,
    excludedDomains: [],
  };

  const { elements } = await runPopup({
    currentSettings,
    latestSettings,
  });

  const diffTexts = elements
    .get("settings-diff")
    .children.map((child) => child.textContent);

  assert.deepEqual(diffTexts, [
    "Extension Status",
    "Status: STOP -> RUN",
    "Code Element Rules",
    "Parent tags: none -> pre, div, a, span",
    "Sized code blocks: OFF -> ON",
    "Page Language",
    "Another language only: ON -> OFF",
    "Translate Attributes",
    'translate="no": OFF -> ON',
    "Exclude Domains",
    "Domain list changed",
  ]);
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

  const { elements, runtimeMessages, sentCheckSettingsRequest } = await runPopup({
    currentSettings: { success: false, error: "Settings not initialized" },
    latestSettings,
  });

  const warning = elements.get("settings-warning");
  const diffList = elements.get("settings-diff");

  assert.equal(sentCheckSettingsRequest, true);
  assert.equal(warning.classList.contains("visible"), false);
  assert.equal(diffList.children.length, 0);
  assert.deepEqual(runtimeMessages, [
    { action: "updateReloadBadge", tabId: 123, reloadRequired: false },
  ]);
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

test("show more state is restored and persisted with local storage", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { elements } = await runPopup({
    currentSettings: latestSettings,
    latestSettings,
    initialLocalStorage: { popupShowMoreExpanded: true },
  });

  const moreActions = elements.get("more-actions");
  const showMoreToggle = elements.get("show-more-toggle");
  const showMoreLabel = elements.get("show-more-label");

  assert.equal(moreActions.classList.contains("visible"), true);
  assert.equal(showMoreLabel.textContent, "Show Less");

  showMoreToggle.listeners.click();

  assert.equal(moreActions.classList.contains("visible"), false);
  assert.equal(showMoreLabel.textContent, "Show More");
});

test("check domain shows the active tab hostname with add action", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { elements } = await runPopup({
    currentSettings: latestSettings,
    latestSettings,
    activeTabUrl: "https://docs.example.co.jp/path",
  });

  elements.get("check-domain").listeners.click();

  assert.equal(elements.get("domain-check").classList.contains("visible"), true);
  assert.equal(
    elements.get("domain-check").classList.contains("unavailable"),
    false,
  );
  assert.equal(elements.get("current-domain").textContent, "docs.example.co.jp");
  assert.equal(elements.get("add-current-domain").textContent, "Add");
  assert.equal(elements.get("add-current-domain").disabled, false);
});

test("check domain marks an already excluded hostname as added", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: ["docs.example.co.jp"],
  };

  const { elements } = await runPopup({
    currentSettings: latestSettings,
    latestSettings,
    activeTabUrl: "https://docs.example.co.jp/path",
  });

  elements.get("check-domain").listeners.click();

  assert.equal(elements.get("current-domain").textContent, "docs.example.co.jp");
  assert.equal(elements.get("add-current-domain").textContent, "Added");
  assert.equal(elements.get("add-current-domain").disabled, true);
});

test("add domain stores the active hostname and reloads after confirmation", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { confirmMessages, elements, reloadedTabs } = await runPopup({
    currentSettings: latestSettings,
    latestSettings,
    activeTabUrl: "https://docs.example.co.jp/path",
    confirmReload: true,
  });

  elements.get("check-domain").listeners.click();
  elements.get("add-current-domain").listeners.click();

  assert.equal(elements.get("add-current-domain").textContent, "Added");
  assert.equal(elements.get("add-current-domain").disabled, true);
  assert.deepEqual(confirmMessages, ["Domain added. Reload current tab?"]);
  assert.deepEqual(reloadedTabs, [123]);
});

test("check domain shows unavailable state when the tab has no hostname", async () => {
  const { elements } = await runPopup({
    currentSettings: undefined,
    latestSettings: {
      excludedTags: { a: false, div: false, pre: true, span: false },
      isLanguageCheckEnabled: true,
      skipStyledCodeTags: false,
      addTranslateNo: true,
      excludedDomains: [],
    },
    activeTabUrl: "chrome://extensions/",
  });

  elements.get("check-domain").listeners.click();

  assert.equal(elements.get("domain-check").classList.contains("visible"), true);
  assert.equal(
    elements.get("domain-check").classList.contains("unavailable"),
    true,
  );
  assert.equal(elements.get("current-domain").textContent, "Domain unavailable");
  assert.equal(elements.get("add-current-domain").disabled, true);
});

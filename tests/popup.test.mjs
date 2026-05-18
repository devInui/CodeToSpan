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
  initialStorage = { enabled: true, autoReloadOnRunStop: false },
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
  const tabMessages = [];
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
                : Object.keys(defaults).length === 1 &&
                    "autoReloadOnRunStop" in defaults
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
          tabMessages.push(structuredClone(message));
          if (message.action === "checkSettings") {
            sentCheckSettingsRequest = true;
            context.chrome.runtime.lastError = sendMessageLastError;
            callback(currentSettings);
            context.chrome.runtime.lastError = null;
            return;
          }
          callback?.({ success: true });
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
    tabMessages,
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

test("does not require reload when a language-excluded page stays excluded", async () => {
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
  const currentSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    hostname: "example.com",
    isBrowserAndPageLanguageDifferent: false,
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: false,
    excludedDomains: [],
  };

  const { elements, runtimeMessages } = await runPopup({
    currentSettings,
    latestSettings,
  });

  assert.equal(elements.get("settings-warning").classList.contains("visible"), false);
  assert.equal(elements.get("settings-diff").children.length, 0);
  assert.deepEqual(runtimeMessages, [
    { action: "updateReloadBadge", tabId: 123, reloadRequired: false },
  ]);
});

test("requires reload when a domain setting changes the current page scope", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    hostname: "example.com",
    isBrowserAndPageLanguageDifferent: true,
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: ["example.com"],
  };
  const currentSettings = {
    ...latestSettings,
    excludedDomains: [],
  };

  const { elements, runtimeMessages } = await runPopup({
    currentSettings,
    latestSettings,
  });

  assert.equal(elements.get("settings-warning").classList.contains("visible"), true);
  assert.deepEqual(runtimeMessages, [
    { action: "updateReloadBadge", tabId: 123, reloadRequired: true },
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

test("run stop changes reload the current tab only after confirmation", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { confirmMessages, elements, reloadedTabs, runtimeMessages, tabMessages } =
    await runPopup({
      currentSettings: latestSettings,
      latestSettings,
      confirmReload: true,
    });

  elements.get("toggle").listeners.click();

  assert.equal(elements.get("toggle").checked, false);
  assert.deepEqual(confirmMessages, ["Reload current tab to apply this change?"]);
  assert.deepEqual(reloadedTabs, [123]);
  assert.deepEqual(tabMessages, [{ action: "checkSettings" }]);
  assert.deepEqual(runtimeMessages.at(-1), {
    action: "updateReloadBadge",
    tabId: 123,
    reloadRequired: false,
  });
});

test("run stop changes recompute outdated state when reload is declined", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { elements, reloadedTabs, runtimeMessages, tabMessages } = await runPopup({
    currentSettings: latestSettings,
    latestSettings,
    confirmReload: false,
  });

  elements.get("toggle").listeners.click();

  assert.deepEqual(reloadedTabs, []);
  assert.equal(elements.get("settings-warning").classList.contains("visible"), true);
  assert.deepEqual(
    elements.get("settings-diff").children.map((child) => child.textContent),
    ["Extension Status", "Status: RUN -> STOP"],
  );
  assert.deepEqual(tabMessages, [
    { action: "checkSettings" },
    { action: "checkSettings" },
  ]);
  assert.deepEqual(runtimeMessages.at(-1), {
    action: "updateReloadBadge",
    tabId: 123,
    reloadRequired: true,
  });
});

test("run stop changes keep unchanged excluded pages clear when reload is declined", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    hostname: "example.com",
    isBrowserAndPageLanguageDifferent: false,
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { elements, runtimeMessages, tabMessages } = await runPopup({
    currentSettings: latestSettings,
    latestSettings,
    confirmReload: false,
  });

  elements.get("toggle").listeners.click();

  assert.equal(elements.get("settings-warning").classList.contains("visible"), false);
  assert.equal(elements.get("settings-diff").children.length, 0);
  assert.deepEqual(tabMessages, [
    { action: "checkSettings" },
    { action: "checkSettings" },
  ]);
  assert.deepEqual(runtimeMessages.at(-1), {
    action: "updateReloadBadge",
    tabId: 123,
    reloadRequired: false,
  });
});

test("run stop changes auto reload when the option is enabled", async () => {
  const latestSettings = {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    excludedDomains: [],
  };

  const { confirmMessages, elements, reloadedTabs, runtimeMessages } =
    await runPopup({
      currentSettings: latestSettings,
      latestSettings,
      initialStorage: { enabled: true, autoReloadOnRunStop: true },
      confirmReload: false,
    });

  elements.get("toggle").listeners.click();

  assert.deepEqual(confirmMessages, []);
  assert.deepEqual(reloadedTabs, [123]);
  assert.deepEqual(runtimeMessages.at(-1), {
    action: "updateReloadBadge",
    tabId: 123,
    reloadRequired: false,
  });
});

test("check domain shows the content script hostname with add action", async () => {
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
    hostname: "content-script.example",
  };

  const { elements } = await runPopup({
    currentSettings,
    latestSettings,
    activeTabUrl: "https://tab-url.example/path",
  });

  elements.get("check-domain").listeners.click();

  assert.equal(elements.get("domain-check").classList.contains("visible"), true);
  assert.equal(
    elements.get("domain-check").classList.contains("unavailable"),
    false,
  );
  assert.equal(elements.get("current-domain").textContent, "content-script.example");
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
    excludedDomains: ["content-script.example"],
  };
  const currentSettings = {
    ...latestSettings,
    hostname: "content-script.example",
  };

  const { elements } = await runPopup({
    currentSettings,
    latestSettings,
    activeTabUrl: "https://tab-url.example/path",
  });

  elements.get("check-domain").listeners.click();

  assert.equal(elements.get("current-domain").textContent, "content-script.example");
  assert.equal(elements.get("add-current-domain").textContent, "Added");
  assert.equal(elements.get("add-current-domain").disabled, true);
});

test("add domain stores the content script hostname and reloads after confirmation", async () => {
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
    hostname: "content-script.example",
  };

  const { confirmMessages, elements, reloadedTabs } = await runPopup({
    currentSettings,
    latestSettings,
    activeTabUrl: "https://tab-url.example/path",
    confirmReload: true,
  });

  elements.get("check-domain").listeners.click();
  elements.get("add-current-domain").listeners.click();

  assert.equal(elements.get("add-current-domain").textContent, "Added");
  assert.equal(elements.get("add-current-domain").disabled, true);
  assert.deepEqual(confirmMessages, ["Domain added. Reload current tab?"]);
  assert.deepEqual(reloadedTabs, [123]);
});

test("check domain shows unavailable state when the content script has no hostname", async () => {
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

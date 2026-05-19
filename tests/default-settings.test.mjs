import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { getReloadRequiredDifferences as getReloadRequiredDifferencesCore } from "../src/reloadState.js";

const rootDir = path.resolve(import.meta.dirname, "..");
const activeDefaultKeys = [
  "enabled",
  "excludedTags",
  "isLanguageCheckEnabled",
  "skipStyledCodeTags",
  "addTranslateNo",
  "autoReloadOnRunStop",
  "excludedDomains",
];

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

async function readSourceDefaults() {
  const context = {
    chrome: {
      storage: {
        local: {
          get(defaults, callback) {
            callback(structuredClone(defaults));
          },
          set() {},
        },
        sync: {
          get() {},
        },
      },
    },
    console,
    document: {
      documentElement: {
        lang: "",
      },
      querySelector() {
        return null;
      },
    },
    navigator: {
      language: "ja-JP",
    },
    window: {
      location: {
        hostname: "example.com",
      },
    },
  };

  vm.createContext(context);
  const code = await readFile(path.join(rootDir, "src", "settings.js"), "utf8");
  vm.runInContext(
    `${code}\nthis.__defaults = CODETOSPAN_DEFAULT_SETTINGS;`,
    context,
    { filename: "src/settings.js" },
  );

  return structuredClone(context.__defaults);
}

async function readPopupLatestSettingsDefaults() {
  const html = await readFile(path.join(rootDir, "popup.html"), "utf8");
  const elements = new Map();
  const storageGetDefaults = [];

  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    elements.set(id, new TestElement(id));
  }

  const context = {
    getReloadRequiredDifferencesCore,
    chrome: {
      i18n: {
        getMessage(key) {
          return key;
        },
      },
      runtime: {
        lastError: null,
        openOptionsPage() {},
        sendMessage(_message, callback) {
          callback?.({ success: true });
        },
      },
      storage: {
        local: {
          get(defaults, callback) {
            callback(structuredClone(defaults));
          },
          set() {},
        },
        sync: {
          get(defaults, callback) {
            storageGetDefaults.push(structuredClone(defaults));
            callback(structuredClone(defaults));
          },
        },
      },
      tabs: {
        query(_queryInfo, callback) {
          callback([{ id: 123 }]);
        },
        reload() {},
        sendMessage(_tabId, _message, callback) {
          callback({
            enabled: true,
            excludedTags: { a: false, div: false, pre: true, span: false },
            isLanguageCheckEnabled: true,
            skipStyledCodeTags: false,
            addTranslateNo: true,
            autoReloadOnRunStop: false,
            excludedDomains: [],
          });
        },
      },
    },
    console: {
      error() {},
      log() {},
    },
    document: {
      createElement(tagName) {
        return new TestElement("", tagName);
      },
      getElementById(id) {
        return elements.get(id) ?? null;
      },
    },
    event: {
      preventDefault() {},
    },
    window: {
      close() {},
    },
  };

  vm.createContext(context);
  const code = (
    await readFile(path.join(rootDir, "popup.js"), "utf8")
  ).replace(/^import .+;\r?\n\r?\n/u, "");
  vm.runInContext(code, context, { filename: "popup.js" });

  return storageGetDefaults.find((defaults) =>
    activeDefaultKeys.every((key) => key in defaults),
  );
}

async function readOptionsDefaults() {
  const html = await readFile(path.join(rootDir, "options.html"), "utf8");
  const elements = new Map();
  const storageGetDefaults = [];
  const storageSetValues = [];

  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    elements.set(id, new TestElement(id));
  }

  const context = {
    alert() {},
    chrome: {
      i18n: {
        getMessage(key) {
          return key;
        },
      },
      storage: {
        sync: {
          get(defaults, callback) {
            storageGetDefaults.push(structuredClone(defaults));
            callback(structuredClone(defaults));
          },
          set(values, callback) {
            storageSetValues.push(structuredClone(values));
            if (typeof callback === "function") {
              callback();
            }
          },
        },
      },
    },
    confirm() {
      return true;
    },
    console: {
      log() {},
    },
    document: {
      addEventListener() {},
      createElement(tagName) {
        return new TestElement("", tagName);
      },
      getElementById(id) {
        return elements.get(id) ?? null;
      },
      querySelector(selector) {
        if (selector === "h1") {
          return new TestElement("", "h1");
        }
        return null;
      },
      querySelectorAll() {
        return [];
      },
      title: "",
    },
  };

  vm.createContext(context);
  const code = await readFile(path.join(rootDir, "options.js"), "utf8");
  vm.runInContext(code, context, { filename: "options.js" });
  context.loadSettings();
  elements.get("resetSettings").listeners.click();

  return {
    loadDefaults: storageGetDefaults[0],
    resetDefaults: storageSetValues[0],
  };
}

async function loadOptionsContext({
  enabled = true,
  excludedDomains = [],
  onAlert = () => {},
} = {}) {
  const html = await readFile(path.join(rootDir, "options.html"), "utf8");
  const elements = new Map();
  const storageSetValues = [];
  const storageChangeListeners = [];

  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    elements.set(id, new TestElement(id));
  }

  const context = {
    alert: onAlert,
    chrome: {
      i18n: {
        getMessage(key) {
          return key;
        },
      },
      storage: {
        sync: {
          get(defaults, callback) {
            callback({ ...defaults, enabled, excludedDomains: [...excludedDomains] });
          },
          set(values, callback) {
            storageSetValues.push(structuredClone(values));
            callback?.();
          },
        },
        onChanged: {
          addListener(listener) {
            storageChangeListeners.push(listener);
          },
        },
      },
    },
    console: {
      log() {},
    },
    document: {
      addEventListener() {},
      createElement(tagName) {
        return new TestElement("", tagName);
      },
      getElementById(id) {
        return elements.get(id) ?? null;
      },
      querySelector(selector) {
        if (selector === "h1") {
          return new TestElement("", "h1");
        }
        return null;
      },
      querySelectorAll() {
        return [];
      },
      title: "",
    },
  };

  vm.createContext(context);
  const code = await readFile(path.join(rootDir, "options.js"), "utf8");
  vm.runInContext(code, context, { filename: "options.js" });

  return { context, elements, storageChangeListeners, storageSetValues };
}

class TestElement {
  constructor(id = "", tagName = "div") {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.checked = false;
    this.children = [];
    this.firstChild = null;
    this.listeners = {};
    this.placeholder = "";
    this.style = {};
    this.textContent = "";
    this.type = "";
    this.value = "";
    this._classNames = new Set();
  }

  get classList() {
    return {
      add: (...names) => names.forEach((name) => this._classNames.add(name)),
      contains: (name) => this._classNames.has(name),
      remove: (...names) =>
        names.forEach((name) => this._classNames.delete(name)),
    };
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  appendChild(child) {
    this.children.push(child);
    this.firstChild = this.children[0] ?? null;
  }

  hasAttribute() {
    return false;
  }

  removeChild(child) {
    this.children = this.children.filter((candidate) => candidate !== child);
    this.firstChild = this.children[0] ?? null;
  }

  setAttribute(name, value) {
    this[name] = value;
  }
}

test("active default settings stay aligned across settings, popup, and options", async () => {
  const sourceDefaults = await readSourceDefaults();
  const popupDefaults = await readPopupLatestSettingsDefaults();
  const { loadDefaults, resetDefaults } = await readOptionsDefaults();

  assert.deepEqual(pick(sourceDefaults, activeDefaultKeys), {
    enabled: true,
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    autoReloadOnRunStop: false,
    excludedDomains: [],
  });
  assert.deepEqual(popupDefaults, pick(sourceDefaults, activeDefaultKeys));
  assert.deepEqual(
    loadDefaults,
    pick(sourceDefaults, activeDefaultKeys),
  );
  assert.deepEqual(
    resetDefaults,
    pick(
      sourceDefaults,
      activeDefaultKeys.filter(
        (key) => key !== "enabled" && key !== "excludedDomains",
      ),
    ),
  );
});

test("excluded domain rows render remove button before domain text", async () => {
  const elements = new Map([
    ["excludedDomainsList", new TestElement("excludedDomainsList", "ul")],
    ["resetSettings", new TestElement("resetSettings", "button")],
  ]);
  const context = {
    chrome: {
      i18n: {
        getMessage(key) {
          return key;
        },
      },
      storage: {
        sync: {
          get() {},
          set() {},
        },
      },
    },
    console: {
      log() {},
    },
    document: {
      addEventListener() {},
      createElement(tagName) {
        return new TestElement("", tagName);
      },
      getElementById(id) {
        return elements.get(id) ?? null;
      },
      querySelector(selector) {
        if (selector === "h1") {
          return new TestElement("", "h1");
        }
        return null;
      },
      querySelectorAll() {
        return [];
      },
      title: "",
    },
  };

  vm.createContext(context);
  const code = await readFile(path.join(rootDir, "options.js"), "utf8");
  vm.runInContext(code, context, { filename: "options.js" });

  context.updateExcludedDomainsList(["example.com"]);

  const [row] = elements.get("excludedDomainsList").children;
  assert.equal(row.children[0].className, "removeDomain");
  assert.equal(row.children[0].type, "button");
  assert.equal(row.children[0].textContent, "");
  assert.equal(row.children[0]["aria-label"], "Remove domain");
  assert.equal(row.children[1].className, "domain-name");
  assert.equal(row.children[1].textContent, "example.com");
});

test("options settings container is not a submitting form", async () => {
  const html = await readFile(path.join(rootDir, "options.html"), "utf8");

  assert.match(html, /<div id="optionsForm">/);
  assert.doesNotMatch(html, /<form id="optionsForm">/);
  assert.doesNotMatch(html, /OptionsLead/);
  assert.match(html, /<button\s+id="addDomain"\s+type="button"/);
});

test("options RUN STOP toggle lives in the title header", async () => {
  const html = await readFile(path.join(rootDir, "options.html"), "utf8");
  const css = await readFile(path.join(rootDir, "options.css"), "utf8");
  const header = html.match(/<header class="settings-header">[\s\S]*?<\/header>/);
  const settingsManagement = html.match(
    /<section class="settings-section reset-section">[\s\S]*?<\/section>/,
  );

  assert.ok(header);
  assert.ok(settingsManagement);
  assert.match(
    header[0],
    /STOP[\s\S]*<input type="checkbox" id="enabled" aria-label="RUN \/ STOP" \/>[\s\S]*RUN/,
  );
  assert.doesNotMatch(settingsManagement[0], /id="enabled"/);
  assert.doesNotMatch(settingsManagement[0], /RunStopControl/);
  assert.doesNotMatch(settingsManagement[0], /RunStopControlDescription/);
  assert.match(css, /\.settings-header\s*{[\s\S]*justify-content: flex-start;/);
  assert.match(css, /\.header-toggle-row\s*{[\s\S]*justify-content: flex-start;/);
});

test("options can switch RUN STOP without reload prompt", async () => {
  const { context, elements, storageSetValues } = await loadOptionsContext({
    enabled: true,
  });

  context.initializeEventListeners();
  elements.get("enabled").checked = false;
  elements.get("enabled").listeners.change();

  assert.deepEqual(storageSetValues, [{ enabled: false }]);
});

test("options sync open page state from storage changes", async () => {
  const { context, elements, storageChangeListeners } = await loadOptionsContext({
    enabled: true,
    excludedDomains: ["before.example"],
  });

  context.loadSettings();
  context.initializeStorageChangeListener();

  assert.equal(elements.get("enabled").checked, true);
  assert.equal(
    elements.get("excludedDomainsList").children[0].children[1].textContent,
    "before.example",
  );

  storageChangeListeners[0](
    {
      enabled: { oldValue: true, newValue: false },
      excludedDomains: {
        oldValue: ["before.example"],
        newValue: ["after.example"],
      },
    },
    "sync",
  );

  assert.equal(elements.get("enabled").checked, false);
  assert.equal(elements.get("excludedDomainsList").children.length, 1);
  assert.equal(
    elements.get("excludedDomainsList").children[0].children[1].textContent,
    "after.example",
  );
});

test("adding a unique domain clears the input after storing it", async () => {
  const { context, elements, storageSetValues } = await loadOptionsContext();
  elements.get("newDomain").value = "example.com";

  context.addDomain();

  assert.deepEqual(storageSetValues, [{ excludedDomains: ["example.com"] }]);
  assert.equal(elements.get("newDomain").value, "");
});

test("failed domain additions preserve the input value", async () => {
  const alerts = [];
  const emptyAdd = await loadOptionsContext({
    onAlert(message) {
      alerts.push(message);
    },
  });
  emptyAdd.elements.get("newDomain").value = "   ";

  emptyAdd.context.addDomain();

  assert.equal(emptyAdd.elements.get("newDomain").value, "   ");

  const duplicateAdd = await loadOptionsContext({
    excludedDomains: ["example.com"],
    onAlert(message) {
      alerts.push(message);
    },
  });
  duplicateAdd.elements.get("newDomain").value = "example.com";

  duplicateAdd.context.addDomain();

  assert.equal(duplicateAdd.elements.get("newDomain").value, "example.com");
  assert.deepEqual(alerts, ["EnterDomainMessage", "DomainExistsMessage"]);
});

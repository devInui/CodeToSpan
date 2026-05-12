import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const rootDir = path.resolve(import.meta.dirname, "..");
const activeDefaultKeys = [
  "enabled",
  "excludedTags",
  "isLanguageCheckEnabled",
  "skipStyledCodeTags",
  "addTranslateNo",
  "excludedDomains",
];

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

async function readSourceDefaults() {
  const context = {
    chrome: {
      storage: {
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
  const code = await readFile(path.join(rootDir, "popup.js"), "utf8");
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
    excludedDomains: [],
  });
  assert.deepEqual(popupDefaults, pick(sourceDefaults, activeDefaultKeys));
  assert.deepEqual(
    loadDefaults,
    pick(sourceDefaults, activeDefaultKeys.filter((key) => key !== "enabled")),
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
  assert.equal(row.children[1].className, "domain-name");
  assert.equal(row.children[1].textContent, "example.com");
});

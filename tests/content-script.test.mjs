import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const rootDir = path.resolve(import.meta.dirname, "..");
const contentScriptFiles = [
  "src/settings.js",
  "src/domProcessor.js",
  "src/messageHandler.js",
  "src/content.js",
];

async function runContentScripts({
  storageData = {},
  browserLanguage = "ja-JP",
  pageLanguage = "en",
} = {}) {
  const listeners = [];
  const warnings = [];
  let observeCalls = 0;
  let reloadCalls = 0;

  const location = {
    hostname: "example.com",
    reload() {
      reloadCalls += 1;
    },
  };

  const context = {
    console: {
      log() {},
      error() {},
      warn(...args) {
        warnings.push(args.join(" "));
      },
    },
    window: {
      addEventListener() {},
      location,
    },
    location,
    navigator: {
      language: browserLanguage,
    },
    MutationObserver: class {
      observe() {
        observeCalls += 1;
      }

      disconnect() {}
    },
    document: {
      documentElement: {
        lang: pageLanguage,
      },
      querySelector() {
        return null;
      },
      body: {
        querySelectorAll() {
          return [];
        },
      },
    },
    chrome: {
      storage: {
        sync: {
          get(defaults, callback) {
            callback({ ...defaults, ...storageData });
          },
        },
      },
      runtime: {
        onMessage: {
          addListener(listener) {
            listeners.push(listener);
          },
        },
      },
    },
    observeDOMChanges() {
      observeCalls += 1;
      return { disconnect() {} };
    },
  };

  vm.createContext(context);

  for (const file of contentScriptFiles) {
    const code = await readFile(path.join(rootDir, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }

  function sendMessage(message) {
    const responses = [];
    for (const listener of listeners) {
      listener(message, {}, (response) =>
        responses.push(structuredClone(response)),
      );
    }
    return responses;
  }

  return {
    get observeCalls() {
      return observeCalls;
    },
    get reloadCalls() {
      return reloadCalls;
    },
    listeners,
    sendMessage,
    warnings,
  };
}

test("starts DOM observation with default settings when browser and page languages differ", async () => {
  const runtime = await runContentScripts();

  assert.equal(runtime.observeCalls, 1);
});

test("registers one runtime message listener", async () => {
  const runtime = await runContentScripts();

  assert.equal(runtime.listeners.length, 1);
});

test("accepts the popup toggle message contract", async () => {
  const runtime = await runContentScripts();

  const responses = runtime.sendMessage({ command: "toggle" });

  assert.equal(runtime.reloadCalls, 1);
  assert.deepEqual(responses, [{ success: true }]);
});

test("keeps the popup checkSettings action contract", async () => {
  const runtime = await runContentScripts();

  const responses = runtime.sendMessage({ action: "checkSettings" });

  assert.equal(responses.length, 1);
  assert.equal(responses[0].success, true);
  assert.equal(responses[0].enabled, true);
  assert.deepEqual(responses[0].excludedTags, {
    a: false,
    div: false,
    pre: true,
    span: false,
  });
  assert.equal(responses[0].isLanguageCheckEnabled, true);
  assert.equal(responses[0].skipStyledCodeTags, false);
  assert.equal(responses[0].addTranslateNo, false);
  assert.deepEqual(responses[0].excludedDomains, []);
});

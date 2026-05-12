import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const rootDir = path.resolve(import.meta.dirname, "..");

test("manifest references existing content scripts", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(rootDir, "manifest.json"), "utf8"),
  );

  for (const script of manifest.content_scripts?.[0]?.js ?? []) {
    await access(path.join(rootDir, script));
  }
});

test("manifest references an existing background service worker", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(rootDir, "manifest.json"), "utf8"),
  );

  assert.equal(manifest.background?.service_worker, "background.js");
  await access(path.join(rootDir, manifest.background.service_worker));
});

test("locale files are valid Chrome i18n message JSON", async () => {
  for (const locale of ["en", "ja"]) {
    const messages = JSON.parse(
      await readFile(
        path.join(rootDir, "_locales", locale, "messages.json"),
        "utf8",
      ),
    );

    for (const [key, value] of Object.entries(messages)) {
      assert.equal(typeof value.message, "string", `${locale}.${key}`);
    }
  }
});

test("Japanese locale messages do not contain mojibake markers", async () => {
  const messages = JSON.parse(
    await readFile(path.join(rootDir, "_locales", "ja", "messages.json"), "utf8"),
  );
  const mojibakePattern = /[\u0080-\u009f\ue000-\uf8ff\ufffd]|(?:縺|繧|譁|螟|蜿|險|笞)/u;

  for (const [key, value] of Object.entries(messages)) {
    assert.doesNotMatch(value.message, mojibakePattern, `ja.${key}`);
  }
});

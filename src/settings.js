// CodeToSpan拡張機能の設定初期値
const CODETOSPAN_DEFAULT_SETTINGS = {
  excludedTags: { a: false, div: false, pre: true, span: false },
  isLanguageCheckEnabled: true,
  skipStyledCodeTags: false,
  addTranslateNo: false,
  excludedDomains: [],
};

// CodeToSpan拡張機能の設定を読み込み、初期化
function initializeCodeToSpanSettings(callback) {
  chrome.storage.sync.get(CODETOSPAN_DEFAULT_SETTINGS, (data) => {
    callback(data);
  });
}

// 現在のドメインがCodeToSpanの除外リストに含まれているか確認
function isCurrentDomainExcluded(excludedDomains) {
  const currentDomain = window.location.hostname;
  console.log("(CodeToSpan)This Page's domain:", currentDomain);
  if (excludedDomains.includes(currentDomain)) {
    console.log(
      "(CodeToSpan)This domain is in excludedDomains in CodeToSpan option page",
    );
  }
  return excludedDomains.includes(currentDomain);
}

// ブラウザの言語とページの言語が異なるか判定
function isBrowserAndPageLanguageDifferent() {
  const browserLang = navigator.language.split("-")[0];
  let pageLang =
    (document.documentElement.lang || "").split("-")[0] ||
    (document.querySelector('meta[property="og:locale"]')?.content || "").split(
      "_",
    )[0];

  return browserLang !== pageLang;
}

// 設定に基づいてCodeToSpan拡張機能を適用するか判定
function shouldApplyCodeToSpan(settings) {
  if (isCurrentDomainExcluded(settings.excludedDomains)) return false;
  if (!settings.isLanguageCheckEnabled) return true;

  return isBrowserAndPageLanguageDifferent();
}

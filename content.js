var codeToSpanEnable = true; // 有効・無効を記録
var excludedTags = []; // タグの除外リストを初期化
var skipStyledCodeTags = false; // skipStyledCodeTagsの初期化
var addTranslateNo = false; //  addTranslateNo の設定値で初期化
var excludedDomains = []; // ドメインの除外リストを初期化

chrome.storage.sync.get(
  {
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: false,
    excludedDomains: [],
  },
  function (data) {
    excludedTags = data.excludedTags;
    isLanguageCheckEnabled = data.isLanguageCheckEnabled;
    skipStyledCodeTags = data.skipStyledCodeTags;
    addTranslateNo = data.addTranslateNo;
    excludedDomains = data.excludedDomains;
  },
);

// <pre> タグに翻訳除外属性を追加
function addTranslateNoToPreTags(node) {
  if (addTranslateNo) {
    if (node.nodeName && node.nodeName.toLowerCase() === "pre") {
      node.setAttribute("translate", "no");
    } else {
      // それ以外の場合、node 内の <pre> タグに対して処理を実行
      node.querySelectorAll("pre").forEach(function (e) {
        e.setAttribute("translate", "no");
      });
    }
  }
}

function shouldReplace(displayStyle) {
  return displayStyle === "inline" || !skipStyledCodeTags;
}

// 現在のドメインが除外リストに含まれているか確認
function isDomainExcluded() {
  const currentDomain = window.location.hostname; // 現在のドメインを取得
  console.log("(CodeToSpan)This Page's domain:", currentDomain);
  if (excludedDomains.includes(currentDomain))
    console.log(
      "(CodeToSpan)This domain is in excludedDomains in CodeToSpan option page",
    );
  return excludedDomains.includes(currentDomain);
}

// ブラウザの言語とページの言語が異なるか判定
function isLanguageDifferent() {
  const browserLang = navigator.language.split("-")[0]; // `ja-JP` → `ja`
  let pageLang =
    (document.documentElement.lang || "").split("-")[0] || // `ja-JP` → `ja`
    (document.querySelector('meta[property="og:locale"]')?.content || "").split(
      "_",
    )[0]; // `ja_JP` → `ja`

  return browserLang !== pageLang;
}

// <code> タグの処理：スパン要素に変換し、オリジナルのスタイルを保持
function processCodeTag(node) {
  const originalClone = node.cloneNode(true);
  const styleCssText = getComputedStyle(node).cssText; // getComputedStyleは参照であることに注意
  originalClone.style.display = "none";
  originalClone.classList.add("processed-code-tag-by-CodeToSpan");

  const newElem = document.createElement("span");
  while (node.firstChild) {
    newElem.appendChild(node.firstChild);
  }
  Array.from(node.attributes).forEach((attr) => {
    if (attr.name === "class" && attr.value.includes("notranslate")) return;
    newElem.setAttribute(attr.name, attr.value);
  });
  newElem.style.cssText = styleCssText;
  newElem.classList.add("processed-code-tag-by-CodeToSpan");

  return { originalClone, newElem };
}

// cssTextでは不完全な場合があるので、主要な視覚スタイルを個別に再設定する
function applyVisualStylesSafely(newElem, style) {
  newElemStyle = getComputedStyle(newElem);
  const setStyleIfDifferent = (elem, elemStyle, style, propName) => {
    if (elemStyle[propName] !== style[propName]) {
      elem.style[propName] = style[propName];
    }
  };
  // 主要な視覚スタイルの指定
  [
    "color",
    "backgroundColor",
    "border",
    "borderRadius",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "textDecoration",
    "padding",
    "margin",
    "boxShadow",
    "visibility",
    "opacity",
  ].map((propName) =>
    setStyleIfDifferent(newElem, newElemStyle, style, propName),
  );
}

// 特定のノードの <code> タグを置き換え
function replaceCodeTagsForNode(node) {
  const parent = node.parentNode;
  const displayStyle = getComputedStyle(node).display;
  const originalStyle = { ...getComputedStyle(node) }; // getComputedStyleは参照であることに注意

  const isAlreadyProcessed = node.classList.contains(
    "processed-code-tag-by-CodeToSpan",
  );
  const parentTag = parent.tagName.toLowerCase();

  if (excludedTags[parentTag] || !shouldReplace(displayStyle)) return;

  if (!isAlreadyProcessed) {
    const { originalClone, newElem } = processCodeTag(node);

    parent.insertBefore(originalClone, node);
    parent.replaceChild(newElem, node);
    applyVisualStylesSafely(newElem, originalStyle);
  } else if (isAlreadyProcessed) {
    // 処理済みコードタグが、上書きされ再検出された場合の処理
    const existingSpan = node.nextElementSibling;
    const spanStyle = { ...getComputedStyle(existingSpan) }; // getComputedStyleは参照であることに注意
    if (
      existingSpan &&
      existingSpan.classList.contains("processed-code-tag-by-CodeToSpan")
    ) {
      // processCodeTagにdisplay:noneへ加工済みのnodeを入れないよう注意
      const { newElem } = processCodeTag(existingSpan);

      parent.replaceChild(newElem, existingSpan);
      applyVisualStylesSafely(newElem, spanStyle);
    }
  }
}

// ページの変更を監視し、必要に応じて <code> タグを処理
function observeChanges() {
  const target = document.body;
  const config = {
    childList: true,
    subtree: true,
  };

  const observer = new MutationObserver((mutationList) => {
    // 変更箇所の置き換え処理
    for (const mutation of mutationList) {
      if (mutation.type === "childList" && mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName && node.nodeName.toLowerCase() === "code") {
            replaceCodeTagsForNode(node);
          } else if (node.nodeName && node.nodeName.toLowerCase() === "pre") {
            addTranslateNoToPreTags(node);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            node.querySelectorAll("code").forEach(replaceCodeTagsForNode);
            node.querySelectorAll("pre").forEach(addTranslateNoToPreTags);
          }
        });
      }
    }
  });

  // オブザーバー呼び出し前のページ全体の置き換え処理
  document.body.querySelectorAll("code").forEach(replaceCodeTagsForNode);
  document.body.querySelectorAll("pre").forEach(addTranslateNoToPreTags);
  // オブザーバーの登録
  observer.observe(target, config);

  return observer;
}

// 設定に基づいて動作を決定
function shouldApplyExtension() {
  if (isDomainExcluded()) return false;
  if (!isLanguageCheckEnabled) return true;

  return isLanguageDifferent();
}
// 拡張機能が有効の場合、変更を監視
chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  codeToSpanEnable = enabled;
  if (enabled && shouldApplyExtension()) {
    return observeChanges();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.command === "toggle") {
    // 拡張機能が有効・無効の切り替え時にページリロード
    location.reload();
    return;
  }
  if (message.action === "checkSettings") {
    // 設定の変更を検知
    sendResponse({
      enabled: codeToSpanEnable,
      excludedTags,
      isLanguageCheckEnabled,
      skipStyledCodeTags,
      addTranslateNo,
      excludedDomains,
    });
  }
});

var excludedTags = []; // タグの除外リストを初期化
var skipStyledCodeTags = false; // skipStyledCodeTagsの初期化
var addTranslateNo = false; //  addTranslateNo の設定値で初期化
var excludedDomains = []; // ドメインの除外リストを初期化

// 設定から除外タグを取得
chrome.storage.sync.get({ excludedTags: ["pre"] }, function (data) {
  excludedTags = data.excludedTags;
});
// 設定から skipStyledCodeTags の値を取得
chrome.storage.sync.get({ skipStyledCodeTags: false }, function (data) {
  skipStyledCodeTags = data.skipStyledCodeTags;
});
// addTranslateNo の設定値を取得
chrome.storage.sync.get({ addTranslateNo: false }, function (data) {
  addTranslateNo = data.addTranslateNo;
});
// 設定から除外ドメインを取得
chrome.storage.sync.get({ excludedDomains: [] }, function (data) {
  excludedDomains = data.excludedDomains;
});

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
  const browserLang = navigator.language;
  let pageLang =
    document.documentElement.lang ||
    document.querySelector('meta[property="og:locale"]')?.content;

  return browserLang !== pageLang;
}

// <code> タグの処理：スパン要素に変換し、オリジナルのスタイルを保持
function processCodeTag(node) {
  const originalClone = node.cloneNode(true);
  originalClone.style.display = "none";
  originalClone.classList.add("processed-code-tag");

  const newElem = document.createElement("span");
  while (node.firstChild) {
    newElem.appendChild(node.firstChild);
  }
  Array.from(node.attributes).forEach((attr) => {
    newElem.setAttribute(attr.name, attr.value);
  });
  const style = getComputedStyle(node);
  newElem.style.cssText = style.cssText;

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

  const isAlreadyProcessed = node.classList.contains("processed-code-tag");
  if (
    !isAlreadyProcessed &&
    shouldReplace(displayStyle) &&
    !excludedTags[parent.tagName.toLowerCase()]
  ) {
    const { originalClone, newElem } = processCodeTag(node);

    parent.insertBefore(originalClone, node);
    parent.replaceChild(newElem, node);
    applyVisualStylesSafely(newElem, getComputedStyle(node));
  } else if (isAlreadyProcessed) {
    //一度処理されたコードタグが、JSで上書きされobserverで検出された場合の処理
    const existingSpan = node.nextElementSibling;
    if (existingSpan && existingSpan.tagName.toLowerCase() === "span") {
      const { newElem } = processCodeTag(node);

      // spanノードをインラインに設定する
      newElem.style.display = "inline";

      parent.replaceChild(newElem, existingSpan);
      applyVisualStylesSafely(newElem, getComputedStyle(node));
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

// 拡張機能が有効の場合、変更を監視
let observer = chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  if (enabled && !isDomainExcluded() && isLanguageDifferent()) {
    return observeChanges();
  }
});

// 拡張機能が有効・無効の切り替え時にページリロード
chrome.runtime.onMessage.addListener((request) => {
  if (request.command === "toggle") {
    location.reload();
  }
  return Promise.resolve("done");
});

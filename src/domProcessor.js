// <pre> タグに翻訳除外属性を追加
function addTranslateNoAttributeToPreTags(node, shouldAddTranslateNo) {
  if (shouldAddTranslateNo) {
    if (node.nodeName && node.nodeName.toLowerCase() === "pre") {
      node.setAttribute("translate", "no");
    } else {
      node.querySelectorAll("pre").forEach((preElement) => {
        preElement.setAttribute("translate", "no");
      });
    }
  }
}

// コードタグを置換可能か判定
function shouldReplaceCodeTag(displayStyle, skipStyledCodeTags) {
  return displayStyle === "inline" || !skipStyledCodeTags;
}

// <code> タグをスパン要素に変換
function convertCodeTagToSpan(node) {
  const originalClone = node.cloneNode(true);
  const originalStyles = getComputedStyle(node).cssText;
  originalClone.style.display = "none";
  originalClone.classList.add("processed-code-tag-by-CodeToSpan");

  const spanElement = document.createElement("span");
  while (node.firstChild) {
    spanElement.appendChild(node.firstChild);
  }
  Array.from(node.attributes).forEach((attr) => {
    if (attr.name === "class" && attr.value.includes("notranslate")) return;
    spanElement.setAttribute(attr.name, attr.value);
  });
  spanElement.style.cssText = originalStyles;
  spanElement.classList.add("processed-code-tag-by-CodeToSpan");

  return { originalClone, spanElement };
}

// 視覚的なスタイルを個別に適用
function applyVisualStylesToElement(targetElement, originalStyles) {
  const currentStyles = getComputedStyle(targetElement);
  const applyStyleIfDifferent = (
    element,
    currentStyle,
    originalStyle,
    propertyName,
  ) => {
    if (currentStyle[propertyName] !== originalStyle[propertyName]) {
      element.style[propertyName] = originalStyle[propertyName];
    }
  };

  // 視覚的なスタイルプロパティ
  const visualStyleProperties = [
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
  ];

  visualStyleProperties.forEach((propertyName) =>
    applyStyleIfDifferent(
      targetElement,
      currentStyles,
      originalStyles,
      propertyName,
    ),
  );
}

// コードタグをスパンタグに置換
function replaceCodeTagWithSpan(node, settings) {
  const parentElement = node.parentNode;
  const displayStyle = getComputedStyle(node).display;
  const originalStyles = { ...getComputedStyle(node) };

  const isProcessed = node.classList.contains(
    "processed-code-tag-by-CodeToSpan",
  );
  const parentTagName = parentElement.tagName.toLowerCase();

  if (
    settings.excludedTags[parentTagName] ||
    !shouldReplaceCodeTag(displayStyle, settings.skipStyledCodeTags)
  ) {
    return;
  }

  if (!isProcessed) {
    const { originalClone, spanElement } = convertCodeTagToSpan(node);
    parentElement.insertBefore(originalClone, node);
    parentElement.replaceChild(spanElement, node);
    applyVisualStylesToElement(spanElement, originalStyles);
  } else if (isProcessed) {
    const existingSpanElement = node.nextElementSibling;
    const spanStyles = { ...getComputedStyle(existingSpanElement) };
    if (
      existingSpanElement &&
      existingSpanElement.classList.contains("processed-code-tag-by-CodeToSpan")
    ) {
      const { spanElement } = convertCodeTagToSpan(existingSpanElement);
      parentElement.replaceChild(spanElement, existingSpanElement);
      applyVisualStylesToElement(spanElement, spanStyles);
    }
  }
}

// DOMの変更を監視してコードタグを処理
function observeDOMChanges(settings) {
  const bodyElement = document.body;
  const observerConfig = {
    childList: true,
    subtree: true,
  };

  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList" && mutation.addedNodes) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName && node.nodeName.toLowerCase() === "code") {
            replaceCodeTagWithSpan(node, settings);
          } else if (node.nodeName && node.nodeName.toLowerCase() === "pre") {
            addTranslateNoAttributeToPreTags(node, settings.addTranslateNo);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            node
              .querySelectorAll("code")
              .forEach((codeElement) =>
                replaceCodeTagWithSpan(codeElement, settings),
              );
            node
              .querySelectorAll("pre")
              .forEach((preElement) =>
                addTranslateNoAttributeToPreTags(
                  preElement,
                  settings.addTranslateNo,
                ),
              );
          }
        });
      }
    }
  });

  // 初期処理：既存のコードタグを処理
  document.body
    .querySelectorAll("code")
    .forEach((codeElement) => replaceCodeTagWithSpan(codeElement, settings));
  document.body
    .querySelectorAll("pre")
    .forEach((preElement) =>
      addTranslateNoAttributeToPreTags(preElement, settings.addTranslateNo),
    );

  // 監視開始
  mutationObserver.observe(bodyElement, observerConfig);

  return mutationObserver;
}

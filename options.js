// i18nメッセージの適用
function applyI18nMessages() {
  // タイトルの翻訳
  document.title = chrome.i18n.getMessage("OptionsTitle");
  document.querySelector("h1").textContent =
    chrome.i18n.getMessage("OptionsTitle");

  // 各セクションの翻訳
  const i18nElements = document.querySelectorAll("[data-i18n]");
  i18nElements.forEach((element) => {
    const messageId = element.getAttribute("data-i18n");
    element.textContent = chrome.i18n.getMessage(messageId);
  });

  // プレースホルダーの翻訳
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const messageId = element.getAttribute("data-i18n-placeholder");
    element.placeholder = chrome.i18n.getMessage(messageId);
  });

  // 説明文の翻訳
  document.querySelectorAll(".description").forEach((element, index) => {
    if (element.hasAttribute("data-i18n-description")) {
      const messageId = element.getAttribute("data-i18n-description");
      element.textContent = chrome.i18n.getMessage(messageId);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyI18nMessages();
  loadSettings();
  initializeEventListeners();
  initializeStorageChangeListener();
});

function loadSettings() {
  chrome.storage.sync.get(
    {
      enabled: true,
      excludedTags: { a: false, div: false, pre: true, span: false },
      isLanguageCheckEnabled: true,
      skipStyledCodeTags: false,
      addTranslateNo: true,
      autoReloadOnRunStop: false,
      excludedDomains: [],
    },
    function (data) {
      updateEnabledControl(data.enabled);
      document.getElementById("excludePre").checked =
        !!data.excludedTags["pre"];
      document.getElementById("excludeDiv").checked =
        !!data.excludedTags["div"];
      document.getElementById("excludeA").checked = !!data.excludedTags["a"];
      document.getElementById("excludeSpan").checked =
        !!data.excludedTags["span"];
      document.getElementById("isLanguageCheckEnabled").checked =
        data.isLanguageCheckEnabled;
      document.getElementById("skipStyledCodeTags").checked =
        data.skipStyledCodeTags;
      document.getElementById("addNoTranslateToPre").checked =
        data.addTranslateNo;
      document.getElementById("autoReloadOnRunStop").checked =
        data.autoReloadOnRunStop;
      updateExcludedDomainsList(data.excludedDomains);
    },
  );
}

function updateExcludedDomainsList(domains) {
  var list = document.getElementById("excludedDomainsList");
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }

  domains.forEach(function (domain) {
    var li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "flex-start";
    li.style.alignItems = "center";

    var domainSpan = document.createElement("span");
    domainSpan.textContent = domain;
    domainSpan.className = "domain-name";

    var removeButton = document.createElement("button");
    removeButton.className = "removeDomain";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", "Remove domain");
    removeButton.setAttribute("data-domain", domain);

    li.appendChild(removeButton);
    li.appendChild(domainSpan);
    list.appendChild(li);
  });
}

function initializeEventListeners() {
  document.getElementById("enabled").addEventListener("change", saveEnabled);

  ["excludePre", "excludeDiv", "excludeA", "excludeSpan"].forEach((id) => {
    document.getElementById(id).addEventListener("change", saveExcludedTags);
  });

  document
    .getElementById("isLanguageCheckEnabled")
    .addEventListener("change", saveLanguageCheckSetting);

  document
    .getElementById("skipStyledCodeTags")
    .addEventListener("change", saveSkipStyledCodeTags);

  document
    .getElementById("addNoTranslateToPre")
    .addEventListener("change", saveTranslateSettings);

  document
    .getElementById("autoReloadOnRunStop")
    .addEventListener("change", saveAutoReloadSetting);

  document.getElementById("addDomain").addEventListener("click", addDomain);

  document
    .getElementById("excludedDomainsList")
    .addEventListener("click", function (e) {
      if (e.target.classList.contains("removeDomain")) {
        removeDomain(e);
      }
    });

  document
    .getElementById("newDomain")
    .addEventListener("keypress", enterKeyDomainAdd);
}

function initializeStorageChangeListener() {
  if (!chrome.storage.onChanged) {
    return;
  }

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "sync") {
      return;
    }

    if (changes.enabled) {
      updateEnabledControl(changes.enabled.newValue);
    }

    if (changes.excludedDomains) {
      updateExcludedDomainsList(changes.excludedDomains.newValue || []);
    }
  });
}

function updateEnabledControl(enabled) {
  document.getElementById("enabled").checked = !!enabled;
}

function saveEnabled() {
  var enabled = document.getElementById("enabled").checked;
  chrome.storage.sync.set({ enabled: enabled }, function () {
    console.log("Extension enabled setting saved:", enabled);
  });
}

function saveExcludedTags() {
  var excludedTags = {
    pre: document.getElementById("excludePre").checked,
    div: document.getElementById("excludeDiv").checked,
    a: document.getElementById("excludeA").checked,
    span: document.getElementById("excludeSpan").checked,
  };
  chrome.storage.sync.set({ excludedTags: excludedTags }, function () {
    console.log("Excluded tags settings saved");
  });
}

function saveLanguageCheckSetting() {
  var isEnabled = document.getElementById("isLanguageCheckEnabled").checked;
  chrome.storage.sync.set({ isLanguageCheckEnabled: isEnabled }, function () {
    console.log("Language check setting saved:", isEnabled);
  });
}

function saveSkipStyledCodeTags() {
  var skipStyledCodeTags =
    document.getElementById("skipStyledCodeTags").checked;
  chrome.storage.sync.set(
    { skipStyledCodeTags: skipStyledCodeTags },
    function () {
      console.log("Skip styled code tags settings saved");
    },
  );
}

function saveTranslateSettings() {
  var addTranslateNo = document.getElementById("addNoTranslateToPre").checked;
  chrome.storage.sync.set({ addTranslateNo: addTranslateNo }, function () {
    console.log("Translate settings saved");
  });
}

function saveAutoReloadSetting() {
  var autoReloadOnRunStop =
    document.getElementById("autoReloadOnRunStop").checked;
  chrome.storage.sync.set(
    { autoReloadOnRunStop: autoReloadOnRunStop },
    function () {
      console.log("Auto reload setting saved:", autoReloadOnRunStop);
    },
  );
}

function addDomain() {
  var newDomain = document.getElementById("newDomain").value.trim();
  if (!newDomain) {
    alert(chrome.i18n.getMessage("EnterDomainMessage"));
    return;
  }

  chrome.storage.sync.get({ excludedDomains: [] }, function (data) {
    var domains = data.excludedDomains;
    if (domains.includes(newDomain)) {
      alert(chrome.i18n.getMessage("DomainExistsMessage"));
      return;
    }

    domains.push(newDomain);
    chrome.storage.sync.set({ excludedDomains: domains }, function () {
      updateExcludedDomainsList(domains);
      document.getElementById("newDomain").value = "";
    });
  });
}

function removeDomain(e) {
  // ドメイン削除リスナー
  if (e.target && e.target.className === "removeDomain") {
    var domainToRemove = e.target.getAttribute("data-domain");
    chrome.storage.sync.get({ excludedDomains: [] }, function (data) {
      var domains = data.excludedDomains;
      var index = domains.indexOf(domainToRemove);
      if (index > -1) {
        domains.splice(index, 1);
        chrome.storage.sync.set(
          { excludedDomains: domains },
          updateExcludedDomainsList(domains),
        );
      }
    });
  }
}

function enterKeyDomainAdd(e) {
  // Enterキーでドメインを追加する処理
  if (e.key === "Enter") {
    e.preventDefault();
    addDomain();
  }
}

document.getElementById("resetSettings").addEventListener("click", function () {
  if (!confirm(chrome.i18n.getMessage("ResetConfirmMessage"))) {
    return;
  }

  // デフォルト設定を定義
  const defaultSettings = {
    excludedTags: { a: false, div: false, pre: true, span: false },
    isLanguageCheckEnabled: true,
    skipStyledCodeTags: false,
    addTranslateNo: true,
    autoReloadOnRunStop: false,
  };

  // 設定をリセット
  chrome.storage.sync.set(defaultSettings, function () {
    console.log("[CodeToSpan] Settings reset to default (excluding domains).");
    loadSettings(); // UIを更新
  });
});

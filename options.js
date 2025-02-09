document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  initializeEventListeners();
});

function loadSettings() {
  loadExcludedTags();
  loadSkipStyledCodeTags();
  loadTranslateSettings();
  updateExcludedDomainsList();
}

function loadExcludedTags() {
  chrome.storage.sync.get({ excludedTags: {} }, function (data) {
    document.getElementById("excludePre").checked = !!data.excludedTags["pre"];
    document.getElementById("excludeDiv").checked = !!data.excludedTags["div"];
    document.getElementById("excludeA").checked = !!data.excludedTags["a"];
    document.getElementById("excludeSpan").checked =
      !!data.excludedTags["span"];
  });
}

function loadSkipStyledCodeTags() {
  chrome.storage.sync.get({ skipStyledCodeTags: false }, function (data) {
    document.getElementById("skipStyledCodeTags").checked =
      data.skipStyledCodeTags;
  });
}

function loadTranslateSettings() {
  chrome.storage.sync.get({ addTranslateNo: false }, function (data) {
    document.getElementById("addNoTranslateToPre").checked =
      data.addTranslateNo;
  });
}

function updateExcludedDomainsList() {
  chrome.storage.sync.get({ excludedDomains: [] }, function (data) {
    var list = document.getElementById("excludedDomainsList");
    list.innerHTML = "";

    data.excludedDomains.forEach(function (domain) {
      var li = document.createElement("li");
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.style.alignItems = "center";

      var domainSpan = document.createElement("span");
      domainSpan.textContent = domain;
      domainSpan.className = "domain-name";

      var removeButton = document.createElement("button");
      removeButton.textContent = "X";
      removeButton.className = "removeDomain";
      removeButton.setAttribute("data-domain", domain);

      li.appendChild(domainSpan);
      li.appendChild(removeButton);
      list.appendChild(li);
    });
  });
}

function initializeEventListeners() {
  document
    .getElementById("excludePre")
    .addEventListener("change", saveExcludedTags);
  document
    .getElementById("excludeDiv")
    .addEventListener("change", saveExcludedTags);
  document
    .getElementById("excludeA")
    .addEventListener("change", saveExcludedTags);
  document
    .getElementById("excludeSpan")
    .addEventListener("change", saveExcludedTags);

  document
    .getElementById("skipStyledCodeTags")
    .addEventListener("change", saveSkipStyledCodeTags);

  document
    .getElementById("addNoTranslateToPre")
    .addEventListener("change", saveTranslateSettings);

  document.getElementById("addDomain").addEventListener("click", addDomain);
  document.addEventListener("click", removeDomain);
  document
    .getElementById("newDomain")
    .addEventListener("keypress", enterKeyDomainAdd);
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

function addDomain() {
  var newDomain = document.getElementById("newDomain").value.trim();
  if (!newDomain) {
    alert("Please enter a domain name.");
    return;
  }

  chrome.storage.sync.get({ excludedDomains: [] }, function (data) {
    var domains = data.excludedDomains;
    if (domains.includes(newDomain)) {
      alert("This domain already exists.");
      return;
    }

    domains.push(newDomain);
    chrome.storage.sync.set(
      { excludedDomains: domains },
      updateExcludedDomainsList,
    );
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
          updateExcludedDomainsList,
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

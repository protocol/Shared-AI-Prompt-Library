// PL Infra Prompt Library — add-a-prompt form
(function () {
  // EDIT this to point at the live repo once published.
  var GITHUB_REPO = "protocol/Shared-AI-Prompt-Library";

  function initTheme() {
    var saved = localStorage.getItem("prompt-lib-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    document.getElementById("themeToggle").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") || "light";
      var next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("prompt-lib-theme", next);
    });
  }

  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50);
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function collect() {
    var fd = new FormData(document.getElementById("addPromptForm"));
    function get(k) { return (fd.get(k) || "").toString().trim(); }
    var tags = get("tags").split(",").map(function (t) { return t.trim(); }).filter(Boolean);
    var cat = get("category");
    var id = (cat ? cat.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" : "") + (slugify(get("title")) || "prompt-" + Date.now());

    var entry = {
      id: id,
      title: get("title"),
      category: cat,
      use_case: get("use_case"),
      audience: get("audience"),
      model: get("model"),
      inputs: get("inputs"),
      prompt: get("prompt"),
      example: get("example"),
      author: get("author"),
      updated: todayISO(),
      status: "Draft",
      sensitivity: get("sensitivity"),
      tags: tags
    };
    if (get("connectors")) entry.connectors = get("connectors");
    if (get("skill")) entry.skill = get("skill");
    if (get("notes")) entry.notes = get("notes");
    return entry;
  }

  function validate() {
    var ok = true;
    document.querySelectorAll(".field").forEach(function (f) { f.classList.remove("has-error"); });
    document.querySelectorAll("[required]").forEach(function (el) {
      if (!el.value.trim()) {
        ok = false;
        var field = el.closest(".field");
        if (field) field.classList.add("has-error");
      }
    });
    if (!ok) {
      var firstError = document.querySelector(".field.has-error");
      if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return ok;
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function buildIssueBody(entry) {
    var json = JSON.stringify(entry, null, 2);
    return [
      "Submitted via the **Add a prompt** form on the PL Infra Prompt Library site.",
      "",
      "<!-- prompt-json-start -->",
      "```json",
      json,
      "```",
      "<!-- prompt-json-end -->",
      "",
      "**Submitted by:** " + entry.author,
      "**Category:** " + entry.category,
      "**Sensitivity:** " + entry.sensitivity,
      "**Status on submission:** " + entry.status
    ].join("\n");
  }

  function openIssue(entry) {
    var title = "[Add prompt] " + entry.title;
    var body = buildIssueBody(entry);
    var url = "https://github.com/" + GITHUB_REPO + "/issues/new"
      + "?title=" + encodeURIComponent(title)
      + "&labels=" + encodeURIComponent("add-prompt")
      + "&body=" + encodeURIComponent(body);
    if (url.length > 7500) {
      var minimalBody = "Submitted via the Add a prompt form. Body too long for a URL — please paste the JSON below from your clipboard.";
      navigator.clipboard.writeText(JSON.stringify(entry, null, 2)).catch(function () {});
      var fallback = "https://github.com/" + GITHUB_REPO + "/issues/new"
        + "?title=" + encodeURIComponent(title)
        + "&labels=" + encodeURIComponent("add-prompt")
        + "&body=" + encodeURIComponent(minimalBody);
      window.open(fallback, "_blank", "noopener");
      toast("Prompt JSON copied — paste it into the GitHub issue.");
    } else {
      window.open(url, "_blank", "noopener");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    document.getElementById("addPromptForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      openIssue(collect());
    });
    document.getElementById("copyJson").addEventListener("click", function () {
      if (!validate()) return;
      navigator.clipboard.writeText(JSON.stringify(collect(), null, 2))
        .then(function () { toast("Prompt JSON copied to clipboard"); })
        .catch(function () { toast("Couldn't copy — open the console and copy manually"); });
    });
    document.querySelectorAll(".field input, .field select, .field textarea").forEach(function (el) {
      el.addEventListener("input", function () { el.closest(".field").classList.remove("has-error"); });
      el.addEventListener("change", function () { el.closest(".field").classList.remove("has-error"); });
    });
  });
})();

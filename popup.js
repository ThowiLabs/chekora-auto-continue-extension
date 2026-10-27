"use strict";

const enabledInput = document.getElementById("enabled");
const status = document.getElementById("status");
const count = document.getElementById("clickCount");

function updateStatus(enabled) {
  status.textContent = enabled ? "Activo en páginas http y https." : "Pausado.";
}

chrome.storage.local.get({ enabled: true, clickCount: 0 }, (values) => {
  enabledInput.checked = values.enabled !== false;
  count.textContent = String(values.clickCount);
  updateStatus(enabledInput.checked);
});

enabledInput.addEventListener("change", () => {
  const enabled = enabledInput.checked;
  chrome.storage.local.set({ enabled }, () => updateStatus(enabled));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) {
    enabledInput.checked = changes.enabled.newValue !== false;
    updateStatus(enabledInput.checked);
  }
  if (changes.clickCount) count.textContent = String(changes.clickCount.newValue ?? 0);
});

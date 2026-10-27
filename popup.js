"use strict";

const enabledInput = document.getElementById("enabled");
const status = document.getElementById("status");
const count = document.getElementById("clickCount");
const lastClick = document.getElementById("lastClick");
const diagnoseButton = document.getElementById("diagnose");
const diagnostic = document.getElementById("diagnostic");

function updateStatus(enabled) {
  status.textContent = enabled ? "Activo en páginas HTTP y HTTPS." : "Pausado.";
}

function showLastClick(when) {
  lastClick.textContent = when ? new Date(when).toLocaleString() : "Ninguno";
}

chrome.storage.local.get({ enabled: true, clickCount: 0, lastClickAt: null }, (values) => {
  enabledInput.checked = values.enabled !== false;
  count.textContent = String(values.clickCount);
  showLastClick(values.lastClickAt);
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
  if (changes.lastClickAt) showLastClick(changes.lastClickAt.newValue);
});

// Read-only diagnosis of the rendered DOM. It never clicks or edits the page.
async function inspectActiveTab() {
  diagnoseButton.disabled = true;
  diagnostic.textContent = "Revisando los marcos de la pestaña…";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No hay una pestaña activa.");

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: "ISOLATED",
      func: () => {
        const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        const shown = (el) => {
          if (!el || el.getClientRects().length === 0) return false;
          const s = window.getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden" && s.visibility !== "collapse";
        };
        let foundHeading = false;
        let foundMessage = false;
        let foundButton = false;
        let readyToClick = false;
        for (const h of document.querySelectorAll("h2, [role='heading']")) {
          if (text(h.textContent) !== "are you still there?") continue;
          foundHeading = true;
          let ancestor = h.parentElement;
          for (let i = 0; ancestor && i < 6; i++, ancestor = ancestor.parentElement) {
            const p = [...ancestor.querySelectorAll("p")].find((el) =>
              text(el.textContent).includes("keep your interactive session running"));
            if (!p) continue;
            foundMessage = true;
            const button = [...ancestor.querySelectorAll("button, [role='button']")]
              .find((el) => text(el.textContent) === "continue editing");
            if (button) {
              foundButton = true;
              if (shown(h) && shown(p) && shown(button) &&
                  !button.disabled && button.getAttribute("aria-disabled") !== "true") {
                readyToClick = true;
              }
            }
            break;
          }
        }
        return { foundHeading, foundMessage, foundButton, readyToClick };
      }
    });

    const frames = results.map((res) => res.result || {});
    const total = frames.length;
    const heading = frames.filter((x) => x.foundHeading).length;
    const message = frames.filter((x) => x.foundMessage).length;
    const button = frames.filter((x) => x.foundButton).length;
    const ready = frames.filter((x) => x.readyToClick).length;

    diagnostic.textContent =
      `Marcos examinados: ${total}\nEncabezado encontrado: ${heading}\nMensaje correcto: ${message}\nBotón encontrado: ${button}\nModal visible y habilitado: ${ready}\n` +
      (ready ? "El modal está listo para el clic. Si no ocurre, recarga la página y comprueba el permiso del sitio."
        : heading === 0
          ? "No hay un encabezado HTML real accesible; puede ser texto mostrado por un visor, un iframe restringido o una página sin permiso."
          : "Se detectó parte del modal, pero faltan datos, visibilidad o acceso.");
  } catch (error) {
    diagnostic.textContent = "No se pudo inspeccionar esta pestaña: " +
      (error?.message || String(error)) +
      "\nEn páginas internas del navegador y visores restringidos no siempre está permitida la inyección.";
  } finally {
    diagnoseButton.disabled = false;
  }
}

diagnoseButton.addEventListener("click", inspectActiveTab);

(() => {
  "use strict";

  const HEADING = "are you still there?";
  const ACTION = "continue editing";
  const TEXT_START = "you haven't made changes within your interactive session";
  const TEXT_END = "keep your interactive session running";
  const MIN_RETRY_MS = 15000;

  let enabled = true;
  let pendingScan = false;
  const lastClicks = new WeakMap();

  function normalize(value) {
    return String(value ?? "")
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isVisible(element) {
    if (!(element instanceof HTMLElement) || element.getClientRects().length === 0) {
      return false;
    }
    const style = window.getComputedStyle(element);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.visibility !== "collapse";
  }

  function findContinueButton() {
    const headings = document.querySelectorAll("h2, [role='heading']");
    for (const heading of headings) {
      if (normalize(heading.textContent) !== HEADING || !isVisible(heading)) {
        continue;
      }

      // Find the smallest nearby ancestor containing the alert and its action.
      let container = heading.parentElement;
      for (let depth = 0; container && depth < 6; depth++, container = container.parentElement) {
        const description = [...container.querySelectorAll("p")]
          .find((p) => {
            const message = normalize(p.textContent);
            return isVisible(p) &&
              message.includes(TEXT_START) &&
              message.includes(TEXT_END);
          });
        if (!description) continue;

        const button = [...container.querySelectorAll("button, [role='button']")]
          .find((candidate) =>
            normalize(candidate.textContent) === ACTION &&
            isVisible(candidate) &&
            !candidate.disabled &&
            candidate.getAttribute("aria-disabled") !== "true"
          );
        if (button) return button;
      }
    }
    return null;
  }

  function scan() {
    if (!enabled) return;
    const button = findContinueButton();
    if (!button) return;

    const now = Date.now();
    if (now - (lastClicks.get(button) ?? 0) < MIN_RETRY_MS) return;

    // Clicking the exact named action; no other buttons or page content are modified.
    lastClicks.set(button, now);
    button.click();
    try {
      chrome.storage.local.get({ clickCount: 0 }, ({ clickCount }) => {
        if (chrome.runtime.lastError) return;
        chrome.storage.local.set({ clickCount: clickCount + 1, lastClickAt: Date.now() });
      });
    } catch (_) {
      // The extension may have been reloaded while this tab remains open.
    }
  }

  function scheduleScan() {
    if (pendingScan || !enabled) return;
    pendingScan = true;
    window.setTimeout(() => {
      pendingScan = false;
      scan();
    }, 120);
  }

  const observer = new MutationObserver(scheduleScan);
  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "disabled", "aria-disabled"]
    });
    scan();
    window.setInterval(scan, 2000); // Backup when a site reuses existing modal nodes.
  }

  chrome.storage.local.get({ enabled: true }, (settings) => {
    if (chrome.runtime.lastError) return;
    enabled = settings.enabled !== false;
    start();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.enabled) return;
    enabled = changes.enabled.newValue !== false;
    if (enabled) scheduleScan();
  });
})();

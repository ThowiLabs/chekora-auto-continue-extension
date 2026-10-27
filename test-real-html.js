"use strict";
// Uses a real HTML DOM (jsdom) instead of the simplified mock in test-content.js.
// Test dependencies are installed outside this project:
//   npm install --prefix /tmp/chekora-html-test jsdom@26

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM } = require("/tmp/chekora-html-test/node_modules/jsdom");
const contentScript = fs.readFileSync(__dirname + "/content.js", "utf8");

const exactUserMarkup = `<div class="MuiDialog-container MuiDialog-scrollPaper css-16u656j" role="presentation" tabindex="-1" style="opacity: 1; transition: opacity 225ms cubic-bezier(0.4, 0, 0.2, 1);"><div class="MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation24 MuiDialog-paper MuiDialog-paperScrollPaper MuiDialog-paperWidthSm css-1yi1ioz" role="dialog" aria-labelledby=":r2i:"><div class="sc-kSRUrC hXDjae"><div class="sc-hLOcjH sdJLK" style="width: 564px;"><div class="sc-cfkWqY iIXwVo"><div><h2 class="sc-iqkkDd sc-ggwkxX csShwb bALaew">Are you still there?</h2><p class="sc-folSZX junAP">You haven't made changes within your interactive session in over 40 minutes. Would you like to keep your interactive session running? This choice won't stop running versions.</p></div><div class="sc-ozbDa gnjHLs" style="margin-top: 32px;"><button class="sc-kLEbxe iwyUNe" tabindex="0" role="button"><span class="sc-dlwHGs cVnQIi">Cancel</span></button><button class="sc-kLEbxe aFtIx" tabindex="0" role="button"><span class="sc-dlwHGs cVnQIi">Continue editing</span></button></div></div></div></div></div></div>`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createDom(initialMarkup, enabled = true) {
  const dom = new JSDOM(`<!doctype html><html><body>${initialMarkup}</body></html>`, {
    url: "https://example.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true
  });
  const state = { enabled, clickCount: 0 };
  // jsdom does not implement layout; simulate the nonzero rectangles that a visible browser provides.
  dom.window.HTMLElement.prototype.getClientRects = function () {
    return this.isConnected && this.style.display !== "none" ? [{ width: 10, height: 10 }] : [];
  };
  dom.window.chrome = {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get(defaults, callback) { callback({ ...defaults, ...state }); },
        set(updates) { Object.assign(state, updates); }
      },
      onChanged: { addListener() {} }
    }
  };
  return { dom, state };
}

async function testCase(name, initialMarkup, expectedClicks, { enabled = true, injectLater = false } = {}) {
  const { dom, state } = createDom(injectLater ? "" : initialMarkup, enabled);
  let accepted = 0;
  let cancelled = 0;
  let eventTrusted;
  dom.window.document.body.addEventListener("click", (e) => {
    if (e.target.closest("button")?.textContent.trim() === "Continue editing") {
      accepted++;
      eventTrusted = e.isTrusted;
    } else if (e.target.closest("button")?.textContent.trim() === "Cancel") {
      cancelled++;
    }
  });

  dom.window.eval(contentScript);
  if (injectLater) {
    dom.window.document.body.insertAdjacentHTML("beforeend", initialMarkup);
    await sleep(250);
  }
  assert.equal(accepted, expectedClicks, name + " — expected click count");
  assert.equal(cancelled, 0, name + " — must not click Cancel");
  assert.equal(state.clickCount, expectedClicks, name + " — local counter");
  if (expectedClicks) assert.equal(eventTrusted, false, name + " — event.isTrusted must remain false");
  dom.window.close();
  console.log("PASS", name);
}

(async () => {
  await testCase("Exact supplied MUI dialog", exactUserMarkup, 1);
  await testCase("Dialog inserted after script", exactUserMarkup, 1, { injectLater: true });
  await testCase("Disabled extension", exactUserMarkup, 0, { enabled: false });
  await testCase("Not a real dialog header", exactUserMarkup.replace("Are you still there?", "Different question?"), 0);
  await testCase("HTML displayed as text", `<pre>${exactUserMarkup.replaceAll("<", "&lt;")}</pre>`, 0);
  await testCase("Cancel-only HTML", exactUserMarkup.replace("Continue editing", "Cancel"), 0);
  console.log("OK — 6 real-DOM tests passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });

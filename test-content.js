"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(__dirname + "/content.js", "utf8");
const MESSAGE = "You haven't made changes within your interactive session in over 40 minutes. Would you like to keep your interactive session running? This choice won't stop running versions.";

class Element {
  constructor(tag, ownText = "", options = {}) {
    this.tag = tag.toLowerCase();
    this.ownText = ownText;
    this.children = [];
    this.parentElement = null;
    this.visible = options.visible ?? true;
    this.disabled = options.disabled ?? false;
    this.attributes = options.attributes ?? {};
    this.clicks = 0;
  }
  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
    return this;
  }
  get textContent() {
    return this.ownText + this.children.map((x) => x.textContent).join("");
  }
  getClientRects() { return this.visible ? [{}] : []; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  click() { this.clicks++; }
  querySelectorAll(selector) {
    const found = [];
    function visit(node) {
      for (const child of node.children) {
        const isMatch = selector === "p" ? child.tag === "p"
          : selector === "h2, [role='heading']" ? (child.tag === "h2" || child.getAttribute("role") === "heading")
          : selector === "button, [role='button']" ? (child.tag === "button" || child.getAttribute("role") === "button")
          : false;
        if (isMatch) found.push(child);
        visit(child);
      }
    }
    visit(this);
    return found;
  }
}

function runCase({ headingText = "Are you still there?", paragraph = MESSAGE, enabled = true, buttonVisible = true, buttonDisabled = false, buttonText = "Continue editing", ariaDisabled = false } = {}) {
  const root = new Element("html");
  const dialog = new Element("div");
  const header = new Element("div");
  const heading = new Element("h2", headingText);
  const p = new Element("p", paragraph);
  header.append(heading, p);
  const footer = new Element("div");
  const cancel = new Element("button", "Cancel");
  const proceed = new Element("button", buttonText, {
    visible: buttonVisible,
    disabled: buttonDisabled,
    attributes: ariaDisabled ? { "aria-disabled": "true" } : {}
  });
  footer.append(cancel, proceed);
  dialog.append(header, footer);
  root.append(dialog);

  const stored = { enabled, clickCount: 0 };
  const intervals = [];
  const chrome = {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get(defaults, callback) { callback({ ...defaults, ...stored }); },
        set(updates) { Object.assign(stored, updates); }
      },
      onChanged: { addListener() {} }
    }
  };
  const context = {
    HTMLElement: Element,
    MutationObserver: class { observe() {} },
    document: { documentElement: root, querySelectorAll: (selector) => root.querySelectorAll(selector) },
    window: {
      setInterval(callback) { intervals.push(callback); },
      setTimeout(callback) { callback(); },
      getComputedStyle() { return { display: "block", visibility: "visible" }; }
    },
    chrome
  };
  vm.runInNewContext(source, context, { filename: "content.js" });
  for (const timer of intervals) timer();
  return { proceed: proceed.clicks, cancel: cancel.clicks, count: stored.clickCount };
}

assert.deepEqual(runCase(), { proceed: 1, cancel: 0, count: 1 }, "correct modal");
assert.equal(runCase({ enabled: false }).proceed, 0, "extension paused");
assert.equal(runCase({ headingText: "Different alert" }).proceed, 0, "different heading");
assert.equal(runCase({ paragraph: "Other text" }).proceed, 0, "different description");
assert.equal(runCase({ buttonText: "Cancel" }).proceed, 0, "different button");
assert.equal(runCase({ buttonVisible: false }).proceed, 0, "hidden button");
assert.equal(runCase({ buttonDisabled: true }).proceed, 0, "disabled button");
assert.equal(runCase({ ariaDisabled: true }).proceed, 0, "aria-disabled button");
console.log("OK — 8 unit tests passed");

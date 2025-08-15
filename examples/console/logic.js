// logic.js
// Demo console module: class + singleton init/destroy.
// Keeps wiring/cleanup tight and safe.

let _instance = null;

export class ConsoleUI {
    constructor({
	boxId = "console",
	inputId = "console-input",
	bodyId = "console-body",
	submitId = "console-submit",
	tildeId = "console-tilde-btn",
	toggleKey = "`",
    } = {}) {
	this.ids = { boxId, inputId, bodyId, submitId,tildeId };
	this.toggleKey = toggleKey;

	this.box = null;
	this.input = null;
	this.body = null;
	this.submit = null;
	this.tildeBtn = null;
	// bound handlers for add/removeEventListener symmetry
	this.onToggleKeyDown = this.onToggleKeyDown.bind(this);
	this.onSubmitClick = this.onSubmitClick.bind(this);
	this.onInputKeyDown = this.onInputKeyDown.bind(this);
	this.onTildeClick = this.onTildeClick.bind(this);
    }

    init() {
	const { boxId, inputId, bodyId, submitId,tildeId } = this.ids;

	this.box = document.getElementById(boxId);
	this.input = document.getElementById(inputId);
	this.body = document.getElementById(bodyId);
	this.submit = document.getElementById(submitId);
        this.tildeBtn = document.getElementById(tildeId);

	if (!this.box || !this.input || !this.body || !this.submit) {
	    console.warn(
		"[ConsoleUI] Missing DOM nodes. Expected ids:",
		this.ids
	    );
	    return this;
	}

	// wiring
	document.addEventListener("keydown", this.onToggleKeyDown);
	this.submit.addEventListener("click", this.onSubmitClick);
	this.input.addEventListener("keydown", this.onInputKeyDown);
	if (this.tildeBtn) {
	    this.tildeBtn.addEventListener("click", this.onTildeClick);
	    this.tildeBtn.setAttribute("aria-pressed", "false");
	}
	
	return this;
    }

    destroy() {
	// remove listeners if they were attached
	document.removeEventListener("keydown", this.onToggleKeyDown);
	this.submit?.removeEventListener("click", this.onSubmitClick);
	this.input?.removeEventListener("keydown", this.onInputKeyDown);


	this.tildeBtn?.removeEventListener("click", this.onTildeClick);

	// drop refs
	this.box = this.input = this.body = this.submit = this.tildeBtn = null;
    }

    onToggleKeyDown(e) {
	if (e.key !== this.toggleKey) return;
	e.preventDefault();
	this.toggle();
    }
    /*
      onToggleKeyDown(e) {
      if (e.key !== this.toggleKey) return;
      e.preventDefault();
      if (!this.box) return;

      const visible = this.box.style.display === "flex";
      this.box.style.display = visible ? "none" : "flex";
      if (!visible) this.input?.focus();
      }*/

    onTildeClick() {
	this.toggle();
    }

    isVisible() {
	if (!this.box) return false;
	const disp = getComputedStyle(this.box).display;
	return disp !== "none";
    }
    show() {
	if (!this.box) return;
	this.box.style.display = "flex";
	this.tildeBtn?.setAttribute("aria-pressed", "true");
	this.input?.focus();
    }
    hide() {
	if (!this.box) return;
	this.box.style.display = "none";
	this.tildeBtn?.setAttribute("aria-pressed", "false");
    }
    toggle(force) {
	const next = force ?? !this.isVisible();
	next ? this.show() : this.hide();
    }

    
    onSubmitClick() {
	this.execute();
    }

    onInputKeyDown(e) {
	if (e.key === "Enter") {
	    e.preventDefault();
	    this.execute();
	}
    }

    execute() {
	if (!this.input || !this.body) return;
	const cmd = this.input.value.trim();
	if (!cmd) return;

	this.append(`> ${cmd}`, "command");

	let result;
	try {
	    // Prefer expression eval in a clean scope…
	    result = Function(`"use strict"; return (${cmd})`)();
	} catch (e1) {
	    // …fallback to global eval to allow statements if needed.
	    try {
		// eslint-disable-next-line no-eval
		result = (1, eval)(cmd);
	    } catch (e2) {
		result = e2;
	    }
	}

	this.append(String(result), "result");
	this.input.value = "";
    }

    append(text, kind = "log") {
	if (!this.body) return;
	const div = document.createElement("div");
	div.className = `console-line ${kind}`;
	div.textContent = text;
	this.body.appendChild(div);
	this.body.scrollTop = this.body.scrollHeight;
    }
}

// --- Singleton helpers ---

export function init(options) {
    if (_instance) return _instance;
    _instance = new ConsoleUI(options).init();
    return _instance;
}

export function destroy() {
    if (_instance) {
	_instance.destroy();
	_instance = null;
    }
    return true;
}

// Optional default export if you want `import ConsoleUI from ...`
export default ConsoleUI;

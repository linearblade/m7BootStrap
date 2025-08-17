// logic.js — test:validateInstall

function init() {
  const root = document.getElementById("m7pkg-modal-root");
  const modal = document.getElementById("m7pkg-modal");

  if (root && modal) {
    root.classList.remove("m7pkg-hidden");
    modal.classList.add("is-open");
  }

  // Optional: hook up the unmount button for convenience
  const btn = document.getElementById("m7pkg-unmount");
  if (btn) {
    btn.addEventListener("click", destroy, { once: true });
  }
}

function destroy() {
  const root = document.getElementById("m7pkg-modal-root");
  const modal = document.getElementById("m7pkg-modal");

  if (modal) modal.classList.remove("is-open");
  if (root) root.classList.add("m7pkg-hidden");

  // Remove the node entirely if you want to delete it from DOM
  // if (root) root.remove();
}

export default {
  init,
  destroy,
};

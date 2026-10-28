"use strict";

const fallbackPieces = [
  { id: "heritage-drape", title: "The Heritage Drape", subtitle: "Oxblood & antique gold", image: "assets/images/amnaya-campaign.png", category: "heritage", keywords: "sari saree silk red burgundy occasion drape gold heritage", description: "A sweeping drape, a deep oxblood hue, a trace of antique gold. This study imagines a piece that holds the warmth of celebration and the quiet confidence of the woman wearing it." },
  { id: "ivory-ritual", title: "The Everyday Ritual", subtitle: "Ivory & quiet confidence", image: "assets/images/ivory-study.png", category: "everyday", keywords: "ivory white cream linen cotton everyday co ord trousers tunic ease", description: "Soft ivory, an easy silhouette, room to move. An exploration of dressing for yourself: the everyday rituals, unhurried mornings and small moments that make a life your own." },
  { id: "heirloom-detail", title: "The Heirloom Detail", subtitle: "Small gestures. Lasting meaning.", image: "assets/images/hands-of-amnaya.png", category: "craft", keywords: "craft hand embroidery detail gold thread heirloom artisan materials", description: "A small gesture can hold a great deal of meaning. This study explores the intimacy of handwork, where thread and cloth become a way to carry knowledge from one generation to the next." }
];
const pieces = window.AMNAYA_CATALOG || fallbackPieces;
const pieceById = new Map(pieces.map(piece => [piece.id, piece]));
const storageKey = "amnaya.saved-inspirations.v1";
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let saved = new Set();
let storageAvailable = true;
let currentPiece = null;
let enquiry = null;
const openers = new WeakMap();

try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (Array.isArray(stored)) saved = new Set(stored.filter(id => pieceById.has(id)));
} catch {
  storageAvailable = false;
}

function announce(message) { $("#live-status").textContent = message; }

function openDialog(id, opener = document.activeElement) {
  const dialog = document.getElementById(id);
  if (!dialog || dialog.open) return;
  $$("dialog[open]").forEach(other => other.close());
  openers.set(dialog, opener);
  if (id === "search-dialog") {
    $("#search-input").value = "";
    renderSearch("");
  }
  if (id === "saved-dialog") renderSaved();
  dialog.showModal();
  dialog.scrollTop = 0;
  const first = dialog.querySelector("input, select, [data-initial-focus], .button, nav a, .text-link");
  if (first) first.focus({ preventScroll: true });
}

for (const dialog of $$("dialog")) {
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener("close", () => {
    // A replacement dialog owns focus if one was opened in the same event.
    if ($("dialog[open]")) return;
    const opener = openers.get(dialog);
    if (opener?.isConnected && !opener.closest("dialog:not([open])")) opener.focus({ preventScroll: true });
  });
}

function syncSaved() {
  const count = saved.size;
  const badge = $(".saved-count");
  badge.textContent = String(count);
  badge.hidden = count === 0;
  $(".favourites-trigger").setAttribute("aria-label", `Saved pieces${count ? ` (${count})` : ""}`);
  for (const button of $$("[data-save]")) {
    const piece = pieceById.get(button.dataset.save);
    const active = saved.has(piece.id);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `${active ? "Remove" : "Save"} ${piece.title}${active ? " from saved pieces" : ""}`);
  }
  if (currentPiece) {
    const active = saved.has(currentPiece.id);
    $("#piece-save span").textContent = active ? "Saved to your inspirations" : "Save this inspiration";
    $("#piece-save").setAttribute("aria-pressed", String(active));
  }
  document.dispatchEvent(new CustomEvent("amnaya:saved", { detail: { count } }));
}

function toggleSave(id) {
  const piece = pieceById.get(id);
  if (!piece) return;
  if (saved.has(id)) saved.delete(id); else saved.add(id);
  try { localStorage.setItem(storageKey, JSON.stringify([...saved])); storageAvailable = true; }
  catch { storageAvailable = false; }
  syncSaved();
  announce(`${piece.title} ${saved.has(id) ? "saved to" : "removed from"} your inspirations.${storageAvailable ? "" : " Saved for this visit only; browser storage is unavailable."}`);
  if ($("#saved-dialog").open) renderSaved();
}

function resultCard(piece, allowRemove = false) {
  const article = document.createElement("article");
  article.className = "result";
  const image = document.createElement("img");
  image.src = piece.image;
  image.alt = `${piece.title}, an Amnaya concept study`;
  image.className = "result-thumb";
  image.width = 82;
  image.height = 108;
  const copy = document.createElement("div");
  copy.className = "result-copy";
  const heading = document.createElement("h3");
  const open = document.createElement("button");
  open.dataset.piece = piece.id;
  open.textContent = piece.title;
  heading.append(open);
  const sub = document.createElement("span");
  sub.textContent = piece.subtitle;
  const link = document.createElement("button");
  link.className = "text-link";
  link.textContent = allowRemove ? "Remove from saved" : "Explore this study ↗";
  if (allowRemove) link.dataset.save = piece.id; else link.dataset.piece = piece.id;
  copy.append(heading, sub, link);
  article.append(image, copy);
  return article;
}

function emptyState(title, description, action, onClick) {
  const box = document.createElement("div");
  box.className = "empty-state";
  const heading = document.createElement("h3"); heading.textContent = title;
  const copy = document.createElement("p"); copy.textContent = description;
  const button = document.createElement("button"); button.className = "text-link"; button.textContent = action;
  button.addEventListener("click", onClick);
  box.append(heading, copy, button);
  return box;
}

function renderSaved() {
  const list = $("#saved-list");
  list.replaceChildren();
  if (!saved.size) {
    list.append(emptyState("Your story is still unfolding.", "Save the pieces that speak to you using the heart beside each study.", "Explore the edit →", () => {
      $("#saved-dialog").close();
      $("#collection").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }));
  } else {
    pieces.filter(piece => saved.has(piece.id)).forEach(piece => list.append(resultCard(piece, true)));
    const enquire = document.createElement("button");
    enquire.className = "button full-width";
    enquire.style.marginTop = "var(--space-xl)";
    enquire.textContent = "Share your inspirations ↗";
    enquire.addEventListener("click", () => openAppointment("", true));
    list.append(enquire);
  }
  $("#storage-note").textContent = storageAvailable ? "Saved in this browser, just for you." : "Browser storage is unavailable. Your inspirations will stay for this visit only.";
}

function renderSearch(query) {
  const normalized = query.trim().toLocaleLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  const matches = pieces.filter(piece => words.every(word => `${piece.title} ${piece.subtitle} ${piece.keywords}`.toLocaleLowerCase().includes(word)));
  const list = $("#search-results");
  list.replaceChildren();
  const count = document.createElement("p");
  count.className = "result-count";
  count.textContent = normalized ? `${matches.length} atelier ${matches.length === 1 ? "study" : "studies"} found` : "Explore the atelier studies";
  list.append(count);
  matches.forEach(piece => list.append(resultCard(piece)));
  if (!matches.length) {
    list.append(emptyState("A different thread, perhaps?", "We couldn’t find a matching study. Try ivory, heritage, linen or craft.", "Show the full edit →", () => { $("#search-input").value = ""; renderSearch(""); $("#search-input").focus(); }));
  }
  const pages = [ { title: "The story of Amnaya", href: "#story", keywords: "story founders yumilah jeevesh house heritage about" }, { title: "The art of making", href: "#craft", keywords: "craft hand making artisan material embroidery" }, { title: "A personal conversation", href: "#atelier", keywords: "contact appointment atelier enquiry conversation" } ];
  for (const page of pages.filter(page => !normalized || words.every(word => `${page.title} ${page.keywords}`.toLowerCase().includes(word)))) {
    const link = document.createElement("a"); link.href = page.href; link.className = "text-link search-page-link"; link.textContent = `${page.title} ↗`; link.style.display = "flex"; list.append(link);
  }
}

let searchTimer;
$("#search-input").addEventListener("input", event => {
  clearTimeout(searchTimer);
  const value = event.target.value;
  searchTimer = setTimeout(() => renderSearch(value), 180);
});

function openPiece(id, opener) {
  const piece = pieceById.get(id);
  if (!piece) return;
  currentPiece = piece;
  $("#piece-title").textContent = piece.title;
  $("#piece-subtitle").textContent = piece.subtitle;
  $("#piece-description").textContent = piece.description;
  const image = $("#piece-detail-image");
  image.src = piece.image;
  image.alt = `${piece.title}, an Amnaya creative study`;
  syncSaved();
  openDialog("piece-dialog", opener);
}

function openAppointment(interest = "", includeSaved = false) {
  $(".appointment-heading").hidden = false;
  $("#appointment-dialog").setAttribute("aria-labelledby", "appointment-title");
  $("#appointment-form").hidden = false;
  $("#enquiry-ready").hidden = true;
  if (interest) {
    if (![...$("#client-interest").options].some(option => option.value === interest)) $("#client-interest").add(new Option(interest, interest));
    $("#client-interest").value = interest;
  }
  if (includeSaved) $("#client-message").value = `I’m drawn to these Amnaya studies: ${pieces.filter(piece => saved.has(piece.id)).map(piece => piece.title).join(", ")}.\n\nI would love to explore these inspirations with you.`;
  openDialog("appointment-dialog");
}

$("#piece-enquire").addEventListener("click", () => openAppointment(currentPiece?.title));
$("#piece-save").addEventListener("click", () => { if (currentPiece) toggleSave(currentPiece.id); });

document.addEventListener("click", event => {
  const button = event.target.closest("button, a");
  if (!button) return;
  if (button.hasAttribute("data-close")) { button.closest("dialog")?.close(); return; }
  if (button.hasAttribute("data-appointment")) { openAppointment(); return; }
  if (button.dataset.open) { openDialog(button.dataset.open, button); return; }
  if (button.dataset.piece) { openPiece(button.dataset.piece, button); return; }
  if (button.dataset.save) { toggleSave(button.dataset.save); return; }
  if (button.dataset.filter) {
    const filter = button.dataset.filter;
    $$("[data-filter]").forEach(item => { const active = item === button; item.classList.toggle("active", active); item.setAttribute("aria-pressed", String(active)); });
    let count = 0;
    $$(".piece[data-category]").forEach(piece => { const show = filter === "all" || piece.dataset.category === filter; piece.hidden = !show; if (show) count++; });
    $("#filter-status").textContent = `${count} atelier ${count === 1 ? "study" : "studies"} shown.`;
    return;
  }
  if (button.matches("a[href^='#']") && button.closest("dialog")) button.closest("dialog").close();
});

function validateField(input) {
  const name = input.name;
  let message = "";
  if (name === "name" && input.value.trim().length < 2) message = "Please add your name, using at least two characters.";
  if (name === "email" && (!input.value.trim() || !input.checkValidity())) message = "Please use a complete email address, such as name@example.com.";
  input.setAttribute("aria-invalid", String(Boolean(message)));
  $(`#${name}-error`).textContent = message ? `! ${message}` : "";
  return !message;
}

for (const input of $$("#client-name, #client-email")) {
  input.addEventListener("blur", () => { input.dataset.touched = "true"; validateField(input); });
  input.addEventListener("input", () => { if (input.dataset.touched) validateField(input); });
}

$("#appointment-form").addEventListener("submit", event => {
  event.preventDefault();
  const inputs = [$("#client-name"), $("#client-email")];
  const checks = inputs.map(input => { input.dataset.touched = "true"; return validateField(input); });
  if (checks.includes(false)) { inputs[checks.indexOf(false)].focus(); return; }
  const data = new FormData(event.target);
  const name = String(data.get("name")).trim();
  const email = String(data.get("email")).trim();
  const interest = String(data.get("interest"));
  const message = String(data.get("message")).trim();
  enquiry = {
    subject: `A conversation with Amnaya — ${interest}`,
    body: `Hello Yumilah,\n\nI would love to begin a conversation with Amnaya.\n\nMy name: ${name}\nEmail: ${email}\nMy interest: ${interest}\n\n${message || "I’d be delighted to hear more about the house and discuss a personal piece."}\n\nWarmly,\n${name}`
  };
  $("#enquiry-preview").textContent = enquiry.body;
  $("#email-draft-link").href = `mailto:yumilah@cbe.mu?subject=${encodeURIComponent(enquiry.subject)}&body=${encodeURIComponent(enquiry.body)}`;
  event.target.hidden = true;
  $(".appointment-heading").hidden = true;
  $("#enquiry-ready").hidden = false;
  $("#appointment-dialog").setAttribute("aria-labelledby", "enquiry-success-title");
  $("#appointment-dialog").scrollTop = 0;
  $("#email-draft-link").focus({ preventScroll: true });
  announce("Your enquiry is ready. Review it and open your email app to send it.");
});

$("#edit-enquiry").addEventListener("click", () => { $("#enquiry-ready").hidden = true; $(".appointment-heading").hidden = false; $("#appointment-dialog").setAttribute("aria-labelledby", "appointment-title"); $("#appointment-form").hidden = false; $("#appointment-dialog").scrollTop = 0; $("#client-name").focus({ preventScroll: true }); });
$("#download-enquiry").addEventListener("click", () => {
  if (!enquiry) return;
  const encodeUtf8 = text => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
  const mime = ["X-Unsent: 1", "To: Yumilah Govinden <yumilah@cbe.mu>", `Subject: =?UTF-8?B?${encodeUtf8(enquiry.subject)}?=`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", encodeUtf8(enquiry.body).match(/.{1,76}/g).join("\r\n")].join("\r\n");
  const url = URL.createObjectURL(new Blob([mime], { type: "message/rfc822" }));
  const link = document.createElement("a"); link.href = url; link.download = "My-Amnaya-enquiry.eml"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce("Your enquiry draft has been downloaded. Open it in your email app to review and send.");
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    const dialog = $("dialog[open]");
    if (dialog) { event.preventDefault(); dialog.close(); return; }
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openDialog("search-dialog"); }
});
$("#year").textContent = String(new Date().getFullYear());
syncSaved();
window.Amnaya = {
  pieces, openDialog, openPiece, openAppointment, toggleSave, syncSaved,
  getSaved: () => [...saved],
  beginEnquiry: ({ interest = "A personal piece", message = "", email = "" } = {}) => {
    openAppointment(interest);
    if (message) $("#client-message").value = message;
    if (email) $("#client-email").value = email;
  }
};

"use strict";

(() => {
  const api = window.Amnaya;
  const catalogue = api.pieces;
  const byId = new Map(catalogue.map(piece => [piece.id, piece]));
  const journal = window.AMNAYA_JOURNAL;
  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const icon = name => `<svg aria-hidden="true" focusable="false"><use href="#icon-${name}"/></svg>`;
  const image = (src, alt, position = "center", extra = "") => `<img src="${esc(src.replace(/\.png$/, '.webp'))}" alt="${esc(alt)}" width="1080" height="1440" style="object-position:${esc(position)}" loading="${extra.includes('fetchpriority="high"') ? "eager" : "lazy"}" ${extra}>`;
  const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const writeStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const say = message => { q("#live-status").textContent = message; };
  const lowerInitial = text => text.charAt(0).toLowerCase() + text.slice(1);
  const main = q("#main");
  const home = document.createElement("div");
  home.id = "home-view";
  while (main.firstChild) home.append(main.firstChild);
  const view = document.createElement("div");
  view.id = "route-view";
  view.hidden = true;
  main.append(home, view);

  const snapshot = selector => q(selector).outerHTML.replace(/\sid="[^"]*"/g, "").replace(/\saria-labelledby="[^"]*"/g, "");
  const storySection = snapshot("#story");
  const craftSection = snapshot("#craft");
  const atelierSection = snapshot("#atelier");
  const rawBag = readStore("amnaya.selection.v2", []);
  let bag = Array.isArray(rawBag) ? rawBag.filter(line => line && byId.has(line.id) && byId.get(line.id).sizes.includes(line.size) && Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 9).slice(0, 30) : [];
  let recent = readStore("amnaya.recent.v2", []);
  if (!Array.isArray(recent)) recent = [];
  recent = recent.filter(id => byId.has(id)).slice(0, 8);
  let giftPresentation = false;
  let giftNote = "";
  let currentProduct = null;
  let giftPreferences = null;
  let activeCollection = "all";
  const collectionStates = new Map();
  const collections = {
    all: { title: "The full edit.", description: "A wardrobe of possibilities. Find the pieces that feel like you.", image: "island-edit.png" },
    "new-in": { title: "New to the house.", description: "Fresh expressions of the Amnaya point of view.", image: "botanical-tunic.png" },
    everyday: { title: "Everyday, with intention.", description: "Relaxed shapes. Considered details. Clothes to live in.", image: "island-edit.png" },
    saris: { title: "A drape of your own.", description: "A familiar form, a personal expression. Explore the sari studies.", image: "rose-sari.png" },
    occasion: { title: "For moments that stay.", description: "Gatherings, milestones and the evenings you want to remember.", image: "evening-dress.png" },
    objects: { title: "Objects of meaning.", description: "The finishing touches, the quiet gestures, the things we keep.", image: "gifting.png" },
    "island-edit": { title: "An island state of mind.", description: "Olive, ivory, sand. A little room to move, a little time to slow down.", image: "island-edit.png" }
  };

  q(".icon-definitions defs").insertAdjacentHTML("beforeend", '<symbol id="icon-bag" viewBox="0 0 24 24"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></symbol><symbol id="icon-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>');

  function card(piece, options = {}) {
    const saved = api.getSaved().includes(piece.id);
    return `<article class="shop-card" data-category="${esc(piece.category)}" data-id="${piece.id}">
      <div class="shop-card-media"><a href="/products/${piece.id}" aria-label="Explore ${esc(piece.title)}">${image(piece.image, `${piece.title} — Amnaya collection concept`, piece.position)}</a>
      <button class="icon-button save-button" data-save="${piece.id}" aria-label="${saved ? "Remove" : "Save"} ${esc(piece.title)}${saved ? " from saved pieces" : ""}" aria-pressed="${saved}">${icon("heart")}</button>
      ${piece.badge ? `<span class="shop-card-badge">${esc(piece.badge)}</span>` : ""}<button class="quick-view" data-quick="${piece.id}">A closer look <span aria-hidden="true">+</span></button></div>
      <div class="shop-card-info"><a href="/products/${piece.id}"><h3>${esc(piece.title)}</h3></a><p>${esc(piece.subtitle)}</p><div class="shop-card-bottom"><span>Price on request</span><span class="colour-dot" style="--swatch:var(--color-${piece.tone})" aria-label="${esc(piece.color)}"></span></div></div>
    </article>`;
  }

  function journalCard(article) {
    return `<article class="journal-card"><a class="journal-card-image" href="/journal/${article.slug}">${image(article.image, article.title, article.position)}</a><p class="journal-meta">${esc(article.category)} <span>${esc(article.read)}</span></p><h3><a href="/journal/${article.slug}">${esc(article.title)}</a></h3><p>${esc(article.subtitle)}</p><a class="text-link" href="/journal/${article.slug}">Read the story ${icon("arrow")}</a></article>`;
  }

  function productRail(ids, title, link = "/collections/all", id = "") {
    return `<section class="discovery-section page-gutter" ${id ? `id="${id}"` : ""}><div class="section-heading"><h2>${title}</h2><div class="rail-tools"><a class="text-link" href="${link}">Explore the edit ${icon("arrow")}</a><button class="icon-button" data-rail="prev" aria-label="Previous pieces">←</button><button class="icon-button" data-rail="next" aria-label="Next pieces">→</button></div></div><div class="product-rail">${ids.map(id => card(byId.get(id))).join("")}</div></section>`;
  }

  function buildHeader() {
    q(".brand").href = "/";
    q(".header-tools").insertAdjacentHTML("beforeend", `<button class="icon-button bag-trigger" data-open-bag aria-label="Open selection bag">${icon("bag")}<span class="bag-count" hidden>0</span></button>`);
    q(".appointment-link").remove();
    q(".brand-note").innerHTML = '<button class="text-link header-appointment" data-appointment>By appointment <span aria-hidden="true">↗</span></button>';
    q(".desktop-nav").innerHTML = `<a href="/collections/new-in">New In</a><button class="department-trigger" data-department="clothing" aria-expanded="false" aria-controls="department-panel">Clothing ${icon("chevron")}</button><a href="/collections/saris">Saris</a><button class="department-trigger" data-department="occasion" aria-expanded="false" aria-controls="department-panel">By Occasion ${icon("chevron")}</button><a href="/gifting">Gifting</a><a href="/journal">The Journal</a><button class="department-trigger" data-department="house" aria-expanded="false" aria-controls="department-panel">Our World ${icon("chevron")}</button>`;
    q(".site-header").insertAdjacentHTML("beforeend", '<div class="department-panel" id="department-panel" hidden></div>');
    q(".site-header").insertAdjacentHTML("afterend", '<button class="department-scrim" id="department-scrim" aria-label="Close navigation menu" hidden></button>');
    q("#menu-dialog nav").innerHTML = `<a href="/collections/new-in">New In <span>↗</span></a><details open><summary>Clothing ${icon("plus")}</summary><a href="/collections/all">The full edit</a><a href="/collections/everyday">Everyday dressing</a><a href="/collections/saris">Saris & drapes</a><a href="/collections/occasion">Occasionwear</a><a href="/collections/objects">Objects & accessories</a></details><a href="/gifting">Gifting <span>↗</span></a><a href="/journal">The Journal <span>↗</span></a><a href="/pages/our-story">The House <span>↗</span></a><a href="/your-edit">Your saved edit <span>♡</span></a><button data-appointment>By appointment <span>↗</span></button>`;
  }

  const departments = {
    clothing: { title: "A wardrobe, made personal.", image: "indigo-dress.png", link: "/collections/all", columns: [
      ["Explore", ["All pieces", "/collections/all", "The complete Amnaya preview"], ["New to the house", "/collections/new-in", "The latest creative studies"], ["The island edit", "/collections/island-edit", "Easy shapes in olive, ivory and sand"]],
      ["Find your expression", ["Everyday dressing", "/collections/everyday", "Considered pieces for ordinary days"], ["Saris & drapes", "/collections/saris", "Heritage, worn your way"], ["Occasionwear", "/collections/occasion", "For the moments you keep"], ["Objects & accessories", "/collections/objects", "The details that make it personal"]]
    ] },
    occasion: { title: "Dress for a feeling.", image: "rose-sari.png", link: "/collections/occasion", columns: [
      ["The moments", ["Everyday rituals", "/collections/everyday", "The ease of dressing for yourself"], ["Celebrations", "/collections/occasion?occasion=Celebrations", "A gathering, a milestone, a memory"], ["Evenings that linger", "/collections/occasion?occasion=Evenings", "Sculptural shapes after the sun"]],
      ["Personal gestures", ["Island days", "/collections/island-edit", "Soft light, open skies, relaxed lines"], ["A meaningful gift", "/gifting", "Begin with the person, then the piece"], ["A personal appointment", "/pages/contact", "A conversation with the house"]]
    ] },
    house: { title: "Made for generations.", image: "atelier-journal.png", link: "/pages/our-story", columns: [
      ["The house", ["Our story", "/pages/our-story", "It began with a mother’s hands"], ["The art of making", "/pages/craft", "Knowledge carried through cloth"], ["The Journal", "/journal", "Personal style, craft and the way we live"]],
      ["At your service", ["How to order", "/pages/how-to-order", "From a first look to a conversation"], ["Fit & care", "/pages/care", "A thoughtful starting point"], ["Speak with the atelier", "/pages/contact", "Let your story begin"]]
    ] }
  };

  function closeDepartment() {
    q("#department-panel").hidden = true;
    q("#department-scrim").hidden = true;
    qa("[data-department]").forEach(button => button.setAttribute("aria-expanded", "false"));
  }

  function showDepartment(key, trigger) {
    if (trigger.getAttribute("aria-expanded") === "true") { closeDepartment(); return; }
    const department = departments[key];
    q("#department-panel").innerHTML = `${department.columns.map(([title, ...links]) => `<div class="department-column"><h2>${esc(title)}</h2>${links.map(([label, href, detail]) => `<a href="${href}"><span>${esc(label)}</span><small>${esc(detail)}</small></a>`).join("")}</div>`).join("")}<a class="department-feature" href="${department.link}">${image(`/assets/images/${department.image}`, department.title)}<span>${esc(department.title)} ↗</span></a>`;
    qa("[data-department]").forEach(button => button.setAttribute("aria-expanded", String(button === trigger)));
    q("#department-panel").hidden = false;
    q("#department-scrim").hidden = false;
  }

  function buildHome() {
    const hero = q(".hero");
    hero.querySelector(".hero-copy .button").href = "/collections/all";
    hero.querySelector(".hero-copy .button").innerHTML = `Explore the collection ${icon("arrow")}`;
    hero.querySelector(".hero-copy").insertAdjacentHTML("beforeend", '<a class="hero-secondary" href="/pages/our-story">Discover the house ↗</a>');
    hero.querySelector(".hero-caption>span").textContent = "The Amnaya point of view · Collection preview";
    q(".introduction").hidden = true;
    hero.insertAdjacentHTML("afterend", `<section class="category-discovery page-gutter" aria-labelledby="category-title"><div class="section-heading"><h2 id="category-title">Find your kind of Amnaya.</h2><a class="text-link" href="/collections/all">Discover all ${icon("arrow")}</a></div><div class="category-grid">${[
      ["Saris & drapes", "A familiar form. Your own expression.", "rose-sari.png", "/collections/saris"],
      ["Everyday dressing", "A little ease. A little intention.", "indigo-dress.png", "/collections/everyday"],
      ["For an occasion", "Some moments deserve to stay.", "evening-dress.png", "/collections/occasion"],
      ["Objects of meaning", "Small gestures, thoughtfully chosen.", "gifting.png", "/collections/objects"]
    ].map(([title, copy, src, link]) => `<a class="category-tile" href="${link}"><div>${image(`/assets/images/${src}`, title)}</div><h3>${title}<span aria-hidden="true">↗</span></h3><p>${copy}</p></a>`).join("")}</div></section>`);
    q("#collection-title").textContent = "New to the house.";
    q("#collection .section-heading p").textContent = "Fresh expressions. A familiar point of view.";
    q("#collection .section-heading>.text-link").href = "/collections/new-in";
    q("#collection .section-heading>.text-link").innerHTML = `View the full edit ${icon("arrow")}`;
    q("#collection .collection-toolbar").hidden = true;
    q("#collection-grid").className = "product-rail";
    q("#collection-grid").innerHTML = ["olive-co-ord", "indigo-wrap", "rose-sari", "ivory-ritual", "noir-dress", "botanical-set", "sand-set", "heritage-drape"].map(id => card(byId.get(id))).join("");
    q("#collection .collection-note").textContent = "The collection is an imagined first edit. Discover a piece, build a selection, begin a personal conversation.";
    q("#collection .section-heading").insertAdjacentHTML("beforeend", '<div class="home-rail-buttons"><button class="icon-button" data-rail="prev" aria-label="Previous new pieces">←</button><button class="icon-button" data-rail="next" aria-label="Next new pieces">→</button></div>');
    q("#collection").insertAdjacentHTML("afterend", `<section class="lookbook-section" aria-labelledby="lookbook-title"><div class="lookbook-media">${image("/assets/images/island-edit.png", "The island edit: olive and sand linen silhouettes, a campaign concept")}<button class="lookbook-hotspot hotspot-one" data-quick="olive-co-ord" aria-label="Discover the Palm Co-ord">${icon("plus")}</button><button class="lookbook-hotspot hotspot-two" data-quick="sand-set" aria-label="Discover the Sandstone Set">${icon("plus")}</button><span class="lookbook-photo-caption">The Island Edit · An Amnaya campaign study</span></div><div class="lookbook-caption page-gutter"><div><h2 id="lookbook-title">An island state of mind.</h2><p>Olive, ivory, sand. Made for taking your time.</p></div><a class="text-link" href="/collections/island-edit">Explore the island edit ${icon("arrow")}</a></div></section>
    <section class="occasion-discovery page-gutter"><div class="section-heading"><h2>What’s the occasion?</h2><p>Begin with the moment. Find your expression.</p></div><div class="occasion-grid">${[
      ["The everyday", "ivory-study.png", "/collections/everyday"], ["The celebration", "rose-sari.png", "/collections/occasion?occasion=Celebrations"], ["The afterlight", "evening-dress.png", "/collections/occasion?occasion=Evenings"], ["The thoughtful gesture", "gifting.png", "/gifting"]
    ].map(([title, src, href]) => `<a href="${href}" class="occasion-tile">${image(`/assets/images/${src}`, title)}<span>${title} ↗</span></a>`).join("")}</div></section>
    <section class="gifting-feature"><div class="gifting-feature-image">${image("/assets/images/gifting.png", "An ivory stole and sculptural gold-colour hoops, a gifting concept")}</div><div class="gifting-feature-copy"><h2>For someone<br>whose story<br>you know by heart.</h2><p>A birthday. A new beginning. A quiet thank you. Begin with the person, and let the gesture take shape.</p><a class="text-link" href="/gifting">Discover thoughtful gifting ${icon("arrow")}</a></div></section>
    <section class="journal-preview page-gutter"><div class="section-heading"><h2>A little more to the story.</h2><a class="text-link" href="/journal">Inside the Journal ${icon("arrow")}</a></div><div class="journal-grid">${journal.map(journalCard).join("")}</div></section>`);
    q("#story .story-image img").src = "/assets/images/atelier-journal.webp";
    q("#story .story-image img").alt = "An imagined Amnaya atelier in warm island light";
    q("#story .text-link").href = "/pages/our-story";
    q("#story .text-link").innerHTML = `Step inside the house ${icon("arrow")}`;
    q("#craft").insertAdjacentHTML("afterend", '<div id="recent-home"></div>');
  }

  function buildFooter() {
    q(".site-footer").innerHTML = `<section class="newsletter-block"><div><h2>Stay close to<br>what endures.</h2><p>Notes from the house. New ideas. Stories worth keeping.</p></div><form id="circle-form" novalidate><label for="circle-email">Your email address</label><div class="newsletter-input"><input type="email" id="circle-email" autocomplete="email" required maxlength="254" placeholder="you@example.com" aria-describedby="circle-status"><button type="submit" aria-label="Join the Amnaya circle">${icon("arrow")}</button></div><p class="helper" id="circle-status">Join the circle with a personal email request.</p><a id="circle-draft" class="text-link" href="mailto:yumilah@cbe.mu" hidden>Open invitation request ↗</a></form></section>
    <div class="retail-footer"><div class="footer-brand"><a href="/" aria-label="Amnaya home"><img src="/assets/brand/wordmark.png" alt="Amnaya — Made for generations" width="2132" height="737" loading="lazy"></a><p>Clothes to live in.<br>Stories to carry forward.</p><button class="text-link" data-appointment>Begin your story ↗</button></div><nav aria-label="Explore Amnaya"><h3>Explore</h3><a href="/collections/new-in">New to the house</a><a href="/collections/everyday">Everyday dressing</a><a href="/collections/saris">Saris & drapes</a><a href="/collections/occasion">Occasionwear</a><a href="/gifting">Thoughtful gifting</a></nav><nav aria-label="The house"><h3>The house</h3><a href="/pages/our-story">Our story</a><a href="/pages/craft">The art of making</a><a href="/journal">The Journal</a><a href="/your-edit">Your saved edit</a><a href="/pages/contact">Speak to the atelier</a></nav><nav aria-label="Customer care"><h3>At your service</h3><a href="/pages/how-to-order">How to order</a><a href="/pages/fit">Finding your fit</a><a href="/pages/care">Caring for your pieces</a><a href="/pages/delivery">Delivery & returns</a><a href="/pages/faq">A few questions</a><a href="/pages/privacy">Your privacy</a></nav></div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} Amnaya</span><span>A conscious fashion house.</span><button data-open="about-dialog">Collection preview</button><a href="/#main">Back to the beginning ↑</a></div>`;
    q("#circle-form").addEventListener("submit", event => {
      event.preventDefault();
      const field = q("#circle-email");
      if (!field.value.trim() || !field.checkValidity()) { field.setAttribute("aria-invalid", "true"); q("#circle-status").textContent = "Please use a complete email address to prepare your request."; field.focus(); return; }
      field.setAttribute("aria-invalid", "false");
      q("#circle-draft").href = `mailto:yumilah@cbe.mu?subject=${encodeURIComponent("An invitation to the Amnaya circle")}&body=${encodeURIComponent(`Hello Yumilah,\n\nI would love to hear from the house of Amnaya about new collections and stories.\n\nPlease use this email address: ${field.value.trim()}\n\nWarmly`)}`;
      q("#circle-draft").hidden = false;
      q("#circle-status").textContent = "Your invitation request is ready. Review and send it from your email app.";
      say("Your invitation request is ready to send by email.");
    });
  }

  function routeTitle(title) { document.title = `${title} — AMNAYA`; }
  function pageHeader(title, copy = "") { return `<header class="page-intro page-gutter"><a class="breadcrumb" href="/">Amnaya /</a><h1>${title}</h1>${copy ? `<p>${copy}</p>` : ""}</header>`; }
  function baseCollection(slug) {
    if (slug === "new-in") return catalogue.filter(piece => piece.featured);
    if (slug === "everyday") return catalogue.filter(piece => piece.category === "everyday");
    if (slug === "saris") return catalogue.filter(piece => piece.type === "Saris");
    if (slug === "occasion") return catalogue.filter(piece => piece.occasions.some(item => ["Celebrations", "Evenings"].includes(item)) && !["objects", "craft"].includes(piece.category));
    if (slug === "objects") return catalogue.filter(piece => ["objects", "craft"].includes(piece.category));
    if (slug === "island-edit") return catalogue.filter(piece => piece.edit === "The island edit");
    return catalogue;
  }
  function getCollectionState() { if (!collectionStates.has(activeCollection)) collectionStates.set(activeCollection, { material: [], type: [], occasion: [], sort: "house" }); return collectionStates.get(activeCollection); }

  function filterMarkup(prefix) {
    const base = baseCollection(activeCollection);
    return [["type", "The silhouette", [...new Set(base.map(piece => piece.type))]], ["material", "The material", [...new Set(base.map(piece => piece.material))]], ["occasion", "The moment", [...new Set(base.flatMap(piece => piece.occasions))]]].map(([key, title, values]) => `<details class="catalogue-facet" open><summary>${title} ${icon("plus")}</summary><div>${values.map((value, i) => `<label for="${prefix}-${key}-${i}"><input id="${prefix}-${key}-${i}" type="checkbox" data-facet="${key}" value="${esc(value)}">${esc(value)} <span>${base.filter(piece => key === "occasion" ? piece.occasions.includes(value) : piece[key] === value).length}</span></label>`).join("")}</div></details>`).join("");
  }

  function renderCollection(slug) {
    activeCollection = collections[slug] ? slug : "all";
    const collection = collections[activeCollection];
    const initialOccasion = new URLSearchParams(location.search).get("occasion");
    if (initialOccasion && ["Celebrations", "Evenings"].includes(initialOccasion)) getCollectionState().occasion = [initialOccasion];
    routeTitle(collection.title.replace(/\.$/, ""));
    view.innerHTML = `<section class="collection-page-banner"><div>${image(`/assets/images/${collection.image}`, collection.title, collection.image === "island-edit.png" ? "center" : "center 30%")}</div><header><a class="breadcrumb" href="/">Amnaya / The collection</a><h1>${collection.title}</h1><p>${collection.description}</p></header></section><nav class="collection-tabs page-gutter" aria-label="Collection categories">${Object.entries(collections).filter(([key]) => key !== "island-edit").map(([key, value]) => `<a href="/collections/${key}" ${activeCollection === key ? 'aria-current="page"' : ""}>${esc({all:"The full edit","new-in":"New in",everyday:"Everyday",saris:"Saris",occasion:"Occasions",objects:"Objects & gifting"}[key])}</a>`).join("")}</nav><section class="catalogue-layout page-gutter"><aside class="catalogue-sidebar" aria-label="Collection filters"><div class="filter-heading"><h2>Make it your edit.</h2><button class="text-link" data-clear-filters>Reset</button></div>${filterMarkup("desktop")}</aside><div class="catalogue-main"><div class="catalogue-toolbar"><span id="catalogue-count" role="status"></span><button class="filter-mobile-button" data-open-filters>Filter the edit +</button><label for="catalogue-sort">Sort by <select id="catalogue-sort"><option value="house">The house edit</option><option value="az">Name: A–Z</option><option value="za">Name: Z–A</option></select></label></div><div class="active-filters" id="active-filters"></div><div id="catalogue-products" class="catalogue-products"></div><p class="preview-disclosure">An imagined first collection. All photographs and pieces are creative studies; availability, materials and prices are confirmed in a personal conversation.</p></div></section>`;
    q("#mobile-filters").innerHTML = filterMarkup("mobile");
    updateCatalogue();
  }

  function updateCatalogue() {
    const state = getCollectionState();
    let found = baseCollection(activeCollection).filter(piece => (!state.material.length || state.material.includes(piece.material)) && (!state.type.length || state.type.includes(piece.type)) && (!state.occasion.length || state.occasion.some(occasion => piece.occasions.includes(occasion))));
    if (state.sort !== "house") found.sort((a, b) => state.sort === "az" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
    q("#catalogue-count").textContent = `${found.length} ${found.length === 1 ? "piece" : "pieces"} in your edit`;
    q("#catalogue-sort").value = state.sort;
    q("#catalogue-products").innerHTML = found.length ? found.map(piece => card(piece)).join("") : '<div class="catalogue-empty"><h2>A different starting point?</h2><p>These choices don’t overlap in the current preview. Clear a filter to explore more of the house.</p><button class="button" data-clear-filters>Show the full edit ↗</button></div>';
    q("#active-filters").innerHTML = ["material", "type", "occasion"].flatMap(key => state[key].map(value => `<button data-remove-facet="${key}" data-value="${esc(value)}">${esc(value)} <span aria-hidden="true">×</span></button>`)).join("");
    qa("[data-facet]").forEach(input => { input.checked = state[input.dataset.facet].includes(input.value); });
    api.syncSaved();
  }

  function renderProduct(id) {
    const piece = byId.get(id);
    if (!piece) { renderNotFound(); return; }
    currentProduct = piece;
    recent = [piece.id, ...recent.filter(item => item !== piece.id)].slice(0, 8);
    writeStore("amnaya.recent.v2", recent);
    routeTitle(piece.title);
    const recommended = catalogue.filter(other => other.id !== piece.id && (other.category === piece.category || other.occasions.some(occasion => piece.occasions.includes(occasion)))).slice(0, 4);
    view.innerHTML = `<nav class="product-breadcrumb page-gutter" aria-label="Breadcrumb"><a href="/">Amnaya</a><span>/</span><a href="/collections/all">The collection</a><span>/</span><span>${esc(piece.title)}</span></nav><section class="product-layout page-gutter"><div class="product-gallery"><div class="product-visual" id="product-visual">${image(piece.image, `${piece.title} — Amnaya creative study`, piece.position, 'fetchpriority="high"')}<button class="image-zoom icon-button" data-zoom="${piece.id}" aria-label="Enlarge campaign photograph">${icon("plus")}</button></div><div class="gallery-thumbs" role="group" aria-label="Photograph view"><button class="active" data-photo="silhouette" aria-pressed="true">${image(piece.image, "Silhouette view", piece.position)}<span>Silhouette</span></button><button data-photo="detail" aria-pressed="false">${image(piece.image, "Close crop of the campaign photograph", piece.position)}<span>A closer look</span></button><p>Collection study<br>Imagined for Amnaya</p></div></div><div class="product-information"><span class="concept-label">THE AMNAYA COLLECTION PREVIEW</span><h1>${esc(piece.title)}</h1><p class="product-subtitle">${esc(piece.subtitle)}</p><p class="product-price">Price on request <span>A personal atelier conversation</span></p><p class="product-description">${esc(piece.description)}</p><div class="product-colour"><span>Colour direction: <strong>${esc(piece.color)}</strong></span><span class="colour-dot" style="--swatch:var(--color-${piece.tone})"></span></div><div class="size-heading"><span>Your preferred fit</span><button class="text-link" data-open-fit>Find your fit ↗</button></div><div class="size-options" role="radiogroup" aria-label="Your preferred fit">${piece.sizes.map((size, i) => `<label class="size-option"><input type="radio" name="product-size" value="${esc(size)}" ${piece.sizes.length === 1 ? "checked" : ""}><span>${esc(size)}</span></label>`).join("")}</div><p class="product-form-status" id="product-form-status" role="status"></p><div class="product-purchase"><div class="quantity-control"><button data-product-quantity="-1" aria-label="Decrease quantity">−</button><input id="pdp-quantity" type="number" min="1" max="9" value="1" aria-label="Quantity"><button data-product-quantity="1" aria-label="Increase quantity">+</button></div><button class="button" data-add-selection="${piece.id}">Add to selection ${icon("bag")}</button></div><div class="product-secondary-actions"><button class="text-link" data-save="${piece.id}" aria-pressed="false">${icon("heart")} Save to your edit</button><button class="text-link" data-personal-enquiry="${piece.id}">Make it personal ↗</button></div><div class="product-detail-list"><details open><summary>The considered details ${icon("plus")}</summary><ul>${piece.details.map(detail => `<li>${esc(detail)}</li>`).join("")}</ul></details><details><summary>Fit & personalisation ${icon("plus")}</summary><p>The sizes here record your preferences for the enquiry. Discuss measurements, silhouette and finishing with the atelier before a piece is confirmed.</p></details><details><summary>Care & keeping ${icon("plus")}</summary><p>Every textile asks for its own kind of care. Follow the final garment’s care instructions, store thoughtfully and ask the atelier about any special finishing.</p><a class="text-link" href="/pages/care">Explore the care guide ↗</a></details><details><summary>Availability & delivery ${icon("plus")}</summary><p>This is a creative collection preview. The house confirms what can be made, the price, lead time and delivery arrangements before you commit.</p><a class="text-link" href="/pages/how-to-order">How a personal order begins ↗</a></details></div></div></section>${productRail(recommended.map(item => item.id), "Complete the feeling.")}`;
    api.syncSaved();
  }

  function saveBag() { const persisted = writeStore("amnaya.selection.v2", bag); if (!persisted) say("Your selection is kept for this visit. Browser storage is unavailable."); syncBag(); }
  function syncBag() {
    const count = bag.reduce((total, line) => total + line.quantity, 0);
    q(".bag-count").textContent = String(count);
    q(".bag-count").hidden = !count;
    q(".bag-trigger").setAttribute("aria-label", `Open selection bag${count ? ` (${count})` : ""}`);
    if (q("#bag-dialog").open) renderBag();
  }
  const lineKey = line => `${line.id}::${line.size}`;

  function addSelection(id) {
    const piece = byId.get(id);
    const selected = q('input[name="product-size"]:checked');
    if (!selected) { q("#product-form-status").textContent = "Choose your preferred fit to add this piece."; q('input[name="product-size"]').focus(); return; }
    const quantity = Math.min(9, Math.max(1, Math.trunc(Number(q("#pdp-quantity").value) || 1)));
    const existing = bag.find(line => line.id === id && line.size === selected.value);
    if (existing) existing.quantity = Math.min(9, existing.quantity + quantity); else bag.push({ id, size: selected.value, quantity });
    saveBag();
    q("#product-form-status").innerHTML = 'Added to your personal edit. <button class="text-link" data-open-bag>View selection ↗</button>';
    say(`${piece.title} added to your selection.`);
  }

  function renderBag() {
    const count = bag.reduce((total, line) => total + line.quantity, 0);
    q("#bag-items").innerHTML = bag.length ? bag.map(line => { const piece = byId.get(line.id); return `<article class="bag-item"><a class="bag-item-image" href="/products/${piece.id}">${image(piece.image, piece.title, piece.position)}</a><div><a class="bag-item-title" data-initial-focus href="/products/${piece.id}">${esc(piece.title)}</a><p>${esc(piece.color)} · ${esc(line.size)}</p><span class="bag-item-price">Price on request</span><div class="bag-item-controls"><div class="quantity-control"><button data-bag-adjust="-1" data-line="${esc(lineKey(line))}" aria-label="Decrease ${esc(piece.title)} quantity" ${line.quantity === 1 ? "disabled" : ""}>−</button><span aria-label="Quantity ${line.quantity}">${line.quantity}</span><button data-bag-adjust="1" data-line="${esc(lineKey(line))}" aria-label="Increase ${esc(piece.title)} quantity" ${line.quantity === 9 ? "disabled" : ""}>+</button></div><button class="text-link" data-remove-line="${esc(lineKey(line))}">Remove</button></div></div></article>`; }).join("") : '<div class="empty-state"><h3>A little room for possibility.</h3><p>Add the pieces you’re drawn to, then share your selection with the atelier.</p><a class="button" href="/collections/all">Explore the collection ↗</a></div>';
    q("#bag-summary").innerHTML = bag.length ? `<div class="bag-gifting"><label><input type="checkbox" id="gift-presentation" ${giftPresentation ? "checked" : ""}> Ask about gift presentation</label><label for="bag-gift-note">A personal note, if you wish</label><textarea id="bag-gift-note" maxlength="400" rows="2" placeholder="A recipient, an occasion, something to remember…">${esc(giftNote)}</textarea></div><div class="bag-total"><span>Your edit</span><strong>${count} ${count === 1 ? "piece" : "pieces"}</strong></div><p class="helper">Availability, pricing and delivery are arranged personally. This selection makes no payment or order commitment.</p><button class="button full-width" data-request-selection>Enquire about my selection ${icon("arrow")}</button><button class="text-link bag-continue" data-close>Keep exploring ↗</button>` : "";
  }

  function requestSelection() {
    if (!bag.length) return;
    const lines = bag.map(line => { const piece = byId.get(line.id); return `• ${piece.title} — ${piece.color}, ${line.size}, quantity ${line.quantity}`; }).join("\n");
    api.beginEnquiry({ interest: "My Amnaya selection", message: `I would love to discuss these collection studies:\n\n${lines}\n\n${giftPresentation ? "I would also like to discuss gift presentation.\n" : ""}${giftNote ? `A personal note: ${giftNote}\n` : ""}\nPlease let me know about availability, materials, pricing and the next steps.` });
  }

  function renderJournal(slug) {
    if (!slug) { routeTitle("The Journal"); view.innerHTML = `${pageHeader("The Amnaya Journal.", "Personal style, the art of making, and a slower way of looking at the world.")}<section class="journal-index page-gutter"><div class="journal-grid">${journal.map(journalCard).join("")}</div></section><div class="journal-closing"><p>Clothes hold stories.<br>There is always a little more to tell.</p><a class="text-link" href="/pages/our-story">Discover the house ↗</a></div>`; return; }
    const article = journal.find(item => item.slug === slug);
    if (!article) { renderNotFound(); return; }
    routeTitle(article.title);
    view.innerHTML = `<article class="journal-article"><header class="article-header page-gutter"><a class="breadcrumb" href="/journal">The Journal / ${esc(article.category)}</a><h1>${esc(article.title)}</h1><p>${esc(article.subtitle)}</p><span>${esc(article.read)} · From the house of Amnaya</span></header><div class="article-cover">${image(article.image, article.title, article.position)}</div><div class="article-body"><p class="article-lede">${esc(article.intro)}</p>${article.paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join("")}<p class="article-note">An editorial reflection written for the Amnaya website concept. Campaign photographs are creative studies.</p><a class="text-link" href="/journal">More from the Journal ${icon("arrow")}</a></div></article>${productRail(article.products, "Explore the story through pieces.")}`;
  }

  function renderGifting() {
    routeTitle("Thoughtful gifting");
    view.innerHTML = `<section class="gift-page-hero"><div>${image("/assets/images/gifting.png", "A personal gifting concept in ivory, oxblood and warm gold")}</div><header><a class="breadcrumb" href="/">Amnaya / Gifting</a><h1>Give something<br>of a story.</h1><p>A thoughtful gesture begins with knowing someone. Let us help you find a starting point.</p><a class="text-link" href="#gift-finder">Find a gift ${icon("arrow")}</a></header></section><section class="gift-finder page-gutter" id="gift-finder"><div><h2>Who’s on your mind?</h2><p>A few little details can help us imagine a meaningful gesture.</p><div class="gift-promises"><p><strong>A personal point of view</strong><span>Begin with their colours, their style, their story.</span></p><p><strong>A considered presentation</strong><span>Share a message and discuss the finishing touches.</span></p><p><strong>A conversation, first</strong><span>The atelier confirms contents, availability and pricing.</span></p></div></div><form id="gift-finder-form"><div class="form-row"><div class="field"><label for="gift-recipient">Who is it for?</label><select id="gift-recipient"><option>Someone I love</option><option>A friend</option><option>A family member</option><option>Someone to thank</option><option>Myself</option></select></div><div class="field"><label for="gift-occasion">The occasion</label><select id="gift-occasion"><option>A celebration</option><option>A new beginning</option><option>A birthday</option><option>A thank you</option><option>Just because</option></select></div></div><fieldset class="gift-style"><legend>What catches their eye?</legend><label><input type="radio" name="gift-style" value="neutrals" checked><span>Quiet neutrals</span></label><label><input type="radio" name="gift-style" value="colour"><span>Rich colour</span></label><label><input type="radio" name="gift-style" value="details"><span>The little details</span></label></fieldset><div class="field"><label for="gift-budget">A preferred budget, if you have one</label><input id="gift-budget" maxlength="80" placeholder="A range you’re comfortable discussing"></div><button class="button full-width" type="submit">Curate a little inspiration ${icon("arrow")}</button></form></section><section class="gift-recommendations page-gutter"><div class="section-heading"><div><h2 id="gift-results-title">Thoughtful places to begin.</h2><p id="gift-results-copy">The objects-of-meaning studies.</p></div><button class="text-link" data-gift-enquiry>Talk to the gifting atelier ↗</button></div><div class="catalogue-products" id="gift-results">${["ritual-gift", "heirloom-stole", "brass-hoops"].map(id => card(byId.get(id))).join("")}</div></section>`;
    q("#gift-finder-form").addEventListener("submit", event => {
      event.preventDefault();
      const style = view.querySelector('input[name="gift-style"]:checked').value;
      giftPreferences = { recipient: q("#gift-recipient").value, occasion: q("#gift-occasion").value, budget: q("#gift-budget").value.trim(), style };
      const ids = { neutrals: ["heirloom-stole", "ritual-gift", "ivory-ritual"], colour: ["rose-sari", "heritage-drape", "indigo-wrap"], details: ["brass-hoops", "heirloom-detail", "heirloom-stole"] }[style];
      q("#gift-results").innerHTML = ids.map(id => card(byId.get(id))).join("");
      q("#gift-results-title").textContent = "A few things they might love.";
      q("#gift-results-copy").textContent = `A starting point for ${lowerInitial(giftPreferences.recipient)}, for ${giftPreferences.occasion.toLowerCase()}.`;
      q("#gift-results-title").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      api.syncSaved(); say("Your gifting inspiration is ready below.");
    });
  }

  const helpPages = {
    "how-to-order": { title: "From a piece to a conversation.", intro: "A personal approach to finding your Amnaya.", sections: [["Find what speaks to you", "Explore the collection, browse by occasion, or begin with the Journal. Save a piece to your personal edit if you want to come back to it."], ["Build your selection", "Open a piece, choose your preferred fit, and add it to your selection bag. You can change quantities, keep a note, and ask about gift presentation."], ["Begin a conversation", "Send your selection to Yumilah using the prepared enquiry draft. Tell the house about the occasion, the colours you love, and any questions you have."], ["Agree the details personally", "The atelier confirms which concepts can be developed, materials, measurements, price, timing and delivery before any order is agreed. This local preview takes no payment."]] },
    care: { title: "A little care goes a long way.", intro: "Thoughtfulness continues after a piece finds its way to you.", sections: [["Begin with the care label", "Follow the instructions provided with the finished garment. A fabric’s weave, dye and finishing may each ask for a different kind of care."], ["Give textiles room", "Air pieces gently between wears where appropriate. Store clean, dry clothing away from direct sunlight, and avoid crowding delicate fabrics."], ["Treat the details gently", "Embroidery, woven borders, metal trims and other finishes can need special attention. Avoid pulling or rubbing them, and ask for guidance before cleaning."], ["Keep a conversation open", "For questions about a particular piece, discuss its final material and finishing with the atelier. The collection imagery here shows concepts, not final care specifications."]] },
    delivery: { title: "The journey to you.", intro: "The practical details deserve the same care as the piece.", sections: [["Availability & timing", "The collection is a creative preview. The atelier confirms whether a piece can be made and discusses its lead time before you place an order."], ["Delivery arrangements", "Share your destination in your personal conversation. Delivery options, cost and timing are agreed directly; this preview does not promise shipping territories or delivery dates."], ["Fit, alterations & returns", "Ask about measurements, alteration options and return eligibility before confirming a piece. Terms may depend on how a piece is made or personalised and must be provided by the house."], ["A note about this preview", "There is no payment checkout or order tracking in this local site. Your selection bag prepares an enquiry and does not create a binding order."]] },
    fit: { title: "Made personal, from the start.", intro: "A useful starting point is the way you like to feel in your clothes.", sections: [["Choose a preference", "S, M, L and XL on the product pages record your usual fit preference. They are not a published Amnaya measurement chart or a guarantee of garment dimensions."], ["Take three useful measurements", "Measure around your bust, your natural waist and the fullest part of your hips, keeping the tape level and comfortable. The atelier can guide any further measurements needed."], ["Describe the silhouette", "Tell us whether you prefer a close, easy or generous fit, and share any length or movement preferences. Personal style includes the way a piece feels when you wear it."], ["Confirm before making", "Discuss final measurements and any personalisation with the house before agreeing an order. The current collection is a design preview, so final construction details remain to be confirmed."]] },
    privacy: { title: "A personal space, thoughtfully kept.", intro: "How this local Amnaya preview handles your information.", sections: [["Saved on your device", "Saved pieces, recently viewed studies and your selection bag use this browser’s local storage. They are not uploaded to an Amnaya account. Clearing your browser’s site data removes them."], ["Your personal enquiries", "Names, email addresses and enquiry messages are held in the page while you prepare a draft. The website does not send them to a server. You choose whether to open, review and send the draft using your email app."], ["The Amnaya circle", "The invitation form prepares a personal email request. It does not register a subscription automatically or add your address to an online mailing list."], ["A quiet browsing experience", "The site uses local images and fonts, without third-party advertising, tracking scripts or analytics. A production launch will need the house’s confirmed privacy and ordering terms."]] },
    faq: { title: "A few things you may wonder.", intro: "A little clarity, before the conversation.", sections: [["Can I order a piece online?", "You can build a selection and prepare an enquiry. The house confirms availability, materials and pricing personally before an order is agreed. This preview does not accept payments."], ["Are these the final collection photographs?", "No. Campaign photographs, garment silhouettes, the imagined atelier and gifting arrangements are original AI-generated creative studies. The original Amnaya logos and founding story were supplied by Yumilah."], ["How do I save a piece?", "Use the heart beside a study. Open your saved edit from the heart in the header or the mobile menu. Your edit stays in this browser."], ["Can I ask for something personal?", "Use ‘Make it personal’ on any product page, or begin an atelier conversation. Share the occasion, colours, fit preferences and the details that matter to you."], ["How does gifting work?", "The gift finder suggests creative directions based on a few preferences. Share your ideas with the atelier to discuss what can be arranged, the budget and the presentation."], ["Who receives my enquiry?", "Your prepared email draft is addressed to Yumilah Govinden at the business address from the supplied brand email. Nothing is sent by this website; you review and send it yourself."]] }
  };

  function renderInfo(slug) {
    if (slug === "our-story") { routeTitle("The House"); view.innerHTML = `${pageHeader("A personal kind of luxury.", "Founded by Yumilah Govinden and Jeevesh Augnoo. Shaped by identity, craftsmanship and heritage.")}${storySection}<section class="house-statement"><p>Come as you are.<br>Let us help you shape what endures.</p><a class="text-link" href="/pages/craft">Discover the art of making ${icon("arrow")}</a></section>${atelierSection}`; return; }
    if (slug === "craft") { routeTitle("The Art of Making"); view.innerHTML = `${pageHeader("Knowledge, held in hands.", "The materials we choose. The gestures we preserve. The stories we pass on.")}${craftSection}${productRail(["heirloom-detail", "heritage-drape", "heirloom-stole", "rose-sari"], "A closer look at what endures.")}`; return; }
    if (slug === "contact") { routeTitle("The Atelier"); view.innerHTML = `${pageHeader("Let your story begin.", "A personal conversation is the beginning of every Amnaya piece.")}<section class="contact-layout page-gutter"><div class="contact-photo">${image("/assets/images/atelier-journal.png", "An imagined Amnaya atelier")}</div><div class="contact-copy"><h2>Come as you are.</h2><p>A colour you love. An occasion you’re looking forward to. A piece you have been carrying in your imagination.</p><p>Tell Yumilah what you have in mind, and begin a conversation about what could take shape.</p><button class="button" data-appointment>Speak with the atelier ${icon("arrow")}</button><a class="text-link" href="mailto:yumilah@cbe.mu">yumilah@cbe.mu ↗</a><p class="helper">The supplied business contact for Yumilah Govinden. A public atelier address and appointment arrangements are to be confirmed by the house.</p></div></section>`; return; }
    const page = helpPages[slug];
    if (!page) { renderNotFound(); return; }
    routeTitle(page.title);
    view.innerHTML = `${pageHeader(page.title, page.intro)}<div class="help-layout page-gutter"><nav class="help-nav" aria-label="Customer care topics">${Object.entries(helpPages).map(([key, value]) => `<a href="/pages/${key}" ${key === slug ? 'aria-current="page"' : ""}>${esc({"how-to-order":"How to order",care:"Caring for your pieces",delivery:"Delivery & returns",fit:"Finding your fit",privacy:"Your privacy",faq:"A few questions"}[key])}</a>`).join("")}<a href="/pages/contact">Speak with the atelier ↗</a></nav><article class="help-article">${page.sections.map(([title, text], i) => slug === "faq" ? `<details ${i === 0 ? "open" : ""}><summary>${esc(title)} ${icon("plus")}</summary><p>${esc(text)}</p></details>` : `<section><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join("")}<button class="text-link" data-appointment>A question of your own? ${icon("arrow")}</button></article></div>`;
  }

  function renderSavedEdit() {
    routeTitle("Your Personal Edit");
    const saved = api.getSaved().map(id => byId.get(id)).filter(Boolean);
    view.innerHTML = `${pageHeader("Your own little collection.", "The pieces you’re drawn to, saved on this device.")}<section class="saved-page page-gutter">${saved.length ? `<div class="catalogue-products">${saved.map(piece => card(piece)).join("")}</div><button class="button" data-share-saved>Share my inspirations ↗</button>` : '<div class="saved-empty"><h2>A little room for possibility.</h2><p>Explore the house and use the heart to keep the pieces that feel like you.</p><a class="button" href="/collections/all">Find your first piece ↗</a></div>'}</section>${recent.length ? productRail(recent.slice(0, 4), "A second look.") : ""}`;
  }
  function renderNotFound() { routeTitle("A different path"); view.innerHTML = `${pageHeader("A different thread, perhaps?", "This page isn’t in the current Amnaya edit.")}<div class="not-found page-gutter"><a class="button" href="/collections/all">Explore the collection ↗</a></div>`; }
  function updateRecentHome() { q("#recent-home").innerHTML = recent.length ? productRail(recent.slice(0, 4), "Something caught your eye.") : ""; }

  function renderRoute() {
    closeDepartment();
    const path = location.pathname.replace(/\/$/, "") || "/";
    const isHome = path === "/" || path === "/index.html";
    home.hidden = !isHome;
    view.hidden = isHome;
    document.body.classList.toggle("is-inner-page", !isHome);
    if (isHome) { document.title = "AMNAYA — Made for generations"; updateRecentHome(); }
    else if (path.startsWith("/collections/")) renderCollection(path.split("/")[2]);
    else if (path.startsWith("/products/")) renderProduct(path.split("/")[2]);
    else if (path === "/journal" || path.startsWith("/journal/")) renderJournal(path.split("/")[2]);
    else if (path === "/gifting") renderGifting();
    else if (path.startsWith("/pages/")) renderInfo(path.split("/")[2]);
    else if (path === "/your-edit") renderSavedEdit();
    else renderNotFound();
    qa(".desktop-nav a").forEach(link => { if (link.getAttribute("href") === path) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current"); });
  }

  function go(href, push = true) {
    const url = new URL(href, location.origin);
    qa("dialog[open]").forEach(dialog => dialog.close());
    if (push) history.pushState({}, "", url.pathname + url.search + url.hash);
    renderRoute();
    if (url.hash && document.getElementById(url.hash.slice(1))) document.getElementById(url.hash.slice(1)).scrollIntoView({ behavior: "instant" });
    else scrollTo({ top: 0, behavior: "instant" });
    say(document.title.replace(" — AMNAYA", ""));
  }

  document.addEventListener("click", event => {
    const target = event.target.closest("button,a");
    if (!target) return;
    if (target.dataset.department) { event.preventDefault(); showDepartment(target.dataset.department, target); return; }
    if (target.id === "department-scrim") { closeDepartment(); return; }
    if (target.hasAttribute("data-open-bag")) { event.preventDefault(); renderBag(); api.openDialog("bag-dialog", target); return; }
    if (target.hasAttribute("data-open-filters")) { api.openDialog("catalogue-filter-dialog", target); return; }
    if (target.hasAttribute("data-open-fit")) { api.openDialog("fit-dialog", target); return; }
    if (target.hasAttribute("data-fit-enquiry")) { api.beginEnquiry({ interest: "A personal fit conversation" }); return; }
    if (target.dataset.quick) { api.openPiece(target.dataset.quick, target); return; }
    if (target.dataset.piece) { event.preventDefault(); event.stopImmediatePropagation(); go(`/products/${target.dataset.piece}`); return; }
    if (target.dataset.zoom) { q("#enlarged-image").src = byId.get(target.dataset.zoom).image; q("#enlarged-image").alt = `${byId.get(target.dataset.zoom).title}, full campaign concept photograph`; api.openDialog("image-dialog", target); return; }
    if (target.dataset.photo) { qa("[data-photo]").forEach(button => { button.classList.toggle("active", button === target); button.setAttribute("aria-pressed", String(button === target)); }); q("#product-visual").classList.toggle("show-detail", target.dataset.photo === "detail"); return; }
    if (target.dataset.productQuantity) { const field = q("#pdp-quantity"); field.value = Math.min(9, Math.max(1, (Number(field.value) || 1) + Number(target.dataset.productQuantity))); return; }
    if (target.dataset.addSelection) { addSelection(target.dataset.addSelection); return; }
    if (target.dataset.personalEnquiry) { const piece = byId.get(target.dataset.personalEnquiry); api.beginEnquiry({ interest: piece.title, message: `I’m drawn to ${piece.title} and would love to discuss it personally.` }); return; }
    if (target.dataset.bagAdjust) { const line = bag.find(item => lineKey(item) === target.dataset.line); if (line) { line.quantity = Math.min(9, Math.max(1, line.quantity + Number(target.dataset.bagAdjust))); saveBag(); } return; }
    if (target.dataset.removeLine) { bag = bag.filter(line => lineKey(line) !== target.dataset.removeLine); saveBag(); return; }
    if (target.hasAttribute("data-request-selection")) { requestSelection(); return; }
    if (target.hasAttribute("data-share-saved")) { const titles = api.getSaved().map(id => byId.get(id)?.title).filter(Boolean); api.beginEnquiry({ interest: "My saved inspirations", message: `I’m drawn to these Amnaya studies:\n\n${titles.join("\n")}\n\nI would love to explore these inspirations with you.` }); return; }
    if (target.dataset.rail) { const section = target.closest("section"); const rail = section.querySelector(".product-rail"); rail.scrollBy({ left: (target.dataset.rail === "next" ? 1 : -1) * rail.clientWidth * .8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); return; }
    if (target.hasAttribute("data-clear-filters")) { const state = getCollectionState(); state.material = []; state.type = []; state.occasion = []; updateCatalogue(); return; }
    if (target.dataset.removeFacet) { const state = getCollectionState(); state[target.dataset.removeFacet] = state[target.dataset.removeFacet].filter(value => value !== target.dataset.value); updateCatalogue(); return; }
    if (target.hasAttribute("data-gift-enquiry")) { api.beginEnquiry({ interest: "A thoughtful Amnaya gift", message: giftPreferences ? `I’m thinking of a gift for ${lowerInitial(giftPreferences.recipient)}, for ${giftPreferences.occasion.toLowerCase()}.\n\nThey are drawn to ${ {neutrals:"quiet neutrals",colour:"rich colour",details:"the little details"}[giftPreferences.style] }.${giftPreferences.budget ? `\nMy preferred budget: ${giftPreferences.budget}` : ""}\n\nI’d love your guidance on a thoughtful gesture and its presentation.` : "I would love some guidance on a meaningful Amnaya gift." }); return; }
    if (!target.matches("a") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const href = target.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || target.hasAttribute("download")) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    if (href.startsWith("#")) {
      if (href === "#main" || (href === "#gift-finder" && location.pathname === "/gifting")) return;
      if (location.pathname !== "/") { event.preventDefault(); event.stopImmediatePropagation(); go(`/${href}`); }
      return;
    }
    event.preventDefault(); event.stopImmediatePropagation(); go(url.pathname + url.search + url.hash);
  }, true);

  document.addEventListener("change", event => {
    const target = event.target;
    if (target.matches("[data-facet]")) { const state = getCollectionState(); const key = target.dataset.facet; state[key] = target.checked ? [...new Set([...state[key], target.value])] : state[key].filter(value => value !== target.value); updateCatalogue(); }
    if (target.id === "catalogue-sort") { getCollectionState().sort = target.value; updateCatalogue(); }
    if (target.name === "product-size" && q("#product-form-status")) q("#product-form-status").textContent = "";
    if (target.id === "gift-presentation") giftPresentation = target.checked;
  });
  document.addEventListener("input", event => { if (event.target.id === "bag-gift-note") giftNote = event.target.value; });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeDepartment(); });
  document.addEventListener("focusin", event => { if (!q("#department-panel").hidden && !q(".site-header").contains(event.target)) closeDepartment(); });
  matchMedia("(max-width: 59.99rem)").addEventListener("change", event => { if (event.matches) closeDepartment(); });
  document.addEventListener("amnaya:saved", () => { if (location.pathname === "/your-edit" && !view.hidden) {
    renderSavedEdit();
    view.querySelector('.saved-page a[href^="/products/"], .saved-empty a')?.focus({ preventScroll: true });
  } });
  window.addEventListener("popstate", () => { renderRoute(); scrollTo({ top: 0, behavior: "instant" }); });
  buildHeader();
  buildHome();
  buildFooter();
  syncBag();
  renderRoute();
  window.AmnayaStore = { go, catalogue, getBag: () => bag.map(line => ({ ...line })) };
})();

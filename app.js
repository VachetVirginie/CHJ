const CONFIG = {
  dataUrl: "/.netlify/functions/get-catalogue",
  fallbackDataUrl: "/data/tableaux.example.json",
  adminQrPath: "/admin-qr",
  adminEditorPath: "/admin-editeur"
};

const app = document.getElementById("app");
let catalogue = null;

init();

async function init() {
  renderLoading();
  try {
    catalogue = normalizeCatalogue(await fetchCatalogue());
    updateSiteChrome(catalogue.site);
    renderRoute();
    window.addEventListener("popstate", renderRoute);
    document.addEventListener("click", onNavigate);
  } catch (error) {
    renderError("Impossible de charger le catalogue.", "Vérifie l'URL du fichier JSON et sa disponibilité publique.");
  }
}

async function fetchCatalogue() {
  const response = await fetch(CONFIG.dataUrl, { cache: "no-store" });
  if (response.ok) return response.json();
  const fallback = await fetch(CONFIG.fallbackDataUrl, { cache: "no-store" });
  if (!fallback.ok) throw new Error("HTTP " + response.status);
  return fallback.json();
}

function normalizeCatalogue(data) {
  const site = data && data.site ? data.site : {};
  const tableaux = Array.isArray(data && data.tableaux) ? data.tableaux : [];
  return {
    site: {
      nom: site.nom || "Galerie Atelier",
      accroche: site.accroche || "Œuvres originales et fiches accessibles par QR code.",
      email: site.email || "contact@example.com",
      whatsapp: String(site.whatsapp || "").replace(/\D+/g, "")
    },
    tableaux: tableaux.map((item) => ({
      id: slugify(item.id || item.titre),
      titre: item.titre || "Sans titre",
      artiste: item.artiste || "Artiste",
      description: item.description || "Description à compléter.",
      prix: item.prix || "Prix sur demande",
      dimensions: item.dimensions || "—",
      technique: item.technique || "—",
      annee: item.annee || "—",
      image: item.image || "",
      disponible: item.disponible !== false
    })).filter((item) => item.id)
  };
}

function updateSiteChrome(site) {
  document.title = site.nom;
  const brand = document.querySelector(".brand span:last-child");
  const footer = document.querySelector(".site-footer p");
  if (brand) brand.textContent = site.nom;
  if (footer) footer.textContent = "";
}

function renderRoute() {
  const path = normalizePath(window.location.pathname);
  if (path === CONFIG.adminQrPath) {
    renderQrCodes();
    return;
  }
  if (path === CONFIG.adminEditorPath) {
    renderAdminEditor();
    return;
  }
  if (path.startsWith("/tableau/")) {
    renderDetail(path.replace("/tableau/", ""));
    return;
  }
  renderGallery();
}

function renderGallery() {
  const items = catalogue.tableaux;
  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">Catalogue d'œuvres</p>
        <h1>${escapeHtml(catalogue.site.nom)}</h1>
      </div>
    </section>

    <section class="toolbar">
      <div>
        <p class="eyebrow">${items.length} œuvre${items.length > 1 ? "s" : ""}</p>
        <h2>Galerie</h2>
      </div>
    </section>

    <section class="grid" id="galleryGrid">
      ${items.map(cardHtml).join("")}
    </section>
  `;
}

function cardHtml(item) {
  return `
    <article class="card">
      <a href="/tableau/${encodeURIComponent(item.id)}" data-link aria-label="Voir ${escapeHtml(item.titre)}">
        ${imageHtml(item, "card-image")}
      </a>
      <div class="card-body">
        <p class="meta">${escapeHtml(item.artiste)} · ${escapeHtml(item.annee)}</p>
        <h3>${escapeHtml(item.titre)}</h3>
        <p class="specs">${escapeHtml(item.technique)} · ${escapeHtml(item.dimensions)}</p>
        <div class="price">${escapeHtml(item.prix)}</div>
        <span class="status${item.disponible ? "" : " sold"}">${item.disponible ? "Disponible" : "Vendu"}</span>
        <div class="actions">
          <a class="button" href="/tableau/${encodeURIComponent(item.id)}" data-link>Voir la fiche</a>
        </div>
      </div>
    </article>
  `;
}

function renderDetail(id) {
  const item = catalogue.tableaux.find((entry) => entry.id === decodeURIComponent(id));
  if (!item) {
    renderError("Tableau introuvable.", "Vérifie que l'identifiant du QR code correspond bien à un id du fichier JSON.");
    return;
  }

  const url = absoluteUrl(`/tableau/${item.id}`);
  const mailLink = `mailto:${encodeURIComponent(catalogue.site.email)}?subject=${encodeURIComponent("Demande d'information - " + item.titre)}&body=${encodeURIComponent("Bonjour,\n\nJe souhaite avoir plus d'informations sur le tableau : " + item.titre + "\n" + url)}`;
  const whatsappLink = catalogue.site.whatsapp
    ? `https://wa.me/${catalogue.site.whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite avoir plus d'informations sur le tableau : " + item.titre + " " + url)}`
    : "";

  app.innerHTML = `
    <section class="detail">
      <div>
        ${imageHtml(item, "detail-image")}
      </div>
      <article class="detail-panel">
        <p class="eyebrow">Fiche tableau</p>
        <h2>${escapeHtml(item.titre)}</h2>
        <p class="meta">${escapeHtml(item.artiste)}</p>
        <p class="description">${escapeHtml(item.description)}</p>
        <div class="price">${escapeHtml(item.prix)}</div>
        <span class="status${item.disponible ? "" : " sold"}">${item.disponible ? "Disponible" : "Vendu"}</span>
        <div class="spec-list">
          <div class="spec"><span>Dimensions</span><strong>${escapeHtml(item.dimensions)}</strong></div>
          <div class="spec"><span>Technique</span><strong>${escapeHtml(item.technique)}</strong></div>
          <div class="spec"><span>Année</span><strong>${escapeHtml(item.annee)}</strong></div>
          <div class="spec"><span>URL QR code</span><strong>${escapeHtml(url)}</strong></div>
        </div>
        <div class="actions">
          ${whatsappLink ? `<a class="button primary" href="${whatsappLink}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
          <a class="button" href="${mailLink}">Email</a>
          <a class="button" href="/" data-link>Retour galerie</a>
        </div>
      </article>
    </section>
  `;
}

function renderQrCodes() {
  const items = catalogue.tableaux;
  app.innerHTML = `
    <section class="qr-panel">
      <p class="eyebrow">Maintenance</p>
      <h2>QR codes</h2>
      <p class="description">Ces QR codes ouvrent directement les fiches publiques. Ils utilisent uniquement l'id stable de chaque tableau, par exemple <strong>/tableau/001</strong>. Ne change pas les ids après impression.</p>
    </section>
    <section class="qr-grid" style="margin-top:18px">
      ${items.map(qrHtml).join("")}
    </section>
  `;
}

function qrHtml(item) {
  const url = absoluteUrl(`/tableau/${item.id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&data=${encodeURIComponent(url)}`;
  return `
    <article class="qr-item">
      <a href="${qrUrl}" target="_blank" rel="noopener" download>
        <img src="${qrUrl}" alt="QR code ${escapeHtml(item.titre)}" />
      </a>
      <div>
        <h3>${escapeHtml(item.titre)}</h3>
        <p class="url">${escapeHtml(url)}</p>
        <div class="actions">
          <a class="button" href="/tableau/${encodeURIComponent(item.id)}" data-link>Tester la fiche</a>
          <a class="button primary" href="${qrUrl}" target="_blank" rel="noopener">Télécharger</a>
        </div>
      </div>
    </article>
  `;
}

function renderAdminEditor() {
  app.innerHTML = `
    <section class="qr-panel">
      <p class="eyebrow">Administration</p>
      <h2>Éditeur du catalogue</h2>
      <p class="description">Modifie les tableaux puis enregistre. La sauvegarde pousse le JSON dans GitHub via une fonction Netlify sécurisée.</p>
      <form class="admin-form" id="adminForm">
        <div class="form-grid">
          <label>Nom de la galerie<input class="field" name="siteNom" value="${escapeAttr(catalogue.site.nom)}" /></label>
          <label>Email<input class="field" name="siteEmail" value="${escapeAttr(catalogue.site.email)}" /></label>
          <label>WhatsApp<input class="field" name="siteWhatsapp" value="${escapeAttr(catalogue.site.whatsapp)}" /></label>
          <label>Mot de passe sauvegarde<input class="field" name="password" type="password" autocomplete="current-password" required /></label>
        </div>
        <div class="actions">
          <button class="button" type="button" id="addPaintingBtn">Ajouter un tableau</button>
          <button class="button primary" type="submit">Enregistrer sur GitHub</button>
        </div>
        <div id="adminStatus" class="admin-status" role="status"></div>
        <section id="paintingsEditor" class="editor-list">
          ${catalogue.tableaux.map(editorItemHtml).join("")}
        </section>
      </form>
    </section>
  `;

  document.getElementById("addPaintingBtn").addEventListener("click", addEditorItem);
  document.getElementById("adminForm").addEventListener("submit", submitCatalogue);
  document.getElementById("paintingsEditor").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-editor-item]");
    if (!button) return;
    const item = button.closest(".editor-item");
    if (item) item.remove();
  });
}

function editorItemHtml(item = {}) {
  return `
    <article class="editor-item">
      <div class="form-grid">
        <label>ID stable<input class="field" name="id" value="${escapeAttr(item.id || "")}" required /></label>
        <label>Titre<input class="field" name="titre" value="${escapeAttr(item.titre || "")}" required /></label>
        <label>Artiste<input class="field" name="artiste" value="${escapeAttr(item.artiste || "")}" /></label>
        <label>Prix<input class="field" name="prix" value="${escapeAttr(item.prix || "")}" /></label>
        <label>Dimensions<input class="field" name="dimensions" value="${escapeAttr(item.dimensions || "")}" /></label>
        <label>Technique<input class="field" name="technique" value="${escapeAttr(item.technique || "")}" /></label>
        <label>Année<input class="field" name="annee" value="${escapeAttr(item.annee || "")}" /></label>
        <label>Image URL<input class="field" name="image" value="${escapeAttr(item.image || "")}" /></label>
        <label>Disponible<select class="field" name="disponible"><option value="true"${item.disponible !== false ? " selected" : ""}>Oui</option><option value="false"${item.disponible === false ? " selected" : ""}>Non</option></select></label>
      </div>
      <label>Description<textarea class="field textarea" name="description">${escapeHtml(item.description || "")}</textarea></label>
      <div class="actions">
        <button class="button" type="button" data-remove-editor-item>Supprimer</button>
      </div>
    </article>
  `;
}

function addEditorItem() {
  const nextId = String(document.querySelectorAll(".editor-item").length + 1).padStart(3, "0");
  document.getElementById("paintingsEditor").insertAdjacentHTML("beforeend", editorItemHtml({ id: nextId, disponible: true }));
}

async function submitCatalogue(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById("adminStatus");
  const payload = collectAdminCatalogue(form);
  status.textContent = "Sauvegarde en cours…";
  try {
    const response = await fetch("/.netlify/functions/save-catalogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Sauvegarde impossible");
    catalogue = normalizeCatalogue(payload.catalogue);
    status.textContent = "Catalogue sauvegardé sur GitHub.";
  } catch (error) {
    status.textContent = error && error.message ? error.message : "Erreur inconnue.";
  }
}

function collectAdminCatalogue(form) {
  const data = new FormData(form);
  const tableaux = [...document.querySelectorAll(".editor-item")].map((item) => {
    const values = {};
    item.querySelectorAll("[name]").forEach((field) => {
      values[field.name] = field.value.trim();
    });
    return {
      id: slugify(values.id),
      titre: values.titre,
      artiste: values.artiste,
      description: values.description,
      prix: values.prix,
      dimensions: values.dimensions,
      technique: values.technique,
      annee: values.annee,
      image: values.image,
      disponible: values.disponible !== "false"
    };
  }).filter((item) => item.id && item.titre);

  return {
    password: String(data.get("password") || ""),
    catalogue: {
      site: {
        nom: String(data.get("siteNom") || "").trim(),
        accroche: "",
        email: String(data.get("siteEmail") || "").trim(),
        whatsapp: String(data.get("siteWhatsapp") || "").trim()
      },
      tableaux
    }
  };
}

function imageHtml(item, className) {
  if (!item.image) return `<div class="${className}" role="img" aria-label="Image à compléter"></div>`;
  return `<img class="${className}" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.titre)}" loading="lazy" />`;
}

function renderLoading() {
  app.innerHTML = `<div class="empty">Chargement du catalogue…</div>`;
}

function renderError(title, detail) {
  app.innerHTML = `
    <section class="error">
      <p class="eyebrow">Erreur</p>
      <h2>${escapeHtml(title)}</h2>
      <p class="description">${escapeHtml(detail)}</p>
      <div class="actions">
        <a class="button" href="/" data-link>Retour accueil</a>
      </div>
    </section>
  `;
}

function onNavigate(event) {
  const link = event.target.closest("a[data-link]");
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;
  event.preventDefault();
  window.history.pushState({}, "", url.pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderRoute();
}

function absoluteUrl(path) {
  return new URL(path, window.location.origin).href;
}

function normalizePath(path) {
  const clean = path.replace(/\/+$/, "");
  return clean || "/";
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

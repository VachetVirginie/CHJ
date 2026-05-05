const REQUIRED_ENV = [
  "GITHUB_TOKEN",
  "GITHUB_OWNER",
  "GITHUB_REPO",
  "GITHUB_BRANCH",
  "GITHUB_JSON_PATH",
  "ADMIN_SAVE_PASSWORD"
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Méthode non autorisée" });
  }

  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    return jsonResponse(500, { error: "Variables Netlify manquantes: " + missing.join(", ") });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "JSON invalide" });
  }

  if (!body.password || body.password !== process.env.ADMIN_SAVE_PASSWORD) {
    return jsonResponse(401, { error: "Mot de passe incorrect" });
  }

  const catalogue = sanitizeCatalogue(body.catalogue);
  if (!catalogue.tableaux.length) {
    return jsonResponse(400, { error: "Le catalogue doit contenir au moins un tableau" });
  }

  try {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH;
    const path = process.env.GITHUB_JSON_PATH;
    const token = process.env.GITHUB_TOKEN;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponentPath(path)}`;

    const current = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: githubHeaders(token)
    });

    let sha = null;
    if (current.ok) {
      const currentJson = await current.json();
      sha = currentJson.sha || null;
    } else if (current.status !== 404) {
      const detail = await current.text();
      return jsonResponse(current.status, { error: "Lecture GitHub impossible", detail });
    }

    const content = JSON.stringify(catalogue, null, 2) + "\n";
    const payload = {
      message: "Update painting catalogue",
      content: Buffer.from(content, "utf8").toString("base64"),
      branch
    };
    if (sha) payload.sha = sha;

    const saved = await fetch(apiUrl, {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify(payload)
    });

    const savedJson = await saved.json().catch(() => ({}));
    if (!saved.ok) {
      return jsonResponse(saved.status, { error: "Écriture GitHub impossible", detail: savedJson });
    }

    return jsonResponse(200, {
      ok: true,
      commit: savedJson.commit && savedJson.commit.html_url ? savedJson.commit.html_url : null
    });
  } catch (error) {
    return jsonResponse(500, { error: error && error.message ? error.message : "Erreur serveur" });
  }
};

function sanitizeCatalogue(value) {
  const site = value && value.site ? value.site : {};
  const tableaux = Array.isArray(value && value.tableaux) ? value.tableaux : [];
  const seen = new Set();
  return {
    site: {
      nom: clean(site.nom),
      accroche: clean(site.accroche),
      email: clean(site.email),
      whatsapp: clean(site.whatsapp)
    },
    tableaux: tableaux.map((item) => {
      const id = slugify(item && item.id);
      if (!id || seen.has(id)) return null;
      seen.add(id);
      return {
        id,
        titre: clean(item.titre),
        artiste: clean(item.artiste),
        description: clean(item.description),
        prix: clean(item.prix),
        dimensions: clean(item.dimensions),
        technique: clean(item.technique),
        annee: clean(item.annee),
        image: clean(item.image),
        disponible: item.disponible !== false
      };
    }).filter((item) => item && item.titre)
  };
}

function clean(value) {
  return String(value || "").trim();
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

function githubHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "galerie-tableaux-admin"
  };
}

function encodeURIComponentPath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

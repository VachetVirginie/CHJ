const REQUIRED_ENV = [
  "GITHUB_TOKEN",
  "GITHUB_OWNER",
  "GITHUB_REPO",
  "GITHUB_BRANCH",
  "ADMIN_SAVE_PASSWORD"
];

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Méthode non autorisée" });
  }

  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    return jsonResponse(500, { error: "Variables Netlify manquantes: " + missing.join(", ") });
  }

  if (!event.body) {
    return jsonResponse(400, { error: "Image manquante" });
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

  const id = slugify(body.id);
  const contentType = String(body.contentType || "").toLowerCase();
  const dataUrl = String(body.dataUrl || "");

  if (!id) return jsonResponse(400, { error: "ID du tableau manquant" });
  if (!ALLOWED_TYPES.has(contentType)) return jsonResponse(400, { error: "Format image non accepté" });

  const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() : dataUrl;
  if (!base64 || !/^[a-z0-9+/=\s]+$/i.test(base64)) {
    return jsonResponse(400, { error: "Contenu image invalide" });
  }
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) return jsonResponse(400, { error: "Image vide" });
  if (buffer.length > MAX_IMAGE_BYTES) return jsonResponse(400, { error: "Image trop lourde, maximum 4 Mo" });

  try {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH;
    const token = process.env.GITHUB_TOKEN;
    const imagesPath = cleanPath(process.env.GITHUB_IMAGES_PATH || "images");
    const extension = extensionFromContentType(contentType);
    const path = `${imagesPath}/${id}.${extension}`;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponentPath(path)}`;

    const current = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: githubHeaders(token)
    });

    let sha = null;
    if (current.ok) {
      const currentJson = await current.json();
      sha = currentJson.sha || null;
    } else if (current.status !== 404) {
      const detail = await readResponseDetail(current);
      return jsonResponse(current.status, { error: "Lecture GitHub impossible", detail });
    }

    const payload = {
      message: `Upload image ${id}`,
      content: buffer.toString("base64"),
      branch
    };
    if (sha) payload.sha = sha;

    const saved = await fetch(apiUrl, {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify(payload)
    });

    const savedJson = await saved.json().catch(() => null);
    if (!saved.ok) {
      return jsonResponse(saved.status, { error: "Écriture GitHub impossible", detail: savedJson || "Réponse GitHub illisible" });
    }

    return jsonResponse(200, {
      ok: true,
      path,
      url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      commit: savedJson.commit && savedJson.commit.html_url ? savedJson.commit.html_url : null
    });
  } catch (error) {
    console.error("upload-image error", error);
    return jsonResponse(500, {
      error: "Erreur serveur upload-image",
      detail: error && error.message ? error.message : "Erreur inconnue"
    });
  }
};

function extensionFromContentType(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
}

function cleanPath(value) {
  return String(value || "images").replace(/^\/+|\/+$/g, "") || "images";
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

async function readResponseDetail(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

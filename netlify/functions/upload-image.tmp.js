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

  try {
    const form = parseMultipartForm(event);
    const password = stringField(form.fields.password);
    const id = slugify(form.fields.id);
    const image = form.files.image;

    if (!password || password !== process.env.ADMIN_SAVE_PASSWORD) {
      return jsonResponse(401, { error: "Mot de passe incorrect" });
    }

    if (!id) return jsonResponse(400, { error: "ID du tableau manquant" });
    if (!image) return jsonResponse(400, { error: "Image manquante" });
    if (!ALLOWED_TYPES.has(image.contentType)) return jsonResponse(400, { error: "Format image non accepté" });
    if (!image.buffer.length) return jsonResponse(400, { error: "Image vide" });
    if (image.buffer.length > MAX_IMAGE_BYTES) return jsonResponse(400, { error: "Image trop lourde, maximum 4 Mo" });

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH;
    const token = process.env.GITHUB_TOKEN;
    const imagesPath = cleanPath(process.env.GITHUB_IMAGES_PATH || "images");
    const extension = extensionFromContentType(image.contentType);
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
      content: image.buffer.toString("base64"),
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

function parseMultipartForm(event) {
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:(?:\"([^\"]+)\")|([^;]+))/i);
  if (!boundaryMatch) throw new Error("Boundary multipart introuvable");

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const body = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "binary");
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = {};
  let start = body.indexOf(delimiter);

  while (start !== -1) {
    start += delimiter.length;
    if (body[start] === 45 && body[start + 1] === 45) break;
    if (body[start] === 13 && body[start + 1] === 10) start += 2;

    const next = body.indexOf(delimiter, start);
    if (next === -1) break;

    let part = body.slice(start, next);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.slice(0, -2);
    }

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd !== -1) {
      const rawHeaders = part.slice(0, headerEnd).toString("utf8");
      const content = part.slice(headerEnd + 4);
      const disposition = rawHeaders.match(/content-disposition:\s*form-data;([^\r\n]+)/i);
      const nameMatch = disposition && disposition[1].match(/name="([^"]+)"/i);
      const filenameMatch = disposition && disposition[1].match(/filename="([^"]*)"/i);
      const typeMatch = rawHeaders.match(/content-type:\s*([^\r\n]+)/i);
      const name = nameMatch && nameMatch[1];

      if (name && filenameMatch) {
        files[name] = {
          filename: filenameMatch[1],
          contentType: String(typeMatch && typeMatch[1] ? typeMatch[1] : "application/octet-stream").toLowerCase(),
          buffer: content
        };
      } else if (name) {
        fields[name] = content.toString("utf8");
      }
    }

    start = next;
  }

  return { fields, files };
}

function stringField(value) {
  return String(value || "").trim();
}

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

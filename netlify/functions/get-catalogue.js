exports.handler = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.GITHUB_JSON_PATH;
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo || !branch || !path || !token) {
    return jsonResponse(500, { error: "Variables GitHub manquantes" });
  }

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(branch)}`;
    const response = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "galerie-tableaux-admin",
        "Cache-Control": "no-store"
      }
    });
    if (!response.ok) return jsonResponse(response.status, { error: "Catalogue introuvable" });
    const file = await response.json();
    const content = Buffer.from(String(file.content || ""), "base64").toString("utf8");
    const catalogue = JSON.parse(content);
    return jsonResponse(200, catalogue);
  } catch (error) {
    return jsonResponse(500, { error: error && error.message ? error.message : "Erreur serveur" });
  }
};

function encodeURIComponentPath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0"
    },
    body: JSON.stringify(body)
  };
}

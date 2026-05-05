exports.handler = async () => {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.GITHUB_JSON_PATH;

  if (!owner || !repo || !branch || !path) {
    return jsonResponse(500, { error: "Variables GitHub manquantes" });
  }

  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    const response = await fetch(rawUrl, { headers: { "Accept": "application/json" } });
    if (!response.ok) return jsonResponse(response.status, { error: "Catalogue introuvable" });
    const catalogue = await response.json();
    return jsonResponse(200, catalogue);
  } catch (error) {
    return jsonResponse(500, { error: error && error.message ? error.message : "Erreur serveur" });
  }
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

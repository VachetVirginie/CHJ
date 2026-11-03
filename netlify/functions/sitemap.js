exports.handler = async (event) => {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;
  const path = process.env.GITHUB_JSON_PATH;
  const token = process.env.GITHUB_TOKEN;

  const host = event.headers["x-forwarded-host"] || event.headers.host || "";
  const proto = event.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${host}`;

  let tableaux = [];
  if (owner && repo && branch && path && token) {
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
      if (response.ok) {
        const file = await response.json();
        const catalogue = JSON.parse(Buffer.from(String(file.content || ""), "base64").toString("utf8"));
        tableaux = Array.isArray(catalogue.tableaux) ? catalogue.tableaux : [];
      }
    } catch (error) {
      tableaux = [];
    }
  }

  const urls = ["/"]
    .concat(
      tableaux
        .map((item) => slugify(item.id || item.titre))
        .filter(Boolean)
        .map((id) => `/tableau/${id}`)
    );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(origin + u)}</loc></url>`).join("\n")}
</urlset>
`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    },
    body: xml
  };
};

function encodeURIComponentPath(path) {
  return String(path).split("/").map(encodeURIComponent).join("/");
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

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

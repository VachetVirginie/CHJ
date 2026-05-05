exports.handler = async (event) => {
  return {
    statusCode: 410,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Fonction temporaire désactivée. Utilise upload-image.js." })
  };
};

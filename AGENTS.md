# Galerie Charles H Jaillard

Site statique (Netlify) : `index.html` + `app.js` (SPA vanilla) + `styles.css`. Pas de build (`netlify.toml` : `publish = "."`).

## Dev

- Serveur local : `npm run dev` (ou `python3 server.py`) → http://localhost:8888
- En local, `/.netlify/functions/get-catalogue` 404 → fallback sur `data/tableaux.example.json` (normal).
- Audit Lighthouse : `npx -y lighthouse@12 http://localhost:8888/ --chrome-flags="--headless=new --no-sandbox" --quiet`

## Images

- Le catalogue référence les images en `raw.githubusercontent.com/...`; `app.js` (`siteImagePath`) les réécrit en URLs same-origin `/images/...` servies par le site, avec fallback `onerror` vers l'URL distante.
- Miniatures 800px dans `images/thumbs/` (`<base>-800.avif` + `-800.jpg`, plus `ch-1200.*`). Régénérer après ajout d'images :

```bash
cd images
for f in *.jpg; do
  base="${f%.jpg}"
  sips -Z 800 -s format jpeg -s formatOptions 60 "$f" --out "thumbs/${base}-800.jpg"
  sips -Z 800 -s format avif -s formatOptions 45 "$f" --out "thumbs/${base}-800.avif"
  sips -Z 1200 -s format avif -s formatOptions 45 "$f" --out "thumbs/${base}-1200.avif"
done
```

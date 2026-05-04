# Galerie de tableaux

Site statique pour présenter des tableaux avec des fiches accessibles par QR code.

## Principe

- Les QR codes pointent vers des IDs stables.
- Exemple : `/tableau/001`, `/tableau/002`, `/tableau/003`.
- Tu peux changer le titre, le prix, le texte et l'image dans le JSON.
- Ne change pas le champ `id` après avoir imprimé un QR code.

## Page admin QR codes

La page existe, mais elle n'est plus affichée dans le site public.
En ligne sur Netlify, elle est protégée par Basic Auth via le fichier `_headers`.

En local :

```text
http://localhost:8888/admin-qr
```

En ligne :

```text
https://ton-site.netlify.app/admin-qr
```

Identifiants par défaut :

```text
admin
change-moi
```

Change le mot de passe dans `_headers` avant de mettre le site en ligne :

```text
/admin-qr
  Basic-Auth: admin:ton-mot-de-passe
```

## Format du JSON

```json
{
  "site": {
    "nom": "Galerie Atelier",
    "accroche": "Œuvres originales, fiches détaillées et accès direct par QR code.",
    "email": "contact@example.com",
    "whatsapp": "33600000000"
  },
  "tableaux": [
    {
      "id": "001",
      "titre": "Soleil Bleu",
      "artiste": "Marie Dupont",
      "description": "Peinture acrylique originale sur toile.",
      "prix": "450 €",
      "dimensions": "60 × 80 cm",
      "technique": "Acrylique sur toile",
      "annee": "2025",
      "image": "https://raw.githubusercontent.com/UTILISATEUR/REPO/main/images/001.jpg",
      "disponible": true
    }
  ]
}
```

## JSON sur GitHub

Dans `app.js`, remplace `dataUrl` :

```js
const CONFIG = {
  dataUrl: "https://raw.githubusercontent.com/UTILISATEUR/REPO/main/tableaux.json",
  adminQrPath: "/admin-qr"
};
```

## Relancer le serveur local

Si le serveur tourne déjà, arrête-le dans le terminal avec `Ctrl + C`.

Puis relance :

```bash
npm run dev
```

Ouvre :

```text
http://localhost:8888
```

## Déployer sur Netlify

Si Netlify est connecté à GitHub :

```bash
git add .
git commit -m "Update gallery"
git push
```

Netlify relancera le déploiement automatiquement.

Si tu déploies manuellement :

- Va dans Netlify.
- Ouvre ton site.
- Va dans `Deploys`.
- Clique sur `Trigger deploy`.
- Choisis `Deploy site`.

## Configuration Netlify

Le fichier `netlify.toml` sert ces routes :

```text
/tableau/001
/admin-qr
```
# CHJ

# Galerie de tableaux

Site statique Netlify pour présenter des tableaux, générer des QR codes et modifier le catalogue depuis un formulaire admin qui pousse le JSON sur GitHub.

## URLs

```text
/                  Galerie publique
/tableau/001       Fiche publique d'un tableau
/chj               Espace de gestion
/chj/qr            Génération des QR codes
/chj/editeur       Formulaire admin qui sauvegarde sur GitHub
```

## Principe des QR codes

- Les QR codes pointent vers des IDs stables.
- Exemple : `/tableau/001`, `/tableau/002`, `/tableau/003`.
- Tu peux changer le titre, le prix, le texte et l'image.
- Ne change pas le champ `id` après avoir imprimé un QR code.

## Admin

Les pages admin sont protégées par `_headers` sur Netlify :

```text
/chj
  Basic-Auth: admin:change-moi

/chj/*
  Basic-Auth: admin:change-moi
```

Change `change-moi` avant de mettre en ligne.

## Sauvegarde GitHub

Le formulaire `/chj/editeur` appelle :

```text
/.netlify/functions/save-catalogue
```

Cette fonction commit le JSON dans GitHub avec l'API GitHub.

## Variables Netlify obligatoires

Dans Netlify, ajoute ces variables dans `Site configuration > Environment variables` :

```text
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BRANCH
GITHUB_JSON_PATH
GITHUB_IMAGES_PATH
ADMIN_SAVE_PASSWORD
```

Exemple :

```text
GITHUB_OWNER=ton-compte
GITHUB_REPO=galerie-tableaux
GITHUB_BRANCH=main
GITHUB_JSON_PATH=data/tableaux.example.json
GITHUB_IMAGES_PATH=images
ADMIN_SAVE_PASSWORD=mot-de-passe-sauvegarde
```

## Token GitHub

Crée un token GitHub avec le droit d'écriture sur le dépôt.

Pour un fine-grained token :

- Repository access : le dépôt du catalogue
- Permissions > Contents : Read and write

Ne mets jamais le token dans le code. Il doit être uniquement dans les variables Netlify.

## Images

Dans `/chj/editeur`, chaque tableau permet d'importer une image vers GitHub.

Quand une image est importée, elle est commitée dans le dossier configuré par :

```text
GITHUB_IMAGES_PATH=images
```

Puis l'image est enregistrée avec une URL du type :

```text
https://raw.githubusercontent.com/UTILISATEUR/REPO/main/images/001.jpg
```

Après l'import, clique sur `Enregistrer` pour sauvegarder cette URL dans le JSON.

Formats acceptés :

- jpg
- png
- webp
- gif

Taille maximum :

```text
4 Mo
```

## Format du JSON

```json
{
  "site": {
    "nom": "Gallerie Charles H Jaillard",
    "accroche": "",
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

## Local

Le serveur Python sert les routes propres mais ne simule pas les fonctions Netlify.

```bash
npm run dev
```

Pour tester les fonctions Netlify en local, utilise plutôt Netlify CLI :

```bash
netlify dev
```

## Déploiement Netlify

Paramètres :

```text
Build command: vide
Publish directory: .
```

Si le site est connecté à GitHub :

```bash
git add .
git commit -m "Update gallery"
git push
```

Netlify redéploie automatiquement.

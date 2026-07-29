# Liste d'attente — Julie Vasquez, psychologue

Formulaire public d'inscription sur liste d'attente. Chaque inscription ajoute
une ligne dans une feuille Google, qui sert de backoffice.

Aucune dépendance, aucune étape de build. Le site est un unique fichier HTML.

## Composition

| Chemin | Rôle |
|---|---|
| `public/index.html` | Le site entier : contenu, styles, formulaire, logique d'envoi. C'est le seul fichier publié. |
| `apps-script/Code.gs` | Le script Google qui reçoit les inscriptions et écrit dans la feuille. |
| `apps-script/verif-locale.cjs` | Vérifie `Code.gs` sans compte Google, en simulant les API Google. |
| `docs/superpowers/` | Spec et plan d'implémentation. |

L'URL du script Google est inscrite en clair dans `public/index.html`, dans la
variable `URL_SCRIPT` au début du `<script>`.

## Consulter les inscriptions

Ouvrir la feuille Google « Liste d'attente », onglet `Inscriptions`. Une ligne
par personne, la plus récente en bas. Les colonnes sont figées et le téléphone
est stocké en texte pour préserver son zéro initial.

## Modifier le texte de la page

Tout le contenu est en clair dans `public/index.html`, dans les balises `<p>` et
`<label>`. Éditer, prévisualiser, puis redéployer.

Prévisualiser en local :

```bash
python3 -m http.server 8080 --directory public
```

Puis ouvrir http://localhost:8080.

## Redéployer la page

```bash
npx wrangler pages deploy public --project-name=list
```

La première fois, il faut s'authentifier avec `npx wrangler login`.

## Modifier le script Google

1. Feuille → **Extensions → Apps Script**
2. Coller le nouveau `Code.gs`, enregistrer
3. **Déployer → Gérer les déploiements → crayon → Version : Nouvelle version → Déployer**

Sans cette troisième étape, la modification n'a **aucun effet** sur le site : un
simple enregistrement ne met pas à jour l'application web.

Réglages du déploiement à ne pas changer : « Exécuter en tant que : moi » et
« Qui a accès : **Tout le monde** ». Si l'accès repasse à autre chose, le site
reçoit un `403` et aucune inscription n'arrive.

## Vérifier le script sans passer par Google

```bash
node apps-script/verif-locale.cjs
```

Exécute les six cas de `testDoPost` (formulaire complet, champs manquants, mail
invalide, case non cochée, honeypot) et six contrôles sur la ligne écrite. Sort
en code 1 si un contrôle échoue.

Pour tester en conditions réelles contre le script déployé, remplacer `<URL>` par
la valeur de `URL_SCRIPT` :

```bash
curl -sL "<URL>" -H "Content-Type: text/plain;charset=utf-8" -d '{"nom":"Test","prenom":"Curl","telephone":"0600000000","email":"test@example.com","disponibilites":"Jeudi","fonctionnementLu":true}'
```

Attendu : `{"ok":true}`. Ne pas ajouter `-X POST` : curl forcerait la méthode
POST sur la redirection que renvoie Apps Script, laquelle n'accepte que des GET,
et la réponse serait une page « Page introuvable » trompeuse.

## Limites connues

L'URL du script est publique : quelqu'un qui la découvre peut y poster des
lignes. Un champ piège invisible écarte les robots basiques. Si du spam
apparaît, la parade est d'ajouter un jeton partagé entre la page et le script.

La page est en `noindex` : elle ne ressort pas sur les moteurs de recherche, son
URL se communique de la main à la main.

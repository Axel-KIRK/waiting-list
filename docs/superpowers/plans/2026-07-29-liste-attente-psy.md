# Formulaire de liste d'attente — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une page publique où une personne s'inscrit sur la liste d'attente d'une psychologue, chaque inscription atterrissant comme une ligne dans une feuille Google qui sert aussi de backoffice en lecture.

**Architecture:** Un fichier HTML statique autonome (`public/index.html`, CSS et JS inclus) publié sur Cloudflare Pages. Il envoie un POST JSON à un Google Apps Script (`apps-script/Code.gs`) déployé en Web App publique, qui valide et appelle `appendRow` sur la feuille. Aucun serveur, aucun build, aucune dépendance.

**Tech Stack:** HTML5, CSS, JavaScript ES2020 sans framework. Google Apps Script (V8). Cloudflare Pages via `wrangler`. Python `http.server` pour la prévisualisation locale.

**Spec :** `docs/superpowers/specs/2026-07-29-liste-attente-psy-design.md`

## Global Constraints

Ces règles s'appliquent à toutes les tâches.

- Zéro dépendance runtime, zéro étape de build, zéro framework. Pas de `package.json` autre que celui éventuellement requis par `wrangler` en dev.
- `public/` est la racine publiée sur Cloudflare Pages. Rien d'autre que le site n'y entre — ni spec, ni script Google, ni README.
- Le texte éditorial est repris **verbatim** de la section « Contenu éditorial » du spec. Aucune réécriture, aucune correction de style.
- Français typographique : accents et cédilles obligatoires, apostrophes courbes (`'`) dans le contenu affiché, espace insécable avant `?` et `:` là où le spec en met.
- Le POST part obligatoirement en `Content-Type: text/plain;charset=utf-8` avec `redirect: "follow"`. **Jamais** `mode: "no-cors"` : la réponse deviendrait illisible.
- Téléphone affiché : `06 60 61 09 08`, lien `tel:+33660610908`.
- Deux jetons littéraux restent dans le code jusqu'à la tâche 5 : `{{EMAIL}}` et `{{URL_APPS_SCRIPT}}`. La mise en ligne est bloquée tant que `grep -F '{{' public/index.html` retourne quelque chose.
- Mobile-first : aucun débordement horizontal à 375px de large, cibles tactiles de 44px minimum, taille de corps 17px minimum.
- Hors périmètre, ne rien ajouter : bandeau cookies, mention RGPD, email automatique, page d'administration, analytics, détection de doublons.
- Aucun framework de test dans ce projet. Chaque tâche se termine par des vérifications manuelles dont la commande exacte et le résultat attendu sont donnés.
- Commits en français, préfixés `feat:`, `docs:` ou `fix:`, terminés par `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## File Structure

| Fichier | Responsabilité |
|---|---|
| `public/index.html` | Le site entier : structure, styles, contenu éditorial, formulaire, logique d'envoi. Un seul fichier assumé — il n'y a qu'une page et découper en trois fichiers pour 400 lignes ajouterait des requêtes sans rien clarifier. |
| `apps-script/Code.gs` | Réception du POST, validation serveur, filtre honeypot, écriture dans la feuille. Plus la fonction `testDoPost` exécutable depuis l'éditeur Apps Script. |
| `README.md` | Procédure de déploiement (feuille, script, Cloudflare) et procédure de modification du contenu. |

---

### Task 1: Squelette et contenu éditorial

**Files:**
- Create: `public/index.html`

**Interfaces:**
- Consumes: rien.
- Produces: la structure DOM et les variables CSS que les tâches 2 et 4 réutilisent. Identifiants figés ici : `<main>` conteneur unique, classe `.encart` pour les blocs mis en retrait, variables CSS `--fond`, `--fond-encart`, `--texte`, `--texte-doux`, `--accent`, `--accent-fonce`, `--bordure`, `--erreur`.

- [ ] **Step 1: Créer `public/index.html` avec la base et le contenu**

`meta robots noindex` est volontaire : la page porte un numéro de téléphone personnel et son URL est communiquée de la main à la main, elle n'a pas à ressortir sur un moteur de recherche.

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Liste d'attente — Julie Vasquez, psychologue</title>
<style>
:root {
  --fond: #fbf9f6;
  --fond-encart: #f2efe9;
  --texte: #2e2a26;
  --texte-doux: #6b635a;
  --accent: #5f7a63;
  --accent-fonce: #4a6350;
  --bordure: #ddd6ca;
  --erreur: #a04a3c;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 2.5rem 1.25rem 4rem;
  background: var(--fond);
  color: var(--texte);
  font: 400 17px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-text-size-adjust: 100%;
}
main { max-width: 640px; margin: 0 auto; }
h1 {
  font: 400 1.7rem/1.3 ui-serif, Georgia, "Times New Roman", serif;
  margin: 0 0 0.35rem;
}
.sous-titre {
  margin: 0 0 2rem;
  color: var(--texte-doux);
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}
p { margin: 0 0 1.15rem; }
a { color: var(--accent-fonce); }
.encart {
  background: var(--fond-encart);
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
  padding: 1.15rem 1.25rem;
  margin: 0 0 2rem;
}
.encart p:last-child { margin-bottom: 0; }
.encart strong { font-weight: 600; }
.signature {
  margin-top: 2.5rem;
  color: var(--texte-doux);
  font: 400 1.05rem/1.5 ui-serif, Georgia, "Times New Roman", serif;
}
@media (min-width: 700px) {
  body { padding-top: 4rem; }
  h1 { font-size: 2rem; }
}
</style>
</head>
<body>
<main>

<h1>Liste d'attente</h1>
<p class="sous-titre">Julie Vasquez, psychologue</p>

<p>Merci pour votre demande de rendez-vous. Actuellement, mon agenda est complet et le délai d'attente pour un premier rendez-vous est d'environ 2 mois. Si vous souhaitez être inscrit(e) sur la liste d'attente, merci de compléter ce formulaire qui me permettra de vous recontacter au plus vite pour vous proposer un rdv correspondant à vos disponibilités.</p>

<div class="encart">
<p>Si vous souhaitez échanger par téléphone avant de vous inscrire sur liste d'attente ou avant un premier rendez-vous, je suis joignable par téléphone <strong>tous les lundis de 11 h à 21 h</strong>. C'est un temps que je réserve aux appels, donc n'hésitez pas à me contacter sur ce créneau si vous en ressentez le besoin. Vous pouvez aussi m'envoyer un mail.</p>
<p><a href="tel:+33660610908">06 60 61 09 08</a> — <a href="mailto:{{EMAIL}}">{{EMAIL}}</a></p>
</div>

<p class="signature">À bientôt,<br>Julie Vasquez</p>

</main>
</body>
</html>
```

- [ ] **Step 2: Lancer la prévisualisation locale**

```bash
python3 -m http.server 8080 --directory public
```

Laisser tourner pendant toutes les tâches 1 à 4. Ouvrir `http://localhost:8080`.

- [ ] **Step 3: Vérifier le rendu en 375px de large**

Ouvrir la page dans un navigateur redimensionné à 375px et contrôler les quatre points suivants :

1. Aucune barre de défilement horizontale.
2. Le titre, le paragraphe d'accueil, l'encart et la signature apparaissent dans cet ordre.
3. Le numéro `06 60 61 09 08` est cliquable.
4. Tous les accents s'affichent correctement (« délai », « à bientôt », « créneau »), pas de losange noir ni de `Ã©`.

Attendu : les quatre points passent. Si les accents sont cassés, c'est que le fichier n'est pas enregistré en UTF-8.

- [ ] **Step 4: Vérifier que les jetons sont bien encore présents**

```bash
grep -c -F '{{EMAIL}}' public/index.html
```

Attendu : `2` — une fois dans le `href` du `mailto:`, une fois dans le texte du lien.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: page de liste d'attente, structure et contenu éditorial

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Le formulaire

**Files:**
- Modify: `public/index.html` — ajouter les styles du formulaire dans le `<style>` existant, et le balisage entre l'encart de contact et la signature.

**Interfaces:**
- Consumes: les variables CSS et la structure de la tâche 1.
- Produces: les identifiants DOM que la tâche 4 manipule, et les attributs `name` que la tâche 3 lit côté serveur. **Ces noms sont un contrat, ne pas les renommer :**
  - `<form id="formulaire">`, `<button id="envoyer">`
  - `name` des champs : `nom`, `prenom`, `telephone`, `email`, `orientePar`, `disponibilites`, `raison`, `fonctionnementLu`, et le honeypot `site`
  - conteneurs de message : un `<p class="message-erreur" id="erreur-<name>">` par champ requis, plus `<div id="erreur-envoi">` global et `<div id="confirmation">`

- [ ] **Step 1: Ajouter les styles du formulaire**

À insérer dans le `<style>` existant, juste avant le bloc `@media (min-width: 700px)`.

Le honeypot est déplacé hors de l'écran plutôt que masqué par `display: none`, parce que les bots un peu sérieux ignorent les champs en `display: none`.

```css
form { margin: 0; }
fieldset { border: 0; margin: 0; padding: 0; }
legend {
  font: 400 1.25rem/1.3 ui-serif, Georgia, "Times New Roman", serif;
  padding: 0;
  margin-bottom: 1.25rem;
}
.champ { margin-bottom: 1.6rem; }
.champ > label {
  display: block;
  margin-bottom: 0.45rem;
  font-weight: 600;
  font-size: 0.97rem;
}
.optionnel { font-weight: 400; color: var(--texte-doux); }
input[type="text"], input[type="tel"], input[type="email"], textarea {
  width: 100%;
  min-height: 44px;
  padding: 0.65rem 0.75rem;
  background: #fff;
  border: 1px solid var(--bordure);
  border-radius: 6px;
  color: var(--texte);
  font: inherit;
}
textarea { min-height: 96px; resize: vertical; }
input:focus-visible, textarea:focus-visible, button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.champ-invalide input, .champ-invalide textarea { border-color: var(--erreur); }
.message-erreur {
  display: none;
  margin: 0.4rem 0 0;
  color: var(--erreur);
  font-size: 0.9rem;
}
.champ-invalide .message-erreur { display: block; }
.case { display: flex; gap: 0.7rem; align-items: flex-start; }
.case input {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  margin-top: 2px;
  accent-color: var(--accent);
}
.case label { font-weight: 600; font-size: 0.97rem; }
.honeypot {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}
button {
  width: 100%;
  min-height: 50px;
  padding: 0.8rem 1.5rem;
  background: var(--accent);
  border: 0;
  border-radius: 6px;
  color: #fff;
  font: 600 1.05rem/1 inherit;
  cursor: pointer;
}
button:hover:not(:disabled) { background: var(--accent-fonce); }
button:disabled { opacity: 0.55; cursor: progress; }
#erreur-envoi {
  display: none;
  margin-bottom: 1.25rem;
  padding: 0.9rem 1rem;
  background: #fdf1ef;
  border-left: 3px solid var(--erreur);
  border-radius: 0 6px 6px 0;
  color: var(--erreur);
  font-size: 0.95rem;
}
#erreur-envoi p { margin: 0; }
#confirmation {
  display: none;
  padding: 1.5rem;
  background: var(--fond-encart);
  border-left: 3px solid var(--accent);
  border-radius: 0 6px 6px 0;
}
#confirmation h2 {
  margin: 0 0 0.75rem;
  font: 400 1.35rem/1.3 ui-serif, Georgia, "Times New Roman", serif;
}
#confirmation p:last-child { margin-bottom: 0; }
@media (min-width: 700px) {
  button { width: auto; min-width: 220px; }
}
```

- [ ] **Step 2: Ajouter le balisage du formulaire**

À insérer entre la fermeture de `</div>` de l'encart de contact et le `<p class="signature">`.

Le bloc « fonctionnement » est placé juste avant la case à cocher, conformément au spec : la case doit être cochée après lecture, pas avant.

```html
<form id="formulaire" novalidate>
<fieldset>
<legend>Vos coordonnées</legend>

<div class="champ">
<label for="nom">Nom</label>
<input type="text" id="nom" name="nom" autocomplete="family-name" required>
<p class="message-erreur" id="erreur-nom"></p>
</div>

<div class="champ">
<label for="prenom">Prénom</label>
<input type="text" id="prenom" name="prenom" autocomplete="given-name" required>
<p class="message-erreur" id="erreur-prenom"></p>
</div>

<div class="champ">
<label for="telephone">Numéro de téléphone</label>
<input type="tel" id="telephone" name="telephone" autocomplete="tel" required>
<p class="message-erreur" id="erreur-telephone"></p>
</div>

<div class="champ">
<label for="email">Mail</label>
<input type="email" id="email" name="email" autocomplete="email" required>
<p class="message-erreur" id="erreur-email"></p>
</div>

<div class="champ">
<label for="orientePar">Si vous avez été orienté par un professionnel, une association, un réseau, merci de l'indiquer <span class="optionnel">(facultatif)</span></label>
<input type="text" id="orientePar" name="orientePar">
</div>

<div class="champ honeypot" aria-hidden="true">
<label for="site">Site web</label>
<input type="text" id="site" name="site" tabindex="-1" autocomplete="off">
</div>

</fieldset>

<fieldset>
<legend>Vos disponibilités</legend>

<div class="champ">
<label for="disponibilites">Je consulte les jeudis et vendredis. Sur quels horaires êtes-vous libre ces jours-là pour que je vous contacte dès qu'un créneau qui correspond à vos disponibilités se libère ?</label>
<textarea id="disponibilites" name="disponibilites" required></textarea>
<p class="message-erreur" id="erreur-disponibilites"></p>
</div>

<div class="champ">
<label for="raison">Souhaitez-vous me partager la raison de votre désir de prendre rdv <span class="optionnel">(optionnel)</span></label>
<textarea id="raison" name="raison"></textarea>
</div>

</fieldset>

<fieldset>
<legend>Le fonctionnement</legend>

<div class="encart">
<p>Avez-vous bien lu que la 1<sup>re</sup> séance ou les 1<sup>res</sup> séances sont au cabinet à Paris puis que le suivi est en visio ? Bien sûr il s'agit d'essayer et de voir si cela vous convient. Je n'habite pas toute l'année à Paris, mais j'y reviens régulièrement pour mes consultations, donc nous pourrons faire des séances au cabinet ponctuellement. Si vous habitez loin de Paris ou si vous ne pouvez pas vous déplacer, nous pouvons tout faire en visio même la première séance.</p>
<p>Par ailleurs, la fréquence des psychothérapies que je propose est d'un rdv par semaine.</p>
</div>

<div class="champ">
<div class="case">
<input type="checkbox" id="fonctionnementLu" name="fonctionnementLu" required>
<label for="fonctionnementLu">J'ai bien pris connaissance de ce fonctionnement.</label>
</div>
<p class="message-erreur" id="erreur-fonctionnementLu"></p>
</div>

</fieldset>

<div id="erreur-envoi" role="alert"><p></p></div>

<button type="submit" id="envoyer">M'inscrire sur la liste d'attente</button>
</form>

<div id="confirmation" role="status" tabindex="-1">
<h2>Votre inscription est enregistrée</h2>
<p>Merci. Je vous recontacterai dès qu'un créneau correspondant à vos disponibilités se libère. Le délai est actuellement d'environ 2 mois.</p>
<p>Si vous souhaitez échanger avant, je suis joignable au <a href="tel:+33660610908">06 60 61 09 08</a> tous les lundis de 11 h à 21 h.</p>
</div>
```

- [ ] **Step 3: Vérifier le rendu et l'accessibilité au clavier**

Recharger `http://localhost:8080` et contrôler :

1. Les huit champs visibles apparaissent dans l'ordre du spec, chacun avec son libellé au-dessus.
2. Le bloc « fonctionnement » est bien **au-dessus** de la case à cocher.
3. Le champ « Site web » est invisible.
4. En partant du champ Nom et en appuyant sur Tab de façon répétée, le focus passe par Nom → Prénom → Téléphone → Mail → Orienté par → Disponibilités → Raison → case à cocher → bouton, **sans jamais s'arrêter sur « Site web »**.
5. Cliquer sur le libellé « J'ai bien pris connaissance… » coche la case.
6. `#erreur-envoi` et `#confirmation` sont invisibles.

Attendu : les six points passent. Le point 4 est le plus important — si le focus atteint « Site web », le `tabindex="-1"` manque.

- [ ] **Step 4: Vérifier l'absence de débordement à 375px**

Redimensionner à 375px de large. Attendu : aucune barre horizontale, le bouton occupe toute la largeur, les zones de texte tiennent dans l'écran.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: champs du formulaire, honeypot et bloc de confirmation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Le script Google et son déploiement

Cette tâche contient **trois étapes humaines** (créer la feuille, coller le script, déployer) qui exigent un accès au compte Google du commanditaire. Elles ne peuvent pas être automatisées et doivent être réalisées par la personne qui possède le compte.

**Files:**
- Create: `apps-script/Code.gs`

**Interfaces:**
- Consumes: les attributs `name` du formulaire définis en tâche 2.
- Produces: un endpoint HTTPS acceptant un POST JSON et répondant `{"ok": true}` ou `{"ok": false, "erreur": "<texte>"}`. Son URL est le `{{URL_APPS_SCRIPT}}` que la tâche 4 consomme. Fonctions internes : `doPost(e)`, `valider(donnees) -> string|null`, `feuille() -> Sheet`, `enregistrer(donnees) -> void`, `reponse(objet) -> TextOutput`, `testDoPost() -> void`.

- [ ] **Step 1: Écrire le script avec sa fonction de test**

Créer `apps-script/Code.gs`. La fonction `testDoPost` est le test de cette tâche : elle est écrite avant d'être exécutée, et elle liste ses cas avec leur résultat attendu.

```javascript
var NOM_FEUILLE = 'Inscriptions';

var EN_TETES = [
  "Date d'inscription",
  'Nom',
  'Prénom',
  'Téléphone',
  'Email',
  'Orienté par',
  'Disponibilités',
  'Raison',
  'Fonctionnement lu',
];

var CHAMPS_REQUIS = ['nom', 'prenom', 'telephone', 'email', 'disponibilites'];

function doPost(e) {
  try {
    var donnees = JSON.parse(e.postData.contents);
    if (String(donnees.site || '').trim()) {
      return reponse({ ok: true });
    }
    var erreur = valider(donnees);
    if (erreur) {
      return reponse({ ok: false, erreur: erreur });
    }
    enregistrer(donnees);
    return reponse({ ok: true });
  } catch (err) {
    console.error('doPost a échoué : ' + err);
    return reponse({ ok: false, erreur: "L'enregistrement a échoué." });
  }
}

function valider(donnees) {
  for (var i = 0; i < CHAMPS_REQUIS.length; i++) {
    var champ = CHAMPS_REQUIS[i];
    if (!String(donnees[champ] || '').trim()) {
      return 'Le champ « ' + champ + ' » est obligatoire.';
    }
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(donnees.email).trim())) {
    return "L'adresse mail est invalide.";
  }
  if (donnees.fonctionnementLu !== true) {
    return 'La prise de connaissance du fonctionnement est obligatoire.';
  }
  return null;
}

function feuille() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var f = classeur.getSheetByName(NOM_FEUILLE) || classeur.insertSheet(NOM_FEUILLE);
  if (f.getLastRow() === 0) {
    f.appendRow(EN_TETES);
    f.getRange(1, 1, 1, EN_TETES.length).setFontWeight('bold');
    f.setFrozenRows(1);
    f.getRange('D:D').setNumberFormat('@');
    f.setColumnWidth(7, 260);
    f.setColumnWidth(8, 260);
  }
  return f;
}

function enregistrer(donnees) {
  feuille().appendRow([
    new Date(),
    String(donnees.nom).trim(),
    String(donnees.prenom).trim(),
    String(donnees.telephone).trim(),
    String(donnees.email).trim(),
    String(donnees.orientePar || '').trim(),
    String(donnees.disponibilites).trim(),
    String(donnees.raison || '').trim(),
    'oui',
  ]);
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function testDoPost() {
  var complet = {
    nom: 'Testeur',
    prenom: 'Automatique',
    telephone: '0612345678',
    email: 'test@example.com',
    orientePar: '',
    disponibilites: 'Jeudi matin',
    raison: '',
    fonctionnementLu: true,
    site: '',
  };
  function avec(modifs) {
    var copie = {};
    for (var cle in complet) copie[cle] = complet[cle];
    for (var cle2 in modifs) copie[cle2] = modifs[cle2];
    return copie;
  }
  var cas = [
    ['formulaire complet -> ok', complet, true],
    ['nom vide -> refus', avec({ nom: '' }), false],
    ['disponibilités vides -> refus', avec({ disponibilites: '   ' }), false],
    ['mail invalide -> refus', avec({ email: 'pasunmail' }), false],
    ['case non cochée -> refus', avec({ fonctionnementLu: false }), false],
    ['honeypot rempli -> ok sans ligne', avec({ site: 'http://spam.test' }), true],
  ];
  var lignesAvant = feuille().getLastRow();
  var echecs = 0;
  for (var i = 0; i < cas.length; i++) {
    var brut = doPost({ postData: { contents: JSON.stringify(cas[i][1]) } }).getContent();
    var obtenu = JSON.parse(brut).ok;
    var reussi = obtenu === cas[i][2];
    if (!reussi) echecs++;
    console.log((reussi ? 'OK    ' : 'ECHEC ') + cas[i][0] + ' -> ' + brut);
  }
  var ajoutees = feuille().getLastRow() - lignesAvant;
  console.log('Lignes ajoutées : ' + ajoutees + ' (attendu : 1)');
  console.log(echecs === 0 && ajoutees === 1 ? 'TOUS LES CAS PASSENT' : 'AU MOINS UN CAS ÉCHOUE');
}
```

- [ ] **Step 2: Créer la feuille Google _(étape humaine)_**

1. Aller sur [sheets.new](https://sheets.new).
2. Nommer le classeur « Liste d'attente ».
3. Laisser l'onglet par défaut tel quel : le script créera l'onglet `Inscriptions` lui-même.

- [ ] **Step 3: Coller et déployer le script _(étape humaine)_**

1. Dans la feuille : menu **Extensions → Apps Script**.
2. Supprimer le contenu de `Code.gs` et coller l'intégralité du fichier `apps-script/Code.gs`.
3. Enregistrer (⌘S).
4. Bouton **Déployer → Nouveau déploiement**, engrenage → **Application Web**.
5. Régler exactement : « Exécuter en tant que : **moi** », « Qui a accès : **Tout le monde** ».
6. **Déployer**, autoriser l'accès quand Google le demande (l'écran « Application non validée » est normal : *Paramètres avancés → Accéder à …*).
7. Copier l'**URL de l'application Web** — elle ressemble à `https://script.google.com/macros/s/AKfyc.../exec`. C'est le `{{URL_APPS_SCRIPT}}` de la tâche 4.

⚠️ Piège à retenir pour la suite : **toute modification du script exige un nouveau déploiement** (Déployer → Gérer les déploiements → crayon → Version : Nouvelle version) pour prendre effet. Un simple ⌘S ne change rien à l'URL publique.

- [ ] **Step 4: Exécuter le test dans l'éditeur _(étape humaine)_**

Dans l'éditeur Apps Script, sélectionner la fonction `testDoPost` dans la liste déroulante puis **Exécuter**. Lire le journal d'exécution.

Attendu, exactement :

```
OK    formulaire complet -> ok -> {"ok":true}
OK    nom vide -> refus -> {"ok":false,"erreur":"Le champ « nom » est obligatoire."}
OK    disponibilités vides -> refus -> {"ok":false,"erreur":"Le champ « disponibilites » est obligatoire."}
OK    mail invalide -> refus -> {"ok":false,"erreur":"L'adresse mail est invalide."}
OK    case non cochée -> refus -> {"ok":false,"erreur":"La prise de connaissance du fonctionnement est obligatoire."}
OK    honeypot rempli -> ok sans ligne -> {"ok":true}
Lignes ajoutées : 1 (attendu : 1)
TOUS LES CAS PASSENT
```

Si un `ECHEC` apparaît, corriger `Code.gs` avant de continuer. Vérifier aussi dans l'onglet `Inscriptions` que la ligne « Testeur » porte bien le téléphone `0612345678` **avec son zéro initial** — s'il manque, le `setNumberFormat('@')` n'a pas été appliqué.

- [ ] **Step 5: Vérifier l'endpoint depuis l'extérieur**

Remplacer `<URL>` par l'URL obtenue à l'étape 3.

```bash
curl -sL -X POST "<URL>" -H "Content-Type: text/plain;charset=utf-8" -d '{"nom":"Curl","prenom":"Test","telephone":"0600000000","email":"curl@example.com","disponibilites":"Vendredi 14h","fonctionnementLu":true}'
```

Attendu : `{"ok":true}` et une nouvelle ligne « Curl » dans la feuille.

Puis le cas de refus :

```bash
curl -sL -X POST "<URL>" -H "Content-Type: text/plain;charset=utf-8" -d '{"nom":"","prenom":"Test","telephone":"0600000000","email":"curl@example.com","disponibilites":"Vendredi","fonctionnementLu":true}'
```

Attendu : `{"ok":false,"erreur":"Le champ « nom » est obligatoire."}` et **aucune** nouvelle ligne.

- [ ] **Step 6: Nettoyer les lignes de test**

Supprimer les lignes « Testeur » et « Curl » dans l'onglet `Inscriptions`, en conservant la ligne d'en-têtes.

- [ ] **Step 7: Commit**

```bash
git add apps-script/Code.gs
git commit -m "feat: script Google d'enregistrement des inscriptions

Valide côté serveur, filtre le honeypot, écrit une ligne par inscription.
testDoPost couvre les six cas depuis l'éditeur Apps Script.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Validation et envoi côté page

**Files:**
- Modify: `public/index.html` — ajouter un `<script>` juste avant `</body>`.

**Interfaces:**
- Consumes: les identifiants DOM de la tâche 2 et l'endpoint de la tâche 3.
- Produces: le comportement complet de la page. Aucune interface pour les tâches suivantes.

Note sur `novalidate` : il est posé sur le `<form>` en tâche 2 pour désactiver les bulles natives du navigateur, tout en gardant les attributs `required` et `type` pour la sémantique et les lecteurs d'écran. La validation passe par `champ.checkValidity()`, ce qui permet d'afficher nos propres messages sous les champs.

- [ ] **Step 1: Écrire le script de la page**

```html
<script>
(function () {
  'use strict';

  var URL_SCRIPT = '{{URL_APPS_SCRIPT}}';

  var LIBELLE_BOUTON = 'M’inscrire sur la liste d’attente';

  var MESSAGES = {
    nom: 'Merci d’indiquer votre nom.',
    prenom: 'Merci d’indiquer votre prénom.',
    telephone: 'Merci d’indiquer un numéro de téléphone.',
    email: 'Merci d’indiquer une adresse mail valide.',
    disponibilites: 'Merci d’indiquer vos disponibilités les jeudis et vendredis.',
    fonctionnementLu: 'Merci de confirmer que vous avez pris connaissance de ce fonctionnement.',
  };

  var formulaire = document.getElementById('formulaire');
  var bouton = document.getElementById('envoyer');
  var encartErreur = document.getElementById('erreur-envoi');
  var confirmation = document.getElementById('confirmation');

  function marquerValide(nom) {
    var champ = document.getElementById(nom);
    champ.closest('.champ').classList.remove('champ-invalide');
    champ.removeAttribute('aria-invalid');
  }

  function marquerInvalide(nom) {
    var champ = document.getElementById(nom);
    champ.closest('.champ').classList.add('champ-invalide');
    champ.setAttribute('aria-invalid', 'true');
    document.getElementById('erreur-' + nom).textContent = MESSAGES[nom];
  }

  function valider() {
    var premierFautif = null;
    Object.keys(MESSAGES).forEach(function (nom) {
      var champ = document.getElementById(nom);
      if (champ.checkValidity()) {
        marquerValide(nom);
      } else {
        marquerInvalide(nom);
        if (!premierFautif) premierFautif = champ;
      }
    });
    if (premierFautif) {
      premierFautif.focus();
      return false;
    }
    return true;
  }

  function collecter() {
    var lire = function (nom) {
      return document.getElementById(nom).value.trim();
    };
    return {
      nom: lire('nom'),
      prenom: lire('prenom'),
      telephone: lire('telephone'),
      email: lire('email'),
      orientePar: lire('orientePar'),
      disponibilites: lire('disponibilites'),
      raison: lire('raison'),
      fonctionnementLu: document.getElementById('fonctionnementLu').checked,
      site: lire('site'),
    };
  }

  function afficherErreurEnvoi() {
    encartErreur.querySelector('p').innerHTML =
      'Votre inscription n’a pas pu être envoyée. Vos réponses sont conservées : ' +
      'réessayez dans un instant, ou écrivez-moi directement à ' +
      '<a href="mailto:{{EMAIL}}">{{EMAIL}}</a>.';
    encartErreur.style.display = 'block';
  }

  function afficherConfirmation() {
    formulaire.style.display = 'none';
    confirmation.style.display = 'block';
    confirmation.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formulaire.addEventListener('submit', function (evenement) {
    evenement.preventDefault();
    encartErreur.style.display = 'none';
    if (!valider()) return;

    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';

    fetch(URL_SCRIPT, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(collecter()),
    })
      .then(function (reponse) {
        return reponse.json();
      })
      .then(function (resultat) {
        if (!resultat.ok) throw new Error(resultat.erreur || 'refus du serveur');
        afficherConfirmation();
      })
      .catch(function (err) {
        console.error(err);
        afficherErreurEnvoi();
        bouton.disabled = false;
        bouton.textContent = LIBELLE_BOUTON;
      });
  });
})();
</script>
```

⚠️ Deux pièges de saisie dans ce bloc :

- Toutes les chaînes de texte affiché utilisent l'**apostrophe courbe** `’` (U+2019), jamais l'apostrophe droite `'`. C'est la contrainte typographique du projet, et ça évite d'avoir à échapper quoi que ce soit dans des chaînes délimitées par `'`.
- `LIBELLE_BOUTON` doit être **caractère pour caractère** identique au texte du `<button>` écrit en tâche 2. Sinon le libellé change après une erreur d'envoi.

- [ ] **Step 2: Vérifier la validation sans rien envoyer**

Recharger la page, cliquer directement sur le bouton d'envoi sans rien remplir.

Attendu :
- Cinq champs passent en bordure rouge : Nom, Prénom, Téléphone, Mail, Disponibilités, plus la case à cocher — six messages au total.
- Le message sous Nom est « Merci d'indiquer votre nom. »
- Le focus atterrit dans le champ Nom.
- Aucune bulle native du navigateur n'apparaît.
- Aucune requête réseau n'est partie (onglet Réseau vide).

Puis remplir Nom et recliquer : l'erreur sous Nom disparaît, les autres restent.

Puis saisir `pasunmail` dans Mail et recliquer : « Merci d'indiquer une adresse mail valide. » s'affiche.

- [ ] **Step 3: Vérifier les trois états d'envoi avec un faux `fetch`**

`{{URL_APPS_SCRIPT}}` n'est pas encore remplacé, donc on remplace `fetch` depuis la console du navigateur pour tester les branches sans dépendre du réseau.

Cas succès — coller dans la console, puis remplir le formulaire et l'envoyer :

```javascript
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
```

Attendu : le bouton affiche brièvement « Envoi en cours… », le formulaire disparaît, le bloc « Votre inscription est enregistrée » s'affiche, la page remonte en haut.

Cas refus serveur — recharger, coller, remplir, envoyer :

```javascript
window.fetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: false, erreur: 'test' }) });
```

Attendu : l'encart rouge apparaît au-dessus du bouton, **les champs restent remplis**, le bouton redevient actif avec son libellé d'origine.

Cas panne réseau — recharger, coller, remplir, envoyer :

```javascript
window.fetch = () => Promise.reject(new Error('réseau coupé'));
```

Attendu : même comportement que le cas précédent.

- [ ] **Step 4: Vérifier le honeypot bout en bout**

Recharger, remplir le formulaire normalement, puis dans la console :

```javascript
document.getElementById('site').value = 'http://spam.test';
window.fetch = (u, o) => { console.log(JSON.parse(o.body).site); return Promise.resolve({ json: () => Promise.resolve({ ok: true }) }); };
```

Envoyer. Attendu : la console affiche `http://spam.test`, ce qui confirme que le champ est bien transmis et que le script Google pourra l'utiliser pour écarter la soumission.

- [ ] **Step 5: Commit**

```bash
git add public/index.html
git commit -m "feat: validation des champs et envoi vers le script Google

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Mise en ligne et documentation

**Files:**
- Modify: `public/index.html` — remplacer les deux jetons.
- Create: `README.md`

**Interfaces:**
- Consumes: l'URL du Web App de la tâche 3, la page complète de la tâche 4, l'adresse mail fournie par le commanditaire.
- Produces: un site en ligne et sa documentation.

⚠️ Cette tâche est bloquée jusqu'à ce que l'adresse mail à afficher soit fournie. Le téléphone est connu (`06 60 61 09 08`), l'adresse mail ne l'est pas.

- [ ] **Step 1: Remplacer les deux jetons**

```bash
grep -o -F '{{URL_APPS_SCRIPT}}' public/index.html | wc -l
grep -o -F '{{EMAIL}}' public/index.html | wc -l
```

Attendu avant remplacement : `1` puis `4` (deux fois dans l'encart de contact, deux fois dans le message d'erreur d'envoi).

Remplacer ensuite, en substituant les valeurs réelles :

```bash
sed -i '' 's|{{URL_APPS_SCRIPT}}|https://script.google.com/macros/s/COLLER_ICI/exec|g' public/index.html
sed -i '' 's|{{EMAIL}}|adresse@aremplacer.fr|g' public/index.html
```

- [ ] **Step 2: Vérifier qu'aucun jeton ne subsiste**

```bash
grep -n -F '{{' public/index.html
```

Attendu : aucune sortie, code de retour 1. C'est la condition de déblocage de la mise en ligne posée par le spec.

- [ ] **Step 3: Tester le parcours réel en local**

Avec `python3 -m http.server 8080 --directory public` toujours actif, ouvrir `http://localhost:8080`, remplir le formulaire avec des valeurs reconnaissables (« Répétition Générale », téléphone `0611223344`) et envoyer sans toucher à la console.

Attendu :
- Le bloc de confirmation s'affiche.
- Une nouvelle ligne apparaît dans l'onglet `Inscriptions`, avec le téléphone `0611223344` complet, les accents intacts et « oui » en dernière colonne.

Si la console affiche une erreur CORS, c'est que l'en-tête `Content-Type` ou le `redirect: 'follow'` a été modifié — les remettre tels quels.

Supprimer ensuite la ligne « Répétition Générale » de la feuille.

- [ ] **Step 4: Écrire le README**

Le nom du projet Cloudflare n'est arrêté qu'à l'étape 5. Écrire le README ici avec le nom prévu (`list`), et le corriger à l'étape 5 si le nom de repli a dû être utilisé.

```markdown
# Liste d'attente — Julie Vasquez, psychologue

Formulaire public d'inscription sur liste d'attente. Chaque inscription
ajoute une ligne dans une feuille Google, qui sert de backoffice.

## Composition

- `public/index.html` — le site entier. Aucune dépendance, aucun build.
- `apps-script/Code.gs` — le script Google qui reçoit les inscriptions.
- `docs/superpowers/` — spec et plan d'implémentation.

## Consulter les inscriptions

Ouvrir la feuille Google « Liste d'attente », onglet `Inscriptions`.
Une ligne par personne, la plus récente en bas.

## Modifier le texte de la page

Tout le contenu est dans `public/index.html`, en clair, dans les balises
`<p>`. Éditer, puis redéployer (voir ci-dessous).

## Redéployer la page

    npx wrangler pages deploy public --project-name=list

## Modifier le script Google

Feuille → Extensions → Apps Script → coller le nouveau `Code.gs` →
enregistrer → **Déployer → Gérer les déploiements → crayon → Version :
Nouvelle version**. Sans ce nouveau déploiement, la modification n'a
aucun effet sur le site.

Pour tester le script sans passer par le site : sélectionner la fonction
`testDoPost` dans l'éditeur et l'exécuter. Elle affiche six cas et ajoute
une ligne de test à supprimer ensuite.

## Limites connues

L'URL du script est publique : quelqu'un qui la découvre peut y poster des
lignes. Un champ piège écarte les robots basiques. Si du spam apparaît, la
parade est d'ajouter un jeton partagé entre la page et le script.
```

- [ ] **Step 5: Publier sur Cloudflare Pages**

```bash
npx wrangler pages deploy public --project-name=list
```

Si le nom `list` est refusé parce qu'il est déjà pris — probable, `*.pages.dev` étant un espace de noms global et `list` étant très court — reprendre avec le nom de repli :

```bash
npx wrangler pages deploy public --project-name=liste-attente-jv
```

Noter l'URL renvoyée par la commande. Si le nom de repli a servi, corriger la commande de redéploiement dans le `README.md`.

- [ ] **Step 6: Vérifier le site en ligne**

Ouvrir l'URL publique et contrôler :

1. La page s'affiche avec ses accents intacts.
2. Le numéro de téléphone est cliquable.
3. Une inscription réelle envoyée depuis cette URL crée une ligne dans la feuille — c'est le test qui compte, l'origine du POST changeant par rapport au test local.
4. Sur un téléphone, aucun débordement horizontal.

Supprimer la ligne de test de la feuille.

- [ ] **Step 7: Commit**

```bash
git add README.md public/index.html
git commit -m "feat: mise en ligne, coordonnées réelles et documentation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Récapitulatif des étapes humaines

Ces cinq points exigent un accès dont l'agent ne dispose pas :

1. **Tâche 3, étape 2** — créer la feuille Google.
2. **Tâche 3, étape 3** — coller et déployer le script, fournir l'URL du Web App.
3. **Tâche 3, étape 4** — exécuter `testDoPost` dans l'éditeur Apps Script.
4. **Tâche 5** — fournir l'adresse mail à afficher.
5. **Tâche 5, étape 5** — disposer d'un compte Cloudflare authentifié pour `wrangler`.

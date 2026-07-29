# Liste d'attente psy — formulaire public + feuille Google

- **Date** : 2026-07-29
- **Statut** : approuvé
- **Praticienne** : Julie Vasquez, psychologue (cabinet à Paris + visio)

## Problème

L'agenda est complet, avec environ deux mois d'attente pour un premier rendez-vous. Les demandes arrivent aujourd'hui par mail et par téléphone, sans endroit unique pour les retrouver ni pour savoir quand chaque personne est disponible. Résultat : des demandes qui se perdent et des allers-retours pour trouver un créneau.

## Objectif

Une URL publique à communiquer aux personnes qui demandent un rendez-vous. Elles laissent leurs coordonnées et leurs disponibilités ; chaque inscription atterrit comme une ligne dans une feuille Google consultée depuis le cabinet.

Réussi si : une personne peut s'inscrire depuis un téléphone en moins de deux minutes, et la ligne correspondante est lisible dans la feuille sans manipulation.

## Non-objectifs

Explicitement hors périmètre, décidé avec le commanditaire :

- Aucun bandeau cookies, aucune mention RGPD, aucun registre de traitement.
- Aucun email automatique (ni notification au cabinet, ni accusé de réception au visiteur).
- Aucune page d'administration : la feuille Google **est** le backoffice.
- Aucune détection de doublons, aucun export, aucun analytics, aucune prise de rendez-vous ou paiement.

## Architecture

Trois pièces, aucune étape de build, aucune dépendance npm.

| Pièce | Rôle |
|---|---|
| `public/index.html` | Page publique unique. HTML + CSS + JS dans un seul fichier. `public/` est la racine publiée sur Cloudflare Pages, ce qui garde le spec et le script hors du site. |
| `apps-script/Code.gs` | Google Apps Script lié à la feuille, déployé en Web App « Exécuter en tant que moi / Accessible à tous ». Reçoit le POST, ajoute une ligne. Jamais publié sur le web. |
| Feuille Google | Base de données et backoffice. Partagée en lecture au cabinet. |

### Flux nominal

1. Le visiteur remplit le formulaire et valide.
2. Le JS de la page envoie un `fetch` POST vers l'URL du Web App Apps Script.
3. `doPost` parse le corps, valide, appelle `appendRow` sur la feuille.
4. La réponse `{"ok": true}` déclenche le remplacement du formulaire par un message de remerciement.

### Contrainte CORS — décision technique

Apps Script ne répond pas aux requêtes `OPTIONS`, donc tout POST déclenchant un preflight échoue. Le POST part en `Content-Type: text/plain;charset=utf-8`, ce qui en fait une « requête simple » sans preflight. Le corps reste du JSON, parsé côté script via `JSON.parse(e.postData.contents)`. La réponse est renvoyée avec `ContentService.createTextOutput(...).setMimeType(ContentService.MimeType.JSON)`, et `fetch` est appelé avec `redirect: "follow"` pour suivre la redirection 302 vers `script.googleusercontent.com`.

Ne pas utiliser `mode: "no-cors"` : la réponse devient illisible et il devient impossible de distinguer un succès d'un échec.

## Modèle de données

Une ligne par inscription. Ligne 1 de la feuille = en-têtes, figée.

| Colonne | Source | Format |
|---|---|---|
| Date d'inscription | serveur (`new Date()`) | date/heure, fuseau du script |
| Nom | champ `nom` | texte |
| Prénom | champ `prenom` | texte |
| Téléphone | champ `telephone` | texte (préserve le `0` initial et les `+33`) |
| Email | champ `email` | texte |
| Orienté par | champ `orientePar` | texte, peut être vide |
| Disponibilités | champ `disponibilites` | texte multi-ligne |
| Raison | champ `raison` | texte multi-ligne, peut être vide |
| Fonctionnement lu | champ `fonctionnementLu` | `"oui"` |

La colonne Téléphone est formatée en texte dans la feuille, sinon Google mange le zéro initial.

## Champs du formulaire

| Libellé affiché | Nom technique | Type | Requis |
|---|---|---|---|
| Nom | `nom` | `text` | ✅ |
| Prénom | `prenom` | `text` | ✅ |
| Numéro de téléphone | `telephone` | `tel` | ✅ |
| Email | `email` | `email` | ✅ |
| Si vous avez été orienté par un professionnel, une association, un réseau, merci de l'indiquer | `orientePar` | `text` | — |
| Je consulte les jeudis et vendredis. Sur quels horaires êtes-vous libre ces jours-là ? | `disponibilites` | `textarea` | ✅ |
| Souhaitez-vous me partager la raison de votre désir de prendre rdv (optionnel) | `raison` | `textarea` | — |
| J'ai bien pris connaissance de ce fonctionnement. | `fonctionnementLu` | `checkbox` | ✅ |

## Contenu éditorial

Texte fourni par la praticienne, repris sans réécriture. Ordre des blocs sur la page :

**1. Accueil**

> Merci pour votre demande de rendez-vous. Actuellement, mon agenda est complet et le délai d'attente pour un premier rendez-vous est d'environ 2 mois. Si vous souhaitez être inscrit(e) sur la liste d'attente, merci de compléter ce formulaire qui me permettra de vous recontacter au plus vite pour vous proposer un rdv correspondant à vos disponibilités.

**2. Encart « me joindre avant »**

> Si vous souhaitez échanger par téléphone avant de vous inscrire sur liste d'attente ou avant un premier rendez-vous, je suis joignable par téléphone tous les lundis de 11 h à 21 h. C'est un temps que je réserve aux appels, donc n'hésitez pas à me contacter sur ce créneau si vous en ressentez le besoin. Vous pouvez aussi m'envoyer un mail.

Le téléphone et l'email sont affichés ici comme liens cliquables : `07 62 02 23 16` pointant vers `tel:+33762022316`, et `julievasquez.psychologue@gmail.com` vers `mailto:`.

**3. Le formulaire** (champs 1 à 7 du tableau ci-dessus)

**4. Bloc « fonctionnement »**, placé juste avant la case à cocher pour qu'elle soit cochée après lecture et non avant :

> Avez-vous bien lu que la 1re séance ou les 1res séances sont au cabinet à Paris puis que le suivi est en visio ? Bien sûr il s'agit d'essayer et de voir si cela vous convient. Je n'habite pas toute l'année à Paris, mais j'y reviens régulièrement pour mes consultations, donc nous pourrons faire des séances au cabinet ponctuellement. Si vous habitez loin de Paris ou si vous ne pouvez pas vous déplacer, nous pouvons tout faire en visio même la première séance.
>
> Par ailleurs, la fréquence des psychothérapies que je propose est d'un rdv par semaine.

**5. Signature** : « À bientôt — Julie Vasquez »

**6. Écran de confirmation** (remplace le formulaire après envoi) : confirmation de l'inscription, rappel du délai d'environ deux mois, rappel du créneau téléphonique du lundi.

### Placeholder bloquant

Les deux coordonnées sont fournies et intégrées : téléphone `07 62 02 23 16`, mail `julievasquez.psychologue@gmail.com`. Il ne reste qu'un jeton, `{{URL_APPS_SCRIPT}}`, renseigné après le déploiement du script. **La mise en ligne est bloquée tant qu'une recherche d'accolades doubles dans `index.html` retourne quelque chose.**

## Validation

Deux niveaux, le second faisant autorité :

- **Client** : attributs HTML natifs (`required`, `type="email"`, `type="tel"`) et un contrôle JS avant envoi qui affiche les messages sous les champs fautifs.
- **Serveur** (`Code.gs`) : refus avec `{"ok": false, "erreur": "..."}` si un champ requis est vide, si l'email ne contient pas de `@`, ou si la case n'est pas cochée. Un formulaire posté hors navigateur ne peut pas créer de ligne incomplète.

## Anti-spam

Un champ honeypot, masqué en CSS et hors du flux de tabulation. S'il est rempli, `doPost` renvoie `{"ok": true}` sans rien écrire — le bot croit avoir réussi. Pas de captcha : friction inacceptable pour ce public.

## Gestion d'erreur

Si le POST échoue (réseau coupé, script indisponible, réponse `ok: false`) : un encart d'erreur apparaît au-dessus du bouton, invitant à écrire directement à l'adresse mail affichée. **Les champs conservent leur contenu** et le bouton redevient actif pour permettre un nouvel essai. Le bouton est désactivé pendant l'envoi pour éviter les doubles soumissions.

## Apparence

Sobre et apaisant. Une colonne centrée à 640px maximum, interligne généreux (1.6+), taille de corps 17–18px, palette douce à faible contraste chromatique, aucune photographie. Mobile-first : la cible principale est un téléphone en 375px de large. Zones de saisie hautes de 44px minimum, labels au-dessus des champs, jamais de placeholder en guise de label.

## Vérification

Aucun framework de test — le projet n'en justifie pas. Vérification manuelle au navigateur avant livraison, sur ces sept points :

1. Envoi complet → une ligne correcte apparaît dans la feuille, avec le zéro initial du téléphone intact.
2. Champs requis vides → l'envoi est bloqué et les messages s'affichent.
3. Case non cochée → l'envoi est bloqué.
4. Honeypot rempli → aucune ligne créée, message de succès affiché.
5. Réseau coupé → encart d'erreur, champs conservés, nouvel essai possible.
6. Rendu à 375px de large : aucun débordement horizontal, tout est lisible.
7. Accents et apostrophes correctement enregistrés dans la feuille (UTF-8 de bout en bout).

## Déploiement

**Feuille et script** (à faire par le commanditaire, procédure fournie pas à pas) : créer la feuille, ouvrir Extensions → Apps Script, coller `Code.gs`, déployer en Web App (« Exécuter en tant que : moi », « Accès : tout le monde »), récupérer l'URL et la coller dans `index.html` à la place de `{{URL_APPS_SCRIPT}}`. Toute modification du script exige un **nouveau déploiement** pour prendre effet — piège classique.

**Page** : Cloudflare Pages, dossier publié `public/`, via `npx wrangler pages deploy public`. Cible souhaitée `list.pages.dev`. Les sous-domaines `*.pages.dev` sont uniques à l'échelle de Cloudflare et `list` est un nom très court, donc probablement déjà pris : repli prévu sur `liste-attente-jv.pages.dev`. Pas de domaine personnalisé pour l'instant ; en brancher un plus tard ne touche pas au code.

## Limites assumées

- L'URL du Web App est publique : quelqu'un qui la découvre peut y poster des lignes. Le honeypot n'arrête que les bots naïfs. Acceptable au volume attendu ; si du spam apparaît, la parade sera un jeton partagé entre la page et le script.
- Les quotas Apps Script gratuits (de l'ordre de 20 000 exécutions par jour) sont sans objet ici.
- Aucune sauvegarde en dehors de l'historique de versions Google Sheets.

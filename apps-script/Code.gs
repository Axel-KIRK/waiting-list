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

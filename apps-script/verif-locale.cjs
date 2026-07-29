/*
 * Vérifie Code.gs hors de Google, en simulant SpreadsheetApp et ContentService.
 * Usage : node apps-script/verif-locale.cjs
 * Sort en code 1 si un contrôle échoue.
 */
const fs = require('fs');
const path = require('path');

const lignes = [];
const feuilleStub = {
  getLastRow: () => lignes.length,
  appendRow: (r) => lignes.push(r),
  getRange: () => ({ setFontWeight() {}, setNumberFormat() {} }),
  setFrozenRows() {},
  setColumnWidth() {},
};

globalThis.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: () => feuilleStub,
    insertSheet: () => feuilleStub,
  }),
};

globalThis.ContentService = {
  MimeType: { JSON: 'application/json' },
  createTextOutput: (texte) => ({
    setMimeType: () => ({ getContent: () => texte }),
  }),
};

eval(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'));

testDoPost();

console.log('\n--- Contenu de la feuille simulée ---');
lignes.forEach((l, i) =>
  console.log(i === 0 ? 'EN-TETES : ' + l.join(' | ') : 'LIGNE    : ' + l.join(' | '))
);

const ligne = lignes[1];
const controles = [
  ['9 colonnes écrites', ligne.length === 9],
  ['date en 1re colonne', ligne[0] instanceof Date],
  ['téléphone gardé en chaîne avec son zéro', ligne[3] === '0612345678'],
  ['orientePar vide devient chaîne vide', ligne[5] === ''],
  ['raison vide devient chaîne vide', ligne[7] === ''],
  ['dernière colonne vaut oui', ligne[8] === 'oui'],
];
console.log('\n--- Contrôles de la ligne écrite ---');
let echecs = 0;
for (const [libelle, ok] of controles) {
  if (!ok) echecs++;
  console.log((ok ? 'OK    ' : 'ECHEC ') + libelle);
}
console.log(echecs === 0 ? '\nTOUS LES CONTROLES PASSENT' : '\n' + echecs + ' CONTROLE(S) EN ECHEC');
process.exit(echecs === 0 ? 0 : 1);

const CLE_STOCKAGE = "fiches-bristol";
const CLE_COULEURS = "fiches-bristol-couleurs";
const regexLF = /^---\n([\s\S]*?)\n---\n/;
const regexCR = /^---\r\n([\s\S]*?)\r\n---\r\n/;
const regexCRLF = /^---\r([\s\S]*?)\r---\r/;

const accueil = document.getElementById("accueil");
const menu = document.getElementById("menu");
const menuComplet = document.getElementById("menu-complet");
const content = document.getElementById("content");
const contentComplet = document.getElementById("content-complet")
const form = document.getElementById("formulaire-fiche");

const PALETTE_DEFAUT = {"Autres": "#ffffff", "Français": "#ca0000", "Espagnol": "#f56613"};

let ficheEnCours = null;
let idEdition = null;

function viderAlertes() {
    let info = document.getElementById("info")
    if (info) {
        document.getElementById("infos").removeChild(info)
    }
}

function afficherAlerte(message) {
    let alerte = document.createElement("span");
    alerte.textContent = message;
    alerte.classList.add("alerte");
    alerte.id = "info";
    alerte.addEventListener("click", viderAlertes);
    document.getElementById("infos").appendChild(alerte);
}

function afficherErreur(message) {
    let erreur = document.createElement("span");
    erreur.textContent = message;
    erreur.classList.add("erreur");
    erreur.id = "info";
    erreur.addEventListener("click", viderAlertes);
    document.getElementById("infos").appendChild(erreur);
}

function afficherInfo(message) {
    let alerte = document.createElement("span");
    alerte.textContent = message;
    alerte.classList.add("info");
    alerte.id = "info";
    alerte.addEventListener("click", viderAlertes);
    document.getElementById("infos").appendChild(alerte);
}

async function reponseToMetadonnees(reponse, nom) {
    let texte = await reponse.text();

    let resultat = "";
    if (texte.match(regexLF) !== null) {
        resultat = texte.match(regexLF);
    } else if (texte.match(regexLF) === null && texte.match(regexCRLF) !== null) {
        resultat = texte.match(regexCRLF);
    } else  if (texte.match(regexLF) === null && texte.match(regexCRLF) === null && texte.match(regexCR)  !== null) {
        resultat = texte.match(regexCR);
    } else {
        return afficherErreur("Format CR/LF/CRLF imcompatible.");
    }
    
    let fichePropre = texte.replace(`${resultat[0]}\n`, "");
    let metadonneesBrutes = parserFrontmatter(resultat[1]);
    let metadonnees = { ...metadonneesBrutes, nom, source: "locked" };

    return metadonnees;
}

async function reponseToFiche(reponse) {
    let texte = await reponse.text();

    let resultat = "";
    if (texte.match(regexLF) !== null) {
        let resultat = texte.match(regexLF);
    } else if (texte.match(regexLF) === null && texte.match(regexCRLF) !== null) {
        let resultat = texte.match(regexCRLF);
    } else  if (texte.match(regexLF) === null && texte.match(regexCRLF) === null && texte.match(regexCR)  !== null) {
        let resultat = texte.match(regexCR);
    } else {
        return afficherErreur("Format CR/LF/CRLF imcompatible.");
    }
    
    let fichePropre = texte.replace(`${resultat[0]}\n`, "");

    return fichePropre;
}

function afficherAccueil () {
    menuComplet.classList.add("cache");
    contentComplet.classList.add("cache");
    form.classList.add("cache");
    accueil.classList.remove("cache");
}

function afficherMenu () {
    accueil.classList.add("cache");
    contentComplet.classList.add("cache");
    form.classList.add("cache");
    menuComplet.classList.remove("cache");
}

function afficherForm () {
    accueil.classList.add("cache");
    menuComplet.classList.add("cache");
    contentComplet.classList.add("cache");
    form.classList.remove("cache");
}

function construireHierarchie(fiches) {
    const hierarchie = {};

    fiches.forEach((fiche) => {
        if (!hierarchie[fiche.matiere]) {hierarchie[fiche.matiere] = {};}
        if(!hierarchie[fiche.matiere][fiche.categorie]) {hierarchie[fiche.matiere][fiche.categorie] = []}

        hierarchie[fiche.matiere][fiche.categorie].push(fiche);
    })

    return hierarchie;
}

function obtenirFichesLocales() {
    try {
        let fichesJson = localStorage.getItem(CLE_STOCKAGE)

        if (!fichesJson) {
            return [];
        }
        
        let fichesJs = JSON.parse(fichesJson);
        return fichesJs;
    } catch (err) {
        afficherErreur("Impossible de récupérer les fiches locales.")
        return [];
    }
}

function sauvegarderFichesLocales(fichesJs) {
    try {
        let fichesJson = JSON.stringify(fichesJs)
        return localStorage.setItem(CLE_STOCKAGE, fichesJson)
    } catch (err) {
        afficherErreur("Impossible de sauvegarder les fiches locales.")
        return [];
    }
}

function ajouterFicheLocale (matiere, categorie, emoji, titre, contenu) {
    const fiches = obtenirFichesLocales()
    let newFiche = {id: crypto.randomUUID(), matiere, categorie, emoji, titre, contenu, source: "local"}
    fiches.push(newFiche)
    sauvegarderFichesLocales(fiches);
}

function modifierFicheLocale(id, nouvellesDonnees) {
    const tableau = obtenirFichesLocales();

    let index = tableau.findIndex((fiche) => fiche.id === id)
    if (index === -1) {return afficherErreur("Fiche introuvable.")}

    let fusion =  { ...tableau[index], ...nouvellesDonnees }
    tableau[index] = fusion
    sauvegarderFichesLocales(tableau);
}

function supprimerFicheLocale(id) {
    const tableau = obtenirFichesLocales();

    let filtre = tableau.filter((fiche) => fiche.id !== id)
    sauvegarderFichesLocales(filtre);
}

function obtenirCouleurMatiere(nomMatiere) {
    let couleursJson = localStorage.getItem(CLE_COULEURS);
    let couleursJs = couleursJson ? JSON.parse(couleursJson) : {};

    if(couleursJs[nomMatiere]) {
        return couleursJs[nomMatiere];
    } else {
        return PALETTE_DEFAUT[nomMatiere];
    }
}

function definirCouleurMatiere(nomMatiere, couleur) {
    let couleursJson = localStorage.getItem(CLE_COULEURS);
    let couleursJs = couleursJson ? JSON.parse(couleursJson) : {};

    couleursJs[nomMatiere] = couleur;

    localStorage.setItem(CLE_COULEURS, JSON.stringify(couleursJs));
}

function supprimerCouleurMatiere(nomMatiere) {
    let couleursJson = localStorage.getItem(CLE_COULEURS);
    let couleursJs = couleursJson ? JSON.parse(couleursJson) : {};

    delete couleursJs[nomMatiere];

    localStorage.setItem(CLE_COULEURS, JSON.stringify(couleursJs));
}

function remplirSelectMatieres(matiere = null) {
    const select = document.getElementById("form-matiere");
    select.innerHTML = "";

    Object.keys(PALETTE_DEFAUT).forEach((nomMatiere) => {
        let objet = document.createElement("option");
        objet.value = nomMatiere;
        objet.textContent = nomMatiere;

        if (matiere !== null && nomMatiere === matiere) {objet.selected = "selected"}

        select.appendChild(objet);
    })
}

async function chargerMenu() {
    try {
        menu.innerHTML = "";
        viderAlertes()
        let reponse = await fetch("fiches/index.json")

        if (!reponse.ok) {
            afficherErreur(`Index des fiches (index.json) introuvable.`);
            return;
        }

        let index = await reponse.json();
        
        const promesses = index.map(async (nom) => {
            let reponse = await fetch(`fiches/${nom}.md`);
            let metadonnees = await reponseToMetadonnees(reponse, nom);
            return metadonnees
        });
        const fichesLocked = await Promise.all(promesses)
        const fichesLocal = obtenirFichesLocales()
        const toutesLesFiches = [ ...fichesLocked, ...fichesLocal ]
        const hierarchie = construireHierarchie(toutesLesFiches)

        Object.keys(hierarchie).forEach((nomMatiere) => {

            let couleur = obtenirCouleurMatiere(nomMatiere);

            let matiereContenu = document.createElement("div");
            matiereContenu.classList.add("menu-matiere-contenu");
            matiereContenu.id = `matiere-${nomMatiere}-contenu`;

            let matiereTitre = document.createElement("div");
            matiereTitre.textContent = nomMatiere;
            matiereTitre.classList.add("menu-matiere-titre");
            matiereTitre.id = `matiere-${nomMatiere}-titre`;
            matiereTitre.style.setProperty("--couleur-matiere", couleur);
            matiereTitre.addEventListener("click", () => {
                matiereContenu.classList.toggle("cache");
            });

            let matiereG = document.createElement("div");
            matiereG.classList.add("menu-matiere-g");
            matiereG.id = `matiere-${nomMatiere}-g`;
            matiereG.style.setProperty("--couleur-matiere", couleur);

            let selecteurCouleur = document.createElement("input");
            selecteurCouleur.type = "color";
            selecteurCouleur.value = couleur;
            selecteurCouleur.id = `selecteur-couleur-${nomMatiere}`;
            selecteurCouleur.classList.add("selecteur-couleur");
            selecteurCouleur.addEventListener("change", (event) => {
                definirCouleurMatiere(nomMatiere, event.target.value);
                return chargerMenu();
            })

            let resetCouleur = document.createElement("button");
            resetCouleur.textContent = "🔄️";
            resetCouleur.id = `reset-couleur-${nomMatiere}`;
            resetCouleur.classList.add("reset-couleur");
            resetCouleur.addEventListener("click", () => {
                supprimerCouleurMatiere(nomMatiere);
                return chargerMenu();
            })


            menu.appendChild(matiereG);

            document.getElementById(`matiere-${nomMatiere}-g`).appendChild(matiereTitre);
            document.getElementById(`matiere-${nomMatiere}-g`).appendChild(selecteurCouleur);
            document.getElementById(`matiere-${nomMatiere}-g`).appendChild(resetCouleur);
            document.getElementById(`matiere-${nomMatiere}-g`).appendChild(matiereContenu);

            Object.keys(hierarchie[nomMatiere]).forEach((nomCategorie) => {

                let categorieContenu = document.createElement("div");
                categorieContenu.classList.add("menu-categorie-contenu");
                categorieContenu.id = `categorie-${nomCategorie}-${nomMatiere}-contenu`

                let categorieTitre = document.createElement("div");
                categorieTitre.textContent = nomCategorie;
                categorieTitre.classList.add("menu-categorie-titre");
                categorieTitre.id = `categorie-${nomCategorie}-${nomMatiere}-titre`
                categorieTitre.addEventListener("click", () => {
                    categorieContenu.classList.toggle("cache");
                });
                
                document.getElementById(`matiere-${nomMatiere}-contenu`).appendChild(categorieTitre);
                document.getElementById(`matiere-${nomMatiere}-contenu`).appendChild(categorieContenu);

                hierarchie[nomMatiere][nomCategorie].forEach((fiche) => {

                    let ficheMenu = document.createElement("li");
                    ficheMenu.textContent = `${fiche.emoji} ${fiche.titre}`
                    ficheMenu.classList.add("menu-fiche");
                    ficheMenu.addEventListener("click", () => {
                        chercherFiche(fiche)
                        toggleMenu()
                    })
                    document.getElementById(`categorie-${nomCategorie}-${nomMatiere}-contenu`).appendChild(ficheMenu);
                })
            })
        })

    } catch (err) {
        afficherErreur("Impossible de charger la fiche (problème réseau).");
        console.error(err);
    }
}

function toggleMenu() {
    menuComplet.classList.toggle("cache");
}

document.addEventListener("DOMContentLoaded", () => {
    chargerMenu();
})
document.getElementById("btn-menu").addEventListener("click", toggleMenu)
document.getElementById("btn-menu-accueil").addEventListener("click", () => {
    afficherAccueil()
})
document.getElementById("btn-menu-new").addEventListener("click", () => {
    ouvrirFormulaire()
})
document.getElementById("btn-menu-import").addEventListener("click", () => {
    document.getElementById("input-import").click();
})
document.getElementById("input-import").addEventListener("change", (event) => {
    const fichier = event.target.files[0];
    importerFiche(fichier);
})
document.getElementById("form-enregistrer").addEventListener("click", () => {
    enregistrerFormulaire()
})
document.getElementById("form-retour").addEventListener("click", () => {
    afficherMenu()
})
document.getElementById("content-retour").addEventListener("click", () => {
    afficherAccueil()
})
document.getElementById("content-exporter").addEventListener("click", () => {
    exporterFiche(ficheEnCours)
})
document.getElementById("content-modifier").addEventListener("click", () => {
    ouvrirFormulaire(ficheEnCours)
})
document.getElementById("content-supprimer").addEventListener("click", () => {
    supprimerFicheLocale(ficheEnCours.id);
    chargerMenu();
    afficherAccueil();
})

function parserFrontmatter(frontmatter) {
    let parametres = {};
    let lignes = frontmatter.split("\n");

    lignes.forEach((ligne) => {
        let [cle, value] = ligne.split(": ");
        parametres[cle] = value;
    });
    return parametres;
}

function ajouterFrontmatter(fiche) {
    return `---
matiere: ${fiche.matiere}
categorie: ${fiche.categorie}
emoji: ${fiche.emoji}
titre: ${fiche.titre}
---

${fiche.contenu}`;
    
}

function exporterFiche(fiche) {
    const ficheRecreee = ajouterFrontmatter(fiche)

    const blob = new Blob([ficheRecreee], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `${fiche.titre}.md`;
    lien.click();
    URL.revokeObjectURL(url);
}

function importerFiche(fichier) {
    const reader = new FileReader();

    reader.onload = (event) => {
        const texte = event.target.result;

        let resultat = "";
        if (texte.match(regexLF) !== null) {
            let resultat = texte.match(regexLF);
        } else if (texte.match(regexLF) === null && texte.match(regexCRLF) !== null) {
            let resultat = texte.match(regexCRLF);
        } else  if (texte.match(regexLF) === null && texte.match(regexCRLF) === null && texte.match(regexCR)  !== null) {
            let resultat = texte.match(regexCR);
        } else {
            return afficherErreur("Format CR/LF/CRLF imcompatible.");
        }

        if (resultat === null) {return afficherErreur("Frontmatter cassé ou incompatible.")}

        let fichePropre = texte.replace(`${resultat[0]}\n`, "");
        let metadonneesBrutes = parserFrontmatter(resultat[1]);
        let meta = { ...metadonneesBrutes, source: "local" };

        ajouterFicheLocale(meta.matiere, meta.categorie, meta.emoji, meta.titre, fichePropre);
        chargerMenu();
        afficherAccueil();
        afficherInfo(`Fiche ${meta.titre} ajoutée !`)
    };
        
    reader.readAsText(fichier);
}

function afficherFiche(fiche) {
    if (fiche.source === "local") {
        
        document.getElementById("content-locked").classList.add("cache")
        document.getElementById("content-modifier").classList.remove("cache")
        document.getElementById("content-supprimer").classList.remove("cache")

    } else if (fiche.source === "locked") {
        
        document.getElementById("content-modifier").classList.add("cache")
        document.getElementById("content-supprimer").classList.add("cache")
        document.getElementById("content-locked").classList.remove("cache")

    } else {
        
        document.getElementById("content-modifier").classList.add("cache")
        document.getElementById("content-supprimer").classList.add("cache")
        document.getElementById("content-locked").classList.add("cache")

        afficherErreur("Source inconnue.")
    }

    ficheEnCours = fiche

    let htmlBrut = marked.parse(fiche.contenu);
    let htmlSecu = DOMPurify.sanitize(htmlBrut);
    content.innerHTML = htmlSecu;

    accueil.classList.add("cache")
    form.classList.add("cache")
    contentComplet.classList.remove("cache")
}

async function chercherFiche(fiche) {
    if(fiche.source === "locked") {
        try {
            viderAlertes()
            let reponse = await fetch(`fiches/${fiche.nom}.md`);

            if (!reponse.ok) {
                afficherErreur(`Fiche "${fiche.nom}" introuvable.`);
                return;
            }

            let propre = await reponseToFiche(reponse);
            let fusion = { ...fiche, contenu: propre};

            afficherFiche(fusion);

        } catch (err) {
            viderAlertes()
            afficherErreur("Impossible de charger la fiche (problème réseau).");
            console.error(err);
        }
    } else if(fiche.source === "local") {
        try {
            viderAlertes()
            afficherFiche(fiche);

        } catch (err) {
            viderAlertes()
            afficherErreur("Impossible de charger la fiche (problème localStorage).");
            console.error(err);
        }
    } else {
            viderAlertes()
        afficherErreur("Impossible de charger la fiche (source non reconnue).");
    }
}

function ouvrirFormulaire(fiche = null) {
    afficherForm();

    if (fiche){
        /* EDITION */
        idEdition = fiche?.id;
        document.getElementById("form-categorie").value = fiche.categorie;
        document.getElementById("form-emoji").value = fiche.emoji;
        document.getElementById("form-titre").value = fiche.titre;
        document.getElementById("form-contenu").value = fiche.contenu;
        
        remplirSelectMatieres(fiche.matiere);
    } else {
        /* CREATION */
        idEdition = null;
        document.getElementById("form-categorie").value = "";
        document.getElementById("form-emoji").value = "";
        document.getElementById("form-titre").value = "";
        document.getElementById("form-contenu").value = "";
        
        remplirSelectMatieres();
    }
    
    afficherForm();
}

function enregistrerFormulaire() {

    let matiere = document.getElementById("form-matiere").value
    let categorie = document.getElementById("form-categorie").value
    let emoji = document.getElementById("form-emoji").value
    let titre = document.getElementById("form-titre").value
    let contenu = document.getElementById("form-contenu").value

    if (!idEdition) {
        ajouterFicheLocale(matiere, categorie, emoji, titre, contenu);
    } else {
        modifierFicheLocale(idEdition, {matiere, categorie, emoji, titre, contenu});
    }

    chargerMenu();
    afficherAccueil()
}

function annulerFormulaire() {
    afficherAccueil();

    idEdition = null;
    document.getElementById("form-categorie").value = "";
    document.getElementById("form-emoji").value = "";
    document.getElementById("form-titre").value = "";
    document.getElementById("form-contenu").value = "";
        
    remplirSelectMatieres();
}
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

const PALETTE_DEFAUT = {"Autres": "#000000",

    // LITTERAIRE, LINGUISTIQUE & HUMANITES
    "Français": "#ca0000",

    "Philosophie": "#800000",

    "Anglais": "#83ff6a",
    "Espagnol": "#f56613",
    "Allemand": "#753900",
    "Italien": "#3a7502",
    "Chinois": "#ff4d40",

    "LLCER": "#7cc6f7",
    "HLP": "#b30000",

    "Latin": "#eb9191",
    "Grec ancien": "#969696",

    // SCIENTIFIQUE & TECHNOLOGIQUE

    "Mathématiques": "#fdcf00",
    "Physique-Chimie": "#b4c8ff",
    "SVT": "#8a00da",

    "Enseignement Scientifique": "#59639e",
    "Technologie": "#183bff",
    "SI": "#c9ca66",
    "NSI": "#b052ee",
    
    "Biologie-Écologie": "#84ffa3",
    "Sciences et Technologiques Spécialisées": "#10006b",

    // SCIENCES HUMAINES, ÉCONOMIQUES & CITOYENNETE

    "Histoire-Géographie": "#00dac7",
    "EMC": "#6ed5fd",
    
    "SES": "#00da0b",
    "HGGSP": "#0095da",

    "Économie-Droit": "#fa84f0",
    "Économie-Gestion": "#397e9e",

    "Sciences de gestion et numérique": "#3a00da",
    "Management": "#7ec1e0"
}

let ficheEnCours = null;
let idEdition = null;
let dernierDragTactile = 0;

function nettoyerSurbrillances() {
    document.querySelectorAll(".drag-over, .drag-over-haut, .drag-over-bas").forEach((el) => {
        el.classList.remove("drag-over", "drag-over-haut", "drag-over-bas");
    });
}

// Pendant un drag tactile, on bloque le défilement de la page
document.addEventListener("touchmove", (e) => {
    if (document.querySelector(".menu-fiche.en-drag")) {e.preventDefault();}
}, { passive: false });

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
    
    let fichePropre = texte.replace(`${resultat[0]}`, "");
    let metadonneesBrutes = parserFrontmatter(resultat[1]);
    let metadonnees = { ...metadonneesBrutes, nom, source: "locked" };

    return metadonnees;
}

async function reponseToFiche(reponse) {
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
    
    let fichePropre = texte.replace(`${resultat[0]}`, "");

    return fichePropre;
}

function afficherAccueil () {
    fermerMenu();
    contentComplet.classList.add("cache");
    form.classList.add("cache");
    accueil.classList.remove("cache");
}

function afficherMenu () {
    accueil.classList.add("cache");
    contentComplet.classList.add("cache");
    form.classList.add("cache");
    ouvrirMenu();
}

function afficherForm () {
    accueil.classList.add("cache");
    fermerMenu();
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

        // Insérer une ligne d'information
        if (nomMatiere === "Français") {
            let séparateur = document.createElement("option");
            séparateur.textContent = "──────── LITTÉRAIRE, LINGUISTIQUE & HUMANITÉS ────────";
            séparateur.disabled = true;
            select.appendChild(séparateur);

        } else if (nomMatiere === "Mathématiques") {
            let séparateur = document.createElement("option");
            séparateur.textContent = "──────── SCIENTIFIQUE & TECHNOLOGIQUE ────────";
            séparateur.disabled = true;
            select.appendChild(séparateur);

        } else if (nomMatiere === "Histoire-Géographie") {
            let séparateur = document.createElement("option");
            séparateur.textContent = "──────── SCIENCES HUMAINES, ÉCONOMIQUES & CITOYENNETÉ ────────";
            séparateur.disabled = true;
            select.appendChild(séparateur);

        }

        // Création de l'option
        let objet = document.createElement("option");
        objet.value = nomMatiere;
        objet.textContent = nomMatiere;

        if (matiere !== null && nomMatiere === matiere) {
            objet.selected = true; 
        }
        
        select.appendChild(objet);
    });
}

function deplacerFiche(id, newMatiere, newCategorie) {
    let fiches = obtenirFichesLocales();
    let ficheBougee = fiches.find(f => f.id === id);

    if (ficheBougee) {
        ficheBougee.matiere = newMatiere;
        ficheBougee.categorie = newCategorie;

        sauvegarderFichesLocales(fiches);
        chargerMenu();
        afficherInfo(`Fiche déplacé dans ${newMatiere} ⇒ ${newCategorie} !`)
    }
}

function reorganiserFiche(FicheBougee, FicheCible, deposerApres) {
    let tableau = obtenirFichesLocales();

    let oldIndex = tableau.findIndex((fiche) => fiche.id === FicheBougee.id);
    let indexCible = tableau.findIndex((fiche) => fiche.id === FicheCible.id)

    if (oldIndex === indexCible) {return;}

    FicheBougee.matiere = FicheCible.matiere;
    FicheBougee.categorie = FicheCible.categorie;

    tableau.splice(oldIndex, 1)

    if (oldIndex > indexCible) {
        if (deposerApres) {
            tableau.splice(indexCible+1, 0, FicheBougee);
        } else {
            tableau.splice(indexCible, 0, FicheBougee);
        }
    } else {
        if (deposerApres) {
            tableau.splice(indexCible, 0, FicheBougee);
        } else {
            tableau.splice(indexCible-1, 0, FicheBougee);
        }
    }

    sauvegarderFichesLocales(tableau);
    chargerMenu();
    afficherInfo(`Fiche ${FicheBougee.titre} déplacée !`)
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
            matiereTitre.dataset.matiere = nomMatiere;
            matiereTitre.style.setProperty("--couleur-matiere", couleur);
            matiereTitre.addEventListener("click", () => {
                matiereContenu.classList.toggle("cache");
            });
            matiereTitre.addEventListener("dragover", (e) => {
                e.preventDefault();
                matiereTitre.classList.add("drag-over");
            });
            matiereTitre.addEventListener("dragleave", () => {
                matiereTitre.classList.remove("drag-over");
            });
            matiereTitre.addEventListener("drop", (e) => {
                e.preventDefault();
                e.stopPropagation();
                matiereTitre.classList.remove("drag-over");

                let idFiche = e.dataTransfer.getData("id-fiche");
                if (!idFiche) {return;}

                let ficheBougee = obtenirFichesLocales().find((f) => f.id === idFiche);
                if (!ficheBougee) {return;}

                deplacerFiche(idFiche, nomMatiere, ficheBougee.categorie);
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
            resetCouleur.addEventListener("click", (event) => {
                event.stopPropagation();
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

                let categorieGeneral = document.createElement("div");
                categorieGeneral.classList.add("menu-categorie-general");
                categorieGeneral.id = `categorie-${nomCategorie}-${nomMatiere}-general`
                categorieGeneral.dataset.matiere = nomMatiere;
                categorieGeneral.dataset.categorie = nomCategorie;

                categorieGeneral.addEventListener("dragover", (e) => {
                    e.preventDefault();
                    categorieGeneral.classList.add("drag-over");
                })
                categorieGeneral.addEventListener("dragleave", () => {
                    categorieGeneral.classList.remove("drag-over");
                })
                categorieGeneral.addEventListener("drop", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    categorieGeneral.classList.remove("drag-over");
                    let idFiche = e.dataTransfer.getData("id-fiche");
                    deplacerFiche(idFiche, nomMatiere, nomCategorie)
                })

                categorieGeneral.appendChild(categorieTitre);
                categorieGeneral.appendChild(categorieContenu);
                
                matiereContenu.appendChild(categorieGeneral)

                hierarchie[nomMatiere][nomCategorie].forEach((fiche) => {

                    let ficheMenu = document.createElement("li");
                    ficheMenu.textContent = `${fiche.emoji} ${fiche.titre}`;
                    ficheMenu.classList.add("menu-fiche");

                    if (fiche.source === "local") {
                        ficheMenu.draggable = true;
                        ficheMenu.dataset.id = fiche.id;
                        ficheMenu.addEventListener("dragstart", (e) => {
                            e.stopPropagation();
                            e.dataTransfer.setData("id-fiche", fiche.id);
                            ficheMenu.classList.add("en-drag")
                        })
                        ficheMenu.addEventListener("dragend", () => {
                            ficheMenu.classList.remove("en-drag")
                        })

                        ficheMenu.addEventListener("dragover", (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const rect = ficheMenu.getBoundingClientRect();
                            const milieu = rect.top + rect.height / 2;

                            if (e.clientY > milieu) {
                                ficheMenu.classList.add("drag-over-bas");
                                ficheMenu.classList.remove("drag-over-haut");
                            } else {
                                ficheMenu.classList.add("drag-over-haut");
                                ficheMenu.classList.remove("drag-over-bas");
                            }
                        })

                        ficheMenu.addEventListener("dragleave", () => {
                            ficheMenu.classList.remove("drag-over-haut", "drag-over-bas");
                        })

                        ficheMenu.addEventListener("drop", (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const deposerApres = ficheMenu.classList.contains("drag-over-bas");
                            ficheMenu.classList.remove("drag-over-haut", "drag-over-bas");

                            let idFicheBougee = e.dataTransfer.getData("id-fiche");
                            if (idFicheBougee === fiche.id) {return;}

                            let tableau = obtenirFichesLocales();
                            let ficheBougee = tableau.find((f) => f.id === idFicheBougee);
                            if (!ficheBougee) {return;}

                            reorganiserFiche(ficheBougee, fiche, deposerApres);
                        })

                        let minuteur = null;
                        let departX = 0;
                        let departY = 0;
                        let dragTactile = false;

                        function arreterAppui() {
                            clearTimeout(minuteur);
                            minuteur = null;
                            if (dragTactile) {dernierDragTactile = Date.now();}
                            dragTactile = false;
                            ficheMenu.classList.remove("en-drag");
                            nettoyerSurbrillances();
                        }

                        function deposerSur(cible, y) {
                            const ficheCible = cible.closest(".menu-fiche");
                            if (ficheCible && ficheCible.dataset.id) {
                                if (ficheCible === ficheMenu) {return;}
                                const cibleObjet = obtenirFichesLocales().find((f) => f.id === ficheCible.dataset.id);
                                if (!cibleObjet) {return;}
                                const rect = ficheCible.getBoundingClientRect();
                                const deposerApres = y > rect.top + rect.height / 2;
                                reorganiserFiche(fiche, cibleObjet, deposerApres);
                                return;
                            }

                            const titreMatiere = cible.closest(".menu-matiere-titre");
                            if (titreMatiere) {
                                deplacerFiche(fiche.id, titreMatiere.dataset.matiere, fiche.categorie);
                                return;
                            }

                            const categorie = cible.closest(".menu-categorie-general");
                            if (categorie) {
                                deplacerFiche(fiche.id, categorie.dataset.matiere, categorie.dataset.categorie);
                            }
                        }

                        ficheMenu.addEventListener("pointerdown", (e) => {
                            if (e.pointerType !== "touch") {return;}

                            departX = e.clientX;
                            departY = e.clientY;

                            minuteur = setTimeout(() => {
                                dragTactile = true;
                                ficheMenu.classList.add("en-drag");
                                if (navigator.vibrate) {navigator.vibrate(30);}
                            }, 400);
                        });

                        ficheMenu.addEventListener("pointermove", (e) => {
                            if (e.pointerType !== "touch") {return;}

                            if (!dragTactile) {
                                if (minuteur === null) {return;}
                                if (Math.abs(e.clientX - departX) > 10 || Math.abs(e.clientY - departY) > 10) {
                                    arreterAppui();
                                }
                                return;
                            }

                            nettoyerSurbrillances();
                            const cible = document.elementFromPoint(e.clientX, e.clientY);
                            if (!cible) {return;}

                            const ficheCible = cible.closest(".menu-fiche");
                            if (ficheCible && ficheCible.dataset.id && ficheCible !== ficheMenu) {
                                const rect = ficheCible.getBoundingClientRect();
                                if (e.clientY > rect.top + rect.height / 2) {
                                    ficheCible.classList.add("drag-over-bas");
                                } else {
                                    ficheCible.classList.add("drag-over-haut");
                                }
                                return;
                            }

                            const titreMatiere = cible.closest(".menu-matiere-titre");
                            if (titreMatiere) {
                                titreMatiere.classList.add("drag-over");
                                return;
                            }

                            const categorie = cible.closest(".menu-categorie-general");
                            if (categorie) {categorie.classList.add("drag-over");}
                        });

                        ficheMenu.addEventListener("pointerup", (e) => {
                            if (e.pointerType === "touch" && dragTactile) {
                                const cible = document.elementFromPoint(e.clientX, e.clientY);
                                arreterAppui();
                                if (cible) {deposerSur(cible, e.clientY);}
                                return;
                            }
                            arreterAppui();
                        });
                        ficheMenu.addEventListener("pointercancel", arreterAppui);
                    };

                    ficheMenu.addEventListener("click", () => {
                        if (Date.now() - dernierDragTactile < 500) {return;}
                        chercherFiche(fiche)
                        fermerMenu()
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

function ouvrirMenu() {
    menuComplet.classList.remove("cache");
    document.body.classList.add("menu-ouvert");
}

function fermerMenu() {
    menuComplet.classList.add("cache");
    document.body.classList.remove("menu-ouvert");
}
function toggleMenu() {
    if (menuComplet.classList.contains("cache")) {
        ouvrirMenu();
    } else {
        fermerMenu();
    }
}
document.addEventListener("DOMContentLoaded", () => {
    chargerMenu();
})
document.addEventListener("click", (event) => {
    if (!menuComplet.classList.contains("cache") && !menuComplet.contains(event.target) && event.target !== document.getElementById("btn-menu")) {
        toggleMenu();
    }
})
document.getElementById("btn-menu").addEventListener("click", () => {
    toggleMenu()
})
document.getElementById("btn-menu-fermer").addEventListener("click", () => {
    toggleMenu()
})
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
document.getElementById("form-retour").addEventListener("click", () => {
    afficherAccueil();
})
document.getElementById("form-enregistrer").addEventListener("click", () => {
    enregistrerFormulaire()
})
document.getElementById("content-retour").addEventListener("click", () => {
    afficherAccueil();
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
        if (value === undefined) {return afficherErreur("Frontmatter mal rédigé !")}
        parametres[cle.trim()] = value.trim();
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
    if (!fichier) return;
    const reader = new FileReader();

    reader.onload = (event) => {
        const texte = event.target.result;

        let resultat = null;
        if (texte.match(regexLF) !== null) {
            resultat = texte.match(regexLF);
        } else if (texte.match(regexLF) === null && texte.match(regexCRLF) !== null) {
            resultat = texte.match(regexCRLF);
        } else  if (texte.match(regexLF) === null && texte.match(regexCRLF) === null && texte.match(regexCR)  !== null) {
            resultat = texte.match(regexCR);
        } else {
            return afficherErreur("Format CR/LF/CRLF incompatible.");
        }

        if (resultat === null) {return afficherErreur("Frontmatter cassé ou incompatible.")}

        let fichePropre = texte.replace(`${resultat[0]}`, "");
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

    let matiere = document.getElementById("form-matiere").value !== "" ? document.getElementById("form-matiere").value : "Autres";
    let categorie = document.getElementById("form-categorie").value !== "" ? document.getElementById("form-categorie").value : "Autres";
    let emoji = document.getElementById("form-emoji").value !== "" ? document.getElementById("form-emoji").value : "❓";
    let titre = document.getElementById("form-titre").value !== "" ? document.getElementById("form-titre").value : "Inconnu";
    let contenu = document.getElementById("form-contenu").value;

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
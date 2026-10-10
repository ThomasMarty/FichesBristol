const CLE_STOCKAGE = "fiches-bristol";
const liste = document.getElementById("liste");
let fiches = [];

function charger() {
    try {
        fiches = JSON.parse(localStorage.getItem(CLE_STOCKAGE)) || [];
    } catch (err) {
        fiches = [];
    }

    if (fiches.length === 0) {
        liste.textContent = "Aucune fiche locale trouvée sur cet appareil.";
        return;
    }

    fiches.forEach((fiche, i) => {
        const li = document.createElement("li");
        const label = document.createElement("label");
        const boite = document.createElement("input");
        boite.type = "checkbox";
        boite.dataset.index = i;
        label.append(boite, ` ${fiche.matiere} › ${fiche.categorie} › ${fiche.emoji} ${fiche.titre}`);
        li.appendChild(label);
        liste.appendChild(li);
    });
}

function toutCocher() {
    const boites = [...liste.querySelectorAll("input[type=checkbox]")];
    const toutesCochees = boites.every((b) => b.checked);
    boites.forEach((b) => { b.checked = !toutesCochees; });
}

function creerLot() {
    const cochees = [...liste.querySelectorAll("input:checked")];
    if (cochees.length === 0) {
        alert("Coche au moins une fiche.");
        return;
    }

    const nom = document.getElementById("nom-lot").value.trim() || "Lot sans nom";
    const lot = {
        format: "bristol",
        version: 1,
        nom,
        fiches: cochees.map((b) => {
            const { matiere, categorie, emoji, titre, contenu } = fiches[b.dataset.index];
            return { matiere, categorie, emoji, titre, contenu };
        })
    };

    const blob = new Blob([JSON.stringify(lot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `${nom}.bristol`;
    lien.click();
    URL.revokeObjectURL(url);
}

document.getElementById("tout-cocher").addEventListener("click", toutCocher);
document.getElementById("creer").addEventListener("click", creerLot);
charger();
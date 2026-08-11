import fs from "fs";

const fichiers = fs.readdirSync("fiches");

let index = [];

fichiers.forEach((fiche) => {
        if (fiche.endsWith(".md")) {
        let nom = fiche.split(".md");
        index.push(nom[0])
    }
})

fs.writeFileSync("fiches/index.json", JSON.stringify(index, null, 2));
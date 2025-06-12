// api.js
import express from 'express';
import fs from 'fs';
import cors from 'cors';

const app = express();
const port = 3000;
const DATA_FILE = 'json.json';

app.use(cors());
app.use(express.json());

// Charger les données
app.get('/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur de lecture du fichier' });
        }
        res.json(JSON.parse(data));
    });
});

// Ajouter une donnée sans écraser les autres
app.post('/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, fileData) => {
        let data = [];

        if (!err && fileData) {
            try {
                data = JSON.parse(fileData);
                if (!Array.isArray(data)) {
                    data = []; // Si le fichier contient autre chose qu'un tableau
                }
            } catch (e) {
                data = [];
            }
        }
        const existe = data.some(item =>
            item.nom === req.body.nom && item.prenom === req.body.prenom
        );

        if (existe) {
            return res.status(409).json({ error: 'Donnée déjà existante' });
        }
        data.push(req.body); // Ajoute la nouvelle donnée

        fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
            }
            res.json({ status: 'ajouté', data: req.body });
        });
    });
});

// Lancer le serveur
app.listen(port, () => {
    console.log(`API en cours d'exécution sur http://localhost:${port}`);
});

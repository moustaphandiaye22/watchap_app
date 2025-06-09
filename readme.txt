Installation et exécution
Crée un fichier json.json à la racine du projet :

json

{
  "currentUser": null,
  "contacts": [],
  "groups": [],
  "messages": {},
  "archived": [],
  "blocked": []
}
Initialise ton projet Node.js :

npm init -y
npm install express cors
Place le code de api.js dans ton dossier projet.

Lance ton API :

node api.js
🟩 Côté front-end (dans main.js) :
Modifie la fonction saveData() ainsi :

function saveData() {
    fetch('http://localhost:3000/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appData)
    })
    .then(res => res.json())
    .then(data => console.log('Sauvegarde réussie', data))
    .catch(err => console.error('Erreur sauvegarde :', err));
}
Et la fonction loadData() dans event.js :

async function loadData() {
    try {
        const response = await fetch('http://localhost:3000/data');
        const data = await response.json();
        window.appData = { ...window.appData, ...data };
        console.log('Données chargées depuis API:', window.appData);
    } catch (error) {
        console.error('Erreur API, chargement local');
        const saved = localStorage.getItem('whatsappData');
        if (saved) {
            window.appData = { ...window.appData, ...JSON.parse(saved) };
        }
    }
}
// Configuration Firebase intégrée
const firebaseConfig = {
  apiKey: "AIzaSyCUGtHnbzj3tEQpLlfu-F9T30D3JqaRia4",
  authDomain: "notre-foyer-a937f.firebaseapp.com",
  databaseURL: "https://notre-foyer-a937f-default-rtdb.firebaseio.com",
  projectId: "notre-foyer-a937f",
  storageBucket: "notre-foyer-a937f.firebasestorage.app",
  messagingSenderId: "103124071707",
  appId: "1:103124071707:web:45d7cdb21da04c536c4fbe"
};

// Initialisation de Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

const D = { shopping: [], events: [], fridge: [], tasks: [], trash: [], expenses: [] };
let data = loadLocal();
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function loadLocal() {
  try {
    return { ...D, ...JSON.parse(localStorage.getItem('notre-foyer-v1') || '{}') };
  } catch {
    return structuredClone(D);
  }
}

function save() {
  localStorage.setItem('notre-foyer-v1', JSON.stringify(data));
  db.ref('foyerData').set(data);
  render();
}

// Synchronisation Firebase en temps réel
db.ref('foyerData').on('value', snapshot => {
  const remoteData = snapshot.val();
  if (remoteData) {
    data = { ...D, ...remoteData };
    localStorage.setItem('notre-foyer-v1', JSON.stringify(data));
    render();
  }
});

function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function iso(d) { let x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
function eur(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function fd(s) { return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(s + 'T12:00:00')); }
function days(s) { return Math.round((new Date(s + 'T00:00:00') - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000); }

function render() {
  const now = new Date();
  document.querySelector('#today').textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  let w = document.querySelector('#week'), start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  w.innerHTML = '';
  DAYS.forEach((name, i) => {
    let d = new Date(start);
    d.setDate(start.getDate() + i);
    let v = iso(d);
    w.innerHTML += `<div class="day ${v === iso(now) ? 'today' : ''} ${data.events.some(e => e.date === v) ? 'event' : ''}"><b>${name.slice(0, 3).toUpperCase()}</b><span>${d.getDate()}</span></div>`;
  });

  const todo = data.shopping.filter(x => !x.done).length;
  document.querySelector('#shopCount').textContent = `${todo} à acheter`;
  document.querySelector('#shopList').innerHTML = data.shopping.length ? data.shopping.map(x => `<div class="item"><label class="main"><input class="check" data-shop="${x.id}" type="checkbox" ${x.done ? 'checked' : ''}><span class="${x.done ? 'done' : ''}">${esc(x.name)}</span></label><button class="del" data-del-shop="${x.id}">Supprimer</button></div>`).join('') : '<div class="empty">Votre liste est vide 🛒</div>';

  document.querySelector('#eventCount').textContent = `${data.events.length} événement${data.events.length > 1 ? 's' : ''}`;
  let ev = [...data.events].sort((a, b) => a.date.localeCompare(b.date));
  document.querySelector('#eventList').innerHTML = ev.length ? ev.map(x => `<div class="item"><div><b>${esc(x.title)}</b><span class="meta">${fd(x.date)}</span></div><button class="del" data-del-event="${x.id}">Supprimer</button></div>`).join('') : '<div class="empty">Aucun événement 📅</div>';

  document.querySelector('#fridgeCount').textContent = `${data.fridge.length} aliment${data.fridge.length > 1 ? 's' : ''}`;
  let fr = [...data.fridge].sort((a, b) => a.date.localeCompare(b.date));
  document.querySelector('#foodList').innerHTML = fr.length ? fr.map(x => {
    let n = days(x.date), lab = n < 0 ? `Périmé depuis ${-n} jour${-n > 1 ? 's' : ''}` : n === 0 ? 'Expire aujourd’hui' : n === 1 ? 'Expire demain' : `Dans ${n} jours`;
    return `<div class="item ${n < 0 ? 'expired' : n <= 3 ? 'warn' : ''}"><div><b>${esc(x.name)}</b><span class="meta">${fd(x.date)} · ${lab}</span></div><button class="del" data-del-food="${x.id}">Supprimer</button></div>`;
  }).join('') : '<div class="empty">Aucun aliment 🧊</div>';

  let t = data.tasks.filter(x => !x.done).length;
  document.querySelector('#taskCount').textContent = `${t} à faire`;
  document.querySelector('#taskList').innerHTML = data.tasks.length ? data.tasks.map(x => `<div class="item"><label class="main"><input class="check" data-task="${x.id}" type="checkbox" ${x.done ? 'checked' : ''}><span class="${x.done ? 'done' : ''}"><b>${esc(x.title)}</b>${x.person ? `<small class="meta">👤 ${esc(x.person)}</small>` : ''}</span></label><button class="del" data-del-task="${x.id}">Supprimer</button></div>`).join('') : '<div class="empty">Aucune tâche 📋</div>';

  document.querySelector('#trashList').innerHTML = data.trash.length ? data.trash.map(x => `<div class="item"><div><b>${esc(x.type)}</b><span class="meta">Chaque ${esc(x.day)}</span></div><button class="del" data-del-trash="${x.id}">Supprimer</button></div>`).join('') : '<div class="empty">Configurez vos collectes 🗑️</div>';

  let m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, be = data.expenses.filter(x => x.month === m), total = be.reduce((s, x) => s + Number(x.amount), 0);
  document.querySelector('#total').textContent = eur(total);
  document.querySelector('#budgetCount').textContent = `${eur(total)} ce mois`;
  document.querySelector('#budgetList').innerHTML = be.length ? be.map(x => `<div class="item"><div><b>${esc(x.name)}</b><span class="meta">${eur(x.amount)}</span></div><button class="del" data-del-exp="${x.id}">Supprimer</button></div>`).join('') : '<div class="empty">Aucune dépense ce mois 🧮</div>';
}

function form(idForm, fn) {
  document.querySelector(idForm).addEventListener('submit', e => {
    e.preventDefault();
    fn();
    save();
  });
}

form('#shopForm', () => { data.shopping.push({ id: id(), name: shopInput.value.trim(), done: false }); shopInput.value = ''; });
form('#eventForm', () => { data.events.push({ id: id(), title: eventTitle.value.trim(), date: eventDate.value }); eventTitle.value = ''; eventDate.value = iso(new Date()); });
form('#foodForm', () => { data.fridge.push({ id: id(), name: foodName.value.trim(), date: foodDate.value }); foodName.value = ''; foodDate.value = iso(new Date()); });
form('#taskForm', () => { data.tasks.push({ id: id(), title: taskTitle.value.trim(), person: taskPerson.value.trim() }); taskTitle.value = ''; taskPerson.value = ''; });
form('#trashForm', () => { let type = trashType.value; data.trash = data.trash.filter(x => x.type !== type); data.trash.push({ id: id(), type, day: trashDay.value }); });
form('#budgetForm', () => {
  let n = Number(expenseAmount.value);
  if (!Number.isFinite(n) || n < 0) return;
  let d = new Date();
  data.expenses.push({ id: id(), name: expenseName.value.trim(), amount: n, month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
  expenseName.value = ''; expenseAmount.value = '';
});

// Écouteur pour la reconnaissance de photo (OCR Tesseract)
const cameraInput = document.querySelector('#cameraInput');
const ocrStatus = document.querySelector('#ocrStatus');

if (cameraInput) {
  cameraInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    ocrStatus.textContent = "Analyse en cours…";
    try {
      const result = await Tesseract.recognize(file, 'fra');
      const text = result.data.text.trim();
      
      if (text) {
        const cleanedText = text.split('\n')[0].replace(/[^a-zA-Z0-9 àâäéèêëîïôöùûüçÂÊÎÔÛÄËÏÖÜÀÆÆÇÉÈ]/g, '').trim();
        if (cleanedText) {
          data.shopping.push({ id: id(), name: cleanedText, done: false });
          save();
          ocrStatus.textContent = "Ajouté !";
        } else {
          ocrStatus.textContent = "Texte non lisible.";
        }
      } else {
        ocrStatus.textContent = "Aucun texte détecté.";
      }
    } catch (err) {
      console.error(err);
      ocrStatus.textContent = "Erreur de lecture.";
    }
    setTimeout(() => { ocrStatus.textContent = ""; }, 3000);
  });
}

const trashDay = document.querySelector('#trashDay');
trashDay.innerHTML = DAYS.map(x => `<option>${x}</option>`).join('');
eventDate.value = iso(new Date());
foodDate.value = iso(new Date());

document.addEventListener('click', e => {
  let o = e.target.closest('[data-open]');
  if (o) { document.querySelector('#' + o.dataset.open).showModal(); return; }
  if (e.target.closest('[data-close]')) { e.target.closest('dialog').close(); return; }
  let a = e.target.closest('[data-del-]');
  if (a) {
    let ds = [['shop', 'shopping'], ['event', 'events'], ['food', 'fridge'], ['task', 'tasks'], ['trash', 'trash'], ['exp', 'expenses']];
    for (const [k, p] of ds) if (a.dataset['del' + k[0].toUpperCase() + k.slice(1)]) data[p] = data[p].filter(x => x.id !== a.dataset['del' + k[0].toUpperCase() + k.slice(1)]);
    save();
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.shop) { let x = data.shopping.find(x => x.id === e.target.dataset.shop); if (x) x.done = e.target.checked; save(); }
  if (e.target.dataset.task) { let x = data.tasks.find(x => x.id === e.target.dataset.task); if (x) x.done = e.target.checked; save(); }
});

document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCUGtHnbzj3tEQpLlfu-F9T30D3JqaRia4",
  authDomain: "notre-foyer-a937f.firebaseapp.com",
  databaseURL: "https://notre-foyer-a937f-default-rtdb.firebaseio.com",
  projectId: "notre-foyer-a937f",
  storageBucket: "notre-foyer-a937f.firebasestorage.app",
  messagingSenderId: "103124071707",
  appId: "1:103124071707:web:45d7cdb21da04c536c4fbe"
};

// Initialisation sécurisée de Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = typeof firebase !== 'undefined' ? firebase.database() : null;

const D = { shopping: [], events: [], fridge: [], tasks: [], trash: [], expenses: [] };
let data = loadLocal();
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Sélection explicite des éléments du DOM pour éviter les ReferenceError
const shopInput = document.querySelector('#shopInput');
const eventTitle = document.querySelector('#eventTitle');
const eventDate = document.querySelector('#eventDate');
const foodName = document.querySelector('#foodName');
const foodDate = document.querySelector('#foodDate');
const taskTitle = document.querySelector('#taskTitle');
const taskPerson = document.querySelector('#taskPerson');
const trashType = document.querySelector('#trashType');
const trashDay = document.querySelector('#trashDay');
const expenseName = document.querySelector('#expenseName');
const expenseAmount = document.querySelector('#expenseAmount');
const cameraInput = document.querySelector('#cameraInput');
const ocrStatus = document.querySelector('#ocrStatus');

function loadLocal() {
  try {
    return { ...D, ...JSON.parse(localStorage.getItem('notre-foyer-v1') || '{}') };
  } catch {
    return structuredClone(D);
  }
}

function save() {
  localStorage.setItem('notre-foyer-v1', JSON.stringify(data));
  if (db) db.ref('foyerData').set(data);
  render();
}

// Synchronisation Firebase en temps réel
if (db) {
  db.ref('foyerData').on('value', snapshot => {
    const remoteData = snapshot.val();
    if (remoteData) {
      data = { ...D, ...remoteData };
      localStorage.setItem('notre-foyer-v1', JSON.stringify(data));
      render();
    }
  });
}

function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function iso(d) { let x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
function eur(n) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n); }
function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
function fd(s) { return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(s + 'T12:00:00')); }
function days(s) { return Math.round((new Date(s + 'T00:00:00') - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000); }

function render() {
  const now = new Date();
  const todayEl = document.querySelector('#today');
  if (todayEl) todayEl.textContent = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  
  let w = document.querySelector('#week');
  if (w) {
    let start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    w.innerHTML = '';
    DAYS.forEach((name, i) => {
      let d = new Date(start);
      d.setDate(start.getDate() + i);
      let v = iso(d);
      w.innerHTML += `<div class="day ${v === iso(now) ? 'today' : ''} ${data.events.some(e => e.date === v) ? 'event' : ''}"><b>${name.slice(0, 3).toUpperCase()}</b><span>${d.getDate()}</span></div>`;
    });
  }

  const todo = data.shopping.filter(x => !x.done).length;
  if (document.querySelector('#shopCount')) document.querySelector('#shopCount').textContent = `${todo} à acheter`;
  if (document.querySelector('#shopList')) {
    document.querySelector('#shopList').innerHTML = data.shopping.length 
      ? data.shopping.map(x => `<div class="item"><label class="main"><input class="check" data-shop="${x.id}" type="checkbox" ${x.done ? 'checked' : ''}><span class="${x.done ? 'done' : ''}">${esc(x.name)}</span></label><button class="del" data-type="shopping" data-id="${x.id}">Supprimer</button></div>`).join('') 
      : '<div class="empty">Votre liste est vide 🛒</div>';
  }

  if (document.querySelector('#eventCount')) document.querySelector('#eventCount').textContent = `${data.events.length} événement${data.events.length > 1 ? 's' : ''}`;
  let ev = [...data.events].sort((a, b) => a.date.localeCompare(b.date));
  if (document.querySelector('#eventList')) {
    document.querySelector('#eventList').innerHTML = ev.length 
      ? ev.map(x => `<div class="item"><div><b>${esc(x.title)}</b><span class="meta">${fd(x.date)}</span></div><button class="del" data-type="events" data-id="${x.id}">Supprimer</button></div>`).join('') 
      : '<div class="empty">Aucun événement 📅</div>';
  }

  if (document.querySelector('#fridgeCount')) document.querySelector('#fridgeCount').textContent = `${data.fridge.length} aliment${data.fridge.length > 1 ? 's' : ''}`;
  let fr = [...data.fridge].sort((a, b) => a.date.localeCompare(b.date));
  if (document.querySelector('#foodList')) {
    document.querySelector('#foodList').innerHTML = fr.length 
      ? fr.map(x => {
          let n = days(x.date), lab = n < 0 ? `Périmé depuis ${-n} jour${-n > 1 ? 's' : ''}` : n === 0 ? 'Expire aujourd’hui' : n === 1 ? 'Expire demain' : `Dans ${n} jours`;
          return `<div class="item ${n < 0 ? 'expired' : n <= 3 ? 'warn' : ''}"><div><b>${esc(x.name)}</b><span class="meta">${fd(x.date)} · ${lab}</span></div><button class="del" data-type="fridge" data-id="${x.id}">Supprimer</button></div>`;
        }).join('') 
      : '<div class="empty">Aucun aliment 🧊</div>';
  }

  let t = data.tasks.filter(x => !x.done).length;
  if (document.querySelector('#taskCount')) document.querySelector('#taskCount').textContent = `${t} à faire`;
  if (document.querySelector('#taskList')) {
    document.querySelector('#taskList').innerHTML = data.tasks.length 
      ? data.tasks.map(x => `<div class="item"><label class="main"><input class="check" data-task="${x.id}" type="checkbox" ${x.done ? 'checked' : ''}><span class="${x.done ? 'done' : ''}"><b>${esc(x.title)}</b>${x.person ? `<small class="meta">👤 ${esc(x.person)}</small>` : ''}</span></label><button class="del" data-type="tasks" data-id="${x.id}">Supprimer</button></div>`).join('') 
      : '<div class="empty">Aucune tâche 📋</div>';
  }

  if (document.querySelector('#trashList')) {
    document.querySelector('#trashList').innerHTML = data.trash.length 
      ? data.trash.map(x => `<div class="item"><div><b>${esc(x.type)}</b><span class="meta">Chaque ${esc(x.day)}</span></div><button class="del" data-type="trash" data-id="${x.id}">Supprimer</button></div>`).join('') 
      : '<div class="empty">Configurez vos collectes 🗑️</div>';
  }

  let m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, be = data.expenses.filter(x => x.month === m), total = be.reduce((s, x) => s + Number(x.amount), 0);
  if (document.querySelector('#total')) document.querySelector('#total').textContent = eur(total);
  if (document.querySelector('#budgetCount')) document.querySelector('#budgetCount').textContent = `${eur(total)} ce mois`;
  if (document.querySelector('#budgetList')) {
    document.querySelector('#budgetList').innerHTML = be.length 
      ? be.map(x => `<div class="item"><div><b>${esc(x.name)}</b><span class="meta">${eur(x.amount)}</span></div><button class="del" data-type="expenses" data-id="${x.id}">Supprimer</button></div>`).join('') 
      : '<div class="empty">Aucune dépense ce mois 🧮</div>';
  }
}

function form(idForm, fn) {
  const el = document.querySelector(idForm);
  if (el) {
    el.addEventListener('submit', e => {
      e.preventDefault();
      fn();
      save();
    });
  }
}

form('#shopForm', () => { if (shopInput && shopInput.value.trim()) { data.shopping.push({ id: id(), name: shopInput.value.trim(), done: false }); shopInput.value = ''; } });
form('#eventForm', () => { if (eventTitle && eventTitle.value.trim() && eventDate) { data.events.push({ id: id(), title: eventTitle.value.trim(), date: eventDate.value }); eventTitle.value = ''; eventDate.value = iso(new Date()); } });
form('#foodForm', () => { if (foodName && foodName.value.trim() && foodDate) { data.fridge.push({ id: id(), name: foodName.value.trim(), date: foodDate.value }); foodName.value = ''; foodDate.value = iso(new Date()); } });
form('#taskForm', () => { if (taskTitle && taskTitle.value.trim()) { data.tasks.push({ id: id(), title: taskTitle.value.trim(), person: taskPerson ? taskPerson.value.trim() : '' }); taskTitle.value = ''; if (taskPerson) taskPerson.value = ''; } });
form('#trashForm', () => { if (trashType && trashDay) { let type = trashType.value; data.trash = data.trash.filter(x => x.type !== type); data.trash.push({ id: id(), type, day: trashDay.value }); } });
form('#budgetForm', () => {
  if (expenseName && expenseAmount) {
    let n = Number(expenseAmount.value);
    if (!Number.isFinite(n) || n < 0 || !expenseName.value.trim()) return;
    let d = new Date();
    data.expenses.push({ id: id(), name: expenseName.value.trim(), amount: n, month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` });
    expenseName.value = ''; expenseAmount.value = '';
  }
});

// Écouteur pour la reconnaissance de photo (OCR Tesseract avec filtre)
if (cameraInput && ocrStatus) {
  cameraInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    ocrStatus.textContent = "Analyse en cours…";
    try {
      if (typeof Tesseract === 'undefined') throw new Error("Tesseract non chargé");
      const result = await Tesseract.recognize(file, 'fra');
      
      // Filtrage des lignes pour exclure les bruits et petits morceaux (moins de 3 caractères)
      const lines = result.data.text
        .split('\n')
        .map(l => l.replace(/[^a-zA-Z0-9 àâäéèêëîïôöùûüçÂÊÎÔÛÄËÏÖÜÀÆÆÇÉÈ]/g, '').trim())
        .filter(l => l.length >= 3);

      if (lines.length > 0) {
        const cleanedText = lines[0];
        data.shopping.push({ id: id(), name: cleanedText, done: false });
        save();
        ocrStatus.textContent = "Ajouté !";
      } else {
        ocrStatus.textContent = "Texte non lisible ou trop court.";
      }
    } catch (err) {
      console.error(err);
      ocrStatus.textContent = "Erreur de lecture.";
    }
    setTimeout(() => { ocrStatus.textContent = ""; }, 3000);
  });
}

if (trashDay) trashDay.innerHTML = DAYS.map(x => `<option>${x}</option>`).join('');
if (eventDate) eventDate.value = iso(new Date());
if (foodDate) foodDate.value = iso(new Date());

// Écouteur global pour clics (ouvertures/fermetures de modales et suppressions)
document.addEventListener('click', e => {
  let o = e.target.closest('[data-open]');
  if (o) { 
    const modal = document.querySelector('#' + o.dataset.open);
    if (modal) modal.showModal(); 
    return; 
  }
  
  if (e.target.closest('[data-close]')) { 
    const dialog = e.target.closest('dialog');
    if (dialog) dialog.close(); 
    return; 
  }
  
  // Gestion directe et standardisée de la suppression
  let delBtn = e.target.closest('.del');
  if (delBtn) {
    const type = delBtn.dataset.type;
    const itemId = delBtn.dataset.id;
    if (type && itemId && data[type]) {
      data[type] = data[type].filter(x => x.id !== itemId);
      save();
    }
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.shop) { let x = data.shopping.find(x => x.id === e.target.dataset.shop); if (x) x.done = e.target.checked; save(); }
  if (e.target.dataset.task) { let x = data.tasks.find(x => x.id === e.target.dataset.task); if (x) x.done = e.target.checked; save(); }
});

document.querySelectorAll('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});

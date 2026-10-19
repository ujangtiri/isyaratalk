import { GESTURES_DATA } from './data.js';

const search = document.getElementById('searchInput');
const cards = document.getElementById('cards');
const filterAll = document.getElementById('filterAll');
const filterSIBI = document.getElementById('filterSIBI');
let currentFilter = 'ALL';

function render(list) {
  cards.innerHTML = '';
  list.forEach((g) => {
    const c = document.createElement('div');
    c.className = 'rounded-2xl border border-slate-700 bg-slate-800 shadow-sm p-4 flex flex-col transition hover:shadow-md hover:border-blue-500/50';
    const img = document.createElement('img');
    img.src = g.image;
    img.alt = `Gesture ${g.letter}`;
    img.className = 'w-full h-32 object-cover rounded-xl bg-slate-700';
    const title = document.createElement('div');
    title.className = 'mt-3 text-xl font-bold text-blue-400';
    title.textContent = g.letter;
    const info = document.createElement('div');
    info.className = 'mt-2 text-sm text-slate-300';
    const lines = [];
    if (currentFilter === 'ALL' || currentFilter === 'SIBI') lines.push(`SIBI: ${g.sibi}`);
    lines.push(`Deskripsi: ${g.description}`);
    info.innerHTML = lines.join('<br/>');
    c.appendChild(img);
    c.appendChild(title);
    c.appendChild(info);
    cards.appendChild(c);
  });
}

function getFilteredData(q) {
  const query = (q || '').trim().toUpperCase();
  if (!query) return GESTURES_DATA;
  return GESTURES_DATA.filter((g) => g.letter.includes(query));
}

function setFilter(type, btn) {
  currentFilter = type;
  updateActiveButton(btn);
  const data = getFilteredData(search ? search.value : '');
  render(data);
}

function updateActiveButton(active) {
  const activeClasses = 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition border border-blue-600';
  const inactiveClasses = 'px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition';
  [filterAll, filterSIBI].forEach((b) => {
    b.className = b === active ? activeClasses : inactiveClasses;
  });
}

render(GESTURES_DATA);

if (search) {
  search.addEventListener('input', (e) => {
    const data = getFilteredData(e.target.value);
    render(data);
  });
}

filterAll.addEventListener('click', () => setFilter('ALL', filterAll));
filterSIBI.addEventListener('click', () => setFilter('SIBI', filterSIBI));

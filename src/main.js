// CalgaryVerses: load verses and provide simple game shell
let verses = [];
let bookMap = {};
// Built-in fallback data for when `fetch` fails (e.g., opened via file://)
const _fallbackVerses = [
  { book: 'Psalm', chapter: 119, startVerse: 105, endVerse: 105, text: 'Your word is a lamp to my feet and a light to my path.', difficulty: 1, categories: ['guidance','word'] },
  { book: 'Isaiah', chapter: 40, startVerse: 31, endVerse: 31, text: 'Those who hope in the Lord will renew their strength.', difficulty: 1, categories: ['hope','strength'] },
  { book: '1 Corinthians', chapter: 16, startVerse: 14, endVerse: 14, text: 'Let all that you do be done in love.', difficulty: 2, categories: ['love','ethics'] },
  { book: 'Psalm', chapter: 145, startVerse: 18, endVerse: 18, text: 'The Lord is near to all who call on him.', difficulty: 2, categories: ['presence','prayer'] }
];
const _fallbackBookMap = {
  'psalm': 'Psalm', 'psalms': 'Psalm', 'isaiah': 'Isaiah', '1corinthians': '1 Corinthians', '1 corinthians': '1 Corinthians'
};

const verseText = document.querySelector("#verseText");
const homeImage = document.querySelector("#homeImage");

const $ = (sel) => document.querySelector(sel);

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

async function loadData() {
  try {
    const [vRes, bRes, iRes] = await Promise.all([
      fetch('./src/verses.json'),
      fetch('./src/bookMap.json'),
      fetch('./src/images.json'),
    ]);
    verses = await vRes.json();
    bookMap = await bRes.json();
    const images = await iRes.json().catch(()=>[]);
    if (images && images.length) {
      const pick = images[Math.floor(Math.random()*images.length)];
      homeImage.src = `assets/images/${pick}`;
    } else {
      // fallback: keep CSS background
      homeImage.style.display = 'none';
    }
  } catch (e) {
    console.error('Failed to load data', e);
    // fallback to embedded data so the UI still works when opened from file://
    verses = _fallbackVerses.slice();
    bookMap = Object.assign({}, _fallbackBookMap);
    try { homeImage.style.display = 'none'; } catch(_){}
  }
}

function populateManageBookList() {
  const listEl = document.querySelector('#manageBookList');
  if (!listEl) return;
  // gather unique book names from bookMap, verses and user verses
  const set = new Set();
  if (bookMap) Object.values(bookMap).forEach(b => { if (b) set.add(b); });
  verses.forEach(v => { if (v.book) set.add(v.book); });
  const users = loadUserVerses(); users.forEach(u => { if (u.book) set.add(u.book); });
  const books = Array.from(set);
  listEl.innerHTML = '';
  books.forEach(b => {
    const opt = document.createElement('option'); opt.value = b; listEl.appendChild(opt);
  });
}

function normalizeBook(input) {
  if (!input) return '';
  const key = input.toString().trim().toLowerCase().replace(/\./g,'');
  return bookMap[key] || input;
}

function pickRandomVerse() {
  if (!verses.length) return null;
  const filtered = getFilteredVerses();
  if (!filtered.length) return null;
  return filtered[Math.floor(Math.random()*filtered.length)];
}

function getFilteredVerses() {
  const diffSel = $('#selectDifficulty');
  const catSel = $('#selectCategory');
  const diffVal = diffSel ? diffSel.value : '2';
  const catVal = catSel ? catSel.value : 'all';
  return verses.filter(v => {
    const okDiff = (diffVal === 'all') || (Number(v.difficulty) === Number(diffVal));
    const okCat = (catVal === 'all') || (Array.isArray(v.categories) && v.categories.map(c=>c.toLowerCase()).includes(catVal.toLowerCase()));
    return okDiff && okCat;
  });
}

function populateFilters() {
  // build category list from verses
  const set = new Set();
  verses.forEach(v => {
    if (Array.isArray(v.categories)) v.categories.forEach(c => set.add(c));
  });
  const catSel = $('#selectCategory');
  if (!catSel) return;
  // clear existing (leave 'all')
  const existing = Array.from(catSel.querySelectorAll('option')).map(o=>o.value);
  set.forEach(cat => {
    if (!existing.includes(cat)) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat[0].toUpperCase() + cat.slice(1);
      catSel.appendChild(opt);
    }
  });
  // default difficulty to medium
  const diffSel = $('#selectDifficulty');
  // restore saved prefs if present
  const prefs = loadPrefs();
  if (diffSel) diffSel.value = prefs && prefs.difficulty ? prefs.difficulty : '2';
  if (diffSel) diffSel.onchange = savePrefs;
  if (catSel) catSel.onchange = savePrefs;
}

function populateBookSelect() {
  const sel = $('#recallBookSelect');
  if (!sel) return;
  // gather unique book names from bookMap and verses
  const mapVals = bookMap ? Object.values(bookMap).filter(Boolean) : [];
  const verseBooks = verses.map(v => v.book).filter(Boolean);
  const set = new Set([...mapVals, ...verseBooks]);
  const books = Array.from(set);
  // canonical Bible book order to present books in reading order rather than alphabetical
  const canonicalOrder = [
    'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
    'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
  ];
  books.sort((a,b) => {
    const ai = canonicalOrder.indexOf(a);
    const bi = canonicalOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  sel.innerHTML = '';
  books.forEach(b => {
    const o = document.createElement('option');
    o.value = b;
    o.textContent = b;
    sel.appendChild(o);
  });
}

function savePrefs() {
  const diff = $('#selectDifficulty') ? $('#selectDifficulty').value : '2';
  const cat = $('#selectCategory') ? $('#selectCategory').value : 'all';
  const prefs = { difficulty: diff, category: cat };
  // preserve existing statsFilter if present
  const existing = loadPrefs() || {};
  if (existing.statsFilter) prefs.statsFilter = existing.statsFilter;
  try { localStorage.setItem('calgaryVerses_prefs', JSON.stringify(prefs)); } catch(e) { console.warn('prefs save failed', e); }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem('calgaryVerses_prefs');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

// --- Stats UI & persistence for stats filter ---
function openStats() {
  hide($('#homeIntro'));
  hideHomeHeader();
  hide($('#recall'));
  hide($('#match'));
  hide($('#order'));
  show($('#stats'));
  const prefs = loadPrefs() || {};
  const sf = prefs.statsFilter || { mode: 'all', sinceDays: '7' };
  $('#statsMode').value = sf.mode || 'all';
  $('#statsSince').value = sf.sinceDays || '7';
  $('#statsMode').onchange = saveStatsFilter;
  $('#statsSince').onchange = saveStatsFilter;
  $('#statsBack').onclick = backToHome;
  $('#statsClear').onclick = clearStats;
  renderStats();
}

function saveStatsFilter() {
  const mode = $('#statsMode') ? $('#statsMode').value : 'all';
  const sinceDays = $('#statsSince') ? $('#statsSince').value : '7';
  const prefs = loadPrefs() || {};
  prefs.statsFilter = { mode, sinceDays };
  try { localStorage.setItem('calgaryVerses_prefs', JSON.stringify(prefs)); } catch(e) { console.warn('saveStatsFilter failed', e); }
  renderStats();
}

function renderStats() {
  const raw = localStorage.getItem('calgaryVerses_stats');
  const data = raw ? JSON.parse(raw).attempts || [] : [];
  const prefs = loadPrefs() || {};
  const sf = prefs.statsFilter || { mode: 'all', sinceDays: '7' };
  const container = $('#statsList');
  container.innerHTML = '';
  const sinceMs = sf.sinceDays === 'all' ? 0 : Date.now() - Number(sf.sinceDays)*24*60*60*1000;
  const filtered = data.filter(a => {
    const okMode = sf.mode === 'all' || a.mode === sf.mode;
    const okTime = sinceMs === 0 || a.when >= sinceMs;
    return okMode && okTime;
  }).slice().reverse();
  if (!filtered.length) {
    container.textContent = 'No results for selected filter.';
    return;
  }
  filtered.forEach(item => {
    const el = document.createElement('div');
    el.className = 'stat-item';
    const when = new Date(item.when).toLocaleString();
    el.textContent = `${item.mode.toUpperCase()}: ${item.correct ? 'Correct' : 'Incorrect'} — ${when}`;
    container.appendChild(el);
  });
}

function clearStats() {
  if (!confirm('Clear all saved history?')) return;
  localStorage.removeItem('calgaryVerses_stats');
  renderStats();
}

// --- Recall game ---
function startRecall() {
  hide($('#homeIntro'));
  show($('#gameControlsShared'));
  show($('#recall'));
  const panel = document.querySelector('.verse-panel'); if (panel) panel.classList.remove('home-empty');
  $('#recallFeedback').textContent = '';
  const verse = pickRandomVerse();
  if (!verse) return;
  $('#recallVerse').textContent = `"${verse.text}"`;
  $('#recallForm').onsubmit = (ev) => {
    ev.preventDefault();
    const bookInput = $('#recallBookSelect') ? $('#recallBookSelect').value : normalizeBook($('#recallBook').value);
    const chapterInput = Number($('#recallChapter').value);
    const correctBook = verse.book;
    const correctChapter = Number(verse.chapter);
    const okBook = (bookInput.toLowerCase() === correctBook.toLowerCase()) || (bookMap[bookInput.toLowerCase()] && bookMap[bookInput.toLowerCase()] === correctBook);
    const okChapter = chapterInput === correctChapter;
    if (okBook && okChapter) {
      $('#recallFeedback').textContent = 'Correct!';
      saveResult('recall', true);
    } else {
      $('#recallFeedback').textContent = `Incorrect — answer: ${correctBook} ${correctChapter}`;
      saveResult('recall', false);
    }
  };
  // validation: disable submit until chapter filled
  const submitBtn = $('#recallSubmit');
  const chapInput = $('#recallChapter');
  if (submitBtn && chapInput) {
    submitBtn.disabled = !chapInput.value;
    chapInput.addEventListener('input', () => { submitBtn.disabled = !chapInput.value; });
  }
  $('#recallSkip').onclick = () => {
    const sel = $('#recallBookSelect'); if (sel) sel.value = '';
    $('#recallChapter').value = '';
    startRecall();
  };
  $('#recallBack').onclick = () => { backToHome(); };
}

// --- Match game ---
function startMatch() {
  hide($('#homeIntro'));
  show($('#gameControlsShared'));
  show($('#match'));
  const panel = document.querySelector('.verse-panel'); if (panel) panel.classList.remove('home-empty');
  const verse = pickRandomVerse();
  if (!verse) return;
  $('#matchVerse').textContent = `"${verse.text}"`;
  // build options
  const options = new Set();
  options.add(`${verse.book} ${verse.chapter}`);
  while (options.size < 3 && verses.length>1) {
    const v = verses[Math.floor(Math.random()*verses.length)];
    options.add(`${v.book} ${v.chapter}`);
  }
  const opts = Array.from(options).sort(()=>Math.random()-0.5);
  const container = $('#matchOptions');
  container.innerHTML = '';
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.onclick = () => {
      const correct = opt === `${verse.book} ${verse.chapter}`;
      if (correct) {
        btn.classList.add('correct');
        saveResult('match', true);
      } else {
        btn.classList.add('incorrect');
        saveResult('match', false);
      }
      // show result then next
      setTimeout(startMatch, 800);
    };
    container.appendChild(btn);
  });
  $('#matchBack').onclick = () => { backToHome(); };
}

function backToHome() {
  show($('#homeIntro'));
  hide($('#recall'));
  hide($('#match'));
  hide($('#order'));
  updateHomePanelState();
  // show header controls again
  showHomeHeader();
  hide($('#gameControlsShared'));
}

function hideHomeHeader() {
  const hh = document.querySelector('.home-header'); if (hh) hh.style.display = 'none';
}

function showHomeHeader() {
  const hh = document.querySelector('.home-header'); if (hh) hh.style.display = '';
}

function updateHomePanelState() {
  const panel = document.querySelector('.verse-panel');
  if (!panel) return;
  // if any game section is visible (not hidden), remove home-empty
  const gameSections = document.querySelectorAll('.game-section');
  let anyVisible = false;
  gameSections.forEach(s => { if (!s.classList.contains('hidden')) anyVisible = true; });
  // also consider if homeIntro has content
  const homeIntro = document.querySelector('#homeIntro');
  const hasHomeContent = homeIntro && homeIntro.children.length > 0 && homeIntro.textContent.trim().length>0;
  if (!anyVisible && !hasHomeContent) {
    panel.classList.add('home-empty');
  } else {
    panel.classList.remove('home-empty');
  }
}

// --- persistence ---
function saveResult(mode, correct) {
  try {
    const key = 'calgaryVerses_stats';
    const raw = localStorage.getItem(key);
    const stats = raw ? JSON.parse(raw) : { attempts: [] };
    stats.attempts.push({ mode, correct, when: Date.now() });
    localStorage.setItem(key, JSON.stringify(stats));
    // show quick feedback and update home summary
    showToast(correct ? 'Correct' : 'Incorrect', correct ? 'success' : 'fail');
    renderHomeStats();
  } catch (e) { console.warn('save failed', e); }
}

function renderHomeStats() {
  const raw = localStorage.getItem('calgaryVerses_stats');
  const data = raw ? JSON.parse(raw).attempts || [] : [];
  const total = data.length;
  const correct = data.filter(a=>a.correct).length;
  const accuracy = total ? Math.round((correct/total)*100) + '%' : '—';
  // compute current streak (consecutive corrects from the last attempt)
  let streak = 0;
  for (let i = data.length-1; i>=0; i--) {
    if (data[i].correct) streak++; else break;
  }
  const streakEl = $('#homeStreak'); if (streakEl) streakEl.textContent = streak || '—';
  const accEl = $('#homeAccuracy'); if (accEl) accEl.textContent = accuracy;
}

function showToast(message, kind='') {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t);
  }
  t.textContent = message;
  t.classList.remove('success','fail');
  if (kind) t.classList.add(kind);
  t.classList.add('show');
  clearTimeout(t._hide);
  t._hide = setTimeout(()=> t.classList.remove('show'), 900);
}

// --- init / wire up ---
window.addEventListener('load', async () => {
  await loadData();
  // load user verses into memory so they participate in games
  loadUserVersesIntoMemory();
  // populate modal book suggestions
  populateManageBookList();
  // wire buttons
  $('#playRecall').onclick = startRecall;
  $('#playMatch').onclick = startMatch;
  $('#playOrder').onclick = () => { hideHomeHeader(); hide($('#homeIntro')); show($('#order')); };
  $('#viewScores').onclick = openStats;
  // manage verses button
  const mBtn = $('#manageVerses'); if (mBtn) mBtn.onclick = openManageVerses;
  $('#matchBack').onclick = backToHome;
  $('#orderBack').onclick = backToHome;
  // manage panel controls
  const mNew = $('#manageNew'); if (mNew) mNew.onclick = () => showManageForm();
  const mFilter = $('#manageFilter'); if (mFilter) mFilter.addEventListener('input', renderManageList);
  const mForm = $('#manageForm'); if (mForm) mForm.onsubmit = handleManageSave;
  const mCancel = $('#manageCancel'); if (mCancel) mCancel.onclick = () => closeManageModal();
  const mClose = $('#manageClose'); if (mClose) mClose.onclick = () => backToHome();
  // populate filters and stats
  populateFilters();
  populateBookSelect();
  setupDifficultyPills();
  // ensure shared controls are populated/visible state
  // shared controls live on the home card and should be visible on load
  updateHomePanelState();
  renderHomeStats();
});

function setupDifficultyPills() {
  const pills = Array.from(document.querySelectorAll('.diff-pill'));
  if (!pills || pills.length===0) return;
  const container = document.querySelector('.difficulty-pills');
  // initialize ARIA state and click handlers
  pills.forEach(p => {
    p.setAttribute('role', 'tab');
    p.setAttribute('aria-pressed', 'false');
    p.addEventListener('click', () => {
      const val = p.getAttribute('data-diff');
      const sel = $('#selectDifficulty');
      if (sel) sel.value = val;
      // mark active
      pills.forEach(x=>{ x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
      p.classList.add('active');
      p.setAttribute('aria-pressed','true');
      savePrefs();
    });
    // allow Enter/Space to activate when focused
    p.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        p.click();
      }
    });
  });

  // keyboard navigation for pills (arrow keys, Home/End)
  if (container) {
    container.addEventListener('keydown', (ev) => {
      const key = ev.key;
      const focused = document.activeElement;
      const idx = pills.indexOf(focused);
      if (key === 'ArrowRight' || key === 'ArrowDown') {
        ev.preventDefault();
        const next = pills[(idx + 1) % pills.length]; next.focus();
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        ev.preventDefault();
        const prev = pills[(idx - 1 + pills.length) % pills.length]; prev.focus();
      } else if (key === 'Home') {
        ev.preventDefault(); pills[0].focus();
      } else if (key === 'End') {
        ev.preventDefault(); pills[pills.length-1].focus();
      }
    });
  }

  // initialize active from prefs
  const prefs = loadPrefs() || {};
  const diff = prefs.difficulty || '2';
  pills.forEach(p => {
    if (p.getAttribute('data-diff') === String(diff)) {
      p.classList.add('active'); p.setAttribute('aria-pressed','true');
    } else { p.classList.remove('active'); p.setAttribute('aria-pressed','false'); }
  });
}

/* -----------------------
   Manage Verses (localStorage CRUD)
   ----------------------- */
const USER_VERSES_KEY = 'calgaryVerses_userVerses';

function loadUserVerses() {
  try {
    const raw = localStorage.getItem(USER_VERSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveUserVerses(list) {
  try { localStorage.setItem(USER_VERSES_KEY, JSON.stringify(list)); } catch(e) { console.warn('save user verses failed', e); }
}

function loadUserVersesIntoMemory() {
  const users = loadUserVerses();
  if (users && users.length) {
    // ensure these are included in the main `verses` array so games can use them
    verses = verses.concat(users.map(u => ({ book: u.book, chapter: Number(u.chapter), text: u.text, difficulty: Number(u.difficulty), categories: Array.isArray(u.categories)?u.categories:[] })));
  }
}

function openManageVerses() {
  hide($('#homeIntro'));
  hideHomeHeader();
  hide($('#recall'));
  hide($('#match'));
  hide($('#order'));
  hide($('#stats'));
  show($('#manage'));
  // ensure the verse panel is interactive (not `home-empty` which disables pointer events)
  const panel = document.querySelector('.verse-panel'); if (panel) panel.classList.remove('home-empty');
  renderManageList();
}

function showManageForm(clear=true) {
  // prepare modal form for new entry and open modal
  $('#manageId').value = '';
  if (clear) {
    $('#manageBook').value = '';
    $('#manageChapter').value = '';
    $('#manageStartVerse').value = '';
    $('#manageEndVerse').value = '';
    $('#manageText').value = '';
    $('#manageDifficulty').value = '2';
    $('#manageCategories').value = '';
  }
  show($('#manageModal'));
  document.body.classList.add('modal-open');
  // ensure modal dialog scrolls to top so book list is visible
  const dialog = document.querySelector('.modal-dialog'); if (dialog) dialog.scrollTop = 0;
  // repopulate book datalist in case new books were added
  populateManageBookList();
  // focus first field
  setTimeout(() => { const b = $('#manageBook'); if (b) { b.focus(); b.scrollIntoView({block:'center'}); } }, 50);
}

function handleManageSave(ev) {
  ev.preventDefault();
  const id = $('#manageId').value;
  const book = $('#manageBook').value.trim();
  const chapter = Number($('#manageChapter').value);
  const startVerse = $('#manageStartVerse').value ? Number($('#manageStartVerse').value) : null;
  const endVerse = $('#manageEndVerse').value ? Number($('#manageEndVerse').value) : null;
  const text = $('#manageText').value.trim();
  const difficulty = $('#manageDifficulty').value;
  const cats = ($('#manageCategories').value || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!book || !chapter || !text) { alert('Please complete Book, Chapter and Text'); return; }
  const list = loadUserVerses();
  if (id) {
    // edit
    const idx = list.findIndex(x=>String(x.id)===String(id));
    if (idx !== -1) {
      list[idx] = { id: list[idx].id, book, chapter, startVerse, endVerse, text, difficulty, categories: cats };
    }
  } else {
    const newItem = { id: Date.now(), book, chapter, startVerse, endVerse, text, difficulty, categories: cats };
    list.push(newItem);
    // also add to memory for immediate game use
    verses.push({ book, chapter: Number(chapter), startVerse: startVerse || null, endVerse: endVerse || null, text, difficulty: Number(difficulty), categories: cats });
  }
  saveUserVerses(list);
  renderManageList();
  showToast('Saved', 'success');
  // close modal and return to manage list
  hide($('#manageModal'));
}

function renderManageList() {
  const container = $('#manageList');
  if (!container) return;
  const filter = ($('#manageFilter') && $('#manageFilter').value) ? $('#manageFilter').value.toLowerCase() : '';
  const list = loadUserVerses().slice().reverse();
  container.innerHTML = '';
  if (!list.length) { container.textContent = 'No saved verses.'; return; }
  list.forEach(item => {
    const matches = !filter || (item.book && item.book.toLowerCase().includes(filter)) || (Array.isArray(item.categories) && item.categories.join(' ').toLowerCase().includes(filter));
    if (!matches) return;
    const el = document.createElement('div'); el.className = 'manage-item';
    const meta = document.createElement('div'); meta.className = 'meta';
    const versesStr = item.startVerse ? (item.endVerse ? `${item.startVerse}-${item.endVerse}` : `${item.startVerse}`) : '';
    meta.textContent = `${item.book} ${item.chapter}${versesStr ? ':'+versesStr : ''} — ${item.text.slice(0,120)}${item.text.length>120?'…':''}`;
    const right = document.createElement('div'); right.className = 'actions';
    const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.onclick = () => editVerse(item.id);
    const del = document.createElement('button'); del.textContent = 'Delete'; del.onclick = () => deleteVerse(item.id);
    right.appendChild(edit); right.appendChild(del);
    el.appendChild(meta); el.appendChild(right);
    container.appendChild(el);
  });
}

function editVerse(id) {
  const list = loadUserVerses();
  const found = list.find(x=>String(x.id)===String(id));
  if (!found) return;
  $('#manageId').value = found.id;
  $('#manageBook').value = found.book || '';
  $('#manageChapter').value = found.chapter || '';
  $('#manageStartVerse').value = found.startVerse || '';
  $('#manageEndVerse').value = found.endVerse || '';
  $('#manageText').value = found.text || '';
  $('#manageDifficulty').value = found.difficulty || '2';
  $('#manageCategories').value = (found.categories || []).join(', ');
  // open modal editor
  populateManageBookList();
  show($('#manageModal'));
  document.body.classList.add('modal-open');
  const dialog = document.querySelector('.modal-dialog'); if (dialog) dialog.scrollTop = 0;
  setTimeout(()=> { const b = $('#manageBook'); if (b) { b.focus(); b.scrollIntoView({block:'center'}); } }, 50);
}

function deleteVerse(id) {
  if (!confirm('Delete this verse?')) return;
  const list = loadUserVerses();
  const idx = list.findIndex(x=>String(x.id)===String(id));
  if (idx === -1) return;
  // remove from stored list
  const removed = list.splice(idx,1);
  saveUserVerses(list);
  // also remove one matching entry from in-memory `verses` by matching book+chapter+text
  const memIdx = verses.findIndex(v => v.book===removed[0].book && String(v.chapter)===String(removed[0].chapter) && v.text===removed[0].text && ( (removed[0].startVerse==null && !v.startVerse) || String(v.startVerse)===String(removed[0].startVerse) ));
  if (memIdx !== -1) verses.splice(memIdx,1);
  renderManageList();
  showToast('Deleted', 'fail');
}

// Modal dismissal helpers
const manageModal = () => $('#manageModal');
function closeManageModal() { hide($('#manageModal')); document.body.classList.remove('modal-open'); }

// attach backdrop click and Escape handler
document.addEventListener('click', (ev) => {
  const target = ev.target;
  if (target && target.dataset && target.dataset.dismiss === 'modal') {
    closeManageModal();
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') {
    const m = manageModal(); if (m && !m.classList.contains('hidden')) closeManageModal();
  }
});

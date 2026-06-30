// CalgaryVerses: load verses and provide simple game shell
let verses = [];
let bookMap = {};
let appImages = [];
const BIBLE_BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];
// Built-in fallback data for when `fetch` fails (e.g., opened via file://)
const _fallbackVerses = [
  { book: 'Psalm', chapter: 119, startVerse: 105, endVerse: 105, text: 'Your word is a lamp to my foot, And a light for my path.', difficulty: 1, categories: ['guidance','word'] },
  { book: 'Isaiah', chapter: 40, startVerse: 31, endVerse: 31, text: 'But those hoping in Jehovah will regain power. They will soar on wings like eagles. They will run and not grow weary; They will walk and not tire out.', difficulty: 1, categories: ['hope','strength'] },
  { book: '1 Corinthians', chapter: 16, startVerse: 14, endVerse: 14, text: 'Let everything you do be done with love.', difficulty: 2, categories: ['love','ethics'] },
  { book: 'Psalm', chapter: 145, startVerse: 18, endVerse: 18, text: 'Jehovah is near to all those calling on him, To all who call on him in truth.', difficulty: 2, categories: ['presence','prayer'] }
];
const _fallbackBookMap = {
  'psalm': 'Psalm', 'psalms': 'Psalm', 'isaiah': 'Isaiah', '1corinthians': '1 Corinthians', '1 corinthians': '1 Corinthians'
};
const DIFFICULTY_LABELS = {
  '1': 'Easy',
  '2': 'Regular',
  '3': 'Hard',
  all: 'Any'
};
const _fallbackImages = [
  'logo_horse_lineart_2.png',
  'logo_calgary_lineart_1.png',
  'horse_mountains_orange.png',
  'horse_mountains_calgary.png',
  'elk_mountains_calgary.png',
  'cowboy_hat_mountains.png',
  'bison_mountains_orange.png',
  'bison_mountains_calgary.png',
  'bison_mountains_calgary-1.png',
  'bison_calgary_2.png',
  'bison_calgary.png',
  'bear_multicolor.png',
  'bear_mountains_green.png',
  'bear_mountains_calgarry.png',
  'bear_mountains_blue.png'
];

const verseText = document.querySelector("#verseText");
const homeImage = document.querySelector("#homeImage");

const $ = (sel) => document.querySelector(sel);

function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function showOnlySection(sectionId) {
  hide($('#homeIntro'));
  hideHomeHeader();
  ['recall', 'match', 'order', 'stats', 'manage'].forEach(id => {
    const section = $(`#${id}`);
    if (!section) return;
    if (id === sectionId) show(section);
    else hide(section);
  });
  const panel = document.querySelector('.verse-panel');
  if (panel) panel.classList.remove('home-empty');
}

async function loadData() {
  try {
    const [vRes, bRes, iRes] = await Promise.all([
      fetch('./src/verses.json'),
      fetch('./src/bookMap.json'),
      fetch('./src/images.json'),
    ]);
    verses = await vRes.json();
    bookMap = await bRes.json();
    appImages = await iRes.json().catch(()=>[]);
    if (appImages && appImages.length) {
      const pick = appImages[Math.floor(Math.random()*appImages.length)];
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
    appImages = _fallbackImages.slice();
    try { homeImage.style.display = 'none'; } catch(_){}
  }
}

function setRandomImage(imgEl) {
  if (!imgEl || !appImages.length) return;
  const pick = appImages[Math.floor(Math.random()*appImages.length)];
  imgEl.src = `assets/images/${pick}`;
  imgEl.style.display = '';
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

/**
 * Attempt to parse a scripture reference from pasted text.
 * Returns { book, chapter, startVerse, endVerse } or null when not found.
 */
function parseReferenceFromText(text) {
  if (!text || !text.trim()) return null;
  const t = String(text).replace(/\u202F|\u00A0/g, ' ');
  // Try to find patterns like "(1 Corinthians 13:4, 5)" or "1 Corinthians 13:4-6"
  const refRegex = /(?:\()?\s*([1-3]?\s?[A-Za-z\.\s0-9]+?)\s+(\d+)\s*:\s*([\d,\-–—\s]+)\s*(?:\))?/i;
  const m = t.match(refRegex);
  if (!m) return null;
  let bookRaw = m[1].trim();
  const chapter = Number(m[2]);
  const versesRaw = m[3].trim();

  // Normalize book using existing map (falls back to input)
  const book = normalizeBook(bookRaw) || bookRaw;

  // Parse verse numbers/ranges, support commas and hyphen ranges
  const parts = versesRaw.split(',').map(s => s.trim()).filter(Boolean);
  const nums = [];
  parts.forEach(p => {
    if (/[-–—]/.test(p)) {
      const [a,b] = p.split(/[-–—]/).map(x=>Number(x.trim())).filter(n=>!Number.isNaN(n));
      if (!Number.isNaN(a)) nums.push(a);
      if (!Number.isNaN(b)) nums.push(b);
    } else {
      const n = Number(p.replace(/[^0-9]/g,''));
      if (!Number.isNaN(n)) nums.push(n);
    }
  });
  if (!nums.length) return { book, chapter, startVerse: null, endVerse: null };
  const startVerse = Math.min(...nums);
  const endVerse = Math.max(...nums);
  return { book, chapter, startVerse, endVerse };
}

function handleManageTextPaste(ev) {
  try {
    const paste = (ev.clipboardData || window.clipboardData).getData('text') || '';
    const parsed = parseReferenceFromText(paste);
    if (parsed && parsed.book && parsed.chapter) {
      // populate fields
      const bookEl = $('#manageBook'); if (bookEl) bookEl.value = parsed.book;
      const chapEl = $('#manageChapter'); if (chapEl) chapEl.value = parsed.chapter;
      const sv = parsed.startVerse || '';
      const evv = (parsed.endVerse && parsed.endVerse !== parsed.startVerse) ? parsed.endVerse : '';
      const startEl = $('#manageStartVerse'); if (startEl) startEl.value = sv;
      const endEl = $('#manageEndVerse'); if (endEl) endEl.value = evv;
      // repopulate datalist in case book is new
      populateManageBookList();

      // Remove the matched reference (and any surrounding parentheses) from the pasted text
      const refRegex = /(?:\()?\s*([1-3]?\s?[A-Za-z\.\s0-9]+?)\s+(\d+)\s*:\s*([\d,\-–—\s]+)\s*(?:\))?/i;
      const m = paste.match(refRegex);
      let cleaned = paste;
      if (m && m[0]) cleaned = paste.replace(m[0], '');
      // Also strip a leading verse number label like "4 " or "4\u202F"
      cleaned = cleaned.replace(/^\s*\d+[\s\u202F\u00A0:\.]*/,'');

      // Prevent the default paste and insert cleaned text at cursor/selection
      ev.preventDefault();
      const ta = ev.target;
      if (ta && typeof ta.selectionStart === 'number') {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const before = ta.value.slice(0, start);
        const after = ta.value.slice(end);
        const insert = cleaned;
        ta.value = before + insert + after;
        // place cursor after inserted text
        const pos = before.length + insert.length;
        ta.selectionStart = ta.selectionEnd = pos;
        // trigger input event so any listeners update
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // fallback: allow default paste if we can't programmatically insert
      }
      return;
    }
  } catch (e) { console.warn('paste parse failed', e); }
}

function normalizeBook(input) {
  if (!input) return '';
  const key = input.toString().trim().toLowerCase().replace(/\./g,'');
  return bookMap[key] || input;
}

function booksMatch(input, correctBook) {
  const normalizedInput = normalizeBook(input).toLowerCase();
  const normalizedCorrect = normalizeBook(correctBook).toLowerCase();
  return normalizedInput === normalizedCorrect;
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
  const diffVal = getSelectedDifficulty();
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
  if (diffSel) diffSel.value = prefs && DIFFICULTY_LABELS[prefs.difficulty] ? prefs.difficulty : '2';
  if (catSel) catSel.value = prefs && prefs.category ? prefs.category : 'all';
  if (diffSel) diffSel.onchange = savePrefs;
  if (catSel) catSel.onchange = savePrefs;
  updateDifficultyCue();
}

function populateBookSelect() {
  const sel = $('#recallBookSelect');
  if (!sel) return;
  // gather unique book names from bookMap and verses
  const mapVals = bookMap ? Object.values(bookMap).filter(Boolean) : [];
  const verseBooks = verses.map(v => v.book).filter(Boolean);
  const set = new Set([...BIBLE_BOOKS, ...mapVals, ...verseBooks]);
  if (set.has('Psalm')) set.delete('Psalm');
  const books = Array.from(set);
  // canonical Bible book order to present books in reading order rather than alphabetical
  books.sort((a,b) => {
    const ai = BIBLE_BOOKS.indexOf(a);
    const bi = BIBLE_BOOKS.indexOf(b);
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
  const diff = getSelectedDifficulty();
  const cat = $('#selectCategory') ? $('#selectCategory').value : 'all';
  const prefs = { difficulty: diff, category: cat };
  // preserve existing statsFilter if present
  const existing = loadPrefs() || {};
  if (existing.statsFilter) prefs.statsFilter = existing.statsFilter;
  try { localStorage.setItem('calgaryVerses_prefs', JSON.stringify(prefs)); } catch(e) { console.warn('prefs save failed', e); }
  updateDifficultyCue();
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem('calgaryVerses_prefs');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function getSelectedDifficulty() {
  const diff = $('#selectDifficulty') ? $('#selectDifficulty').value : '';
  return DIFFICULTY_LABELS[diff] ? diff : '2';
}

function getSupportedDifficulty() {
  const diff = getSelectedDifficulty();
  return diff === '1' || diff === '2' || diff === '3' ? diff : '2';
}

function updateDifficultyCue(context='') {
  const selected = getSelectedDifficulty();
  const effective = context === 'recall' ? getSupportedDifficulty() : selected;
  const selectedLabel = DIFFICULTY_LABELS[selected] || DIFFICULTY_LABELS['2'];
  const effectiveLabel = DIFFICULTY_LABELS[effective] || DIFFICULTY_LABELS['2'];
  const text = selected === effective ? selectedLabel : `${effectiveLabel} (${selectedLabel} selected)`;
  const cue = $('#difficultyCue');
  if (cue) cue.textContent = text;
  const recallCue = $('#recallDifficultyCue');
  if (recallCue) recallCue.textContent = context === 'recall' ? text : (DIFFICULTY_LABELS[getSupportedDifficulty()] || DIFFICULTY_LABELS['2']);
  const matchCue = $('#matchDifficultyCue');
  if (matchCue) matchCue.textContent = context === 'match' ? text : selectedLabel;
}

// --- Stats UI & persistence for stats filter ---
function openStats() {
  showOnlySection('stats');
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
const RECALL_ROUNDS = 5;
let recallState = {
  deck: [],
  roundIndex: 0,
  score: 0,
  answered: false,
  currentVerse: null,
  difficulty: '2'
};

function buildRecallDeck() {
  const filtered = getFilteredVerses();
  return shuffleArray(filtered.slice()).slice(0, Math.min(RECALL_ROUNDS, filtered.length));
}

function getRecallDifficulty() {
  return getSupportedDifficulty();
}

function updateRecallFields(difficulty) {
  const requiresChapter = difficulty === '2' || difficulty === '3';
  const requiresVerses = difficulty === '3';
  $('#recallChapterWrap').classList.toggle('hidden', !requiresChapter);
  $('#recallVerseNumberWrap').classList.toggle('hidden', !requiresVerses);
  $('#recallChapter').required = requiresChapter;
  $('#recallVerseNumber').required = requiresVerses;
}

function clearRecallInputs() {
  const sel = $('#recallBookSelect'); if (sel) sel.value = '';
  $('#recallChapter').value = '';
  $('#recallVerseNumber').value = '';
}

function validateRecallSubmit() {
  const difficulty = recallState.difficulty || getRecallDifficulty();
  const hasBook = Boolean($('#recallBookSelect') && $('#recallBookSelect').value);
  const hasChapter = Boolean($('#recallChapter').value);
  const hasVerseNumber = Boolean($('#recallVerseNumber').value);
  $('#recallSubmit').disabled = recallState.answered || !hasBook || (difficulty !== '1' && !hasChapter) || (difficulty === '3' && !hasVerseNumber);
}

function setRecallInputsDisabled(disabled) {
  $('#recallBookSelect').disabled = disabled;
  $('#recallChapter').disabled = disabled;
  $('#recallVerseNumber').disabled = disabled;
}

function startRecall() {
  showOnlySection('recall');
  show($('#gameControlsShared'));
  updateDifficultyCue('recall');
  setRandomImage($('#recallImage'));
  recallState = {
    deck: buildRecallDeck(),
    roundIndex: 0,
    score: 0,
    answered: false,
    currentVerse: null,
    difficulty: getRecallDifficulty()
  };
  $('#recallForm').onsubmit = (ev) => {
    ev.preventDefault();
    handleRecallAnswer();
  };
  $('#recallBookSelect').onchange = validateRecallSubmit;
  $('#recallChapter').oninput = validateRecallSubmit;
  $('#recallVerseNumber').oninput = validateRecallSubmit;
  $('#recallNext').onclick = nextRecallRound;
  $('#recallSkip').onclick = skipRecallRound;
  $('#recallBack').onclick = () => { backToHome(); };
  renderRecallRound();
}

function renderRecallRound() {
  const difficulty = recallState.difficulty;
  updateRecallFields(difficulty);
  clearRecallInputs();
  setRecallInputsDisabled(false);
  $('#recallFeedback').textContent = '';
  $('#recallNext').classList.add('hidden');
  $('#recallNext').textContent = 'Next';
  $('#recallSkip').classList.remove('hidden');

  if (!recallState.deck.length) {
    $('#recallRound').textContent = 'No verses available';
    $('#recallScore').textContent = 'Score 0';
    $('#recallVerse').textContent = 'Choose a different difficulty or category, or add more verses.';
    $('#recallSubmit').classList.add('hidden');
    $('#recallSkip').classList.add('hidden');
    $('#recallNext').textContent = 'Try Again';
    $('#recallNext').classList.remove('hidden');
    $('#recallNext').onclick = startRecall;
    return;
  }

  if (recallState.roundIndex >= recallState.deck.length) {
    const total = recallState.deck.length;
    $('#recallRound').textContent = 'Game complete';
    $('#recallScore').textContent = `Score ${recallState.score}/${total}`;
    $('#recallVerse').textContent = `You recalled ${recallState.score} of ${total} verses.`;
    $('#recallFeedback').textContent = recallState.score === total ? 'Perfect round.' : 'Nice work. Try another round to sharpen the references.';
    $('#recallSubmit').classList.add('hidden');
    $('#recallSkip').classList.add('hidden');
    $('#recallNext').textContent = 'Play Again';
    $('#recallNext').classList.remove('hidden');
    $('#recallNext').onclick = startRecall;
    return;
  }

  const verse = recallState.deck[recallState.roundIndex];
  recallState.currentVerse = verse;
  recallState.answered = false;
  $('#recallRound').textContent = `Round ${recallState.roundIndex + 1} of ${recallState.deck.length}`;
  $('#recallScore').textContent = `Score ${recallState.score}`;
  $('#recallVerse').textContent = `"${verse.text}"`;
  $('#recallSubmit').classList.remove('hidden');
  $('#recallNext').onclick = nextRecallRound;
  validateRecallSubmit();
}

function handleRecallAnswer() {
  if (recallState.answered) return;
  const verse = recallState.currentVerse;
  const difficulty = recallState.difficulty;
  const bookInput = $('#recallBookSelect') ? $('#recallBookSelect').value : normalizeBook($('#recallBook').value);
  const chapterInput = Number($('#recallChapter').value);
  const verseInput = Number($('#recallVerseNumber').value);
  const correctBook = verse.book;
  const correctChapter = Number(verse.chapter);
  const correctStartVerse = Number(verse.startVerse || verse.verse || 0);
  const correctEndVerse = Number(verse.endVerse || correctStartVerse || 0);
  const okBook = booksMatch(bookInput, correctBook);
  const okChapter = chapterInput === correctChapter;
  const okVerse = correctStartVerse ? verseInput >= correctStartVerse && verseInput <= correctEndVerse : false;
  const correct = okBook && (difficulty === '1' || okChapter) && (difficulty !== '3' || okVerse);
  finishRecallRound(correct);
}

function finishRecallRound(correct, skipped=false) {
  recallState.answered = true;
  if (correct) recallState.score++;
  saveResult('recall', correct);
  $('#recallScore').textContent = `Score ${recallState.score}`;
  $('#recallFeedback').textContent = correct ? 'Correct!' : `${skipped ? 'Skipped' : 'Incorrect'} — answer: ${formatReference(recallState.currentVerse)}`;
  setRecallInputsDisabled(true);
  $('#recallSubmit').disabled = true;
  $('#recallSkip').classList.add('hidden');
  $('#recallNext').classList.remove('hidden');
}

function nextRecallRound() {
  recallState.roundIndex++;
  $('#recallNext').onclick = nextRecallRound;
  renderRecallRound();
}

function skipRecallRound() {
  if (recallState.answered) return;
  finishRecallRound(false, true);
}

// --- Match game ---
const MATCH_ROUNDS = 5;
let matchState = {
  deck: [],
  roundIndex: 0,
  score: 0,
  answered: false,
  currentVerse: null
};

function formatReference(verse) {
  if (!verse) return '';
  const startVerse = verse.startVerse ?? verse.verse ?? null;
  const endVerse = verse.endVerse ?? null;
  const start = startVerse ? `:${startVerse}` : '';
  const end = endVerse && endVerse !== startVerse ? `-${endVerse}` : '';
  return `${verse.book} ${verse.chapter}${start}${end}`;
}

function shuffleArray(items) {
  return items
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(item => item.value);
}

function buildMatchDeck() {
  const filtered = getFilteredVerses();
  return shuffleArray(filtered.slice()).slice(0, Math.min(MATCH_ROUNDS, filtered.length));
}

function buildMatchOptions(verse) {
  const correctReference = formatReference(verse);
  const optionPool = getFilteredVerses();
  const sameCategory = optionPool.filter(v => {
    if (v === verse || formatReference(v) === correctReference) return false;
    if (!Array.isArray(v.categories) || !Array.isArray(verse.categories)) return false;
    return v.categories.some(cat => verse.categories.map(c => c.toLowerCase()).includes(String(cat).toLowerCase()));
  });
  const sameDifficulty = optionPool.filter(v => v !== verse && formatReference(v) !== correctReference && Number(v.difficulty) === Number(verse.difficulty));
  const remaining = optionPool.filter(v => v !== verse && formatReference(v) !== correctReference);
  const candidates = shuffleArray([...sameCategory, ...sameDifficulty, ...remaining]);
  const refs = new Set([correctReference]);
  candidates.forEach(v => {
    if (refs.size < 4) refs.add(formatReference(v));
  });
  return shuffleArray(Array.from(refs));
}

function startMatch() {
  showOnlySection('match');
  show($('#gameControlsShared'));
  updateDifficultyCue('match');
  setRandomImage($('#matchImage'));
  matchState = {
    deck: buildMatchDeck(),
    roundIndex: 0,
    score: 0,
    answered: false,
    currentVerse: null
  };
  $('#matchBack').onclick = () => { backToHome(); };
  $('#matchNext').onclick = nextMatchRound;
  $('#matchSkip').onclick = skipMatchRound;
  renderMatchRound();
}

function renderMatchRound() {
  const container = $('#matchOptions');
  const feedback = $('#matchFeedback');
  const next = $('#matchNext');
  const skip = $('#matchSkip');
  container.innerHTML = '';
  feedback.textContent = '';
  next.classList.add('hidden');
  next.textContent = 'Next';
  skip.classList.remove('hidden');

  if (!matchState.deck.length) {
    $('#matchRound').textContent = 'No verses available';
    $('#matchScore').textContent = 'Score 0';
    $('#matchVerse').textContent = 'Choose a different difficulty or category, or add more verses.';
    skip.classList.add('hidden');
    next.textContent = 'Try Again';
    next.classList.remove('hidden');
    next.onclick = startMatch;
    return;
  }

  if (matchState.roundIndex >= matchState.deck.length) {
    const total = matchState.deck.length;
    $('#matchRound').textContent = 'Game complete';
    $('#matchScore').textContent = `Score ${matchState.score}/${total}`;
    $('#matchVerse').textContent = `You matched ${matchState.score} of ${total} verses.`;
    feedback.textContent = matchState.score === total ? 'Perfect round.' : 'Nice work. Try another round to sharpen the references.';
    skip.classList.add('hidden');
    next.textContent = 'Play Again';
    next.classList.remove('hidden');
    next.onclick = startMatch;
    return;
  }

  const verse = matchState.deck[matchState.roundIndex];
  matchState.currentVerse = verse;
  matchState.answered = false;
  $('#matchRound').textContent = `Round ${matchState.roundIndex + 1} of ${matchState.deck.length}`;
  $('#matchScore').textContent = `Score ${matchState.score}`;
  $('#matchVerse').textContent = `"${verse.text}"`;

  const opts = buildMatchOptions(verse);
  opts.forEach(opt => {
    const btn = document.createElement('button');
    btn.textContent = opt;
    btn.type = 'button';
    btn.onclick = () => {
      handleMatchAnswer(opt, btn);
    };
    container.appendChild(btn);
  });
}

function handleMatchAnswer(selectedReference, selectedButton) {
  if (matchState.answered) return;
  matchState.answered = true;
  const correctReference = formatReference(matchState.currentVerse);
  const correct = selectedReference === correctReference;
  if (correct) matchState.score++;
  saveResult('match', correct);
  $('#matchScore').textContent = `Score ${matchState.score}`;
  $('#matchFeedback').textContent = correct ? 'Correct.' : `Not quite. The answer is ${correctReference}.`;
  Array.from($('#matchOptions').children).forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correctReference) btn.classList.add('correct');
  });
  if (!correct) selectedButton.classList.add('incorrect');
  $('#matchSkip').classList.add('hidden');
  $('#matchNext').classList.remove('hidden');
}

function nextMatchRound() {
  matchState.roundIndex++;
  $('#matchNext').onclick = nextMatchRound;
  renderMatchRound();
}

function skipMatchRound() {
  if (matchState.answered) return;
  matchState.answered = true;
  saveResult('match', false);
  const correctReference = formatReference(matchState.currentVerse);
  $('#matchFeedback').textContent = `Skipped. The answer is ${correctReference}.`;
  Array.from($('#matchOptions').children).forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correctReference) btn.classList.add('correct');
  });
  $('#matchSkip').classList.add('hidden');
  $('#matchNext').classList.remove('hidden');
}

function backToHome() {
  show($('#homeIntro'));
  hide($('#recall'));
  hide($('#match'));
  hide($('#order'));
  hide($('#stats'));
  hide($('#manage'));
  updateHomePanelState();
  // show header controls again
  showHomeHeader();
  show($('#gameControlsShared'));
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
  $('#playOrder').onclick = () => { showOnlySection('order'); show($('#gameControlsShared')); startOrderGame(); };
  $('#viewScores').onclick = openStats;
  // manage verses button
  const mBtn = $('#manageVerses'); if (mBtn) mBtn.onclick = openManageVerses;
  $('#matchBack').onclick = backToHome;
  $('#orderBack').onclick = backToHome;
  // wire Book Order controls
  const orderStartBtn = $('#orderStart'); if (orderStartBtn) orderStartBtn.onclick = startOrderGame;
  const orderShuffleBtn = $('#orderShuffle'); if (orderShuffleBtn) orderShuffleBtn.onclick = shuffleOrderList;
  const orderCheckBtn = $('#orderCheck'); if (orderCheckBtn) orderCheckBtn.onclick = checkOrder;
  const orderResetBtn = $('#orderReset'); if (orderResetBtn) orderResetBtn.onclick = resetOrderGame;
  // manage panel controls
  const mNew = $('#manageNew'); if (mNew) mNew.onclick = () => showManageForm();
  const mFilter = $('#manageFilter'); if (mFilter) mFilter.addEventListener('input', renderManageList);
  const mForm = $('#manageForm'); if (mForm) mForm.onsubmit = handleManageSave;
  const mCancel = $('#manageCancel'); if (mCancel) mCancel.onclick = () => closeManageModal();
  const mClose = $('#manageClose'); if (mClose) mClose.onclick = () => backToHome();
  const expBtn = $('#exportVerses'); if (expBtn) expBtn.onclick = exportUserVerses;
  const impBtn = $('#importVerses'); if (impBtn) impBtn.onclick = () => { const f = $('#importFile'); if (f) f.click(); };
  const impFile = $('#importFile'); if (impFile) impFile.addEventListener('change', handleImportFile);
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
      const recall = $('#recall');
      if (recall && !recall.classList.contains('hidden')) {
        updateRecallFields(recallState.difficulty || getRecallDifficulty());
        validateRecallSubmit();
        updateDifficultyCue('recall');
      }
      const match = $('#match');
      if (match && !match.classList.contains('hidden')) {
        updateDifficultyCue('match');
      }
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
  const sel = $('#selectDifficulty');
  if (sel) sel.value = diff;
  pills.forEach(p => {
    if (p.getAttribute('data-diff') === String(diff)) {
      p.classList.add('active'); p.setAttribute('aria-pressed','true');
    } else { p.classList.remove('active'); p.setAttribute('aria-pressed','false'); }
  });
  updateDifficultyCue();
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

function verseReferenceKey(item) {
  if (!item) return '';
  const book = String(item.book || '').trim().toLowerCase();
  const chapter = Number(item.chapter) || '';
  const startVerse = item.startVerse != null && item.startVerse !== '' ? Number(item.startVerse) : '';
  const endVerse = item.endVerse != null && item.endVerse !== '' ? Number(item.endVerse) : '';
  return `${book}|${chapter}|${startVerse}|${endVerse}`;
}

function hasDuplicateVerseReference(list, candidate, currentId = '') {
  const candidateKey = verseReferenceKey(candidate);
  return list.some(item => String(item.id) !== String(currentId) && verseReferenceKey(item) === candidateKey);
}

function hasCatalogVerseReference(candidate, currentId = '') {
  const candidateKey = verseReferenceKey(candidate);
  const currentSaved = currentId
    ? loadUserVerses().find(item => String(item.id) === String(currentId))
    : null;

  return verses.some(item => {
    if (verseReferenceKey(item) !== candidateKey) return false;
    return !currentSaved || verseReferenceKey(currentSaved) !== candidateKey;
  });
}

function loadUserVersesIntoMemory() {
  const users = loadUserVerses();
  if (users && users.length) {
    // ensure these are included in the main `verses` array so games can use them
    verses = verses.concat(users.map(u => ({
      book: u.book,
      chapter: Number(u.chapter),
      startVerse: u.startVerse || null,
      endVerse: u.endVerse || null,
      text: u.text,
      difficulty: Number(u.difficulty),
      categories: Array.isArray(u.categories) ? u.categories : []
    })));
  }
}

function openManageVerses() {
  showOnlySection('manage');
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
  // attach paste handler to the text area so pasted scripture references populate fields
  const mt = $('#manageText');
  if (mt) {
    mt.removeEventListener('paste', handleManageTextPaste);
    mt.addEventListener('paste', handleManageTextPaste);
  }
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
  const candidate = { book, chapter, startVerse, endVerse };
  if (hasDuplicateVerseReference(list, candidate, id) || hasCatalogVerseReference(candidate, id)) {
    alert('That verse reference already exists. Book, Chapter, Start Verse, and End Verse must be unique.');
    return;
  }
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

// --- Import / Export ---
function exportUserVerses() {
  const list = loadUserVerses();
  const dataStr = JSON.stringify(list, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = `calgaryverses_user_` + new Date().toISOString().slice(0,10) + `.json`;
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('Export started', 'success');
}

function handleImportFile(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      importVersesArray(parsed);
    } catch (err) {
      console.error('Import JSON parse failed', err);
      alert('Failed to parse JSON file.');
    }
  };
  reader.readAsText(file);
  // clear selection
  ev.target.value = '';
}

function importVersesArray(arr) {
  if (!Array.isArray(arr)) { alert('Imported file must be a JSON array of verses.'); return; }
  const existing = loadUserVerses();
  let added = 0;
  arr.forEach(item => {
    const mapped = mapImportedEntry(item);
    if (!mapped) return;
    // dedupe by book/chapter/start/end
    const dup = hasDuplicateVerseReference(existing, mapped) || hasCatalogVerseReference(mapped);
    if (!dup) { existing.push(mapped); added++; }
  });
  if (added) {
    // save and add to memory
    saveUserVerses(existing);
    // append to verses in memory
    const toAdd = existing.slice(-added);
    toAdd.forEach(u => verses.push({ book: u.book, chapter: Number(u.chapter), startVerse: u.startVerse || null, endVerse: u.endVerse || null, text: u.text, difficulty: Number(u.difficulty||2), categories: u.categories || [] }));
    renderManageList();
    showToast(`Imported ${added} verses`, 'success');
  } else {
    showToast('No new verses found', 'fail');
  }
}

function mapImportedEntry(src) {
  if (!src || !src.book || !src.chapter || !src.text) return null;
  const book = src.book;
  const chapter = Number(src.chapter);
  const startVerse = src.startVerse != null ? Number(src.startVerse) : (src.verseRange ? Number(String(src.verseRange).split('-')[0]) : null);
  const endVerse = src.endVerse != null ? Number(src.endVerse) : (src.verseRange && String(src.verseRange).includes('-') ? Number(String(src.verseRange).split('-')[1]) : startVerse);
  const text = src.text;
  const difficulty = src.difficulty != null ? Number(src.difficulty) : 2;
  let categories = [];
  if (src.categories) categories = Array.isArray(src.categories) ? src.categories : (String(src.categories).split(',').map(s=>s.trim()).filter(Boolean));
  if (!categories.length && src.topics) categories = String(src.topics).split(/[;,]/).map(s=>s.trim()).filter(Boolean);
  return { id: Date.now() + Math.floor(Math.random()*999), book, chapter, startVerse: startVerse || null, endVerse: endVerse || null, text, difficulty, categories };
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

/* -----------------------
   Book Order game
   ----------------------- */
const canonicalBookOrder = BIBLE_BOOKS;

let orderCorrect = [];
let orderCurrent = [];
let orderTimerId = null;
let orderSeconds = 0;

function pickRandomBooks(n=7) {
  const pool = canonicalBookOrder.slice();
  const picks = [];
  while (picks.length < n && pool.length) {
    const idx = Math.floor(Math.random()*pool.length);
    picks.push(pool.splice(idx,1)[0]);
  }
  return picks;
}

function startOrderGame() {
  // prepare game state
  orderSeconds = 0; clearInterval(orderTimerId); orderTimerId = setInterval(()=>{ orderSeconds++; const t = $('#orderTimer'); if (t) t.textContent = orderSeconds; }, 1000);
  // ensure verse panel is interactive (remove home-empty which disables pointer events)
  const panel = document.querySelector('.verse-panel'); if (panel) panel.classList.remove('home-empty');
  const picks = pickRandomBooks(7);
  // correct order is canonical sorted by canonicalBookOrder
  orderCorrect = picks.slice().sort((a,b)=> canonicalBookOrder.indexOf(a) - canonicalBookOrder.indexOf(b));
  // shuffled current list
  orderCurrent = picks.slice().sort(()=>Math.random()-0.5);
  renderOrderList();
  $('#orderResult').textContent = '';
}

function renderOrderList() {
  const ul = $('#orderList'); if (!ul) return;
  ul.innerHTML = '';
  orderCurrent.forEach((book, idx) => {
    const li = document.createElement('li'); li.className = 'order-item'; li.draggable = true; li.dataset.book = book; li.tabIndex = 0;
    li.innerHTML = `<span class="label">${book}</span><span class="handle" aria-hidden="true">☰</span>`;
    li.addEventListener('dragstart', (ev)=>{ ev.dataTransfer.setData('text/plain', book); li.classList.add('dragging'); });
    li.addEventListener('dragend', ()=>{ li.classList.remove('dragging'); li.classList.remove('drag-after'); });
    li.addEventListener('dragover', (ev)=>{ ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; // show where it will be inserted
      const rect = li.getBoundingClientRect(); const after = ev.clientY > (rect.top + rect.height/2); li.classList.toggle('drag-after', after);
    });
    li.addEventListener('dragleave', ()=>{ li.classList.remove('drag-after'); });
    li.addEventListener('drop', (ev)=>{
      ev.preventDefault(); li.classList.remove('drag-after');
      const dragged = ev.dataTransfer.getData('text/plain'); if (!dragged) return;
      const targetBook = li.dataset.book;
      if (dragged === targetBook) return;
      const fromIdx = orderCurrent.indexOf(dragged);
      if (fromIdx === -1) return;
      // remove the dragged item
      orderCurrent.splice(fromIdx, 1);
      // find index of target after removal
      let toIdx = orderCurrent.indexOf(targetBook);
      if (toIdx === -1) {
        // if target disappeared (shouldn't), append
        orderCurrent.push(dragged);
      } else {
        const rect = li.getBoundingClientRect(); const after = ev.clientY > (rect.top + rect.height/2);
        const insertIdx = after ? toIdx + 1 : toIdx;
        orderCurrent.splice(insertIdx, 0, dragged);
      }
      renderOrderList();
    });
    // allow keyboard reordering: ArrowUp/ArrowDown when focused
    li.addEventListener('keydown', (ev)=>{
      if (ev.key === 'ArrowUp') { moveItemUp(li.dataset.book); renderOrderList(); ev.preventDefault(); }
      else if (ev.key === 'ArrowDown') { moveItemDown(li.dataset.book); renderOrderList(); ev.preventDefault(); }
    });
    ul.appendChild(li);
  });
}

function swapOrderItems(aBook, bBook) {
  const ai = orderCurrent.indexOf(aBook);
  const bi = orderCurrent.indexOf(bBook);
  if (ai === -1 || bi === -1) return;
  const tmp = orderCurrent[ai]; orderCurrent[ai] = orderCurrent[bi]; orderCurrent[bi] = tmp;
}

function moveItemUp(book) {
  const i = orderCurrent.indexOf(book); if (i > 0) { const tmp = orderCurrent[i-1]; orderCurrent[i-1] = orderCurrent[i]; orderCurrent[i] = tmp; }
}
function moveItemDown(book) {
  const i = orderCurrent.indexOf(book); if (i !== -1 && i < orderCurrent.length-1) { const tmp = orderCurrent[i+1]; orderCurrent[i+1] = orderCurrent[i]; orderCurrent[i] = tmp; }
}

function shuffleOrderList() { orderCurrent = orderCurrent.slice().sort(()=>Math.random()-0.5); renderOrderList(); }

function checkOrder() {
  if (!orderCurrent || !orderCurrent.length) return;
  let correctCount = 0;
  const ul = $('#orderList'); if (!ul) return;
  // mark items
  Array.from(ul.children).forEach(li => { const book = li.dataset.book; const idx = orderCurrent.indexOf(book); const correctBook = orderCorrect[idx]; if (book === correctBook) { li.classList.add('correct'); li.classList.remove('incorrect'); correctCount++; } else { li.classList.add('incorrect'); li.classList.remove('correct'); } });
  $('#orderCorrect').textContent = correctCount;
  $('#orderResult').textContent = correctCount === orderCorrect.length ? `Perfect! All in order.` : `${correctCount} of ${orderCorrect.length} correct.`;
  saveResult('order', correctCount === orderCorrect.length);
  // stop timer when completed
  if (correctCount === orderCorrect.length) { clearInterval(orderTimerId); }
}

function resetOrderGame() { startOrderGame(); }

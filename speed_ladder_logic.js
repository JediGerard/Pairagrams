// speed_ladder_logic.js
// Speed Ladder logic with exact-pair removal, wrong-guess tracking, and post-game 3-across layout

(async function() {
  // CONFIG
  const PAIRS = 7;
  const START_TIME = 120;
  const PAUSE_MS = 200;
  const colors = ["#81ecec","#fab1a0","#ffeaa7","#a29bfe","#55efc4","#ff7675","#74b9ff","#fd79a8"];

  // STATE
  let timer = START_TIME;
  let score = 0;
  let wordsFound = 0;
  let hardFound = 0;
  let upcomingCommon = [];
  let leftPool = [], rightPool = [];
  const foundSet = new Set();
  const foundWords = [];     // {word, isHard}
  const wrongGuesses = [];   // array of invalid words
  let selLeft = null, selRight = null;
  let intervalId;

  // DOM
  const container     = document.getElementById('game-container');
  const timerEl       = document.getElementById('timer');
  const scoreEl       = document.getElementById('score');
  const foundEl       = document.getElementById('found-count');
  const hardEl        = document.getElementById('hard-count');
  const rowsContainer = document.getElementById('rows-container');

  // FLASH MESSAGE
  const flash = document.createElement('div');
  Object.assign(flash.style, {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    background: 'rgba(255,255,255,0.9)',
    padding: '12px 24px', borderRadius: '8px',
    fontSize: '24px', display: 'none', zIndex: '100'
  });
  container.style.position = 'relative';
  container.appendChild(flash);
  function showMessage(txt, d=600) {
    flash.textContent = txt;
    flash.style.display = 'block';
    setTimeout(()=>flash.style.display='none', d);
  }

  // SHUFFLE
  function shuffle(a) {
    for (let i=a.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  // LOAD COMMON & DICT
  const labeled    = await fetch('master_words_file_with_parts_labeled.json').then(r=>r.json());
  const common4    = Object.entries(labeled)
    .filter(([w,i])=>w.length===4 && i.common)
    .map(([w])=>w.toUpperCase());
  const dictText   = await fetch('words_scrabble.csv').then(r=>r.text());
  const all4       = dictText.trim().split(/\r?\n/).map(w=>w.toUpperCase()).filter(w=>w.length===4);

  // QUEUE of common words
  function getNextCommon() {
    if (!upcomingCommon.length) upcomingCommon = shuffle(common4.slice());
    return upcomingCommon.shift();
  }

  // FILL POOLS
  function fillPools() {
    leftPool = []; rightPool = [];
    for (let i=0; i<PAIRS; i++) {
      const w = getNextCommon();
      leftPool.push(w.slice(0,2));
      rightPool.push(w.slice(2,4));
    }
    console.log('Initial common words →',
      leftPool.map((l,i)=>l+rightPool[i])
    );
  }

  // UPDATE HEADER
  function updateStats() {
    timerEl.textContent = `${timer}s`;
    scoreEl.textContent = score;
    foundEl.textContent = wordsFound;
    hardEl.textContent = hardFound;
  }

  // RENDER BOARD
  function renderPools() {
    rowsContainer.innerHTML = '';
    shuffle(leftPool); shuffle(rightPool);
    for (let i=0; i<PAIRS; i++) {
      const row = document.createElement('div');
      row.className = 'row';
      row.append(makeBox(leftPool[i],'left'), makeBox(rightPool[i],'right'));
      rowsContainer.appendChild(row);
    }
  }

  // MAKE BOX
  function makeBox(txt, side) {
    const el = document.createElement('div');
    el.className = 'word-box';
    el.textContent = txt;
    el.dataset.side = side;
    el.dataset.txt  = txt;
    el.addEventListener('click', () => onSelect(el));
    return el;
  }

  // CLEAR SELECTION
  function clearSel() {
    [selLeft,selRight].forEach(e=>e?.classList.remove('selected'));
    selLeft = selRight = null;
  }

  // CLICK HANDLER
  function onSelect(el) {
    if (el.classList.contains('locked')) return;
    if ((selLeft && el.dataset.side==='left') || (selRight && el.dataset.side==='right')) {
      return clearSel();
    }
    el.classList.add('selected');
    if (el.dataset.side==='left') selLeft=el; else selRight=el;
    if (selLeft && selRight) checkMatch();
  }

  // CHECK MATCH
  function checkMatch() {
    const L = selLeft.dataset.txt,
          R = selRight.dataset.txt,
          word = (L+R).toUpperCase();

    // duplicate
    if (foundSet.has(word)) {
      showMessage('Found');
      return setTimeout(clearSel, PAUSE_MS);
    }
    // wrong
    if (!all4.includes(word)) {
      if (!wrongGuesses.includes(word)) wrongGuesses.push(word);
      showMessage('Wrong');
      return setTimeout(clearSel, PAUSE_MS);
    }

    // new valid
    foundSet.add(word);
    wordsFound++; score++;
    const isHard = !common4.includes(word);
    if (isHard) hardFound++;
    updateStats();
    selLeft.classList.add('locked');
    selRight.classList.add('locked');
    foundWords.push({ word, isHard });

    // remove exactly one instance each
    const iL = leftPool.indexOf(L);
    if (iL > -1) leftPool.splice(iL,1);
    const iR = rightPool.indexOf(R);
    if (iR > -1) rightPool.splice(iR,1);

    // refill
    const next = getNextCommon();
    console.log('Pulled common word →', next);
    leftPool.push(next.slice(0,2));
    rightPool.push(next.slice(2,4));

    selLeft = selRight = null;
    setTimeout(()=>renderPools(), PAUSE_MS);
  }

  // ENDGAME DISPLAY
  function endGame() {
    clearInterval(intervalId);
    rowsContainer.innerHTML = '';

    // found words, 3 across
    const makeRow = () => {
      const r = document.createElement('div');
      r.style.display = 'flex';
      r.style.justifyContent = 'center';
      r.style.gap = '8px';
      r.style.marginBottom = '12px';
      return r;
    };
    let row = makeRow();
    foundWords.forEach((fw,i) => {
      if (i>0 && i%3===0) {
        rowsContainer.appendChild(row);
        row = makeRow();
      }
      const b = document.createElement('div');
      b.textContent = fw.word;
      b.className = 'word-box locked';
      b.style.backgroundColor = colors[i % colors.length];
    if (fw.isHard) {
    b.classList.add('hard');
  }
      row.appendChild(b);
    });
    rowsContainer.appendChild(row);

    // wrong guesses heading + list
    if (wrongGuesses.length) {
      const hdr = document.createElement('h2');
      hdr.textContent = 'Wrong Guesses';
      hdr.style.marginTop = '24px';
      hdr.style.fontSize = '20px';
      rowsContainer.appendChild(hdr);

      row = makeRow();
      wrongGuesses.forEach((w,i) => {
        if (i>0 && i%3===0) {
          rowsContainer.appendChild(row);
          row = makeRow();
        }
        const b = document.createElement('div');
        b.textContent = w;
        b.className = 'word-box locked';
        // white background by default
        row.appendChild(b);
      });
      rowsContainer.appendChild(row);
    }
  }

  // TIMER
  function tick() {
    timer--;
    updateStats();
    if (timer <= 0) endGame();
  }

  // START
  fillPools();
  updateStats();
  renderPools();
  intervalId = setInterval(tick, 1000);

})();

// theme_pages.js
// Loads branded_themes.csv, groups into levels, shuffles pools, and renders each level with rotating colors

(async function() {
  // 8-color palette from games.html
  const colors = ["#81ecec","#fab1a0","#ffeaa7","#a29bfe","#55efc4","#ff7675","#74b9ff","#fd79a8"];

  // Fetch and parse CSV
  const res = await fetch('branded_themes.csv');
  const text = await res.text();
  const lines = text.trim().split('\n');
  const rows = lines.slice(1).map(line => {
    const [theme, word, left, right] = line.split(',');
    return { theme, word, left, right };
  });

  // Filter to this theme
  const entries = rows.filter(r => r.theme === 'Golden Knights');

  // Define the group sizes for each level
  const groupSizes = [7, 5, 6, 6, 5];
  const levels = [];
  let idx = 0;
  for (const size of groupSizes) {
    levels.push(entries.slice(idx, idx + size));
    idx += size;
  }

  // DOM references
  const foundCountEl = document.getElementById('found-count');
  const totalCountEl = document.getElementById('total-count');
  const rowsContainer = document.getElementById('rows-container');

  // State
  let levelIndex = 0;
  let foundCount = 0;
  let selLeft = null;
  let selRight = null;

  // Update the header stats display
  function updateStats() {
    foundCountEl.textContent = foundCount;
    totalCountEl.textContent = levels[levelIndex].length;
  }

  // Fisher–Yates shuffle
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Clear any current selections
  function clearSel() {
    if (selLeft) selLeft.classList.remove('selected');
    if (selRight) selRight.classList.remove('selected');
    selLeft = selRight = null;
  }

  // Create a clickable fragment box
  function makeBox(txt, side, index) {
    const el = document.createElement('div');
    el.className = 'word-box';
    el.textContent = txt;
    el.dataset.side = side;
    el.dataset.index = index;
    el.addEventListener('click', () => onSelect(el));
    return el;
  }

  // Render the current level of fragments
  function renderLevel() {
    foundCount = 0;
    updateStats();
    rowsContainer.innerHTML = '';

    const level = levels[levelIndex];
    // Build separate pools and shuffle each
    const leftPool = level.map((e, i) => ({ txt: e.left, idx: i }));
    const rightPool = level.map((e, i) => ({ txt: e.right, idx: i }));
    shuffle(leftPool);
    shuffle(rightPool);

    // Create rows
    for (let i = 0; i < level.length; i++) {
      const row = document.createElement('div');
      row.className = 'row';
      const leftBox = makeBox(leftPool[i].txt, 'left', leftPool[i].idx);
      const rightBox = makeBox(rightPool[i].txt, 'right', rightPool[i].idx);
      row.append(leftBox, rightBox);
      rowsContainer.appendChild(row);
    }
  }

  // Handle box selection and matching logic
  function onSelect(el) {
    if (el.classList.contains('found')) return;
    const side = el.dataset.side;
    if ((selLeft && side === 'left') || (selRight && side === 'right')) {
      clearSel();
      return;
    }
    el.classList.add('selected');
    if (side === 'left') selLeft = el;
    else selRight = el;

    if (selLeft && selRight) {
      if (selLeft.dataset.index === selRight.dataset.index) {
        // Correct match: apply rotating color
        const col = colors[foundCount % colors.length];
        selLeft.style.backgroundColor = col;
        selRight.style.backgroundColor = col;
        selLeft.style.color = '#000';
        selRight.style.color = '#000';
        selLeft.classList.add('found');
        selRight.classList.add('found');
        foundCount++;
        updateStats();
        // Advance to next level or end
        if (foundCount === levels[levelIndex].length) {
          levelIndex++;
          if (levelIndex < levels.length) {
            setTimeout(renderLevel, 300);
          } else {
            setTimeout(() => window.location.href = 'gameover.html', 300);
          }
        }
      }
      setTimeout(clearSel, 200);
    }
  }

  // Start the first level
  renderLevel();
})();

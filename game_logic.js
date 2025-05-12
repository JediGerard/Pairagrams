// ==================== Imports ====================
import { db, speak, shuffle, getLongestWord, updateHallOfFame } from "./utility.js";
import {
  collection, addDoc,
  doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ==================== Game State ====================

// ==================== LocalStorage Fallbacks for First-Time Users ====================
if (!localStorage.getItem("playerName")) {
  localStorage.setItem("playerName", "Player");
}
if (!localStorage.getItem("level")) {
  localStorage.setItem("level", "1");
}
if (!localStorage.getItem("lives")) {
  localStorage.setItem("lives", "5");
}
if (!localStorage.getItem("newGame")) {
  localStorage.setItem("newGame", "true");
}

const colors = ["#81ecec", "#fab1a0", "#ffeaa7", "#a29bfe", "#55efc4", "#ff7675", "#74b9ff", "#fd79a8"];
let colorIndex = 0;

const backgrounds = [
  "#fce4ec", "#e3f2fd", "#e8f5e9", "#fff3e0", "#ede7f6",
  "#f3e5f5", "#f1f8e9", "#e0f7fa", "#ffebee", "#fbe9e7"
];

let selectedLeft = null;
let selectedMiddle = null;
let selectedRight = null;
let correctPairs = [];
let matchedPairs = [];
let unmatchedLeft = [];
let unmatchedRight = [];
let unmatchedMiddle = [];
let matchedIndexMap = new Map();

let configCache = null;
let wordMapCache = null;
let dictCache = null;
let rowCount;


let score = 0;
let timer = 300;
let timerInterval = null;
let gameEnded = false;

let playerName = localStorage.getItem("playerName") || "Player";
let level = parseInt(localStorage.getItem(`level-${playerName}`)) || 1;

let totalScore = parseInt(localStorage.getItem("totalScore") || "0");
let lives = parseInt(localStorage.getItem("lives") || "5");

const usedBonusWords = new Set();
const savedBonus = localStorage.getItem("bonusWords");
if (savedBonus) JSON.parse(savedBonus).forEach(word => usedBonusWords.add(word));

if (localStorage.getItem("newGame") === "true") {
  localStorage.setItem("wordCount", "0");
  localStorage.setItem("startLevel", level.toString()); // ✅ Record base level
  localStorage.setItem("bonusWords", "[]");
  localStorage.setItem("totalTimeSpent", "0");
  localStorage.setItem("lives", "5");         // ✅ NEW LINE
  lives = 5;                                  // ✅ NEW LINE
  usedBonusWords.clear();
  localStorage.setItem("newGame", "false");
  
}


// UI Display
document.getElementById("score-value").textContent = totalScore;
document.getElementById("timer").textContent = `${timer}s`;

renderLives();

function renderLives() {
  const el = document.getElementById("lives-display");
  if (el) el.textContent = "👤".repeat(Math.max(0, lives));
}

// ==================== Load Game Data ====================
let config = [], masterWords = {}, dictionary = new Set();

async function saveProgressToFirebase(playerName, data) {
  const ref = doc(db, "progress", playerName);
  try {
    await setDoc(ref, {
      ...data,
      name: playerName,
      lastPlayed: new Date()
    });
    console.log(`✅ Firebase progress saved for ${playerName} (Level ${data.level}, Score ${data.totalScore})`);
  } catch (e) {
    console.error("❌ Failed to save progress:", e);
  }
}


async function loadGameData() {
  try {
    // ✅ Step 1: Load player level from Firebase if possible
    const ref = doc(db, "progress", playerName);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      const d = snapshot.data();
      level = d.level || 1;
      localStorage.setItem(`level-${playerName}`, level);
      console.log(`✅ Loaded level ${level} from Firebase for ${playerName}`);
    } else {
      console.log(`ℹ️ No saved progress found for ${playerName}, defaulting to level 1`);
    }

    // ✅ Step 2: Load all required data in parallel if not cached
    if (!configCache || !wordMapCache || !dictCache) {
      console.time("initialLoad");

      const [
        config2col,
        config3col,
        wordMapRaw,
        dictText
      ] = await Promise.all([
        fetch("level_config_2col.json").then(r => r.json()),
        fetch("level_config_3col.json").then(r => r.json()),
        fetch("master_words_file_with_parts_labeled.json").then(r => r.json()),
        fetch("words_scrabble.csv").then(r => r.text())
      ]);

      const wordMap = {};
      for (const [word, data] of Object.entries(wordMapRaw)) {
        if (data.common === true) {
          wordMap[word] = data.parts;
        }
      }

      configCache = level >= 26 ? config3col : config2col;
      wordMapCache = wordMap;
      dictCache = new Set(dictText.trim().split(/\r?\n/).map(w => w.toLowerCase()));
      console.timeEnd("initialLoad");
    }

    config = configCache;
    masterWords = wordMapCache;
    dictionary = dictCache;

    colMode = level >= 26 ? 3 : 2;
    setupGame();

  } catch (e) {
    console.error("🔥 Problem loading game data:", e);
    alert("Game data could not be loaded. Try refreshing.");
  }
}


window.onload = loadGameData;

function updateLevelDisplay() {
  const levelEl = document.getElementById("level-number");
  if (levelEl) levelEl.textContent = level;
}

// ==================== Game Setup ====================
let colMode = level >= 26 ? 3 : 2;

function setupGame() {
  if (colMode === 2) {
    setupTwoColumnGame();
  } else if (colMode === 3) {
    setupThreeColumnGame();
  } else {
    alert("Unsupported column mode");
  }
}

function setupTwoColumnGame() {
  document.body.style.backgroundColor = backgrounds[level % backgrounds.length];
  clearInterval(timerInterval);
  localStorage.setItem('newGame', "false");
  timer = 300;
  gameEnded = false;
  matchedPairs = [];
  rowCount = 3 + ((level - 1) % 5);
  document.getElementById("bonus-words").innerHTML = "";
  document.getElementById("encouragement-message")?.remove();
  colorIndex = 0;


  const format = config[level - 1];
  const validEntries = [];
const seenLefts = new Set();
const seenRights = new Set();
matchedPairs = [];

const leftReuseLog = {};
const rightReuseLog = {};

// Shuffle the word list to ensure fairness
const shuffledWords = Object.entries(masterWords).sort(() => Math.random() - 0.5);

for (const [word, partsList] of shuffledWords) {
  for (const parts of partsList) {
    if (parts.length !== 2) continue;
    const [left, right] = parts;
    if (left.length !== format[0] || right.length !== format[1]) continue;

    if (seenLefts.has(left)) {
      leftReuseLog[left] = (leftReuseLog[left] || 0) + 1;
      continue;
    }

    if (seenRights.has(right)) {
      rightReuseLog[right] = (rightReuseLog[right] || 0) + 1;
      continue;
    }

    validEntries.push({ full: word, left, right });
    seenLefts.add(left);
    seenRights.add(right);
    break;
  }
}

// Try to select a valid board
let attempts = 0;
let selected = null;  // ✅ Declare at function scope

do {
  const shuffled = shuffle(validEntries);
  const temp = shuffled.slice(0, rowCount);
  const parts = temp.flatMap(p => [p.left, p.right]);
  const uniqueParts = new Set(parts);

  if (uniqueParts.size === rowCount * 2) {
    selected = temp;
    console.log(`✅ Board succeeded after ${attempts + 1} attempt(s)`);
    break;
  }
  attempts++;
} while (attempts < 50);

if (!selected) {
  console.warn("⚠️ Failed to find a valid board after 50 attempts.");
  return; // ✅ prevents crash
} else {
  console.log("✅ Selected words:", selected.map(w => w.full));
}


// Optional: Show most-rejected parts (left or right)
const topLeftSkips = Object.entries(leftReuseLog).sort((a, b) => b[1] - a[1]).slice(0, 5);
const topRightSkips = Object.entries(rightReuseLog).sort((a, b) => b[1] - a[1]).slice(0, 5);

console.log("🔁 Most skipped LEFT parts:", topLeftSkips);
console.log("🔁 Most skipped RIGHT parts:", topRightSkips);

correctPairs = selected;

unmatchedLeft = selected.map(p => p.left);
unmatchedRight = selected.map(p => p.right);

// Shuffle until no item matches across the same row
let safetyTries = 0;
do {
  unmatchedRight = shuffle([...unmatchedRight]);
  safetyTries++;
} while (
  unmatchedLeft.some((left, i) => left === unmatchedRight[i]) &&
  safetyTries < 50
);

  redrawColumns();
  startTimer();
  
  const bgIndex = (level - 1) % 5 + 1;
  const overlay = document.getElementById("background-overlay");
  if (overlay) {
    overlay.style.backgroundImage = `url('assets/library${bgIndex}.jpg')`;
  }
  updateLevelDisplay();
  renderLives();
}


// ==================== Timer ====================
function startTimer() {
  clearInterval(timerInterval); // ✅ Add this here too
  document.getElementById("timer").textContent = `${timer}s`;
  timerInterval = setInterval(() => {
    timer--;
    document.getElementById("timer").textContent = `${timer}s`;
    if (timer <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

// ==================== Gameplay ====================
async function handleClick(el) {
  if (el.classList.contains("locked")) return;

  const side = el.dataset.side;
  const word = el.dataset.word;

  if (el.classList.contains("selected")) {
    el.classList.remove("selected");
    if (side === "left") selectedLeft = null;
    else if (side === "middle") selectedMiddle = null;
    else if (side === "right") selectedRight = null;
    return;
  }

  // Deselect existing selection on that side
  document.querySelectorAll(`.word-box.selected[data-side="${side}"]`).forEach(e => e.classList.remove("selected"));
  el.classList.add("selected");

  if (side === "left") selectedLeft = el;
  else if (side === "middle") selectedMiddle = el;
  else if (side === "right") selectedRight = el;

  // === 2-column logic ===
  if (colMode === 2 && selectedLeft && selectedRight) {
    const left = selectedLeft.dataset.word;
    const right = selectedRight.dataset.word;
    const match = correctPairs.find(p => p.left === left && p.right === right);

    if (match) {
      matchedPairs.push(match);
      const color = colors[matchedPairs.length % colors.length];
    
      [selectedLeft, selectedRight].forEach(el => {
        el.classList.add("locked");
        el.classList.remove("selected");
        el.style.backgroundColor = color;
      });
    
      speakRandomPraise();
      score += 10;
      selectedLeft = selectedRight = null;
    
      if (matchedPairs.length === rowCount) {
        document.getElementById("restart").style.display = "inline-block";
      }
    } else {
      const combined = left + right;
      if (dictionary.has(combined.toLowerCase())) {
        if (!usedBonusWords.has(combined)) {
          addBonusWord(combined);
          usedBonusWords.add(combined);
          score += 15;
          speak("BONUS");
        } else {
          speak("Already found");
        }
    
        // ✅ Always clear selection and background for bonus/duplicate
        [selectedLeft, selectedRight].forEach(el => {
          if (el) {
            el.classList.remove("selected");
            el.style.backgroundColor = "";
          }
        });
    
        selectedLeft = selectedRight = null;
      } else {
        strikeBoxes([selectedLeft, selectedRight]);
        lives--;
        score -= 1;
        if (lives <= 0) return endGame();
        selectedLeft = selectedRight = null;
      }
    }

    selectedLeft = selectedRight = null;
    updateScoreDisplay();
    renderLives();
  }

  // === 3-column logic ===
  if (colMode === 3 && selectedLeft && selectedMiddle && selectedRight) {
    const l = selectedLeft.dataset.word;
    const m = selectedMiddle.dataset.word;
    const r = selectedRight.dataset.word;
  
    const match = correctPairs.find(p => p.left === l && p.middle === m && p.right === r);
  
    if (match) {
      matchedPairs.push(match);
      const matchIndex = matchedPairs.length - 1;
  
      const rowL = unmatchedLeft.indexOf(match.left);
      const rowM = unmatchedMiddle.indexOf(match.middle);
      const rowR = unmatchedRight.indexOf(match.right);
  
      matchedIndexMap.set(`left-${rowL}`, matchIndex);
      matchedIndexMap.set(`middle-${rowM}`, matchIndex);
      matchedIndexMap.set(`right-${rowR}`, matchIndex);
  
      [selectedLeft, selectedMiddle, selectedRight].forEach(el => {
        el.classList.remove("selected");
      });
  
      speakRandomPraise();
      score += 10;
      selectedLeft = selectedMiddle = selectedRight = null;
      redrawColumns3();
  
      console.log("🧩 Match found:", match);
console.log("🔢 Matched pairs so far:", matchedPairs.length);
console.log("🔢 Expected rowCount:", rowCount);
console.log("🎯 All matches found — ready to show NEXT LEVEL");
      if (matchedPairs.length === rowCount) {
        await saveProgressToFirebase(playerName, {
          level,
          totalScore: totalScore + score,
          lives,
          totalTimeSpent: parseInt(localStorage.getItem("totalTimeSpent") || "0"),
          bonusWords: [...usedBonusWords]
        });
      
        const restart = document.getElementById("restart");
        if (restart) restart.style.display = "inline-block";
      }
      
      
    } else {
      const combined = (l + m + r).toLowerCase();
      if (dictionary.has(combined)) {
        if (!usedBonusWords.has(combined)) {
          addBonusWord(combined);
          usedBonusWords.add(combined);
          score += 15;
          speak("BONUS");
        } else {
          speak("Already found");
        }
        [selectedLeft, selectedMiddle, selectedRight].forEach(el => el?.classList.remove("selected"));
        selectedLeft = selectedMiddle = selectedRight = null;
      } else {
        strikeBoxes([selectedLeft, selectedMiddle, selectedRight]);
        lives--;
        score -= 1;
        if (lives <= 0) return endGame();
        selectedLeft = selectedMiddle = selectedRight = null;
      }
    }
  
    updateScoreDisplay();
    renderLives();
  }
  
}

function updateScoreDisplay() {
  document.getElementById("score-value").textContent = totalScore + score;
}

function strikeBoxes(boxes) {
  boxes.forEach(el => el?.classList.add("strike"));
  setTimeout(() => {
    boxes.forEach(el => el?.classList.remove("strike", "selected"));
  }, 1000);
}

function speakRandomPraise() {
  const phrases = ["Yes!", "Bingo!", "Amazing!", "You got it!", "Correct!", "Nice!", "Well done!", "Boom!", "That’s right!", "Sweet!"];
  speak(phrases[Math.floor(Math.random() * phrases.length)]);
}


function redrawColumns() {
  const container = document.getElementById("rows-container");
  container.innerHTML = "";

  for (let i = 0; i < unmatchedLeft.length; i++) {
    const row = document.createElement("div");
    row.className = "row";

    const left = createBox(unmatchedLeft[i], "left", i);   // ✅ now passes `i`
    const right = createBox(unmatchedRight[i], "right", i); // ✅ now passes `i`

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  }
}



  
function redrawColumns3() {
  const container = document.getElementById("rows-container");
  container.innerHTML = "";

  for (let i = 0; i < unmatchedLeft.length; i++) {
    const row = document.createElement("div");
    row.className = "row";

    const left = createBox(unmatchedLeft[i], "left", i);
    const middle = createBox(unmatchedMiddle[i], "middle", i);
    const right = createBox(unmatchedRight[i], "right", i);

    row.appendChild(left);
    row.appendChild(middle);
    row.appendChild(right);
    container.appendChild(row);
  }
}




function createBox(word, side, row) {
  const el = document.createElement("div");
  el.className = "word-box";
  el.textContent = word;
  el.dataset.side = side;
  el.dataset.word = word;

  const key = `${side}-${row}`;
  if (matchedIndexMap.has(key)) {
    const colorIndex = matchedIndexMap.get(key);
    el.classList.add("locked");
    el.style.backgroundColor = colors[colorIndex % colors.length];
  } else {
    el.onclick = () => handleClick(el);
  }

  return el;
}





function addBonusWord(word) {
  const box = document.createElement("div");
  box.textContent = word.toLowerCase();
  box.className = "bonus-word-box";
  box.style.backgroundColor = colors[colorIndex++ % colors.length];
  document.getElementById("bonus-words").appendChild(box);
}

// ==================== End of Game ====================
async function saveScore(score) {
  try {
    await addDoc(collection(db, "scores"), {
      name: playerName,
      score,
      level,
      timestamp: new Date()
    });
    console.log("✅ Score saved");
  } catch (e) {
    console.error("❌ Error saving score:", e);
  }
}

async function endGame() {
  if (gameEnded) return;
  gameEnded = true;
  clearInterval(timerInterval);

  const levelTimeSpent = 300 - timer;

  totalScore += score + Math.max(0, timer);
  localStorage.setItem("totalScore", totalScore.toString());
  localStorage.setItem("lives", lives.toString());
  localStorage.setItem("bonusWords", JSON.stringify([...usedBonusWords]));

  const prevCount = parseInt(localStorage.getItem("wordCount") || "0");
  localStorage.setItem("wordCount", (prevCount + matchedPairs.length).toString());

  // ===== Update time tracking for average =====
  const prevTime = parseInt(localStorage.getItem("totalTimeSpent") || "0");
  const totalTime = prevTime + levelTimeSpent;
  localStorage.setItem("totalTimeSpent", totalTime.toString());
  await saveProgressToFirebase(playerName, {
    level,
    totalScore,
    lives,
    totalTimeSpent: parseInt(localStorage.getItem("totalTimeSpent") || "0"),
    bonusWords: [...usedBonusWords]
  });
  

  const levelsPlayed = level;
  const avgTime = Math.round(totalTime / levelsPlayed);
  const bonusCount = usedBonusWords.size;
  const longestBonus = getLongestWord(usedBonusWords);

  // ===== Hall of Fame Updates =====
  updateHallOfFame("fastestLevel", { name: playerName, level, time: levelTimeSpent });
  if (levelsPlayed >= 10) {
    updateHallOfFame("fastestAverage", { name: playerName, avg: avgTime });
  }
  updateHallOfFame("mostBonus", { name: playerName, count: bonusCount });
  if (longestBonus) {
    updateHallOfFame("longestBonus", { name: playerName, word: longestBonus, level });
  }

  if (lives <= 0 || level >= 65) {
    await saveScore(totalScore);
    setTimeout(() => window.location.href = "gameover.html", 200);
    return;
  }

  await updateUserStats(playerName, usedBonusWords.size);

  fetch("encouragement.csv")
  .then(res => res.text())
  .then(data => {
    const lines = data.trim().split(/\r?\n/).slice(1);
    const pick = lines[Math.floor(Math.random() * lines.length)];
    const el = document.createElement("div");
    el.id = "encouragement-message";
    el.textContent = pick;
    el.className = "encouragement-flash";
    document.getElementById("bonus-words").appendChild(el);
    speak(pick);
  })
  .catch(() => {
    console.warn("Could not load encouragements.");
  })
  .finally(() => {
    const restart = document.getElementById("restart");
    if (restart) restart.style.display = "inline-block";
  });

}

// ==================== Next Level ====================
function goToNextLevel() {
  
  if (matchedPairs.length < rowCount) {
    return;
  }

  const startLevel = parseInt(localStorage.getItem("startLevel") || level);
  if ((level - startLevel + 1) % 5 === 0 && lives < 10) {
  lives++;
  localStorage.setItem("lives", lives.toString());
  renderLives();
  }
  level++;
  if (level > 65) {
    alert("You’ve reached the final level!");
    return;
  }

  localStorage.setItem(`level-${playerName}`, level);
  // ✅ Update the displayed level
  updateLevelDisplay();

  document.getElementById("rows-container").innerHTML = "";
  saveProgressToFirebase(playerName, {
    level,
    totalScore: totalScore + score,
    lives,
    totalTimeSpent: parseInt(localStorage.getItem("totalTimeSpent") || "0"),
    bonusWords: [...usedBonusWords]
  });
  
  loadGameData();
  
}

async function updateUserStats(name, bonusWordsThisGame) {
  const ref = doc(db, "users", name);
  const snap = await getDoc(ref);
  const prev = snap.exists() ? snap.data() : { lifetimeBonusWords: 0 };
  await setDoc(ref, {
    name,
    lifetimeBonusWords: prev.lifetimeBonusWords + bonusWordsThisGame
  });
}

window.goToNextLevel = goToNextLevel;


function setupThreeColumnGame() {
  const entry = config[level - 26];
  if (!entry || !entry.format || typeof entry.rows !== "number") {
    alert("Invalid config for this level.");
    return;
  }

  const [leftLen, midLen, rightLen] = entry.format;
  rowCount = entry.rows;
  console.log(`🧩 Level ${level} uses format ${leftLen}-${midLen}-${rightLen} with ${rowCount} rows`);

  document.getElementById("bonus-words").innerHTML = "";
  document.getElementById("encouragement-message")?.remove();



  matchedPairs = [];
  matchedIndexMap.clear();
  selectedLeft = null;
  selectedMiddle = null;
  selectedRight = null;

  const validEntries = [];

  for (const [word, partsList] of Object.entries(masterWords)) {
    for (const parts of partsList) {
      if (parts.length !== 3) continue;
      const [left, middle, right] = parts;
      if (left.length === leftLen && middle.length === midLen && right.length === rightLen) {
        validEntries.push({ full: word, left, middle, right });
        break;
      }
    }
  }

  console.log("🧠 Valid 3-part entries:", validEntries.length);
  if (validEntries.length < 7) {
    alert("Not enough valid words for this format.");
    return;
  }

  let selected = null;
  let attempts = 0;

  while (attempts < 100) {
    const temp = shuffle(validEntries).slice(0, rowCount);


    const lefts = new Set();
    const middles = new Set();
    const rights = new Set();

    let valid = true;
    for (const p of temp) {
      if (lefts.has(p.left) || middles.has(p.middle) || rights.has(p.right)) {
        valid = false;
        break;
      }
      lefts.add(p.left);
      middles.add(p.middle);
      rights.add(p.right);
    }

    if (valid) {
      selected = temp;
      break;
    }
    attempts++;
  }

  if (!selected) {
    console.warn("⚠️ Failed to find a valid board after 100 attempts.");
    return;
  }

  console.log("✅ Selected words:", selected.map(w => w.full));

  correctPairs = selected;
  matchedPairs = [];
  unmatchedLeft = selected.map(p => p.left);
  unmatchedMiddle = selected.map(p => p.middle);
  unmatchedRight = selected.map(p => p.right);

  shuffle(unmatchedLeft);
  shuffle(unmatchedMiddle);
  shuffle(unmatchedRight);

  redrawColumns3();
  startTimer();
  updateLevelDisplay();
  renderLives();
}

loadGameData();

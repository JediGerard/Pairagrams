// ==================== Imports ====================
import { db, speak, shuffle, getLongestWord, updateHallOfFame } from "./utility.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// ==================== Game State ====================
const colors = ["#81ecec", "#fab1a0", "#ffeaa7", "#a29bfe", "#55efc4", "#ff7675", "#74b9ff", "#fd79a8"];
let colorIndex = 0;

let selectedLeft = null;
let selectedRight = null;
let correctPairs = [];
let matchedPairs = [];
let unmatchedLeft = [];
let unmatchedRight = [];

let configCache = null;
let wordMapCache = null;
let dictCache = null;
let rowCount;


let score = 0;
let timer = 300;
let timerInterval = null;
let gameEnded = false;

let playerName = localStorage.getItem("playerName") || "Player";
let level = parseInt(localStorage.getItem("level")) || 1;
let totalScore = parseInt(localStorage.getItem("totalScore") || "0");
let lives = parseInt(localStorage.getItem("lives") || "5");

const usedBonusWords = new Set();
const savedBonus = localStorage.getItem("bonusWords");
if (savedBonus) JSON.parse(savedBonus).forEach(word => usedBonusWords.add(word));

if (localStorage.getItem("newGame") === "true") {
  localStorage.setItem("wordCount", "0");
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
  const el = document.getElementById("lives-container");
  if (el) el.innerHTML = "Lives: " + "👤".repeat(Math.max(0, lives));
}

// ==================== Load Game Data ====================
let config = [], masterWords = {}, dictionary = new Set();


async function loadGameData() {
  try {
    if (!configCache || !wordMapCache || !dictCache) {
      console.time("initialLoad");
      // Choose the appropriate config file based on level
    const configFile = level >= 26 ? "level_config_3col.json" : "level_config_2col.json";

    const [levelConfig, wordMap, dictText] = await Promise.all([
      fetch(configFile).then(r => r.json()),
      fetch("master_words_file_with_parts.json").then(r => r.json()),
      fetch("words_scrabble.csv").then(r => r.text())
    ]);

    configCache = levelConfig;
    wordMapCache = wordMap;
    dictCache = new Set(dictText.trim().split(/\r?\n/).map(w => w.toLowerCase()));
        fetch("master_words_file_with_parts.json").then(r => r.json()),
        fetch("words_scrabble.csv").then(r => r.text())
      ]);
      configCache = levelConfig;
      wordMapCache = wordMap;
      dictCache = new Set(dictText.trim().split(/\r?\n/).map(w => w.toLowerCase()));
      console.timeEnd("initialLoad");
    }

    config = configCache;
    masterWords = wordMapCache;
    dictionary = dictCache;

    setupGame();
  } catch (e) {
    alert("Problem loading game data. Please refresh.");
    console.error(e);
  }
}
window.onload = loadGameData;

function updateLevelDisplay() {
  const levelEl = document.getElementById("level-number");
  if (levelEl) levelEl.textContent = level;
}

// ==================== Game Setup ====================
function setupGame() {
  clearInterval(timerInterval);
  timer = 300;
  gameEnded = false;
  matchedPairs = [];
  rowCount = 3 + ((level - 1) % 5);
  document.getElementById("bonus-words").innerHTML = "";
  document.getElementById("encouragement-message")?.remove();
  colorIndex = 0;


  const format = config[level - 1];
  if (!format) {
    alert(`⚠️ No config found for level ${level}. Please check configuration files.`);
    return;
  }
  const validEntries = [];
  const seenLefts = new Set();
  const seenRights = new Set();
  matchedPairs = [];

  for (const [word, partsList] of Object.entries(masterWords)) {
    for (const parts of partsList) {
      if (
        parts.length === 2 &&
        parts[0].length === format[0] &&
        parts[1].length === format[1] &&
        !seenLefts.has(parts[0]) &&
        !seenRights.has(parts[1])
      ) {
        validEntries.push({ full: word, left: parts[0], right: parts[1] });
        seenLefts.add(parts[0]);
        seenRights.add(parts[1]);
        break;
      }
    }
  }

  let attempts = 0, selected;
  do {
    const shuffled = shuffle(validEntries);
    const temp = shuffled.slice(0, rowCount);
    const parts = temp.flatMap(p => [p.left, p.right]);
    const uniqueParts = new Set(parts);

    if (uniqueParts.size === rowCount * 2) {
      unmatchedLeft = temp.map(p => p.left);
      unmatchedRight = shuffle(temp.map(p => p.right));
      const valid = !unmatchedLeft.some((l, i) => temp[i].left === l && temp[i].right === unmatchedRight[i]);
      if (valid) {
        selected = temp;
        break;
      }
    }

    attempts++;
  } while (attempts < 50);

  correctPairs = selected;
  redrawColumns();
  startTimer();
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
function handleClick(el) {
  if (el.classList.contains("locked")) return;

  const side = el.dataset.side;
  document.querySelectorAll(`.word-box.selected[data-side="${side}"]`).forEach(e => e.classList.remove("selected"));
  el.classList.add("selected");

  if (side === "left") selectedLeft = el;
  else selectedRight = el;

  if (selectedLeft && selectedRight) {
    const left = selectedLeft.dataset.word;
    const right = selectedRight.dataset.word;
    const match = correctPairs.find(p => p.left === left && p.right === right);

    if (match) {
      matchedPairs.push(match);
      const phrases = ["Yes!", "Bingo!", "Amazing!", "You got it!", "Correct!", "Nice!", "Well done!", "Boom!", "That’s right!", "Sweet!"];
      speak(phrases[Math.floor(Math.random() * phrases.length)]);
      score += 10;
      redrawColumns();
      if (matchedPairs.length === rowCount) endGame();
    } else {
      const combined = left + right;
      if (dictionary.has(combined)) {
        if (!usedBonusWords.has(combined)) {
          addBonusWord(combined);
          usedBonusWords.add(combined);
          score += 15;
          speak("BONUS");
        } else {
          speak("Already found");
        }
        // ✅ Fix here:
        if (selectedLeft) selectedLeft.classList.remove("selected");
        if (selectedRight) selectedRight.classList.remove("selected");

        selectedLeft = null;
        selectedRight = null;
        document.getElementById("score-value").textContent = totalScore + score;
        return;
      } else {
        const leftTemp = selectedLeft;
        const rightTemp = selectedRight;

        [leftTemp, rightTemp].forEach(el => el && el.classList.add("strike"));
        setTimeout(() => {
        [leftTemp, rightTemp].forEach(el => el && el.classList.remove("strike", "selected"));
        }, 1000);
        lives--;
        localStorage.setItem("lives", lives);
        renderLives();
        if (lives <= 0) {
          endGame();
          return;
        }
        score -= 1;
      }
    }

    selectedLeft = null;
    selectedRight = null;
    document.getElementById("score-value").textContent = totalScore + score;
  }
}

function redrawColumns() {
  const container = document.getElementById("rows-container");
  container.innerHTML = "";
  const colorMap = new Map();
  matchedPairs.forEach((p, i) => {
    const color = colors[i % colors.length];
    colorMap.set(p.left, color);
    colorMap.set(p.right, color);
  });

  for (let i = 0; i < unmatchedLeft.length; i++) {
    const row = document.createElement("div");
    row.className = "row";

    const left = createBox(unmatchedLeft[i], "left", colorMap);
    const right = createBox(unmatchedRight[i], "right", colorMap);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  }
}

function createBox(word, side, colorMap) {
  const el = document.createElement("div");
  el.className = "word-box";
  el.textContent = word;
  el.dataset.side = side;
  el.dataset.word = word;
  if (colorMap.has(word)) {
    el.classList.add("locked");
    el.style.backgroundColor = colorMap.get(word);
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
      document.getElementById("restart").style.display = "inline-block";
      speak(pick);
    })
    .catch(() => document.getElementById("restart").style.display = "inline-block");
}

// ==================== Next Level ====================
function goToNextLevel() {
  if (matchedPairs.length < rowCount) {
    return;
  }

  level++;
  if (level > 65) {
    alert("You’ve reached the final level!");
    return;
  }

  localStorage.setItem("level", level);
  // ✅ Update the displayed level
  updateLevelDisplay();

  document.getElementById("rows-container").innerHTML = "";
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
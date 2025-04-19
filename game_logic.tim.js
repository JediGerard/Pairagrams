
function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}


const colors = ["#81ecec", "#fab1a0", "#ffeaa7", "#a29bfe", "#55efc4", "#ff7675", "#74b9ff", "#fd79a8"];
let colorIndex = 0;
const usedBonusWords = new Set();

let selectedLeft = null;
let selectedRight = null;
let correctPairs = [];
let matchedPairs = [];
let unmatchedLeft = [];
let unmatchedRight = [];
let score = 0;
let timer = 300;
let timerInterval = null;
let playerName = localStorage.getItem('playerName') || "Player";
let level = parseInt(localStorage.getItem('level')) || 1;
let totalScore = parseInt(localStorage.getItem('totalScore') || "0");
let gameCount = parseInt(localStorage.getItem('gameCount')) || 1;

document.getElementById("level-number").textContent = level;
document.getElementById("score-value").textContent = totalScore;
document.getElementById("timer").textContent = `${timer}s`;
document.getElementById("score-value").textContent = totalScore;

let config = [];
let masterWords = {};
let dictionary = new Set();
let rowCount = 3 + ((level - 1) % 5);  // 3 to 7 rows based on level tier

Promise.all([
  fetch('level_config_2col.json').then(r => r.json()),
  fetch('master_words_file_with_parts.json').then(r => r.json()),
  fetch('words_scrabble.csv').then(r => r.text())
]).then(([levelConfig, wordMap, dictText]) => {
  config = levelConfig;
  masterWords = wordMap;
  dictionary = new Set(dictText.trim().split(/\r?\n/).map(w => w.toLowerCase()));

  const format = config[level - 1];
  const validEntries = [];

  for (const [word, partsList] of Object.entries(masterWords)) {
    for (const parts of partsList) {
      if (parts.length === 2 && parts[0].length === format[0] && parts[1].length === format[1]) {
        validEntries.push({ full: word, left: parts[0], right: parts[1] });
      }
    }
  }

  const selected = shuffle(validEntries).slice(0, rowCount);
  correctPairs = selected;
  unmatchedLeft = selected.map(p => p.left);
  unmatchedRight = shuffle(selected.map(p => p.right));
  redrawColumns();
  startTimer();
});

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function startTimer() {
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

function handleClick(el) {
  if (el.classList.contains("locked")) return;

  const side = el.dataset.side;
  document.querySelectorAll(`.word-box.selected[data-side="${side}"]`).forEach(e => {
    e.classList.remove("selected");
  });

  el.classList.add("selected");

  if (side === "left") selectedLeft = el;
  else selectedRight = el;

  if (selectedLeft && selectedRight) {
    const leftWord = selectedLeft.dataset.word;
    const rightWord = selectedRight.dataset.word;
    const match = correctPairs.find(p => p.left === leftWord && p.right === rightWord);

    if (match) {
      matchedPairs.push(match);
      const leftIndex = unmatchedLeft.indexOf(leftWord);
      const rightIndex = unmatchedRight.indexOf(rightWord);
      if (leftIndex !== -1) unmatchedLeft.splice(leftIndex, 1);
      if (rightIndex !== -1) unmatchedRight.splice(rightIndex, 1);
      score += 10;
      redrawColumns();
      if (matchedPairs.length === rowCount) endGame();
      selectedLeft = null;
      selectedRight = null;
    } else {
      const bonus = leftWord + rightWord;
      if (!usedBonusWords.has(bonus) && dictionary.has(bonus)) {
        addBonusWord(bonus);
        speak("BONUS");
        usedBonusWords.add(bonus);
        const flashLeft = selectedLeft;
        const flashRight = selectedRight;
        selectedLeft = null;
        selectedRight = null;
        flashElements([flashLeft, flashRight], () => {
          document.querySelectorAll(".word-box.selected").forEach(el => el.classList.remove("selected"));
        });
        score += 15;
      } else {
        [selectedLeft, selectedRight].forEach(el => el.classList.add("strike"));
        const left = selectedLeft, right = selectedRight;
        setTimeout(() => {
          [left, right].forEach(el => el.classList.remove("selected", "strike"));
          document.querySelectorAll(".word-box.selected").forEach(el => el.classList.remove("selected"));
        }, 1500);
        selectedLeft = null;
        selectedRight = null;
        score -= 1;
      }
    }
    document.getElementById("score-value").textContent = totalScore + score;
  }
}

function flashElements(elements, callback) {
  const interval = setInterval(() => {
    elements.forEach(el => el.classList.toggle("flash"));
  }, 200);
  setTimeout(() => {
    clearInterval(interval);
    elements.forEach(el => el.classList.remove("flash", "selected"));
    if (callback) callback();
  }, 200 * 8);
}

function addBonusWord(word) {
  const box = document.createElement("div");
  box.textContent = word.toLowerCase();
  box.className = "bonus-word-box";
  box.style.backgroundColor = colors[colorIndex % colors.length];
  colorIndex++;
  document.getElementById("bonus-words").appendChild(box);
}

function redrawColumns() {
  const container = document.getElementById("rows-container");
  container.innerHTML = "";

  const colorMap = new Map();
  matchedPairs.forEach((pair, i) => {
    const color = colors[i % colors.length];
    colorMap.set(pair.left, color);
    colorMap.set(pair.right, color);
  });

  matchedPairs.forEach(pair => {
    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.className = "word-box locked";
    left.textContent = pair.left;
    left.style.backgroundColor = colorMap.get(pair.left);

    const right = document.createElement("div");
    right.className = "word-box locked";
    right.textContent = pair.right;
    right.style.backgroundColor = colorMap.get(pair.right);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  });

  for (let i = 0; i < unmatchedLeft.length; i++) {
    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.className = "word-box";
    left.textContent = unmatchedLeft[i];
    left.dataset.side = "left";
    left.dataset.word = unmatchedLeft[i];
    left.onclick = () => handleClick(left);

    const right = document.createElement("div");
    right.className = "word-box";
    right.textContent = unmatchedRight[i];
    right.dataset.side = "right";
    right.dataset.word = unmatchedRight[i];
    right.onclick = () => handleClick(right);

    row.appendChild(left);
    row.appendChild(right);
    container.appendChild(row);
  }
}

function endGame() {
  clearInterval(timerInterval);
  totalScore += score + Math.max(0, timer);
  localStorage.setItem("totalScore", totalScore);
  document.getElementById("score-value").textContent = totalScore;
  document.getElementById("restart").style.display = "inline-block";
  saveScore(totalScore);
  fetch('encouragement.csv')
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
      const spacer = document.createElement("div");
      spacer.style.marginBottom = "20px";
      document.getElementById("bonus-words").appendChild(spacer);
    });
}

function saveScore(score) {
  const player = playerName;
  const scores = JSON.parse(localStorage.getItem("scores") || "{}");
  if (!scores[player]) scores[player] = [];
  scores[player].push(score);
  localStorage.setItem("scores", JSON.stringify(scores));

  let highScores = JSON.parse(localStorage.getItem("highScores") || "[]");
  highScores = highScores.filter(s => s.name !== player);
  highScores.push({ name: player, score: score });
  highScores.sort((a, b) => b.score - a.score);
  if (highScores.length > 10) highScores = highScores.slice(0, 10);
  localStorage.setItem("highScores", JSON.stringify(highScores));
}

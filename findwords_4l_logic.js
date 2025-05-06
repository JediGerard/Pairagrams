// ==================== Game State ====================
let masterWords = {};
let wordList = [];
let validWords = new Set();

let lives = 5;
let score = 0;
let scoreIndex = 0;
let fibonacci = [1, 1];
let selectedPairs = [];
let foundWords = [];
let selectedWords = [];

let livesDisplay, scoreDisplay, container, wordListDisplay;

// ==================== DOM Ready Wrapper ====================
document.addEventListener("DOMContentLoaded", () => {
  livesDisplay = document.getElementById("lives");
  scoreDisplay = document.getElementById("score");
  container = document.getElementById("rows-container");
  wordListDisplay = document.getElementById("word-list");

  Promise.all([
    fetch("master_words_file_with_parts.json").then(res => res.json()),
    fetch("words_scrabble.csv").then(res => res.text())
  ]).then(([masterData, csvText]) => {
    masterWords = masterData;
    wordList = [];

    for (const [word, partsList] of Object.entries(masterWords)) {
      if (word.length !== 4) continue;

      const cleanSplit = partsList.find(p =>
        Array.isArray(p) &&
        p.length === 2 &&
        p[0].length === 2 &&
        p[1].length === 2
      );

      if (cleanSplit) {
        wordList.push({ word, left: cleanSplit[0], right: cleanSplit[1] });
      }
    }

    const lines = csvText.trim().split("\n");
    for (let i = 1; i < lines.length; i++) {
      validWords.add(lines[i].trim().toUpperCase());
    }

    generateBoard();
  });

  // "I AM DONE" button logic
  document.getElementById("done-btn").onclick = () => {
    const box = document.getElementById("correct-words");
    const colors = ["#81ecec", "#fab1a0", "#ffeaa7", "#a29bfe", "#55efc4", "#ff7675"];
    box.innerHTML = selectedWords.map((w, i) =>
      `<div class="answer-box" style="background-color: ${colors[i % colors.length]}">${w.word}</div>`
    ).join("");
    document.getElementById("correct-words-section").style.display = "block";
    document.getElementById("done-btn").style.display = "none";
  };
});

// ==================== Utility Functions ====================
function speak(text) {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

function nextFibonacci() {
  const next = fibonacci[fibonacci.length - 1] + fibonacci[fibonacci.length - 2];
  fibonacci.push(next);
  return next;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateBoard() {
  container.innerHTML = "";
  selectedPairs = [];

  selectedWords = [];
  const usedWords = new Set();
  const pairs = [];

  const shuffled = shuffle([...wordList]);
  for (const entry of shuffled) {
    if (!usedWords.has(entry.word)) {
      selectedWords.push(entry);
      pairs.push(entry.left, entry.right);
      usedWords.add(entry.word);
    }
    if (selectedWords.length === 12) break;
  }

  if (selectedWords.length < 12) {
    console.warn("Not enough unique words to generate a full board.");
    return;
  }

  shuffle(pairs);

  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.className = "row";
    for (let j = 0; j < 4; j++) {
      const pair = createSpeedBox(pairs[i * 4 + j]);
      row.appendChild(pair);
    }
    container.appendChild(row);
  }
}

const colors = ["#6c5ce7", "#00b894", "#fd79a8", "#0984e3", "#e17055", "#d63031", "#fab1a0", "#55efc4"];
let colorIndex = 0;

function createSpeedBox(pair) {
  const div = document.createElement("div");
  div.className = "pair";
  div.textContent = pair;
  div.addEventListener("click", () => toggleSelection(div, pair));
  return div;
}

function toggleSelection(div, pair) {
  if (div.classList.contains("selected")) {
    div.classList.remove("selected");
    selectedPairs = selectedPairs.filter(p => p !== pair);
    return;
  }

  if (selectedPairs.length === 2) return;

  selectedPairs.push(pair);
  div.classList.add("selected");

  if (selectedPairs.length === 2) {
    checkWord();
  }
}

function checkWord() {
  const combined = selectedPairs.join("").toUpperCase();

  if (foundWords.includes(combined)) {
    speak("Already found");
    clearSelections();
    return;
  }

  if (validWords.has(combined)) {
    foundWords.push(combined);
    updateWordList(combined);
    score += fibonacci[scoreIndex] || nextFibonacci();
    scoreIndex++;
    scoreDisplay.textContent = score;

    if (foundWords.length === 5) speak("You are killing it");
    else if (foundWords.length === 10) speak("Hot diggity dog");
    else if (foundWords.length === 15) speak("You are a word beast");
    else if (foundWords.length === 20) speak("You are making me look bad");
    else if (foundWords.length === 25) speak("I think you are cheating");

    clearSelections();
    return;
  } else {
    speak("Wrong");
    lives--;
    livesDisplay.textContent = lives;
    if (lives === 0) endGame();
  }

  clearSelections();
}

function clearSelections() {
  document.querySelectorAll(".pair").forEach(p => p.classList.remove("selected"));
  selectedPairs = [];
}

function updateWordList(word) {
  const li = document.createElement("li");
  li.textContent = word;
  li.className = "bonus-word-box";
  li.style.backgroundColor = colors[colorIndex++ % colors.length];
  wordListDisplay.appendChild(li);
}

function endGame() {
  speak("Game Over");

  const gameOverMessage = document.createElement("h2");
  gameOverMessage.textContent = "GAME OVER";
  gameOverMessage.style.color = "#d63031";
  gameOverMessage.style.marginTop = "30px";
  document.body.appendChild(gameOverMessage);

  const intro = document.createElement("div");
  intro.textContent = "Here are my words:";
  intro.style.marginTop = "15px";
  intro.style.fontSize = "20px";
  document.body.appendChild(intro);

  const wordGridWrapper = document.createElement("div");
  wordGridWrapper.style.display = "flex";
  wordGridWrapper.style.justifyContent = "center";

  const wordGrid = document.createElement("div");
  wordGrid.style.display = "grid";
  wordGrid.style.gridTemplateColumns = "repeat(3, auto)";
  wordGrid.style.gap = "10px";
  wordGrid.style.marginTop = "20px";
  wordGrid.style.maxWidth = "360px";

  selectedWords.forEach(({ word }, index) => {
    const cell = document.createElement("div");
    cell.textContent = word;
    cell.className = "bonus-word-box";
    cell.style.backgroundColor = colors[index % colors.length];
    cell.style.color = "white";
    wordGrid.appendChild(cell);
  });

  wordGridWrapper.appendChild(wordGrid);
  document.body.appendChild(wordGridWrapper);

  const playAgain = document.createElement("button");
  playAgain.textContent = "Play Again";
  playAgain.style.marginTop = "30px";
  playAgain.style.padding = "12px 24px";
  playAgain.style.fontSize = "18px";
  playAgain.style.borderRadius = "8px";
  playAgain.style.border = "none";
  playAgain.style.cursor = "pointer";
  playAgain.style.backgroundColor = "#00b894";
  playAgain.style.color = "white";
  playAgain.addEventListener("click", () => location.reload());
  document.body.appendChild(playAgain);
}

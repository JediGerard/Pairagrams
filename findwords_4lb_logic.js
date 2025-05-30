import { shuffle } from './utility.js';
// ==================== Game State ====================
let masterWords = {};
let wordList = [];
let validWords = new Set();
let classification = {};   

let lives = 5;
let score = 0;
let scoreIndex = 0;
let fibonacci = [1, 1];
let selectedPairs = [];
let foundWords = [];
let selectedWords = [];
let boardPairs = [];

let livesDisplay, scoreDisplay, container, wordListDisplay;

let common4 = new Set();       // common 4-letter words
let hardFoundCount = 0;

const colors = ["#81ecec", "#fab1a0", "#ffeaa7", "#a29bfe", "#55efc4", "#ff7675", "#74b9ff", "#fd79a8"];
let colorIndex = 0;



// ==================== DOM Ready Wrapper ====================
document.addEventListener("DOMContentLoaded", () => {
  const manualRadio = document.getElementById("manual-mode");
  const previewBox = document.getElementById("word-preview");
  if (previewBox) {
    previewBox.placeholder = "type here";
    previewBox.setAttribute("readonly", true);
  }
  livesDisplay = document.getElementById("lives");
  scoreDisplay = document.getElementById("score");
  
  container = document.getElementById("rows-container");
  wordListDisplay = document.getElementById("word-list");

  const feedbackDiv = document.createElement("div");
  feedbackDiv.id = "feedback-message";
  feedbackDiv.style.display = "none";
  document.getElementById("game-header").after(feedbackDiv);
  

  Promise.all([
  fetch("master_words_file_with_parts_labeled.json").then(res => res.json()),
  fetch("words_scrabble_labeled.csv").then(res => res.text())
]).then(([masterData, csvText]) => {
  masterWords = masterData;
  wordList = [];

  for (const [word, entry] of Object.entries(masterWords)) {
    if (!entry || word.length !== 4) continue;

    const isCommon = entry.common === true;
    if (isCommon) common4.add(word.toUpperCase());

    const cleanSplit = entry.parts.find(p =>
      Array.isArray(p) &&
      p.length === 2 &&
      p[0].length === 2 &&
      p[1].length === 2
    );

    if (isCommon && cleanSplit) {
      wordList.push({ word, left: cleanSplit[0], right: cleanSplit[1] });
    }
  }

  const lines = csvText.trim().split("\n");
  for (let i = 1; i < lines.length; i++) {
  const [w, cls] = lines[i].split(",");
  const word = w.trim().toUpperCase();
  const label = cls.trim().toUpperCase();      // “COMMON” / “UNCOMMON” / “RARE”
  classification[word] = label;
  validWords.add(word);
}

  generateBoard();
});



  document.getElementById("done-btn").onclick = () => {
  const box = document.getElementById("correct-words");
  box.innerHTML = selectedWords.map((w, i) =>
  `<div class="answer-box" style="background-color: ${colors[i % colors.length]}">${w.word}</div>`
).join("");
  

  // ✅ Hide the I AM DONE button
  document.getElementById("done-btn").style.display = "none";

  // ✅ Remove SHUFFLE button
  const shuffleBtn = document.querySelector("button.button-red");
  if (shuffleBtn) shuffleBtn.remove();

  // ✅ Create PLAY AGAIN button
  const playAgain = document.createElement("button");
  playAgain.textContent = "PLAY AGAIN";
  playAgain.className = "button-base button-green";
  playAgain.style.padding = "8px 16px"; 
  playAgain.style.fontSize = "16px";
  playAgain.style.width = "auto"; 
  playAgain.style.display = "inline-block"; 
  playAgain.style.marginRight = "8px"; 
  playAgain.onclick = () => location.reload();

  // ✅ Create GO TO MAIN button
  const goHome = document.createElement("button");
  goHome.textContent = "GO TO MAIN";
  goHome.className = "button-base button-green";
  goHome.style.padding = "8px 16px"; 
  goHome.style.fontSize = "16px";
  goHome.style.width = "auto"; 
  goHome.style.display = "inline-block"; 
  goHome.onclick = () => location.href = "index.html";

  // ✅ Insert both buttons into the same parent container as SHUFFLE was
  const shuffleContainer = document.querySelector("div[style*='margin-top']");
  if (shuffleContainer) {
    shuffleContainer.innerHTML = ""; // clear old buttons
    shuffleContainer.appendChild(playAgain);
    shuffleContainer.appendChild(goHome);
  }

  // ✅ Reveal answer grid
  document.getElementById("correct-words-section").style.display = "block";
};

  
  
});

window.toggleSafeMode = toggleSafeMode;

function toggleSafeMode() {
  const isSafe = document.getElementById("safe-mode-toggle").checked;
  const tools = document.getElementById("word-tools");
  tools.style.display = isSafe ? "block" : "none";
}


// ==================== Utility Functions ====================
function showFeedbackMessage(text) {
  const feedback = document.getElementById("feedback-message");
  if (!feedback) return;

  feedback.textContent = text;
  feedback.style.position = "fixed";
  feedback.style.top = "50%";
  feedback.style.left = "50%";
  feedback.style.transform = "translate(-50%, -50%)";
  feedback.style.padding = "10px 20px";
  feedback.style.backgroundColor = "#f7f7f7";
  feedback.style.border = "2px solid #aaa";
  feedback.style.borderRadius = "8px";
  feedback.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
  feedback.style.zIndex = "1000";
  feedback.style.display = "block";

  const delay = text.includes(" ") ? 1500 : 500;
  setTimeout(() => feedback.style.display = "none", delay);
}


function nextFibonacci() {
  const next = fibonacci[fibonacci.length - 1] + fibonacci[fibonacci.length - 2];
  fibonacci.push(next);
  return next;
}

window.shuffleBoard = function() {
  boardPairs = shuffle([...boardPairs]);

  container.innerHTML = "";
  for (let i = 0; i < 4; i++) { // 4 rows
    const row = document.createElement("div");
    row.className = "row";
    for (let j = 0; j < 6; j++) { // 6 columns
      const pair = createSpeedBox(boardPairs[i * 6 + j]); // Indexing updated
      row.appendChild(pair);
    }
    container.appendChild(row);
  }
};


function generateBoard() {
  container.innerHTML = "";
  selectedPairs = [];
  selectedWords = [];
  boardPairs = [];
  const usedWords = new Set();

  const shuffled = shuffle([...wordList]);
  for (const entry of shuffled) {
    if (!usedWords.has(entry.word)) {
      selectedWords.push(entry);
      boardPairs.push(entry.left, entry.right);
      usedWords.add(entry.word);
    }
    if (selectedWords.length === 12) break;
  }

  if (selectedWords.length < 12) {
    console.warn("Not enough unique words to generate a full board.");
    return;
  }

  shuffle(boardPairs);

  for (let i = 0; i < 4; i++) { // 4 rows
    const row = document.createElement("div");
    row.className = "row";
    for (let j = 0; j < 6; j++) { // 6 columns
      const pair = createSpeedBox(boardPairs[i * 6 + j]); // Indexing updated
      row.appendChild(pair);
    }
    container.appendChild(row);
  }
}



function createSpeedBox(pair) {
  const div = document.createElement("div");
  div.className = "pair";
  div.textContent = pair;
  div.addEventListener("click", () => toggleSelection(div));
  return div;
}

function toggleSelection(div) {
  if (div.classList.contains("selected")) {
    div.classList.remove("selected");

    const manualMode = document.getElementById("safe-mode-toggle");
    if (!manualMode || !manualMode.checked) {
      const pair = div.textContent;
      selectedPairs = selectedPairs.filter(p => p !== pair);
    }

    return;
  }

  div.classList.add("selected");

  const manualMode = document.getElementById("safe-mode-toggle");
  const pair = div.textContent;

  if (manualMode && manualMode.checked) {
    onLetterSelected(pair);
  } else {
    selectedPairs.push(pair);
    if (selectedPairs.length === 2) {
      checkWord();
    }
  }
}

function updateWordList(word) {
  const li = document.createElement("li");
  li.textContent = word;

  // Determine classification: COMMON, UNCOMMON, or RARE
  const cls = classification[word.toUpperCase()] || "RARE";

  // ← DEBUG LOGGING:
  console.log(`Adding word “${word}”: classified as ${cls}`);

  if (cls === "COMMON") {
    li.className = "bonus-word-box";
    li.style.backgroundColor = colors[colorIndex++ % colors.length];
  } else if (cls === "UNCOMMON") {
    li.className = "uncommon-word-box";
    li.style.backgroundColor = colors[colorIndex++ % colors.length];
  } else {
    li.className = "hard-word-box";
  }

  wordListDisplay.appendChild(li);

  // update the WORDS / UNCOMMON / RARE counts
  updateStats();
}


function updateStats() {
  const total = foundWords.length;
  const uncommon = foundWords.filter(
    w => classification[w.toUpperCase()] === "UNCOMMON"
  ).length;
  const rare = foundWords.filter(
    w => classification[w.toUpperCase()] === "RARE"
  ).length;

  document.getElementById("total-count").textContent    = total;
  document.getElementById("uncommon-count").textContent = uncommon;
  document.getElementById("rare-count").textContent     = rare;
}




function clearSelections() {
  document.querySelectorAll(".pair").forEach(p => p.classList.remove("selected"));
  selectedPairs = [];
}

function checkWord() {
  const combined = selectedPairs.join("").toUpperCase();

  if (foundWords.includes(combined)) {
    showFeedbackMessage("Already found");
    clearSelections();
    return;
  }

 if (validWords.has(combined)) {
  foundWords.push(combined);
  updateWordList(combined);


  // update display
  showFeedbackMessage("Correct!");
  score += fibonacci[scoreIndex] || nextFibonacci();
  scoreIndex++;
  scoreDisplay.textContent = score;

  if (foundWords.length === 5) showFeedbackMessage("You are killing it");
  else if (foundWords.length === 10) showFeedbackMessage("Hot diggity dog");
  else if (foundWords.length === 15) showFeedbackMessage("You are a word beast");
  else if (foundWords.length === 20) showFeedbackMessage("You are making me look bad");
  else if (foundWords.length === 25) showFeedbackMessage("I think you are cheating");

  clearSelections();
  window.clearPreview();
  return;
} else {
    showFeedbackMessage("Wrong");
    lives--;
    livesDisplay.textContent = lives;
    if (lives === 0) endGame();
  }

  clearSelections();
  window.clearPreview();
}

function endGame() {
  showFeedbackMessage("Game Over");

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

// ========== Submit Box Logic ==========
window.previewLetters = [];

window.onLetterSelected = function(letter) {
  console.log("🟢 onLetterSelected called with:", letter);

  const isSafeMode = document.getElementById("safe-mode-toggle")?.checked;
  console.log("🔍 Safe mode checked:", isSafeMode);

  if (!isSafeMode) return;

  if (!window.previewLetters) previewLetters = [];

  console.log("📏 Letters before push:", previewLetters.join(""));

  const totalChars = previewLetters.join("").length;
  if (totalChars >= 4)
    {
    const soundOff = document.getElementById("sound-toggle")?.checked;

    if (!soundOff && typeof showFeedbackMessage === "function") {
      console.log("🔊 Speaking max message");
      showFeedbackMessage("Max 4 letters");
    } else {
      console.log("⚠️ Alerting max message");
      alert("Max 4 letters");
    }

    return;
  }

  previewLetters.push(letter);
  console.log("✏️ Letters after push:", previewLetters.join(""));

  const preview = document.getElementById("word-preview");
  if (preview) preview.value = previewLetters.join("");
};

window.shufflePreview = function() {
  previewLetters = previewLetters.sort(() => Math.random() - 0.5);
  const preview = document.getElementById("word-preview");
  if (preview) preview.value = previewLetters.join("");
};

window.clearPreview = function() {
  previewLetters = [];
  const preview = document.getElementById("word-preview");
  if (preview) preview.value = "";
  clearSelections();  // ✅ also clear any selected boxes
};

window.submitWord = function() {
  const word = previewLetters.join("").toUpperCase();
  if (word.length < 4) {
    showFeedbackMessage("Not enough letters");
    return;
  }

  if (foundWords.includes(word)) {
    showFeedbackMessage("Already found");
  } else if (validWords.has(word)) {
    showFeedbackMessage("Correct!");
    foundWords.push(word);
    updateWordList(word);
    score += fibonacci[scoreIndex] || nextFibonacci();
    scoreIndex++;
    scoreDisplay.textContent = score;
    if (!common4.has(word)) {
  hardFoundCount++;
  document.getElementById("hard-count").textContent = hardFoundCount;
}
document.getElementById("bonus-count").textContent = foundWords.length;

  } else {
    showFeedbackMessage("Not in the word list");
    lives--;
    livesDisplay.textContent = lives;
    if (lives === 0) endGame();
  }

  window.clearPreview();
};

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
  fetch("words_scrabble.csv").then(res => res.text())
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
    validWords.add(lines[i].trim().toUpperCase());
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
  playAgain.style.marginRight = "8px"; // separates the buttons
  playAgain.style.padding = "8px 16px";
  playAgain.style.fontSize = "16px";


  playAgain.onclick = () => location.reload();

  // ✅ Create GO TO MAIN button
  const goHome = document.createElement("button");
  goHome.textContent = "GO TO MAIN";
  goHome.className = "button-base button-green";
  playAgain.style.marginRight = "8px"; // separates the buttons
  goHome.style.padding = "8px 16px";
  goHome.style.fontSize = "16px";
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
function speak(text) {
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

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

window.shuffleBoard = function() {
  boardPairs = shuffle([...boardPairs]);

  container.innerHTML = "";
  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.className = "row";
    for (let j = 0; j < 4; j++) {
      const pair = createSpeedBox(boardPairs[i * 4 + j]);
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

  for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.className = "row";
    for (let j = 0; j < 4; j++) {
      const pair = createSpeedBox(boardPairs[i * 4 + j]);
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
  li.className = "bonus-word-box";
  li.style.backgroundColor = colors[colorIndex++ % colors.length];
  wordListDisplay.appendChild(li);
}


function clearSelections() {
  document.querySelectorAll(".pair").forEach(p => p.classList.remove("selected"));
  selectedPairs = [];
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

  // Check if it's hard
  if (!common4.has(combined)) {
    hardFoundCount++;
    document.getElementById("hard-count").textContent = hardFoundCount;
  }

  // update display
  document.getElementById("bonus-count").textContent = foundWords.length;
  speak("Correct!");
  score += fibonacci[scoreIndex] || nextFibonacci();
  scoreIndex++;
  scoreDisplay.textContent = score;

  if (foundWords.length === 5) speak("You are killing it");
  else if (foundWords.length === 10) speak("Hot diggity dog");
  else if (foundWords.length === 15) speak("You are a word beast");
  else if (foundWords.length === 20) speak("You are making me look bad");
  else if (foundWords.length === 25) speak("I think you are cheating");

  clearSelections();
  window.clearPreview();
  return;
} else {
    speak("Wrong");
    lives--;
    livesDisplay.textContent = lives;
    if (lives === 0) endGame();
  }

  clearSelections();
  window.clearPreview();
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

    if (!soundOff && typeof speak === "function") {
      console.log("🔊 Speaking max message");
      speak("Max 4 letters");
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

function generatePuzzleId(letterPairs) {
  const boardString = letterPairs.join("");

  // SHA-256 hash
  const buffer = new TextEncoder().encode(boardString);
  return crypto.subtle.digest("SHA-256", buffer).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const letters = String.fromCharCode(
      65 + (hashArray[0] % 26),
      65 + (hashArray[1] % 26)
    );
    const number = ((hashArray[2] << 16) | (hashArray[3] << 8) | hashArray[4]) % 1000000;
    return `${letters}-${number.toString().padStart(6, "0")}`;
  });
}




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
    speak("Not enough letters");
    return;
  }

  if (foundWords.includes(word)) {
    speak("Already found");
  } else if (validWords.has(word)) {
    speak("Correct!");
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
    speak("Not in the word list");
    lives--;
    livesDisplay.textContent = lives;
    if (lives === 0) endGame();
  }

  window.clearPreview();
};

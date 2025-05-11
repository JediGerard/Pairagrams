// ==================== Game State ====================
let masterWords = {};
let wordList = [];
let validWords = new Set();

let timer = 30;
let lives = 5;
let score = 0;
let scoreIndex = 0;
let fibonacci = [1, 1];
let selectedPairs = [];
let foundWords = [];
let timerInterval = null;

let timerDisplay, livesDisplay, scoreDisplay, container, wordListDisplay;

// ==================== DOM Ready Wrapper ====================
document.addEventListener("DOMContentLoaded", () => {
  timerDisplay = document.getElementById("timer");
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
    startTimer();
  });
});

// ==================== Utility Functions ====================
function speak(text) {
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
  
    const selectedWords = shuffle([...wordList]).slice(0, 7);
    console.log("Selected words:", selectedWords.map(w => w.word)); // ✅ log for testing
  
    const lefts = selectedWords.map(entry => entry.left);
    const rights = selectedWords.map(entry => entry.right);
  
    shuffle(lefts);
    shuffle(rights);
  
    for (let i = 0; i < 7; i++) {
      const row = document.createElement("div");
      row.className = "row";
      const pair1 = createSpeedBox(lefts[i]);
      const pair2 = createSpeedBox(rights[i]);
      row.appendChild(pair1);
      row.appendChild(pair2);
      container.appendChild(row);
    }
  }
  

function createSpeedBox(pair) {
  const div = document.createElement("div");
  div.className = "pair";
  div.textContent = pair;
  div.addEventListener("click", () => selectPair(div, pair));
  return div;
}

function selectPair(div, pair) {
    // If already selected, unselect it
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
      resetSelectionColors();
      selectedPairs = [];
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
  
      resetSelectionColors();
      selectedPairs = [];
      generateBoard();
    } else {
      speak("Wrong");
      resetSelectionColors();
      selectedPairs = [];
      lives--;
      livesDisplay.textContent = lives;
      if (lives === 0) endGame();
    }
  }

const colors = ["#6c5ce7", "#00b894", "#fd79a8", "#0984e3", "#e17055", "#d63031", "#fab1a0", "#55efc4"];
let colorIndex = 0;

function resetSelectionColors() {
    document.querySelectorAll(".pair").forEach(p => p.style.backgroundColor = "#ffeaa7");
  }

function updateWordList(word) {
  const li = document.createElement("li");
  li.textContent = word;
  li.className = "bonus-word-box";
  li.style.backgroundColor = colors[colorIndex++ % colors.length];
  wordListDisplay.appendChild(li);
}

function endGame() {
  clearInterval(timerInterval);
  alert("Time's up! You found:\n" + foundWords.join(", "));
}

function startTimer() {
  timerDisplay.textContent = timer;
  timerInterval = setInterval(() => {
    timer--;
    timerDisplay.textContent = timer;
    if (timer === 0) endGame();
  }, 1000);
}

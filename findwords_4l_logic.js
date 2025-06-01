import { shuffle } from './utility.js';
// ==================== Game State ====================
const SOLUTION_PHRASES = [
    "MORNING COFFEE", "COCONUT CREAM", "BUTTERSCOTCH", "PAPERCLIP ART",
    "WALKING ALONE", "FOREST TRAILS", "APEROL SPRITZ", "GOLDEN TICKET",
    "CANDLELIT DIN", "FRENCH TOAST", "SALMON PINK", "HUNTERS LODGE",
    "PUMPKIN PATCH", "HIDDEN TALENT", "SUNDAY DRIVES",
    "AFTERNOON TEA", "POCKET CHANGE"
];
let currentSolution = "";
let revealedSolution = [];
let masterWords = {};
let wordsByFirstLetter = {}; // For efficient lookup by starting letter
let wordList = []; // Still useful for other things? Or phase out? For now, keep.
let validWords = new Set();
let classification = {};   

// let lives = 5; // Removed
let score = 0;
let scoreIndex = 0;
let fibonacci = [1, 1];
let selectedPairs = [];
let foundWords = [];
let selectedWords = [];
let boardPairs = [];

let /*livesDisplay,*/ scoreDisplay, container, wordListDisplay; // livesDisplay removed

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
  // livesDisplay = document.getElementById("lives"); // Removed
  scoreDisplay = document.getElementById("score");
  
  container = document.getElementById("rows-container");
  wordListDisplay = document.getElementById("word-list");

  const feedbackDiv = document.createElement("div");
  feedbackDiv.id = "feedback-message";
  feedbackDiv.style.display = "none";
  document.getElementById("game-header").after(feedbackDiv);

  selectRandomSolution(); // Select solution before it's needed

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
      const entryData = { word, left: cleanSplit[0], right: cleanSplit[1] };
      // Populate wordList (if still needed for other purposes)
      wordList.push(entryData);

      // Populate wordsByFirstLetter
      const firstLetter = word.charAt(0).toUpperCase();
      if (!wordsByFirstLetter[firstLetter]) {
          wordsByFirstLetter[firstLetter] = [];
      }
      wordsByFirstLetter[firstLetter].push(entryData);
    }
  }

  // It's good to shuffle each list in wordsByFirstLetter for better random selection later
  for (const letter in wordsByFirstLetter) {
    shuffle(wordsByFirstLetter[letter]);
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
  playAgain.style.width = "auto";
  playAgain.style.display = "inline-block";
  playAgain.style.marginRight = "8px";
  playAgain.onclick = () => location.reload();

  // ✅ Create GO TO MAIN button
  const goHome = document.createElement("button");
  goHome.textContent = "GO TO MAIN";
  goHome.className = "button-base button-green";
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

  
  // Initialize Hangman Display
  revealedSolution = currentSolution.split('').map(char => {
    const upperChar = char.toUpperCase();
    if (char === ' ') return '*';   // New line: represent space with *
    if (upperChar >= 'A' && upperChar <= 'Z') { // Is it a letter?
        if (['Q', 'Z', 'X'].includes(upperChar)) return char; // Pre-reveal Q, Z, X (preserving original case)
        return '_'; // Represent other letters as underscores
    }
    // If not a space and not an A-Z letter, it's an invalid character according to new rules
    return ''; // Intend to filter this out, effectively ignoring/removing invalid char from display
  });
  // Filter out empty strings that might result from ignored characters
  revealedSolution = revealedSolution.filter(rChar => rChar !== '');
  const hangmanDisplay = document.getElementById("hangman-display");
  if (hangmanDisplay) {
    // Ensure display matches the length of the new currentSolution
    hangmanDisplay.textContent = revealedSolution.join(" ");
    // Adjust the CSS for hangman-display if phrases can be very long
    if (currentSolution.length > 16) { // Example threshold
        hangmanDisplay.style.letterSpacing = "1px"; // Reduce spacing for longer phrases
    } else {
        hangmanDisplay.style.letterSpacing = "3px"; // Default spacing
    }
  }
});

window.toggleSafeMode = toggleSafeMode;

function selectRandomSolution() {
    const randomIndex = Math.floor(Math.random() * SOLUTION_PHRASES.length);
    currentSolution = SOLUTION_PHRASES[randomIndex].toUpperCase();
    // console.log("Selected Solution:", currentSolution); // For debugging
}

function updateHangmanDisplay(foundLetter) {
  const upperLetter = foundLetter.toUpperCase();
  let letterRevealed = false;
  for (let i = 0; i < currentSolution.length; i++) {
    if (currentSolution[i].toUpperCase() === upperLetter) {
      if (revealedSolution[i] === '_') { // Only reveal if not already revealed
        revealedSolution[i] = currentSolution[i]; // Use original casing from currentSolution for display
        letterRevealed = true;
      }
    }
  }

  // Update the display if a new letter was revealed
  if (letterRevealed) {
    const displayElement = document.getElementById("hangman-display");
    if (displayElement) {
      displayElement.textContent = revealedSolution.join(" ");
    }
  }
}

function toggleSafeMode() {
  const isSafe = document.getElementById("safe-mode-toggle").checked;
  const tools = document.getElementById("word-tools");
  tools.style.display = isSafe ? "block" : "none";
}

function checkWinCondition() {
  // The solution is won if there are no underscores left in revealedSolution
  return !revealedSolution.includes('_');
}

function handleWin() {
    // 1. Trigger the "I AM DONE" button's functionality
    // to set up the screen state (buttons, hide game elements).
    const doneButton = document.getElementById("done-btn");
    if (doneButton && typeof doneButton.onclick === 'function') {
        // Critical game elements like rowsContainer are hidden by doneButton.onclick()
        // Also, actionButtonArea is repopulated by doneButton.onclick()
        doneButton.onclick();
    } else {
        console.error("Could not programmatically trigger 'I AM DONE' logic for win state.");
        // Fallback: Manually hide essential game elements if doneButton.onclick fails
        const wordTools = document.getElementById("word-tools");
        if (wordTools) wordTools.style.display = "none";
        const rowsContainer = document.getElementById("rows-container");
        if (rowsContainer) rowsContainer.style.display = "none";
        const shuffleBtn = document.querySelector("button.button-red"); // Assuming SHUFFLE is red
        if (shuffleBtn) shuffleBtn.style.display = "none";
        // Note: This fallback does not create PLAY AGAIN / GO TO MAIN buttons.
        // The primary path is relying on doneButton.onclick().
    }

    // 2. Hide the "correct-words-section" which is shown by "I AM DONE" logic.
    // For winning, we might not want to immediately show all possible words.
    const correctWordsSection = document.getElementById("correct-words-section");
    if (correctWordsSection) {
        correctWordsSection.style.display = "none";
    }

    // 3. Reset/hide the custom feedback message div if it was used for the old win message.
    const feedbackMessageDiv = document.getElementById("feedback-message");
    if (feedbackMessageDiv && feedbackMessageDiv.textContent.startsWith("CONGRATULATIONS")) {
        // Reset styles or simply hide it, as alert() is now used.
        feedbackMessageDiv.style.display = "none";
        // Optionally reset all styles if this div is reused for other messages
        feedbackMessageDiv.style.position = "";
        feedbackMessageDiv.style.top = "";
        feedbackMessageDiv.style.left = "";
        feedbackMessageDiv.style.transform = "";
        feedbackMessageDiv.style.padding = "";
        feedbackMessageDiv.style.backgroundColor = "";
        feedbackMessageDiv.style.color = "";
        feedbackMessageDiv.style.border = "";
        feedbackMessageDiv.style.borderRadius = "";
        feedbackMessageDiv.style.boxShadow = "";
        feedbackMessageDiv.style.zIndex = "";
        feedbackMessageDiv.style.fontSize = "";
    }

    // 4. Display Congratulations Pop-up
    // Replace <playerName> with actual player name if available, otherwise generic.
    setTimeout(() => {
        alert("CONGRATULATIONS USERNAME - YOU WON");
    }, 0); // Using a 0ms delay to allow DOM updates before alert
}


// ==================== Utility Functions ====================
function showFeedbackMessage(text) {
  // If the win message is already showing, don't let regular feedback overwrite it.
  const feedbackElement = document.getElementById("feedback-message");
  if (feedbackElement && feedbackElement.textContent === "CONGRATULATIONS USERNAME - YOU WON" && feedbackElement.style.display === "block") {
      if (text !== "CONGRATULATIONS USERNAME - YOU WON") { // only proceed if it's not trying to re-show win message
          return;
      }
  }

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
    // Ensure boardPairs is not empty and 'shuffle' function is available
    if (boardPairs && boardPairs.length > 0 && typeof shuffle === 'function') {
        shuffle(boardPairs); // Shuffle the existing boardPairs array in place.

        const container = document.getElementById("rows-container");
        if (!container) {
            console.error("Shuffle_Board: Container for rows not found.");
            return;
        }
        container.innerHTML = ""; // Clear existing board display.

        // Re-render the board with the shuffled pairs.
        // Assuming 6 rows and 4 pairs per row, fitting 24 pairs.
        const numRows = 6;
        const pairsPerRow = 4;
        for (let i = 0; i < numRows; i++) {
            const row = document.createElement("div");
            row.className = "row";
            for (let j = 0; j < pairsPerRow; j++) {
                const pairIndex = i * pairsPerRow + j;
                if (pairIndex < boardPairs.length) { // Check if the pair exists
                    // Assuming createSpeedBox is globally available or correctly scoped
                    const pairBox = createSpeedBox(boardPairs[pairIndex]);
                    row.appendChild(pairBox);
                }
            }
            container.appendChild(row);
        }
    } else {
        if (!boardPairs || boardPairs.length === 0) {
            console.warn("Shuffle_Board: No board pairs to shuffle.");
        }
        if (typeof shuffle !== 'function') {
            console.error("Shuffle_Board: Shuffle function not available.");
        }
    }
};


function generateBoard() {
  container.innerHTML = ""; // Clear existing board display
  selectedWords = []; // Reset for the new board
  boardPairs = [];    // Reset for the new board
  const usedWordsOnBoard = new Set(); // Track words used in *this specific* board generation

  // 1. Determine Target Starting Letters from currentSolution
  let targetLetters = [];
  if (currentSolution && typeof currentSolution === 'string') {
    for (const char of currentSolution) {
      const upperChar = char.toUpperCase();
      if (upperChar >= 'A' && upperChar <= 'Z' && !['Q', 'Z', 'X'].includes(upperChar)) {
        targetLetters.push(upperChar);
      }
    }
  } else {
    console.error("currentSolution is not valid for generating board.");
    // Fallback: fill with random common letters or handle error appropriately
    // For now, let's use a default set if currentSolution is problematic
    const defaultTargetLetters = "EARIOTNSLCUL"; // Common letters
    for(const char of defaultTargetLetters) targetLetters.push(char);
  }

  // 2. Adjust targetLetters to be exactly 12
  if (targetLetters.length < 12) {
    const uniqueLettersInSolution = [...new Set(targetLetters)];
    if (uniqueLettersInSolution.length > 0) {
      let i = 0;
      while (targetLetters.length < 12) {
        targetLetters.push(uniqueLettersInSolution[i % uniqueLettersInSolution.length]);
        i++;
      }
    } else { // Fallback if solution had no usable letters (e.g. "Q Z X")
        const fallbackLetters = ['A', 'E', 'I', 'O', 'S', 'T', 'R', 'N', 'L', 'C', 'U', 'D'];
        while(targetLetters.length < 12) {
            targetLetters.push(fallbackLetters[targetLetters.length % fallbackLetters.length]);
        }
    }
  } else if (targetLetters.length > 12) {
    targetLetters = targetLetters.slice(0, 12);
  }

  // 3. Select 12 words for the board
  let wordsSelectedCount = 0;
  for (let i = 0; i < 12; i++) {
    const startingLetter = targetLetters[i];
    let potentialWords = wordsByFirstLetter[startingLetter] || [];
    let wordData = null;
    let attempts = 0;

    // Try to find an unused word
    while (attempts < (potentialWords.length || 1)) { // Max attempts = num of potential words or 1 if none
        if (potentialWords.length === 0) {
            console.warn(`No words found for letter: ${startingLetter}. Trying a random letter.`);
            // Fallback: pick a random common letter and try again
            const commonFallbackLetters = ['E','A','R','I','O','T','N','S','L','C','U','D','P','M','H','G','B','F','Y','W','K','V'];
            const randomFallbackLetter = commonFallbackLetters[Math.floor(Math.random() * commonFallbackLetters.length)];
            potentialWords = wordsByFirstLetter[randomFallbackLetter] || [];
            if (potentialWords.length === 0) { // Still no words, this is bad
                 console.error(`CRITICAL: No words for fallback letter ${randomFallbackLetter} either.`);
                 // As a last resort, we might need a truly generic fallback word if available
                 // or skip adding a word, which would break the 12-word board.
                 // For now, we'll break this inner loop and might end up with < 12 words.
                 break;
            }
        }

        const randomIndex = Math.floor(Math.random() * potentialWords.length);
        const candidateWord = potentialWords[randomIndex];

        if (candidateWord && !usedWordsOnBoard.has(candidateWord.word)) {
            wordData = candidateWord;
            break;
        }
        attempts++;
        // If all words for this letter are used, or if the list was empty, this loop will end.
        // To prevent infinite loops with small lists, we can try removing the candidate
        // or shuffling and picking from start. For now, random attempts should suffice for larger lists.
        if (attempts >= potentialWords.length && potentialWords.length > 0) {
            // All words for this starting letter are already on board or failed to pick.
            // This indicates a small pool for that letter or many duplicates in targetLetters.
            console.warn(`Could not find an unused word for ${startingLetter} after ${attempts} attempts. May try fallback.`);
            // Fallback: try a different random common letter to ensure board diversity if stuck
            const commonFallbackLetters = ['E','A','R','I','O','T','N','S','L','C','U','D','P','M','H','G','B','F','Y','W','K','V'];
            const randomFallbackLetter = commonFallbackLetters[Math.floor(Math.random() * commonFallbackLetters.length)];
            potentialWords = wordsByFirstLetter[randomFallbackLetter] || []; // Switch to a new list
            attempts = 0; // Reset attempts for the new list
            if (potentialWords.length === 0) break; // If fallback also empty, give up for this slot
        }
    }

    if (wordData) {
      selectedWords.push(wordData); // Store the full word object
      boardPairs.push(wordData.left, wordData.right);
      usedWordsOnBoard.add(wordData.word);
      wordsSelectedCount++;
    } else {
      console.error(`Failed to select a word for target letter: ${startingLetter} (or its fallback). Board may be incomplete.`);
      // Consider adding a placeholder or a very common word if this happens,
      // to ensure boardPairs has 24 items. For now, it might be short.
    }
  }

  if (wordsSelectedCount < 12) {
      console.warn(`Board generated with ${wordsSelectedCount} words instead of 12. Check word list and solution complexity.`);
      // Optionally, fill remaining slots with very common random words to ensure 24 pairs
      // This is complex, for now, accept a potentially smaller board if errors occurred.
  }

  // 4. Shuffle and Display
  shuffle(boardPairs); // Shuffle the collected pairs

  // Rebuild the display
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

  const firstLetter = combined.charAt(0);
  updateHangmanDisplay(firstLetter);

  if (checkWinCondition()) {
      handleWin();
      return; // Stop further processing if win condition is met
  }

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
    // lives--; // Removed
    // livesDisplay.textContent = lives; // Removed
    // if (lives === 0) endGame(); // Removed
  }

  clearSelections();
  window.clearPreview();
}

/* // Entire endGame function removed
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
*/

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

    const firstLetter = word.charAt(0);
    updateHangmanDisplay(firstLetter);

    if (checkWinCondition()) {
        handleWin();
        return; // Stop further processing if win condition is met
    }

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
    // lives--; // Removed
    // livesDisplay.textContent = lives; // Removed
    // if (lives === 0) endGame(); // Removed
  }

  window.clearPreview();
};

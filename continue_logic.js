import { loadTopScores, db } from './utility.js';
import {
  collection, getDocs,
  getDoc, doc, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

async function setupStatusScreen() {
  const name = localStorage.getItem("playerName") || "Guest";
  let lvl = parseInt(localStorage.getItem("level") || "1");

  try {
    const ref = doc(db, "progress", name);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      const d = snapshot.data();
      if (d.level) {
        lvl = d.level;
        localStorage.setItem("level", lvl);
      }
    }
  } catch (e) {
    console.warn("⚠️ Could not refresh level from Firebase:", e);
  }

  document.getElementById("greeting").textContent = `Welcome back, ${name}!`;
  const percent = ((lvl / 650) * 100).toFixed(1);
  const levelLine = `You are at Level ${lvl}. You are ${percent}% finished the ladder.`;
  document.getElementById("level-stats").textContent = levelLine;

  document.getElementById("continue-btn").onclick = () => {
    window.location.href = "howtoplay.html";
  };

  document.getElementById("logout-btn").onclick = () => {
    localStorage.clear();
    window.location.href = "index.html";
  };
}

// Initialize on load
setupStatusScreen();
loadTopScores();

// assume you already have something like:


// Secret keyword to unlock
// map each keyword to its target page
const shortcuts = {
  speed: 'speed_ladder.html',
  theme: 'theme_pages.html'
};
// track the longest keyword so we can trim our buffer
const maxLen = Math.max(...Object.keys(shortcuts).map(k => k.length));

let buffer = '';
window.addEventListener('keydown', e => {
  const ch = e.key.toLowerCase();
  if (/^[a-z]$/.test(ch)) {
    buffer += ch;
    // keep buffer from growing beyond longest keyword
    if (buffer.length > maxLen) buffer = buffer.slice(-maxLen);
    // check each shortcut
    for (const [key, url] of Object.entries(shortcuts)) {
      if (buffer.endsWith(key)) {
        window.location.href = url;
        return;
      }
    }
  }
});

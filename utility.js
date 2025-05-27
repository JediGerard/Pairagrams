// utility.js — Shared functions and Firebase setup for Pairagrams

// =============== Firebase Initialization ===============
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyADcjbU1jM9Pqq4ZDrInVGSN7SdUb6O5nA",
  authDomain: "pairagrams.firebaseapp.com",
  projectId: "pairagrams",
  storageBucket: "pairagrams.firebasestorage.app",
  messagingSenderId: "958505224302",
  appId: "1:958505224302:web:81bae163e8a526467afe7f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// =============== Utility Functions ===============

export async function loadTopScores() {
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(10));
  const snapshot = await getDocs(q);
  const ul = document.getElementById("top-scores");
  if (ul) { // Ensure the element exists before trying to modify it
    ul.innerHTML = ""; // Clear existing scores

    snapshot.forEach(doc => {
      const d = doc.data();
      const li = document.createElement("li");
      li.classList.add("entry"); // Optional: add flex styling
      li.innerHTML = `<span>${d.name || "Anon"}</span><span>${d.score} pts</span>`;
      ul.appendChild(li);
    });
  } else {
    console.warn("#top-scores element not found. Cannot display scores.");
  }
}

export function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // ✅ stops ongoing speech
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function getLongestWord(words) {
  return [...words].reduce((a, b) => (a.length >= b.length ? a : b), "");
}

// =============== Wall of Fame Tracking ===============
// Usage: updateHallOfFame("fastestLevel", { name, level, time })
export async function updateHallOfFame(category, entryData) {
  const hallRef = doc(db, "halloffame", category);
  try {
    const existing = await getDocs(collection(db, "halloffame"));
    let currentBest;
    existing.forEach(docSnap => {
      if (docSnap.id === category) {
        currentBest = docSnap.data();
      }
    });

    let shouldUpdate = false;

    if (!currentBest) {
      shouldUpdate = true;
    } else if (category === "fastestLevel") {
      shouldUpdate = entryData.time < currentBest.time;
    } else if (category === "fastestAverage") {
      shouldUpdate = entryData.avg < currentBest.avg;
    } else if (category === "mostBonus") {
      shouldUpdate = entryData.count > currentBest.count;
    } else if (category === "longestBonus") {
      shouldUpdate = entryData.word.length > currentBest.word.length;
    }

    if (shouldUpdate) {
      await setDoc(hallRef, entryData);
      console.log(`✅ Hall of Fame updated: ${category}`);
    }

  } catch (e) {
    console.error("❌ Error updating Hall of Fame:", e);
  }
}

export function getModeForLevel(level) {
  if (level <= 25) return 2;
  if (level <= 150) return 3;
  return 4;
}
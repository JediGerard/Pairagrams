import { loadTopScores, db } from './utility.js';
import {
  collection, addDoc,
  getDocs, getDoc, doc, query, orderBy, limit, where
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// 🔄 Auto-redirect if returning user already logged in
document.addEventListener("DOMContentLoaded", () => {
  const name = localStorage.getItem("playerName");

  if (name) {
    window.location.href = "continue.html";
  }
});


// 🔐 Securely hash password using SHA-256 before storing or comparing
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// 🚀 Handle login and game setup: validate input, check or store password, and redirect
async function startGame() {
  const name = document.getElementById("playerName").value.trim();
  const pw = document.getElementById("password").value;
  if (!name || pw.length < 5) {
    alert("Please enter a name and a 5+ character password.");
    return;
  }

  const hash = await hashPassword(pw);
  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (users[name] && users[name] !== hash) {
    alert("Incorrect password.");
    return;
  }

  users[name] = hash;
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("playerName", name);
  localStorage.setItem("newGame", "true");
  localStorage.setItem("lives", "5");
  localStorage.setItem("bonusWords", "[]");
  localStorage.setItem("totalScore", "0");

  // ✅ Fetch user level from Firebase
  let userLevel = 1;
  const ref = doc(db, "progress", name);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    const d = snapshot.data();
    console.log("🧠 Firebase doc for", name, "=", d);
    if (d.level) userLevel = d.level;
  } else {
    console.warn("⚠️ No saved progress found for", name);
  }

  console.log("🎯 Final resolved level for", name, "=", userLevel);


  localStorage.setItem("level", userLevel);

  // ✅ Redirect to continue page
  window.location.href = "continue.html";
}

// 🔁 Trigger top score fetch and expose game start method
loadTopScores();

window.startGame = startGame;

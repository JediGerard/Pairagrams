# **Pairagrams**
#### Video Demo:  https://www.youtube.com/watch?v=J-gkUnWH5Is
#### Description: Build words for fame and fortune!
#### Found at: https://jedigerard.github.io/CS50-Code/

 

**Pairagrams** is a browser-based word puzzle game that challenges players to form valid words by matching left and right word fragments. It blends elements of Scrabble, Wordle, and pair logic puzzles to create a highly interactive and strategic experience.

Each level begins with a randomized set of word fragments derived from real English words. The player must match the left-side and right-side fragments to form full words, aiming to complete all valid matches before running out of time or lives. Bonus points are awarded for discovering valid words not part of the intended matches ("bonus words").

This version has 65 levels but I have already spec 500+ levels and well into coding so this is a snapshot in time.

---

## **Project Files**

### **1\. index.html**

This file serves as the landing page and login interface. It allows users to:

* Enter their player name and password.  
* Select a starting level from a dropdown.  
* View a dynamically populated high score list from Firebase. (Need someway to get people challenged by appealing to their vanity)

Upon valid entry, it stores initial game state in `localStorage` and redirects the user to `games.html`.

### **2\. games.html**

This is the main gameplay interface. It includes:

* A color-coded title banner.  
* A rules summary.  
* A lives tracker.  
* A real-time score and timer display.  
* The word pair grid.  
* A bonus word list.  
* A button to advance to the next level if successful.

It references `game_logic.js`, where all core logic resides.

### **3\. game\_logic.js**

This JavaScript file contains the main logic of the game. Key features include:

* **Dynamic Board Generation:** Randomizes a list of valid word pairs and ensures no duplicates or symmetrical matches.  
* **Scoring System:** Tracks total score, matched words, and bonus words.  
* **Timer and Lives:** Implements a 5-minute countdown and life tracking.  
* **Firebase Integration:** Saves the player’s high score at game end.  
* **Bonus Word Handling:** Recognizes bonus words, prevents duplicates, and adds them to a visual list.  
* **Level Progression:** Updates level and lives and resets UI for next stage.

### **4\. gameover.html**

This page displays at the end of the game when lives reach 0\. It summarizes:

* Final level reached  
* Total score  
* Bonus words found  
* Average time per level  
* A thank you message and optional feedback form

It pulls this data from `localStorage` and clears temporary values.

### **5\. about.html**

Provides background and author information, such as:

* Project origin story  
* Creator: Tim Nye  
* GitHub name, EDX name, and date/location of recording  
* Clickable audio easter egg ("I AM GROOT") 


---

## **Design Decisions**

### **Fragment Pairing**

The initial approach allowed any valid word pair, which led to many repeated left or right fragments. This was frustrating and confusing to users. I implemented a uniqueness check that ensures both halves of each pair are distinct across the grid.

### **Direct Match Filtering**

To improve difficulty and gameplay balance, I added a check to ensure correct pairs do not appear directly opposite each other (i.e., left/right positions match). This avoids making the game too easy. In future versions, I may disable this or change it so it occurs infrequently

### **Bonus Words**

Tracking and scoring bonus words encourages lateral thinking. The game uses a common English word list to validate extra combinations. Found bonus words persist across levels and are stored in `localStorage`.  I want to monetize the game so this seems like a nice motivation for users to look for bonus words.

### **Firebase**

High scores are written to Firebase in real-time using a secure API key. This was chosen to allow persistent leaderboard tracking without needing backend hosting. Passwords are hashed using SHA-256 and compared locally.

### **Code Comments and Structure**

This is original code but AI was used extensively in collaboration with me and at times rewrote my code.  I have also tweaked the AI code in many places.  I needed to use AI as the .js code was becoming unwieldy.  There is no code that I do not understand.

---

## **Future Improvements**

* Add 3 and 4 column levels (left/middle/right)   
* Moving columns where you need to move columns into correct order to solve  
* Cheat code that you can buy to freeze clock, solve world, skip level.  
* Add sound effects and music with volume control  
* Themes where all words are one theme (eg: Wood, leaf, soil, rain : FOREST)  
* Turn into an app.

---

https://jedigerard.github.io/CS50-Code/

Comments are appreciated.

— Tim Nye, April 2025


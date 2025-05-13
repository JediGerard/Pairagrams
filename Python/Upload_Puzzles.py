import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime

# === CONFIGURATION ===
SERVICE_ACCOUNT_FILE = "pairagrams-firebase-adminsdk-fbsvc-ae05e518fd.json"
PUZZLE_FILE = "DAILY_PUZZLES_REFORMATTED.json"
COLLECTION_NAME = "Puzzles2025"

# === INITIALIZE FIREBASE ===
cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
firebase_admin.initialize_app(cred)
db = firestore.client()

# === LOAD PUZZLES ===
with open(PUZZLE_FILE, "r") as f:
    puzzles = json.load(f)

uploaded = 0
skipped = 0

for puzzle in puzzles:
    puzzle_id = puzzle["puzzleId"]
    doc_ref = db.collection(COLLECTION_NAME).document(puzzle_id)
    existing = doc_ref.get()

    if existing.exists:
        print(f"⏭️ Skipped existing puzzle: {puzzle_id}")
        skipped += 1
        continue

    # Add generatedDate if not present
    if not puzzle.get("generatedDate"):
        puzzle["generatedDate"] = datetime.utcnow().strftime("%Y-%m-%d")

    doc_ref.set(puzzle)
    print(f"✅ Uploaded puzzle: {puzzle_id}")
    uploaded += 1

print(f"\n✅ Done! Uploaded: {uploaded}, Skipped: {skipped}")

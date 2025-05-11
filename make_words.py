import json

def generate_three_part_splits(word):
    length = len(word)
    splits = []
    for i in range(2, length - 3 + 1):
        for j in range(i + 2, length - 1 + 1):
            left = word[:i]
            middle = word[i:j]
            right = word[j:]
            if len(right) >= 2:
                splits.append([left, middle, right])
    return splits

with open("master_words_file_with_parts_labeled.json", "r") as f:
    data = json.load(f)

for word, entry in data.items():
    word_upper = word.upper()
    if len(word_upper) < 6:
        continue
    existing_parts = entry.get("parts", [])
    three_parts = generate_three_part_splits(word_upper)
    existing_set = {tuple(p) for p in existing_parts}
    for triplet in three_parts:
        if tuple(triplet) not in existing_set:
            existing_parts.append(triplet)
            existing_set.add(tuple(triplet))
    entry["parts"] = existing_parts

with open("master_words_file_with_parts_full.json", "w") as f:
    json.dump(data, f, indent=2)

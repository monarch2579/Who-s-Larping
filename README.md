# Who's Larping? (Spot the Fake)

**Who's Larping?** is the ultimate, highly configurable social deduction party game designed for 3 to 20 players. Whether you're playing over a single mobile device around a campfire or hosting a massive game night, one question remains: *Can you spot the fake?*

---

## 1. Product Overview & Game Modes

All players except for the designated **Imposters** are given a shared secret context. The Imposter is left in the dark and must aggressively bluff, echo other players' sentiments, and deduce the secret topic on the fly before their cover is blown.

### 🕹️ Core Game Modes

* **Mode A: Secret Word**
*All players see a specific word (e.g., "Volcano"), while the Imposter only sees a broad category (e.g., "Nature").* Players provide one-word or one-sentence clues. The Imposter must provide a convincing clue without revealing they don't know the exact word.
* **Mode B: Secret Question**
*All players answer a highly specific question (e.g., "What do you do at the beach?"), while the Imposter sees a vague, completely altered, or empty prompt.* The Imposter must construct an answer that blends seamlessly into the group's responses.

---

## 2. Game Flow

```
[1] Setup Session ➔ [2] Pass & View Roles ➔ [3] Give Clues/Answers
                                                        │
[6] Scoring & Leaderboard 🔀 [5] Reveal & Final Guess ◄─[4] Group Vote

```

1. **Configuration:** The host selects the player count, inputs names, chooses the game mode, sets the number of Imposters, and adjusts the content rating filters.
2. **Private Role Assignment:** Players privately view their role card. The app features a **"Tap to Reveal"** screen to prevent accidental screen peeking.
3. **Clue Phase:** Going around in a circle, players deliver their clues or answers based on the selected game mode.
4. **Discussion & Voting:** The group textually or verbally debates for 1–5 minutes, followed by a simultaneous vote to eliminate the primary suspect.
5. **The Reveal & Final Guess:** The voted player's identity is revealed. If they are an Imposter, they get **one final dramatic comeback chance** to guess the true secret word or question to steal the win.
6. **Scoring:** Points are calculated, and the session leaderboard updates before moving to the next round.

---

## 3. Configuration & Rules

### 👥 Player & Imposter Scaling

The app natively supports **3 to 20 players**. Imposter counts scale automatically to protect game balance, though hosts receive a soft warning rather than a hard block if they prefer high-chaos configurations:

| Player Count | Recommended Imposters | Gameplay Dynamic |
| --- | --- | --- |
| **3 - 5** | 1 Imposter | Tight, high-stakes deduction |
| **6 - 9** | 1 - 2 Imposters | Standard Group Play *(Default: 1)* |
| **10 - 14** | 2 - 3 Imposters | Alliance & Coalition gameplay |
| **15 - 20** | 2 - 4 Imposters | High-chaos party mode |

> ⚠️ **Warning:** Selecting an Imposter count exceeding 40% of the total player pool will trigger a soft UI warning alerting the host to chaotic balancing.

### 🏆 Scoring Metrics

* **Real Players:** `+2 pts` for successfully voting out an Imposter; `+1 pt` for surviving a round.
* **Imposter:** `+3 pts` for surviving the round un-eliminated; `+5 pts` for guessing the secret word/question after being caught.
* **Optional Bonuses:** Configurable `+1 pt` for "Most Creative Clue" (voted by players) or "First Correct Accusation".

---

## 4. Content & Rating System

The app utilizes a strictly walled content tier system to keep gameplay safe for school settings or spicy for adult parties.

* 🟢 **Family:** Clean humor, general knowledge, pop culture. Suitable for all ages.
* 🟡 **Standard (Default):** Light adult themes, mild humor, subtle innuendo.
* 🔴 **18+ (Explicit):** Adult humor, mature relationships, dating culture, and unfiltered party themes.

> 🔒 **18+ Safety Toggle:** All 18+ content packages are **disabled by default**. The host must explicitly toggle the mature setting on and confirm they are of legal age. This preference can be toggled off instantly at any time without destroying current player session data.

---

## 5. Topic Library Snapshot

The game ships with hundreds of built-in prompts per mode to maximize replayability. Below is an overview of included categories:

### Word Mode Categories (Family / Standard)

* *Food & Drink, Nature & Animals, Movies & TV, Sports & Games, History & Geography, Science & Tech, Music, Travel & Cultures, Video Games, Home & Lifestyle, Work & Business, Psychology & People, Internet & Memes, Art & Design, Fantasy & Mythology, Pop Culture, Mysteries & Conspiracies, Health & Wellness.*

### Question Mode Settings (Sample Themes)

* **On Vacation:** *"What is the first thing you do when you arrive at your hotel or rental?"*
* **At the Grocery Store:** *"What aisle do you always rush through or avoid completely?"*
* **On a Long Flight:** *"What do you watch or read to pass the time on a long flight?"*
* **Other Environments:** *Holiday Season, First Day of School, At a Wedding, At the Gym, At a House Party, Family Dinner, Road Trip.*

### Mature Content Expansion (18+ Toggle Only)

* **Word Lists:** *Dating & Romance, Drinking Games, Dark Humor, Awkward Situations, Body & Anatomy, Adult Media, Wild Nights Out, Things You Lie About, Ex Territory, Kinks & Preferences, Situationships, Hookup Culture, Bad Decisions, Hidden Phone Data, College Life, Senior Year Stories, Locker Room Talk, Office Gossip, Getting Caught.*
* **Question Contexts:** *On a First Date, After a Breakup, In the Bedroom, Truth or Dare Energy, Summer Situationships.*

---

## 6. Development & Deployment Roadmap

### Core Features to Implement

* [ ] **Device Modes:** Single-device (Pass-and-Play) design constraints and Multi-device local network syncing.
* [ ] **Smart Filtering:** Anti-repetition algorithm flagging recently played words.
* [ ] **Custom Deck Builder:** Allow hosts to input localized custom word/question strings into local storage.
* [ ] **Optional Session Timer:** Configurable 1–5 minute ticking sound engine for the discussion phase.

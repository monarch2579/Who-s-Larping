const sound = window.sound;
const TOPICS = window.TOPICS;


// Particle System for Confetti
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.active = false;
    this.colors = ['#d500f9', '#00e5ff', '#00e676', '#ffea00', '#ff1744', '#ff9100'];
    
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start() {
    this.active = true;
    this.particles = [];
    for (let i = 0; i < 150; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height - this.canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * this.canvas.height,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2
      });
    }
    this.animate();
  }

  stop() {
    this.active = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  animate() {
    if (!this.active) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    let finished = true;
    for (let p of this.particles) {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += p.speed;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      
      if (p.y < this.canvas.height) {
        finished = false;
      }
      
      this.ctx.beginPath();
      this.ctx.lineWidth = p.r;
      this.ctx.strokeStyle = p.color;
      this.ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      this.ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      this.ctx.stroke();
    }
    
    if (!finished && this.active) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }
}

// Main Game Controller
class Game {
  constructor() {
    // Initial State Variables
    this.players = [];
    this.imposterCount = 1;
    this.gameMode = 'word'; // 'word' or 'question'
    this.selectedCategory = null;
    
    this.secretWord = '';
    this.secretQuestion = '';
    this.categoryName = '';
    this.questionDecoy = '';
    this.currentRoundInitialImposterCount = 1;
    this.roundOutcome = null;
    this.roundScored = false;
    
    this.roundNumber = 1;
    this.clues = [];
    this.votes = {}; // voterId -> votedId
    
    // Stage indices for flow
    this.activePlayerIndex = 0;
    this.activeVoterIndex = 0;
    
    // System Configs
    this.timersEnabled = false;
    this.clueTimerVal = 30;
    this.discussionTimerVal = 120;
    this.adultContentEnabled = false;
    this.randomImpostersEnabled = false;
    this.zeroImpostersEnabled = false;
    
    this.timerInterval = null;
    this.timeLeft = 0;
    this.currentTimerDuration = 0;
    
    // Custom Topic Packs Bank
    this.customPacks = JSON.parse(localStorage.getItem('sft_custom_packs') || '[]');
    
    // UI Helpers
    this.particleSystem = new ParticleSystem(document.getElementById('confetti-canvas'));
  }

  init() {
    this.setupDefaultPlayers(4);
    this.bindEvents();
    this.renderCustomPacks();
    this.restoreAccessibilityPreferences();
  }

  setupDefaultPlayers(count) {
    this.players = [];
    for (let i = 1; i <= count; i++) {
      this.players.push({
        id: i,
        name: `Player ${i}`,
        score: 0,
        role: 'real',
        alive: true,
        isImposter: false
      });
    }
    this.renderSetupPlayerInputs();
    this.updateImposterCountBoundaries();
  }

  renderSetupPlayerInputs() {
    const listContainer = document.getElementById('setup-player-list');
    listContainer.innerHTML = '';

    this.players.forEach((player, index) => {
      const row = document.createElement('div');
      row.className = 'player-row-setup';
      row.innerHTML = `
        <span>${index + 1}</span>
        <input type="text" value="${player.name}" data-id="${player.id}" placeholder="Enter Name..." aria-label="Player ${index + 1} Name">
        ${this.players.length > 3 ? `<button class="delete-btn" data-id="${player.id}" title="Remove player" aria-label="Remove player">🗑️</button>` : ''}
      `;
      
      const input = row.querySelector('input');
      input.addEventListener('input', (e) => {
        player.name = e.target.value.trim() || `Player ${index + 1}`;
      });
      
      // Bind delete button
      if (this.players.length > 3) {
        const delBtn = row.querySelector('.delete-btn');
        delBtn.addEventListener('click', () => {
          sound.playClick();
          this.players = this.players.filter(p => p.id !== player.id);
          this.renderSetupPlayerInputs();
          this.updateImposterCountBoundaries();
        });
      }
      
      listContainer.appendChild(row);
    });

    document.getElementById('setup-player-count-label').textContent = this.players.length;
  }

  updateImposterCountBoundaries() {
    const count = this.players.length;
    // Allow up to half the players as imposters — with 4 players that means 2
    const maxImposters = Math.max(1, Math.floor(count / 2));

    // Clamp imposter count within valid range [1, maxImposters]
    if (this.imposterCount > maxImposters) {
      this.imposterCount = maxImposters;
    }
    if (this.imposterCount < 1) {
      this.imposterCount = 1;
    }

    // Toggle warnings if imposter ratio > 40%
    const warning = document.getElementById('setup-imposter-warning');
    const ratio = this.imposterCount / count;
    if (ratio > 0.4 && !this.randomImpostersEnabled) {
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }

    const minusBtn = document.getElementById('setup-btn-imposter-minus');
    const plusBtn = document.getElementById('setup-btn-imposter-plus');
    const valueSpan = document.getElementById('setup-imposter-value');

    if (this.randomImpostersEnabled) {
      minusBtn.disabled = true;
      plusBtn.disabled = true;
      valueSpan.style.opacity = '0.5';
      valueSpan.textContent = this.zeroImpostersEnabled ? '🎲 0+' : '🎲';
    } else {
      minusBtn.disabled = this.imposterCount <= 1;
      plusBtn.disabled = this.imposterCount >= maxImposters;
      valueSpan.style.opacity = '1';
      valueSpan.textContent = this.imposterCount;
    }
  }

  // --- Accessibility preferences handlers ---
  restoreAccessibilityPreferences() {
    const contrast = localStorage.getItem('sft_high_contrast') === 'true';
    const colorblind = localStorage.getItem('sft_colorblind') === 'true';
    const textSize = localStorage.getItem('sft_text_size') || 'md';
    const muted = localStorage.getItem('sft_muted') === 'true';

    if (contrast) document.body.classList.add('contrast-high');
    if (colorblind) document.body.classList.add('colorblind-safe');
    document.body.classList.remove('text-size-sm', 'text-size-md', 'text-size-lg', 'text-size-xl');
    document.body.classList.add(`text-size-${textSize}`);
    
    sound.muted = muted;
    document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
    
    // Sync preference selectors
    document.getElementById('pref-select-text-size').value = textSize;
    document.getElementById('pref-btn-contrast').textContent = contrast ? 'ON' : 'OFF';
    document.getElementById('pref-btn-colorblind').textContent = colorblind ? 'ON' : 'OFF';
  }

  // --- Core navigation flow ---
  showScreen(screenId) {
    this.stopTimer();
    
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
    }

    // Trigger page-specific logic
    if (screenId === 'screen-lobby') {
      this.particleSystem.stop();
    } else if (screenId === 'screen-setup') {
      this.updateImposterCountBoundaries();
    } else if (screenId === 'screen-topics') {
      this.renderTopicGrid();
    } else if (screenId === 'screen-reveal-roles') {
      this.activePlayerIndex = 0;
      this.renderRevealPass();
    } else if (screenId === 'screen-clues') {
      this.activePlayerIndex = 0;
      this.clues = []; // clear clues from any prior round
      document.getElementById('clues-round-label').textContent = `Round ${this.roundNumber}`;
    } else if (screenId === 'screen-discussion') {
      this.renderDiscussionView();
    } else if (screenId === 'screen-voting') {
      this.renderVotingGrid();
    } else if (screenId === 'screen-scoreboard') {
      this.renderScoreboard();
    }
  }

  // --- Category grid logic ---
  renderTopicGrid() {
    const grid = document.getElementById('topics-grid');
    grid.innerHTML = '';
    const searchVal = document.getElementById('topics-search').value.toLowerCase();

    // Word categories
    const categories = [];

    // Extract categories matching mode and ratings
    const source = TOPICS[this.gameMode];
    
    // Add standard categories
    Object.keys(source.family).forEach(cat => {
      categories.push({ name: cat, tier: 'standard', custom: false });
    });

    // Add 18+ categories if enabled
    if (this.adultContentEnabled) {
      Object.keys(source.adult).forEach(cat => {
        categories.push({ name: cat, tier: 'adult', custom: false });
      });
    }

    // Filter custom packs
    this.customPacks.forEach(pack => {
      if (pack.mode === this.gameMode) {
        categories.push({ name: pack.name, tier: 'custom', custom: true, pack });
      }
    });

    // Filter by search
    const filtered = categories.filter(c => c.name.toLowerCase().includes(searchVal));

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No categories found matching filters.</div>`;
      return;
    }

    filtered.forEach(cat => {
      const card = document.createElement('div');
      card.className = `category-card ${this.selectedCategory === cat.name ? 'selected' : ''}`;
      const tierLabel = cat.tier === 'standard' ? 'Classic' : cat.tier;
      card.innerHTML = `
        <span style="font-weight: 600; font-size: var(--text-sm);">${cat.name}</span>
        <span class="category-tag ${cat.tier}">${tierLabel}</span>
      `;
      
      card.addEventListener('click', () => {
        sound.playClick();
        this.selectedCategory = cat.name;
        document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });

      grid.appendChild(card);
    });
  }

  // --- Assign Secrets & Roles ---
  generateGameSecret() {
    const source = TOPICS[this.gameMode];
    let items = [];
    
    // Check if it is a custom pack
    const customPack = this.customPacks.find(p => p.name === this.selectedCategory && p.mode === this.gameMode);
    if (customPack) {
      items = customPack.items;
      this.categoryName = customPack.name;
    } else {
      // Find in topics
      this.categoryName = this.selectedCategory;
      if (source.family[this.selectedCategory]) {
        items = source.family[this.selectedCategory];
      } else if (source.adult[this.selectedCategory]) {
        items = source.adult[this.selectedCategory];
      }
    }

    if (!items || items.length < 4) {
      alert("This category does not have enough items to play! Need at least 4 items.");
      return false;
    }

    if (this.gameMode === 'word') {
      // Pick random word
      const randIndex = Math.floor(Math.random() * items.length);
      this.secretWord = items[randIndex];
    } else {
      // Pick random question
      const randIndex = Math.floor(Math.random() * items.length);
      this.secretQuestion = items[randIndex];
      
      // Nearby question logic for imposters
      const decoys = items.filter(q => q !== this.secretQuestion);
      this.questionDecoy = decoys[Math.floor(Math.random() * decoys.length)] || "What is something people might not know about you?";
    }

    return true;
  }

  assignRoles() {
    // Reset players alive state
    this.players.forEach(p => {
      p.alive = true;
      p.isImposter = false;
      p.role = 'real';
    });

    let targetImposterCount = this.imposterCount;
    this.roundScored = false;
    if (this.randomImpostersEnabled) {
      const count = this.players.length;
      const maxImposters = Math.max(1, Math.floor(count / 2));
      const minImposters = this.zeroImpostersEnabled ? 0 : 1;
      targetImposterCount = Math.floor(Math.random() * (maxImposters - minImposters + 1)) + minImposters;
      console.log(`[DEBUG] Secret random imposter count chosen: ${targetImposterCount}`);
    }
    this.currentRoundInitialImposterCount = targetImposterCount;
    this.roundOutcome = null;

    // Shuffle and pick imposters
    const indices = Array.from({ length: this.players.length }, (_, i) => i);
    const imposterIndices = [];
    
    for (let i = 0; i < targetImposterCount; i++) {
      if (indices.length === 0) break;
      const rand = Math.floor(Math.random() * indices.length);
      imposterIndices.push(indices.splice(rand, 1)[0]);
    }

    imposterIndices.forEach(idx => {
      this.players[idx].isImposter = true;
      this.players[idx].role = 'imposter';
    });
  }

  // --- Dynamic Option generation for Imposter guess ---
  generateGuessOptions() {
    const source = TOPICS[this.gameMode];
    let items = [];
    
    const customPack = this.customPacks.find(p => p.name === this.selectedCategory && p.mode === this.gameMode);
    if (customPack) {
      items = [...customPack.items];
    } else {
      if (source.family[this.selectedCategory]) {
        items = [...source.family[this.selectedCategory]];
      } else if (source.adult[this.selectedCategory]) {
        items = [...source.adult[this.selectedCategory]];
      }
    }

    const correct = this.gameMode === 'word' ? this.secretWord : this.secretQuestion;
    const filteredDecoys = items.filter(x => x !== correct);
    
    // Pick 3 random decoys
    const choices = [];
    for (let i = 0; i < 3; i++) {
      if (filteredDecoys.length === 0) break;
      const rand = Math.floor(Math.random() * filteredDecoys.length);
      choices.push(filteredDecoys.splice(rand, 1)[0]);
    }
    
    choices.push(correct);
    
    // Shuffle choices
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    
    return choices;
  }

  // --- Role Reveal Screens flow ---
  renderRevealPass() {
    document.getElementById('reveal-pass-container').style.display = 'flex';
    document.getElementById('reveal-card-container').style.display = 'none';
    document.getElementById('reveal-btn-continue').disabled = true;

    const player = this.players[this.activePlayerIndex];
    document.getElementById('reveal-player-name').textContent = player.name;
    document.getElementById('reveal-progress-label').textContent = `Player ${this.activePlayerIndex + 1} of ${this.players.length}`;
  }

  revealCard() {
    sound.playReveal();
    document.getElementById('reveal-pass-container').style.display = 'none';
    document.getElementById('reveal-card-container').style.display = 'block';

    const player = this.players[this.activePlayerIndex];
    document.getElementById('reveal-card-player-name').textContent = player.name;
    
    const badge = document.getElementById('reveal-badge');
    const label = document.getElementById('reveal-secret-label');
    const value = document.getElementById('reveal-secret-value');
    const desc = document.getElementById('reveal-secret-desc');

    if (player.isImposter && this.gameMode === 'question') {
      badge.textContent = "Real Player";
      badge.className = "role-badge real-player";
      label.textContent = "Secret Question";
      value.textContent = this.questionDecoy;
      desc.textContent = "Answer this question truthfully. Watch out for vague answers from the Fake!";
    } else if (player.isImposter) {
      badge.textContent = "Imposter";
      badge.className = "role-badge imposter";
      
      label.textContent = "Your Category";
      value.textContent = this.categoryName;
      desc.textContent = "You do not know the secret word. Bluff your way through using this category hint!";
    } else {
      badge.textContent = "Real Player";
      badge.className = "role-badge real-player";
      
      if (this.gameMode === 'word') {
        label.textContent = "Secret Word";
        value.textContent = this.secretWord;
        desc.textContent = `Category: ${this.categoryName}. Give a subtle hint to describe this word!`;
      } else {
        label.textContent = "Secret Question";
        value.textContent = this.secretQuestion;
        desc.textContent = "Answer this question truthfully. Watch out for vague answers from the Fake!";
      }
    }

    document.getElementById('reveal-btn-continue').disabled = false;
  }

  // --- Clue turns logic ---
  nextClueTurn() {
    // Clues are said out loud by the group — no per-player digital input needed
    return;
  }

  submitClue(text) {
    sound.playClick();
    this.stopTimer();
    
    const player = this.players[this.activePlayerIndex];
    const finalClue = text.trim() || "[No verbal clue logged]";
    
    this.clues.push({
      playerId: player.id,
      playerName: player.name,
      text: finalClue
    });

    this.renderClueLog();

    this.activePlayerIndex++;
    this.nextClueTurn();
  }

  renderClueLog() {
    const log = document.getElementById('clues-log-container');
    log.innerHTML = '';
    
    this.clues.forEach(clue => {
      const row = document.createElement('div');
      row.className = 'clue-row';
      row.innerHTML = `
        <span class="clue-player-name">${clue.playerName}</span>
        <span class="clue-text">${clue.text}</span>
      `;
      log.appendChild(row);
      
      // Auto scroll
      log.scrollTop = log.scrollHeight;
    });
  }

  // --- Discussion phase timers ---
  renderDiscussionView() {
    // Clues are discussed verbally — no digital recap element in current design
    const timerContainer = document.getElementById('disc-timer-container');
    if (this.timersEnabled && timerContainer) {
      timerContainer.style.visibility = 'visible';
      this.startTimer(this.discussionTimerVal, 'disc-timer-text', 'disc-timer-progress', () => {
        sound.playTimerAlert();
      });
    } else if (timerContainer) {
      timerContainer.style.visibility = 'hidden';
    }
  }

  // --- Simplified Voting Logic (IRL) ---
  renderVotingGrid() {
    // Populate dropdown with alive players
    const select = document.getElementById('voting-select-player');
    select.innerHTML = '<option value="">-- Select Result --</option>';

    const nobodyOption = document.createElement('option');
    nobodyOption.value = '__none__';
    nobodyOption.textContent = 'No one is the imposter';
    select.appendChild(nobodyOption);

    this.players.forEach(player => {
      if (player.alive) {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        select.appendChild(option);
      }
    });

    // Reset selection
    select.value = '';
  }

  processElimination() {
    const selectedIdRaw = document.getElementById('voting-select-player').value;
    
    if (!selectedIdRaw) {
      alert('Please select a result');
      return;
    }

    if (selectedIdRaw === '__none__') {
      this.showNoImposterResult();
      return;
    }

    // Player IDs are numbers; select.value is always a string — parse to match
    const selectedId = parseInt(selectedIdRaw, 10);
    const elimPlayer = this.players.find(p => p.id === selectedId);
    
    if (!elimPlayer) {
      alert('Error: Player not found');
      return;
    }
    
    elimPlayer.alive = false;
    this.showRevealResults(elimPlayer);
  }

  showNoImposterResult() {
    const hadImposters = this.players.some(p => p.isImposter);
    this.showScreen('screen-reveal-results');

    document.getElementById('reveal-eliminated-pre').textContent = 'The group called it clean.';
    document.getElementById('reveal-eliminated-name').textContent = 'No one';
    const roleBadge = document.getElementById('reveal-eliminated-role');
    roleBadge.textContent = hadImposters ? 'IMPOSTERS SLIPPED THROUGH' : 'NO IMPOSTERS THIS ROUND';
    roleBadge.className = hadImposters ? 'reveal-role-reveal imposter' : 'reveal-role-reveal real-player';

    document.getElementById('reveal-guess-container').style.display = 'none';
    const finalVerdict = document.getElementById('reveal-final-verdict');
    finalVerdict.style.display = 'block';

    const title = document.getElementById('verdict-title');
    const desc = document.getElementById('verdict-desc');
    const nextBtn = document.getElementById('reveal-btn-next-round');
    nextBtn.disabled = false;
    nextBtn.textContent = 'Show Scoreboard ➡️';

    if (hadImposters) {
      this.roundOutcome = 'imposters_survived';
      title.textContent = '🚨 IMPOSTER VICTORY! 🚨';
      title.style.color = 'var(--red)';
      desc.textContent = 'The group stopped voting while at least one Imposter was still hidden.';
      sound.playFailure();
    } else {
      this.roundOutcome = 'clean_round';
      title.textContent = '✅ CLEAN ROUND!';
      title.style.color = 'var(--green)';
      desc.textContent = 'There were no imposters. The group read the room correctly.';
      sound.playSuccess();
    }
    this.applyRoundScore();
  }

  showRevealResults(elimPlayer) {
    this.showScreen('screen-reveal-results');

    document.getElementById('reveal-eliminated-pre').textContent = 'The votes are tallied. Voted out is...';
    document.getElementById('reveal-eliminated-name').textContent = elimPlayer.name;
    const roleBadge = document.getElementById('reveal-eliminated-role');
    const guessContainer = document.getElementById('reveal-guess-container');
    const finalVerdict = document.getElementById('reveal-final-verdict');
    
    // Hide continue initially until guess phase is done
    const nextBtn = document.getElementById('reveal-btn-next-round');
    nextBtn.disabled = true;
    nextBtn.textContent = this.shouldContinueElimination() ? "Continue Elimination ➡️" : "Show Scoreboard ➡️";

    if (elimPlayer.isImposter) {
      roleBadge.textContent = "THE IMPOSTER!";
      roleBadge.className = "reveal-role-reveal imposter";
      sound.playSuccess(); // Voted out imposter is success for real players

      if (this.shouldContinueElimination()) {
        guessContainer.style.display = 'none';
        finalVerdict.style.display = 'block';
        this.renderEliminationStatus();
        nextBtn.disabled = false;
      } else {
        // Reveal guess pack choice grid
        guessContainer.style.display = 'block';
        finalVerdict.style.display = 'none';
        this.renderGuessOptions();
      }
    } else {
      roleBadge.textContent = "A REAL PLAYER!";
      roleBadge.className = "reveal-role-reveal real-player";
      sound.playFailure(); // Voted out real player is a mistake

      guessContainer.style.display = 'none';
      finalVerdict.style.display = 'block';
      this.renderEliminationStatus();
      nextBtn.disabled = false;
    }
  }

  shouldContinueElimination() {
    const alivePlayers = this.players.filter(p => p.alive);
    const aliveImposters = alivePlayers.filter(p => p.isImposter);
    return this.currentRoundInitialImposterCount > 2 && aliveImposters.length > 0 && alivePlayers.length > 2;
  }

  renderEliminationStatus() {
    const title = document.getElementById('verdict-title');
    const desc = document.getElementById('verdict-desc');

    if (this.shouldContinueElimination()) {
      title.textContent = 'Keep Voting';
      title.style.color = 'var(--yellow)';
      desc.textContent = 'More than two imposters started this round. Keep eliminating or choose "No one is the imposter" when the group is done.';
      return;
    }

    const aliveImposters = this.players.filter(p => p.alive && p.isImposter);
    if (this.currentRoundInitialImposterCount === 0) {
      this.roundOutcome = 'false_alarm';
      title.textContent = 'FALSE ALARM';
      title.style.color = 'var(--yellow)';
      desc.textContent = 'There were no imposters, but the group still voted someone out.';
      sound.playFailure();
    } else if (aliveImposters.length === 0) {
      this.roundOutcome = 'real_players_win';
      title.textContent = '👥 REAL PLAYERS WIN! 👥';
      title.style.color = 'var(--green)';
      desc.textContent = 'All imposters have been eliminated.';
      sound.playSuccess();
    } else {
      this.roundOutcome = 'imposters_survived';
      title.textContent = '🚨 IMPOSTER VICTORY! 🚨';
      title.style.color = 'var(--red)';
      const impNames = aliveImposters.map(p => p.name).join(', ');
      desc.textContent = `The Imposter side survived (${impNames}).`;
      sound.playFailure();
    }
    this.applyRoundScore();
  }

  applyRoundScore() {
    if (!this.roundOutcome || this.roundScored) return;
    this.roundScored = true;

    if (this.roundOutcome === 'imposters_guess') {
      this.players.forEach(p => {
        if (p.isImposter) p.score += 5;
      });
    } else if (this.roundOutcome === 'imposters_survived') {
      this.players.forEach(p => {
        if (p.isImposter) p.score += 3;
        else if (p.alive) p.score += 1;
      });
    } else if (this.roundOutcome === 'real_players_win' || this.roundOutcome === 'clean_round') {
      this.players.forEach(p => {
        if (!p.isImposter) p.score += 2;
      });
    }
  }

  renderGuessOptions() {
    const grid = document.getElementById('reveal-guess-options');
    grid.innerHTML = '';
    
    const options = this.generateGuessOptions();
    const correct = this.gameMode === 'word' ? this.secretWord : this.secretQuestion;

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'guess-btn';
      btn.textContent = opt;
      
      btn.addEventListener('click', () => {
        sound.playClick();
        document.getElementById('reveal-guess-container').style.display = 'none';
        const finalVerdict = document.getElementById('reveal-final-verdict');
        finalVerdict.style.display = 'block';

        const title = document.getElementById('verdict-title');
        const desc = document.getElementById('verdict-desc');

        if (opt === correct) {
          // Imposter guessed correctly!
          sound.playSuccess();
          this.particleSystem.start();
          title.textContent = "🏆 IMPOSTER STEALS THE WIN! 🏆";
          title.style.color = "var(--yellow)";
          desc.textContent = `The Imposter correctly guessed the secret: "${correct}"! (+5 pts)`;
          this.roundOutcome = 'imposters_guess';
        } else {
          // Imposter failed guess
          sound.playFailure();
          title.textContent = "👥 REAL PLAYERS WIN! 👥";
          title.style.color = "var(--green)";
          desc.textContent = `The Imposter failed the final guess! They chose "${opt}" but the secret was "${correct}". (+2 pts for Real Players)`;
          this.roundOutcome = 'real_players_win';
        }

        this.applyRoundScore();
        document.getElementById('reveal-btn-next-round').disabled = false;
      });

      grid.appendChild(btn);
    });
  }

  // --- Scoreboard rendering ---
  renderScoreboard() {
    const list = document.getElementById('scoreboard-list');
    list.innerHTML = '';

    // Sort players by score
    const sorted = [...this.players].sort((a, b) => b.score - a.score);

    sorted.forEach((player, index) => {
      let medal = '';
      if (index === 0) medal = ' rank-1';
      else if (index === 1) medal = ' rank-2';
      else if (index === 2) medal = ' rank-3';

      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `
        <div class="leaderboard-player-info">
          <div class="rank-badge${medal}">${index + 1}</div>
          <div class="leaderboard-player-name">${player.name}</div>
        </div>
        <div class="leaderboard-score">${player.score} pts</div>
      `;
      list.appendChild(row);
    });
  }

  // --- Custom Topics Pack Builder logic ---
  renderCustomPacks() {
    const list = document.getElementById('custom-packs-list');
    list.innerHTML = '';

    if (this.customPacks.length === 0) {
      list.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: var(--text-sm); padding: 1rem;">No custom packs created yet.</div>`;
      return;
    }

    this.customPacks.forEach((pack, index) => {
      const card = document.createElement('div');
      card.className = 'category-card';
      card.style.borderColor = 'var(--cyan)';
      card.innerHTML = `
        <span style="font-weight: 700; font-size: var(--text-sm);">${pack.name}</span>
        <span class="category-tag custom">${pack.mode}</span>
        <button class="delete-pack-btn" style="position: absolute; top: 4px; right: 4px; padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; border: none; background: hsla(355, 90%, 60%, 0.2); color: var(--red);" aria-label="Delete pack">X</button>
      `;

      card.querySelector('.delete-pack-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playClick();
        this.customPacks.splice(index, 1);
        localStorage.setItem('sft_custom_packs', JSON.stringify(this.customPacks));
        this.renderCustomPacks();
      });

      card.addEventListener('click', () => {
        sound.playClick();
        this.selectedCategory = pack.name;
        this.gameMode = pack.mode;
        
        // Go to play setup screen
        this.showScreen('screen-setup');
        
        // Check matching mode button styling
        document.getElementById('setup-mode-word').className = pack.mode === 'word' ? 'primary' : '';
        document.getElementById('setup-mode-question').className = pack.mode === 'question' ? 'primary' : '';
      });

      list.appendChild(card);
    });
  }

  addCustomItem() {
    const input = document.getElementById('custom-pack-item-input');
    const val = input.value.trim();
    if (!val) return;

    sound.playClick();
    const previewList = document.getElementById('custom-pack-preview-list');
    
    const row = document.createElement('div');
    row.className = 'custom-item-row';
    row.innerHTML = `
      <span>${val}</span>
      <button style="padding: 2px 6px; border: none; background: transparent; cursor: pointer; color: var(--text-muted);" class="del-item-btn">X</button>
    `;

    row.querySelector('.del-item-btn').addEventListener('click', () => {
      sound.playClick();
      row.remove();
    });

    previewList.appendChild(row);
    input.value = '';
  }

  saveCustomPack() {
    const nameInput = document.getElementById('custom-pack-name');
    const packName = nameInput.value.trim();
    const mode = document.getElementById('custom-pack-mode').value;
    
    if (!packName) {
      alert("Please enter a pack title!");
      return;
    }

    const items = [];
    document.querySelectorAll('#custom-pack-preview-list .custom-item-row span').forEach(el => {
      items.push(el.textContent);
    });

    if (items.length < 4) {
      alert("Please add at least 4 items to your custom pack!");
      return;
    }

    sound.playSuccess();
    this.customPacks.push({ name: packName, mode, items });
    localStorage.setItem('sft_custom_packs', JSON.stringify(this.customPacks));
    
    // Reset inputs
    nameInput.value = '';
    document.getElementById('custom-pack-preview-list').innerHTML = '';
    
    this.renderCustomPacks();
    alert("Pack saved successfully!");
  }

  // --- Sound and Timers ticking engine ---
  startTimer(duration, elementId, progressId, callback) {
    this.stopTimer();

    this.timeLeft = duration;
    this.currentTimerDuration = duration;
    
    const timerText = document.getElementById(elementId);
    const progressCircle = document.getElementById(progressId);
    const container = timerText.parentElement;
    
    timerText.textContent = this.timeLeft;
    container.classList.remove('timer-warning');

    // Circumference of SVG circle is 144.5
    const circumference = 144.5;
    progressCircle.style.strokeDashoffset = 0;

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      timerText.textContent = this.timeLeft;

      // Update stroke offset
      const offset = circumference - (this.timeLeft / this.currentTimerDuration) * circumference;
      progressCircle.style.strokeDashoffset = offset;

      // Warning when timer is <= 10s
      if (this.timeLeft <= 10) {
        container.classList.add('timer-warning');
        sound.playTimerAlert();
      }

      if (this.timeLeft <= 0) {
        this.stopTimer();
        if (callback) callback();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- Event listener attachments ---
  bindEvents() {
    // Core Layout Accessibility bar
    document.getElementById('btn-rules').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('modal-rules').showModal();
    });
    
    document.getElementById('rules-btn-close').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('modal-rules').close();
    });

    document.getElementById('btn-toggle-contrast').addEventListener('click', () => {
      sound.playClick();
      const enabled = document.body.classList.toggle('contrast-high');
      localStorage.setItem('sft_high_contrast', enabled);
      document.getElementById('pref-btn-contrast').textContent = enabled ? 'ON' : 'OFF';
    });

    document.getElementById('btn-toggle-colorblind').addEventListener('click', () => {
      sound.playClick();
      const enabled = document.body.classList.toggle('colorblind-safe');
      localStorage.setItem('sft_colorblind', enabled);
      document.getElementById('pref-btn-colorblind').textContent = enabled ? 'ON' : 'OFF';
    });

    document.getElementById('btn-text-resize').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('modal-accessibility').showModal();
    });

    document.getElementById('pref-btn-contrast').addEventListener('click', (e) => {
      sound.playClick();
      const enabled = document.body.classList.toggle('contrast-high');
      localStorage.setItem('sft_high_contrast', enabled);
      e.target.textContent = enabled ? 'ON' : 'OFF';
    });

    document.getElementById('pref-btn-colorblind').addEventListener('click', (e) => {
      sound.playClick();
      const enabled = document.body.classList.toggle('colorblind-safe');
      localStorage.setItem('sft_colorblind', enabled);
      e.target.textContent = enabled ? 'ON' : 'OFF';
    });

    document.getElementById('pref-btn-close').addEventListener('click', () => {
      sound.playClick();
      const size = document.getElementById('pref-select-text-size').value;
      document.body.classList.remove('text-size-sm', 'text-size-md', 'text-size-lg', 'text-size-xl');
      document.body.classList.add(`text-size-${size}`);
      localStorage.setItem('sft_text_size', size);
      document.getElementById('modal-accessibility').close();
    });

    document.getElementById('btn-mute').addEventListener('click', () => {
      const muted = sound.toggleMuted();
      localStorage.setItem('sft_muted', muted);
      document.getElementById('btn-mute').textContent = muted ? '🔇' : '🔊';
      sound.playClick();
    });

    // Screen 1: Lobby Buttons
    document.getElementById('lobby-btn-play').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-setup');
    });

    document.getElementById('lobby-btn-custom').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-custom-packs');
    });

    document.getElementById('lobby-btn-instructions').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('modal-rules').showModal();
    });

    // Screen 2: Setup Configuration
    document.getElementById('setup-mode-word').addEventListener('click', () => {
      sound.playClick();
      this.gameMode = 'word';
      this.selectedCategory = null;
      document.getElementById('setup-mode-word').className = 'primary';
      document.getElementById('setup-mode-question').className = '';
    });

    document.getElementById('setup-mode-question').addEventListener('click', () => {
      sound.playClick();
      this.gameMode = 'question';
      this.selectedCategory = null;
      document.getElementById('setup-mode-word').className = '';
      document.getElementById('setup-mode-question').className = 'primary';
    });

    document.getElementById('setup-btn-add-player').addEventListener('click', () => {
      sound.playClick();
      if (this.players.length >= 20) {
        alert("Maximum player limit is 20!");
        return;
      }
      const nextId = this.players.length > 0 ? Math.max(...this.players.map(p => p.id)) + 1 : 1;
      this.players.push({
        id: nextId,
        name: `Player ${nextId}`,
        score: 0,
        role: 'real',
        alive: true,
        isImposter: false
      });
      this.renderSetupPlayerInputs();
      this.updateImposterCountBoundaries();
    });

    // Imposter Stepper Buttons
    document.getElementById('setup-btn-imposter-minus').addEventListener('click', () => {
      sound.playClick();
      if (this.imposterCount > 1) {
        this.imposterCount--;
      }
      this.updateImposterCountBoundaries();
    });

    document.getElementById('setup-btn-imposter-plus').addEventListener('click', () => {
      sound.playClick();
      const maxImposters = Math.max(1, Math.floor(this.players.length / 2));
      if (this.imposterCount < maxImposters) {
        this.imposterCount++;
      }
      this.updateImposterCountBoundaries();
    });

    // Random Imposters Toggle
    document.getElementById('setup-toggle-random-imposters').addEventListener('change', (e) => {
      sound.playClick();
      this.randomImpostersEnabled = e.target.checked;
      this.updateImposterCountBoundaries();
    });

    document.getElementById('setup-toggle-zero-imposters').addEventListener('change', (e) => {
      sound.playClick();
      this.zeroImpostersEnabled = e.target.checked;
      this.updateImposterCountBoundaries();
    });

    // Timers config toggle (optional; the current setup screen omits these controls)
    const timerToggle = document.getElementById('setup-toggle-timers');
    const timerConfig = document.getElementById('setup-timers-config');
    if (timerToggle && timerConfig) {
      timerToggle.addEventListener('change', (e) => {
        sound.playClick();
        this.timersEnabled = e.target.checked;
        timerConfig.style.display = this.timersEnabled ? 'flex' : 'none';
      });
    }

    // 18+ Toggle with confirmation modal
    document.getElementById('setup-toggle-adult').addEventListener('change', (e) => {
      sound.playClick();
      if (e.target.checked) {
        // Show age validation
        e.target.checked = false; // reset until confirmed
        document.getElementById('modal-age-verification').showModal();
      } else {
        this.adultContentEnabled = false;
        this.selectedCategory = null;
      }
    });

    document.getElementById('age-btn-deny').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('modal-age-verification').close();
      this.adultContentEnabled = false;
      this.selectedCategory = null;
      document.getElementById('setup-toggle-adult').checked = false;
    });

    document.getElementById('age-btn-confirm').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('modal-age-verification').close();
      this.adultContentEnabled = true;
      document.getElementById('setup-toggle-adult').checked = true;
    });

    document.getElementById('setup-btn-back').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-lobby');
    });

    document.getElementById('setup-btn-next').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-topics');
    });

    // Screen 3: Topics Screen
    document.getElementById('topics-search').addEventListener('input', () => {
      this.renderTopicGrid();
    });

    document.getElementById('topics-btn-random').addEventListener('click', () => {
      sound.playClick();
      const source = TOPICS[this.gameMode];
      const categories = [];

      Object.keys(source.family).forEach(c => categories.push(c));
      if (this.adultContentEnabled) {
        Object.keys(source.adult).forEach(c => categories.push(c));
      }
      this.customPacks.forEach(p => {
        if (p.mode === this.gameMode) categories.push(p.name);
      });

      if (categories.length > 0) {
        const rand = categories[Math.floor(Math.random() * categories.length)];
        this.selectedCategory = rand;
        this.renderTopicGrid();
        
        // Highlight chosen card dynamically
        const cards = document.querySelectorAll('.category-card');
        cards.forEach(card => {
          if (card.querySelector('span').textContent === rand) {
            card.classList.add('selected');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
    });

    document.getElementById('topics-btn-back').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-setup');
    });

    document.getElementById('topics-btn-start').addEventListener('click', () => {
      sound.playClick();
      if (!this.selectedCategory) {
        alert("Please select a topic category first!");
        return;
      }

      const success = this.generateGameSecret();
      if (success) {
        this.assignRoles();
        this.showScreen('screen-reveal-roles');
      }
    });

    // Screen 4: Role Reveal Screen
    document.getElementById('reveal-pass-container').addEventListener('click', () => {
      this.revealCard();
    });

    document.getElementById('reveal-btn-hide').addEventListener('click', () => {
      sound.playClick();
      this.activePlayerIndex++;
      if (this.activePlayerIndex < this.players.length) {
        this.renderRevealPass();
      } else {
        // Go to gameplay clue turns!
        this.showScreen('screen-clues');
      }
    });

    document.getElementById('reveal-btn-continue').addEventListener('click', () => {
      sound.playClick();
      this.activePlayerIndex++;
      if (this.activePlayerIndex < this.players.length) {
        this.renderRevealPass();
      } else {
        this.showScreen('screen-clues');
      }
    });

    // Screen 5: Clues Phase - Go to Discussion
    document.getElementById('clues-btn-next').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-discussion');
    });

    // Screen 6: Discussion Screen Button
    document.getElementById('disc-btn-start-vote').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-voting');
    });

    // Screen 7: Voting Screen - Confirm Selection
    document.getElementById('voting-btn-confirm').addEventListener('click', () => {
      try {
        sound.playClick();
        this.processElimination();
      } catch (error) {
        console.error('Voting error:', error);
        alert('Error processing vote: ' + error.message);
      }
    });

    // Screen 8: Reveal Screen Continue Button
    document.getElementById('reveal-btn-next-round').addEventListener('click', () => {
      sound.playClick();

      if (this.shouldContinueElimination()) {
        this.showScreen('screen-voting');
        return;
      }

      this.showScreen('screen-scoreboard');
    });

    // Screen 9: Scoreboard screen Buttons
    document.getElementById('scoreboard-btn-lobby').addEventListener('click', () => {
      sound.playClick();
      this.roundNumber = 1;
      this.players.forEach(p => { p.score = 0; p.alive = true; });
      this.showScreen('screen-lobby');
    });

    document.getElementById('scoreboard-btn-replay').addEventListener('click', () => {
      sound.playClick();
      this.roundNumber = 1;
      this.clues = [];
      this.players.forEach(p => {
        p.alive = true;
        p.isImposter = false;
        p.role = 'real';
      });
      this.selectedCategory = null;
      this.roundOutcome = null;
      this.roundScored = false;
      this.showScreen('screen-topics');
    });

    // End Game buttons (on all game screens)
    document.querySelectorAll('.btn-end-game').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        if (confirm('Are you sure you want to end the game?')) {
          this.roundNumber = 1;
          this.players.forEach(p => { p.score = 0; p.alive = true; });
          this.showScreen('screen-lobby');
        }
      });
    });

    // Screen 10: Custom Packs screen Buttons
    document.getElementById('custom-pack-btn-add').addEventListener('click', () => {
      this.addCustomItem();
    });

    document.getElementById('custom-pack-item-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.addCustomItem();
      }
    });

    document.getElementById('custom-pack-btn-save').addEventListener('click', () => {
      this.saveCustomPack();
    });

    document.getElementById('custom-btn-back').addEventListener('click', () => {
      sound.playClick();
      this.showScreen('screen-lobby');
    });
  }
}

// Instantiate and launch game
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
});

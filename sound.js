let audioCtx = null;

function initAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {
    console.warn("Failed to initialize Web Audio API Context:", e);
  }
}

window.sound = {
  muted: false,
  
  toggleMuted() {
    this.muted = !this.muted;
    return this.muted;
  },

  playClick() {
    if (this.muted) return;
    initAudio();
    if (!audioCtx) return;
    
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.06);
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
      console.error(e);
    }
  },

  playTick() {
    if (this.muted) return;
    initAudio();
    if (!audioCtx) return;
    
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {
      console.error(e);
    }
  },
  
  playReveal() {
    if (this.muted) return;
    initAudio();
    if (!audioCtx) return;
    
    try {
      const now = audioCtx.currentTime;
      
      // Sweep sound
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.7);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.7);
      filter.Q.setValueAtTime(6, now);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      osc.start();
      osc.stop(now + 0.7);
    } catch (e) {
      console.error(e);
    }
  },

  playSuccess() {
    if (this.muted) return;
    initAudio();
    if (!audioCtx) return;
    
    try {
      const now = audioCtx.currentTime;
      const playTone = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      playTone(261.63, now, 0.25); // C4
      playTone(329.63, now + 0.08, 0.25); // E4
      playTone(392.00, now + 0.16, 0.25); // G4
      playTone(523.25, now + 0.24, 0.45); // C5
    } catch (e) {
      console.error(e);
    }
  },

  playFailure() {
    if (this.muted) return;
    initAudio();
    if (!audioCtx) return;
    
    try {
      const now = audioCtx.currentTime;
      const playTone = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      playTone(311.13, now, 0.3); // Eb4
      playTone(293.66, now + 0.12, 0.3); // D4
      playTone(277.18, now + 0.24, 0.5); // Db4
    } catch (e) {
      console.error(e);
    }
  },
  
  playTimerAlert() {
    if (this.muted) return;
    initAudio();
    if (!audioCtx) return;
    
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(920, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.error(e);
    }
  }
};

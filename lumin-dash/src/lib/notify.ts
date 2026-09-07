export function playNotificationSound() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime); // A5
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Fallback: ignore sound errors (e.g., autoplay restrictions)
    console.warn('Notification sound failed:', e);
  }
}

export function playWelcomeSwoosh() {
  try {
    // Simple Web Speech Synthesis for the "Swoosh" / Voice Command
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance("Welcome, NovaHost Systems initialized.");
      msg.pitch = 0.8;
      msg.rate = 1.1;
      // Optional: try to find a female/AI sounding voice
      const voices = window.speechSynthesis.getVoices();
      const aiVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Siri'));
      if (aiVoice) msg.voice = aiVoice;
      
      window.speechSynthesis.speak(msg);
    }
  } catch (err) {
    console.log("Voice synth not supported", err);
  }
}

export function playMechanicalThud() {
  try {
    if ('vibrate' in navigator) {
      // 20ms buzz, 30ms pause, 20ms buzz for a tactile "thud" effect
      navigator.vibrate([20, 30, 20]);
    }
  } catch (err) {
    console.log("Vibration not supported", err);
  }
}

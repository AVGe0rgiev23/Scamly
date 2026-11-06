// The optional sound and vibration for a new alert on /family/alerts (W2-03).
// Browsers only allow sound after the user has pressed something on the page, so the
// sound is OFF until the family member presses „Включи звук и вибрация“; that press
// creates the AudioContext (the browser's sound engine). No sound file: a short
// two-tone beep is made with an oscillator (like a tiny synthesizer).

let audio: AudioContext | null = null;

// Called from the button's click handler (a user gesture). False = no sound possible.
export function enableAlertSound(): boolean {
  try {
    if (audio === null) {
      audio = new AudioContext();
    }
    void audio.resume();
    return true;
  } catch {
    return false;
  }
}

// One short beep of `frequency` hertz, starting `delay` seconds from now.
function beep(context: AudioContext, frequency: number, delay: number): void {
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  oscillator.frequency.value = frequency;
  volume.gain.value = 0.2;
  oscillator.connect(volume);
  volume.connect(context.destination);
  const start = context.currentTime + delay;
  oscillator.start(start);
  oscillator.stop(start + 0.25);
}

// Plays the alert: two beeps, and a vibration on phones that can vibrate.
export function playAlertSound(): void {
  try {
    if (audio !== null) {
      beep(audio, 880, 0);
      beep(audio, 660, 0.35);
    }
    // `?.`: only if the browser has vibrate() (desktop browsers and iPhones don't).
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Sound is only an extra: the alert is on the screen anyway.
  }
}

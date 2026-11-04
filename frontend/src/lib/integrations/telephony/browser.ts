import type { TelephonyEvents, TelephonyProvider } from "./types";

/** Browser voice via Web Speech API (Chrome). No telephony vendor needed. */
export class BrowserVoice implements TelephonyProvider {
  readonly name = "Browser voice (Web Speech API)";
  readonly clientSide = true;
  private rec: any = null;

  static supported(): boolean {
    return typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  async startCall(events: TelephonyEvents) {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) throw new Error("Speech recognition is not supported in this browser. Use Chrome.");
    const rec = new SR();
    rec.lang = "en-CA";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const r = e.results[e.results.length - 1];
      events.onTranscript(r[0].transcript, r.isFinal);
    };
    rec.onend = () => events.onEnd();
    rec.onerror = () => events.onEnd();
    this.rec = rec;
    rec.start();
  }

  speak(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-CA";
    u.rate = 1.03;
    window.speechSynthesis.speak(u);
  }

  endCall() {
    try {
      this.rec?.stop();
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }
}

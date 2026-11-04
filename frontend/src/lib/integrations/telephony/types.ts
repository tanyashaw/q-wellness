export interface TelephonyEvents {
  onTranscript(text: string, final: boolean): void;
  onEnd(): void;
}

/** Adapter for the voice channel. In the demo this is the browser (Web Speech API). */
export interface TelephonyProvider {
  readonly name: string;
  /** True when this provider runs entirely in the browser */
  readonly clientSide: boolean;
  startCall(events: TelephonyEvents): Promise<void>;
  speak(text: string): void;
  endCall(): void;
}

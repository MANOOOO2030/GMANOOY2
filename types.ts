
export enum Page {
  Pictures = 'Pictures',
  Sound = 'Sound',
  Analysis = 'Analysis',
  Live = 'Live',
  Chat = 'Chat',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  media?: {
    base64: string;
    mimeType: string;
  }[];
  groundingSources?: GroundingSource[];
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface Voice {
  id:string;
  name: string;
  nameTranslations: Record<string, string>;
  gender: 'female' | 'male' | 'child';
  style: string;
  styleTranslations: Record<string, string>;
  apiName: string;
  language: string;
  greeting: string;
}

export interface SpeakerVoice {
  speaker: string;
  voiceApiName: string;
  gender?: 'male' | 'female' | 'child';
}

export interface TranscriptLine {
    speaker: string;
    text: string;
}

export interface AnalysisResult {
    summary: string;
    transcript: TranscriptLine[];
}

export interface ImageGenState {
    mode: 'create' | 'edit';
    createPrompt: string;
    createAspectRatio: string;
    createGeneratedImage: string | null;
    editPrompt: string;
    editImageFiles: { base64: string; mimeType: string; preview: string }[];
    editGeneratedImage: string | null;
    editAspectRatio: string;
}

export interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly [index: number]: SpeechRecognitionAlternative;
    readonly length: number;
}
export interface SpeechRecognitionAlternative {
    readonly transcript: string;
}
export interface SpeechRecognitionResultList {
    readonly [index: number]: SpeechRecognitionResult;
    readonly length: number;
}
export interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}
export interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}
export interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onspeechend: () => void;
    onsoundstart: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognition;
        webkitSpeechRecognition: new () => SpeechRecognition;
    }
    // Defines the global variable injected by Vite
    var __GEMINI_API_KEY__: string;
}

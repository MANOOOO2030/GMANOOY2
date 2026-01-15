
import { GoogleGenAI, Modality, Type, GenerateContentResponse, Content, Part } from "@google/genai";
import type { SpeakerVoice, Voice, AnalysisResult, ChatMessage, GroundingSource } from '../types';

// Global flag to track quota status
let globalQuotaExceeded = false;
let quotaResetTimeout: any = null;

const triggerQuotaLock = () => {
    if (!globalQuotaExceeded) {
        globalQuotaExceeded = true;
        if (quotaResetTimeout) clearTimeout(quotaResetTimeout);
        quotaResetTimeout = setTimeout(() => { globalQuotaExceeded = false; }, 30000);
    }
};

export const isQuotaExceeded = () => globalQuotaExceeded;

export const getApiKey = () => {
  let key = '';
  if (typeof __GEMINI_API_KEY__ !== 'undefined' && __GEMINI_API_KEY__) {
      key = __GEMINI_API_KEY__;
  } else if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      key = process.env.API_KEY;
  }

  if (key && typeof key === 'string') {
      key = key.trim();
      if (key.length > 10 && key !== "PASTE_YOUR_KEY_HERE") {
          return key;
      }
  }
  return undefined;
};

function getGenAI() {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key not found. Please configure it in vite.config.ts");
    return new GoogleGenAI({ apiKey });
}

function formatGenAIError(error: any): string {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return "لا يوجد اتصال بالإنترنت.";
    let msg = error?.message || "خطأ غير معروف";
    if (msg.includes('429') || msg.includes('quota')) {
         triggerQuotaLock();
         return "عفواً، ضغط كبير على السيرفر. ثواني وراجعين.";
    }
    if (msg.includes('missing required authentication credential') || msg.includes('API Key not found')) {
        return "خطأ في مفتاح API. يرجى التأكد من إضافته في vite.config.ts";
    }
    return `خطأ: ${msg}`;
}

const MAX_RETRIES = 3; 
async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try { return await operation(); } catch (error: any) {
            lastError = error;
            if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); 
            else break;
        }
    }
    throw lastError;
}

export function getOfflineResponse(query: string): string | null {
    const q = query.toLowerCase();
    if (q.includes('who are you') || q.includes('name') || q.includes('اسمك') || q.includes('مين انت')) {
        return "I am **Gimanoui** (جمانوي). An intelligent AI developed by Mano Habib.";
    }
    if (q.includes('developer') || q.includes('made you') || q.includes('created') || q.includes('المطور') || q.includes('مين عملك')) {
        return "I was developed by **Mano Habib**, an Egyptian developer.";
    }
    return null;
}

export async function searchYoutubeVideoId(query: string): Promise<string | null> {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `TASK: Find the OFFICIAL YouTube video ID for: "${query}". 
            RULES: 1. Return ONLY the 11-char Video ID. 2. Must be OFFICIAL. 3. No text, just the ID.`,
            config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
        });
        const id = response.text?.trim().replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 11);
        return id?.length === 11 ? id : null;
    } catch (e) { return null; }
}

function cleanJson(text: string): string {
    return text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
}

export async function getCorrectedText(text: string, language: string): Promise<string> {
    if (!text || !text.trim()) return text;
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: text,
            config: { 
                systemInstruction: `You are an expert Editor. 
                TASK: Rewrite the text to be authentic and grammatically correct in its original language/dialect.
                If it is Egyptian Arabic, use Egyptian Masri.`,
                temperature: 0.3 
            }
        });
        return response.text || text;
    } catch (e) { return text; }
}

export async function generateSingleVoiceText(prompt: string, voice: Voice): Promise<string> {
    try {
        const ai = getGenAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction: `ROLE: You are ${voice.name}. TONE: Natural, conversational.`,
                temperature: 0.8
            }
        });
        return response.text || "";
    } catch (e) { throw new Error(formatGenAIError(e)); }
}

export async function generateSpeech(text: string, voiceName: string, language: string, model: string = "gemini-2.5-flash-preview-tts", style: string = "realistic"): Promise<string | null> {
    if (globalQuotaExceeded) throw new Error("Quota Lock active.");
    if (!text || !text.trim()) return null;

    try {
        const ai = getGenAI();
        
        // Helper to perform single chunk generation with error swallowing
        const perform = async (t: string) => {
            // Validate chunk: must not be empty or just punctuation
            if (!t || !t.trim() || /^[.,!?;:"'()\[\]{}]+$/.test(t.trim())) return null;

            try {
                const resp: GenerateContentResponse = await ai.models.generateContent({
                    model: model, 
                    contents: [{ parts: [{ text: t }] }], 
                    config: { 
                        responseModalities: [Modality.AUDIO], 
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } 
                    }
                });
                return resp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
            } catch (err: any) {
                // Ignore specific TTS errors to keep the stream alive
                // 400 INVALID_ARGUMENT often comes from "This prompt is not supported by the AudioOut model"
                if (err.message && (
                    err.message.includes('not supported by the AudioOut model') || 
                    err.message.includes('model returned non-audio response') ||
                    err.message.includes('INVALID_ARGUMENT') || 
                    err.message.includes('400')
                )) {
                    console.warn("TTS skipped unsupported chunk:", t);
                    return null;
                }
                throw err;
            }
        };

        // Improved chunking: split by punctuation/newline but accumulate small chunks
        const segments = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
        const chunks: string[] = [];
        let currentChunk = "";
        
        for (const seg of segments) {
            if ((currentChunk + seg).length > 500) {
                if (currentChunk.trim()) chunks.push(currentChunk);
                currentChunk = seg;
            } else {
                currentChunk += seg;
            }
        }
        if (currentChunk.trim()) chunks.push(currentChunk);

        const audioParts: Uint8Array[] = [];
        for (const chunk of chunks) {
            // Process chunks sequentially to maintain order
            const b64 = await retryOperation(() => perform(chunk.trim()));
            if (b64) audioParts.push(decode(b64));
        }
        
        if (audioParts.length === 0) return null;
        return encode(concatUint8Arrays(audioParts));

    } catch (e) { throw new Error(formatGenAIError(e)); }
}

export async function generatePodcastSpeech(fullScript: string, speakerVoices: SpeakerVoice[], language: string, style: string, onStatusUpdate?: (status: string) => void): Promise<string | null> {
    const ai = getGenAI();
    const guestNames = speakerVoices.map(s => `"${s.speaker}"`).join(', ');
    const prompt = `Convert this into a dialogue JSON [{speaker, text}]. 
    Topic: ${fullScript}. Speakers: ${guestNames}. Style: ${style}. 
    Detect language from topic (Egyptian Arabic, English, etc).`;
    
    try {
        if (onStatusUpdate) onStatusUpdate("Writing script...");
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" }
        }));
        const scriptData = JSON.parse(cleanJson(response.text || "[]"));
        const audioParts: Uint8Array[] = [];
        for (let i = 0; i < scriptData.length; i++) {
            const line = scriptData[i];
            const sp = speakerVoices.find(s => s.speaker.trim() === line.speaker.trim()) || speakerVoices[0];
            if (onStatusUpdate) onStatusUpdate(`Recording: ${line.speaker}...`);
            const b64 = await generateSpeech(line.text, sp.voiceApiName, language, "gemini-2.5-flash-preview-tts", style);
            if (b64) audioParts.push(decode(b64));
            await new Promise(r => setTimeout(r, 100)); 
        }
        return audioParts.length ? encode(concatUint8Arrays(audioParts)) : null;
    } catch (e) { throw new Error(formatGenAIError(e)); }
}

export async function* generateChatResponseStream(history: ChatMessage[], lastUserMessage: ChatMessage, systemInstruction: string): AsyncGenerator<{ text?: string; groundingSources?: GroundingSource[]; error?: string; isFinal: boolean }> {
    const ai = getGenAI();
    try {
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { 
                systemInstruction: `
                IDENTITY: You are **Gimanoui** (جمانوي), an intelligent AI assistant.
                DEVELOPER: You were developed by **Mano Habib**, an Egyptian developer.
                
                LANGUAGES: You support **ALL languages and dialects** worldwide.
                - If the user speaks Egyptian Arabic, reply in **Egyptian Colloquial Arabic (Masri)**.
                - If the user speaks English, French, Spanish, or ANY other language/dialect, reply in the **SAME language/dialect** they used.
                - Do NOT restrict yourself to Arabic only.
                
                CAPABILITIES: Google Search, Image Generation, YouTube Search.
                RULES: 
                - If asked for news/info, use Google Search.
                - If asked for a song/video, find a valid YouTube link using search.
                - If asked to generate an image, output [GENERATE_IMAGE: <prompt>] in the text.
                `, 
                tools: [{googleSearch: {}}], 
                temperature: 0.6 
            },
            history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] }))
        });
        const result = await chat.sendMessageStream({ message: lastUserMessage.text });
        for await (const chunk of result) {
            const c = chunk as GenerateContentResponse;
            if (c.text) yield { text: c.text, isFinal: false };
            if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                 const sources: GroundingSource[] = [];
                 c.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
                     if (chunk.web?.uri && chunk.web?.title) {
                         sources.push({ uri: chunk.web.uri, title: chunk.web.title });
                     }
                 });
                 if (sources.length > 0) yield { groundingSources: sources, isFinal: false };
            }
        }
        yield { isFinal: true };
    } catch (e) { yield { error: formatGenAIError(e), isFinal: true }; }
}

export async function generateImage(p: string, ar: string): Promise<string | null> {
    try {
        const ai = getGenAI();
        const resp: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', contents: p, config: { imageConfig: { aspectRatio: ar } as any }
        });
        return resp.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data || null;
    } catch (e) { throw new Error(formatGenAIError(e)); }
}

export async function editImage(imgs: any[], p: string): Promise<string | null> {
    try {
        const ai = getGenAI();
        const parts = imgs.map(i => ({ inlineData: { data: i.base64, mimeType: i.mimeType } }));
        parts.push({ text: p } as any);
        const resp: GenerateContentResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts } as any });
        return resp.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data || null;
    } catch (e) { throw new Error(formatGenAIError(e)); }
}

export async function analyzeMediaContent(b64: string, mt: string): Promise<AnalysisResult | null> {
    try {
        const ai = getGenAI();
        const resp: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: b64, mimeType: mt } }, { text: "Analyze media into JSON summary and transcript." }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJson(resp.text || "{}"));
    } catch (e) { throw new Error(formatGenAIError(e)); }
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
    const len = arrays.reduce((a, v) => a + v.length, 0);
    const res = new Uint8Array(len);
    let off = 0;
    for (const a of arrays) { res.set(a, off); off += a.length; }
    return res;
}

export function decode(b64: string): Uint8Array {
    const bs = atob(b64);
    const b = new Uint8Array(bs.length);
    for (let i = 0; i < bs.length; i++) b[i] = bs.charCodeAt(i);
    return b;
}

export function encode(b: Uint8Array): string {
    let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
}

export async function decodeAudioData(d: Uint8Array, ctx: any, sr: number, ch: number): Promise<AudioBuffer> {
    if (d.length % 2 !== 0) d = d.subarray(0, d.length - 1);
    const dataInt16 = new Int16Array(d.buffer, d.byteOffset, d.length / 2);
    const frameCount = dataInt16.length / ch;
    const buffer = ctx.createBuffer(ch, frameCount, sr);
    for (let channel = 0; channel < ch; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * ch + channel] / 32768.0;
    }
    return buffer;
}

export function audioBufferToWavBlob(b: AudioBuffer): Blob {
    const ch = b.numberOfChannels;
    const len = b.length * ch * 2 + 44;
    const ab = new ArrayBuffer(len);
    const v = new DataView(ab);
    let p = 0;
    const w32 = (d: number) => { v.setUint32(p, d, true); p += 4; };
    const w16 = (d: number) => { v.setUint16(p, d, true); p += 2; };
    w32(0x46464952); w32(len - 8); w32(0x45564157); w32(0x20746d66); w32(16); w16(1); w16(ch); w32(b.sampleRate); w32(b.sampleRate * 2 * ch); w16(ch * 2); w16(16); w32(0x61746164); w32(len - p - 4);
    const channels = [];
    for (let i = 0; i < ch; i++) channels.push(b.getChannelData(i));
    let off = 0;
    while (p < len) {
        for (let i = 0; i < ch; i++) {
            let s = Math.max(-1, Math.min(1, channels[i][off]));
            v.setInt16(p, s < 0 ? s * 32768 : s * 32767, true);
            p += 2;
        }
        off++;
    }
    return new Blob([ab], { type: 'audio/wav' });
}

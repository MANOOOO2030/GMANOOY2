
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, Voice, SpeechRecognition, GroundingSource } from '../types';
import { generateChatResponseStream, generateImage, generateSpeech, decode, decodeAudioData, getOfflineResponse } from '../services/geminiService';
import { SendIcon, MicrophoneIcon, Spinner, UploadIcon, SpeakerWaveIcon, ClipboardIcon, XMarkIcon, StartLiveIcon } from './IconComponents';

const mapLanguageToCode = (lang: string): string => {
    const map: Record<string, string> = { 'Egyptian Arabic': 'ar-EG', 'English (US)': 'en-US', 'Spanish': 'es-ES', 'French': 'fr-FR' };
    return map[lang] || 'ar-EG';
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

const cleanTextForSpeech = (text: string): string => {
    if (!text) return "";
    let cleaned = text;
    cleaned = cleaned.replace(/(?:https?:\/\/|www\.)[^\s]+/g, '');
    cleaned = cleaned.replace(/[a-zA-Z0-9-]+\.(com|org|net|io)\/[^\s]*/g, '');
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    cleaned = cleaned.replace(/[*_~`#]/g, ''); 
    cleaned = cleaned.replace(/\s+/g, ' ').trim(); 
    return cleaned;
};

interface ChatProps {
  selectedVoice: Voice;
  theme: 'light' | 'dark';
  T: any;
  onStartLiveChat: () => void;
  audioContext: AudioContext | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  effectiveAppLanguage: string;
  isActive: boolean;
}

const Chat: React.FC<ChatProps> = ({ selectedVoice, theme, T, onStartLiveChat, audioContext, messages, setMessages }) => {
    const [input, setInput] = useState('');
    const [media, setMedia] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDictating, setIsDictating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [isSpeechLoading, setIsSpeechLoading] = useState<string | null>(null);
    
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const audioQueueRef = useRef<Promise<{ buffer: AudioBuffer | null; streamId: number } | null>[]>([]);
    const isPlayingQueueRef = useRef(false);
    const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const currentStreamIdRef = useRef(0);
    const ttsCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const stopAudio = useCallback(() => {
        currentStreamIdRef.current++;
        if (currentAudioSourceRef.current) {
            try { currentAudioSourceRef.current.stop(); } catch(e) {}
            currentAudioSourceRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingQueueRef.current = false;
        setSpeakingMessageId(null);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 15 * 1024 * 1024) { setError(T.fileTooLarge); return; }
        try {
            const base64 = await fileToBase64(file);
            const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
            setMedia({ base64, mimeType: file.type, preview });
        } catch (err) { setError("Failed to read file."); }
        if (e.target) e.target.value = '';
    };

    const processAudioQueue = useCallback(async () => {
        if (isPlayingQueueRef.current || !audioContext) return;
        if (audioContext.state === 'suspended') { try { await audioContext.resume(); } catch (e) {} }
        isPlayingQueueRef.current = true;
        try {
            while (audioQueueRef.current.length > 0) {
                const audioPromise = audioQueueRef.current[0];
                try {
                    const result = await audioPromise;
                    audioQueueRef.current.shift();
                    if (result && result.buffer && result.streamId === currentStreamIdRef.current) {
                        await new Promise<void>((resolve) => {
                            if (currentAudioSourceRef.current) { try { currentAudioSourceRef.current.stop(); } catch(e) {} }
                            const source = audioContext.createBufferSource();
                            source.buffer = result.buffer;
                            source.connect(audioContext.destination);
                            source.onended = () => { currentAudioSourceRef.current = null; resolve(); };
                            source.start();
                            currentAudioSourceRef.current = source;
                        });
                    }
                } catch (e) { audioQueueRef.current.shift(); }
            }
        } finally { isPlayingQueueRef.current = false; if (audioQueueRef.current.length > 0) processAudioQueue(); else setSpeakingMessageId(null); }
    }, [audioContext]);

    const handleSendMessage = async (textOverride?: string) => {
        const trimmedInput = (textOverride !== undefined ? textOverride : input).trim();
        if ((!trimmedInput && !media) || isLoading) return;
        stopAudio(); setIsLoading(true); setError(null);
        
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: trimmedInput,
            media: media ? [{ base64: media.base64, mimeType: media.mimeType }] : undefined,
        };
        const history = [...messages];
        setMessages(prev => [...prev, userMessage]);
        setInput(''); setMedia(null);

        if (!navigator.onLine) {
            const reply = getOfflineResponse(trimmedInput) || "⚠️ **لا يوجد اتصال بالإنترنت.**";
            setTimeout(() => { setMessages(prev => [...prev, { id: `off-${Date.now()}`, role: 'model', text: reply }]); setIsLoading(false); }, 500);
            return;
        }

        try {
            const stream = generateChatResponseStream(history, userMessage, "");
            const modelMessageId = `model-${Date.now()}`;
            setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);
            setSpeakingMessageId(modelMessageId);
            
            let fullText = '';
            let textBuffer = '';
            const streamId = currentStreamIdRef.current;
            let isImageGen = false;

            for await (const chunk of stream) {
                if (chunk.error) { setError(chunk.error); break; }
                if (chunk.text) {
                    fullText += chunk.text;
                    textBuffer += chunk.text;
                    if (fullText.includes('GENERATE_IMAGE:')) { isImageGen = true; stopAudio(); }
                    
                    if (!isImageGen) {
                        const match = textBuffer.match(/([.!?؟\n]+)/);
                        if (match && match.index !== undefined) {
                            const sentence = textBuffer.substring(0, match.index + match[0].length);
                            textBuffer = textBuffer.substring(match.index + match[0].length);
                            const speakText = cleanTextForSpeech(sentence);
                            if (speakText) {
                                audioQueueRef.current.push(generateSpeech(speakText, selectedVoice.apiName, selectedVoice.language).then(async b64 => {
                                    if (streamId !== currentStreamIdRef.current || !b64 || !audioContext) return null;
                                    const buffer = await decodeAudioData(decode(b64), audioContext, 24000, 1);
                                    return { buffer, streamId };
                                }));
                                processAudioQueue();
                            }
                        }
                    }
                    setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: fullText, groundingSources: chunk.groundingSources || m.groundingSources } : m));
                }
            }
            if (!isImageGen && textBuffer.trim()) {
                 const speakText = cleanTextForSpeech(textBuffer);
                 if (speakText) {
                    audioQueueRef.current.push(generateSpeech(speakText, selectedVoice.apiName, selectedVoice.language).then(async b64 => {
                        if (streamId !== currentStreamIdRef.current || !b64 || !audioContext) return null;
                        const buffer = await decodeAudioData(decode(b64), audioContext, 24000, 1);
                        return { buffer, streamId };
                    }));
                    processAudioQueue();
                 }
            }

            if (fullText.includes('GENERATE_IMAGE:')) {
                const prompt = fullText.split('GENERATE_IMAGE:')[1].replace(']', '').trim();
                const imgId = `img-${Date.now()}`;
                setMessages(prev => prev.map(m => m.id === modelMessageId ? { id: imgId, role: 'model', text: T.imageGeneratorLoadingMessage } : m));
                const imgData = await generateImage(prompt, '1:1');
                if (imgData) setMessages(prev => prev.map(m => m.id === imgId ? { ...m, text: '', media: [{ base64: imgData, mimeType: 'image/png' }] } : m));
            }

        } catch (e: any) { setError(e.message); } finally { setIsLoading(false); }
    };

    const handleDictate = () => {
        if (isDictating) { recognitionRef.current?.stop(); return; }
        stopAudio();
        const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return setError("Speech not supported");
        const r = new SR();
        r.lang = mapLanguageToCode(selectedVoice.language);
        r.interimResults = true;
        r.continuous = true;
        recognitionRef.current = r;
        
        const currentInput = input;
        let finalSessionTranscript = '';

        r.onresult = (e: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            let t = '';
            for (let i = 0; i < e.results.length; ++i) t += e.results[i][0].transcript;
            finalSessionTranscript = t;
            setInput((currentInput + ' ' + t).trim());
            silenceTimerRef.current = setTimeout(() => r.stop(), 2000);
        };
        
        r.onend = () => { 
            setIsDictating(false); 
            if (finalSessionTranscript.trim()) handleSendMessage((currentInput + ' ' + finalSessionTranscript).trim());
        };
        
        r.start(); setIsDictating(true);
    };

    const handlePlaySpeech = useCallback(async (msg: ChatMessage) => {
        if (!audioContext || !msg.text) return;
        if (speakingMessageId === msg.id) { stopAudio(); return; }
        stopAudio(); setIsSpeechLoading(msg.id);
        const txt = cleanTextForSpeech(msg.text);
        try {
            let buffer = ttsCacheRef.current.get(msg.id);
            if (!buffer) {
                const b64 = await generateSpeech(txt, selectedVoice.apiName, selectedVoice.language);
                if (b64) buffer = await decodeAudioData(decode(b64), audioContext, 24000, 1);
            }
            if (buffer) {
                ttsCacheRef.current.set(msg.id, buffer);
                const src = audioContext.createBufferSource();
                src.buffer = buffer; src.connect(audioContext.destination); src.start();
                currentAudioSourceRef.current = src; setSpeakingMessageId(msg.id);
                src.onended = () => setSpeakingMessageId(null);
            }
        } catch(e) {} finally { setIsSpeechLoading(null); }
    }, [audioContext, selectedVoice]);

    const renderMessageContent = (text: string) => {
        const parts = text.split(/(https?:\/\/[^\s]+)/g);
        return parts.map((part, i) => {
            if (part.match(/^https?:\/\//)) {
                // YouTube Embed
                const ytMatch = part.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
                if (ytMatch && ytMatch[1]) {
                     return (
                         <div key={i} className="my-2 rounded-xl overflow-hidden shadow-lg border border-gray-700/50 w-full max-w-[320px] aspect-video">
                             <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" frameBorder="0" allowFullScreen></iframe>
                         </div>
                     );
                }
                // Generic Link
                try {
                    const u = new URL(part);
                    // Audio Check
                    if (part.match(/\.(mp3|wav|ogg)$/i)) {
                         return <audio key={i} controls src={part} className="w-full mt-2" />;
                    }
                    return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-cyan-400 underline break-all hover:text-cyan-300">{u.hostname}{u.pathname}</a>;
                } catch(e) { return part; }
            }
            return part;
        });
    };

    return (
        <div className="flex flex-col h-full w-full">
            {selectedImage && (
                <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <img src={selectedImage} className="max-h-[90vh] max-w-full rounded-xl" />
                    <button className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full"><XMarkIcon /></button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-hide">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3.5 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 text-white' : (theme === 'dark' ? 'bg-[#1e1e1e] text-white border border-gray-700' : 'bg-white text-black border border-gray-200')}`}>
                            {msg.media?.map((m, i) => <img key={i} src={`data:${m.mimeType};base64,${m.base64}`} onClick={() => setSelectedImage(`data:${m.mimeType};base64,${m.base64}`)} className="rounded-lg mb-2 cursor-pointer w-full" />)}
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{renderMessageContent(msg.text)}</div>
                            {msg.groundingSources?.map((s, i) => (
                                <a key={i} href={s.uri} target="_blank" className="block text-xs text-cyan-400 mt-2 hover:underline truncate bg-black/20 p-1.5 rounded flex items-center gap-1">🌐 {s.title}</a>
                            ))}
                        </div>
                        {msg.role === 'model' && (
                            <div className="flex gap-2 mt-1 px-1">
                                <button onClick={() => handlePlaySpeech(msg)}>{isSpeechLoading === msg.id ? <Spinner /> : <SpeakerWaveIcon className="w-4 h-4 text-gray-500" />}</button>
                                <button onClick={() => navigator.clipboard.writeText(msg.text)}><ClipboardIcon className="w-4 h-4 text-gray-500" /></button>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            {media && <div className="p-2 bg-gray-800 flex items-center gap-2"><div className="text-cyan-400 text-xs font-bold">Media Ready</div><button onClick={() => setMedia(null)}><XMarkIcon className="w-4 h-4 text-red-500"/></button></div>}
            <div className={`p-2 border-t ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-300'}`}>
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="text-cyan-400"><UploadIcon /></button>
                    <button onClick={onStartLiveChat} className="text-cyan-400"><StartLiveIcon className="w-8 h-8" /></button>
                    <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={T.chatInputPlaceholder} className={`flex-1 p-2 rounded-xl text-sm ${theme === 'dark' ? 'bg-[#111] text-white' : 'bg-gray-100 text-black'}`} rows={1} />
                    <button onClick={handleDictate} className={isDictating ? 'text-red-500 animate-pulse' : 'text-cyan-400'}><MicrophoneIcon /></button>
                    <button onClick={() => handleSendMessage()} className="bg-cyan-600 text-white p-2 rounded-full"><SendIcon /></button>
                </div>
            </div>
        </div>
    );
};
export default Chat;


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from "@google/genai";
import { decode, decodeAudioData, encode, generateImage, getApiKey } from '../services/geminiService';
import { translations } from '../translations';
import type { Voice, ChatMessage } from '../types';
import { 
    EndCall3DIcon, 
    Control3DIcon,
    XMarkIcon, 
    ShareIcon,
    Spinner,
    DownloadIcon,
    VideoCameraIcon
} from './IconComponents';
import LuminousWavesBackground from './LuminousWavesBackground';

// CONFIGURATION
const TRANSMISSION_WIDTH = 480; 
const JPEG_QUALITY = 0.6; 
const TARGET_FPS = 10;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

// Use the exact model version requested for native audio
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

interface LiveChatProps {
    selectedVoice: Voice;
    T: typeof translations.en;
    onClose: () => void;
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const formatLinkSource = (url: string) => {
    try {
        const u = new URL(url);
        const domain = u.hostname.replace('www.', '');
        if (domain.includes('youtube') || domain.includes('youtu.be')) return 'YouTube';
        if (domain.includes('wikipedia')) return 'Wikipedia';
        if (domain.includes('google')) return 'Google';
        if (domain.includes('spotify')) return 'Spotify';
        return domain; 
    } catch (e) { return 'Link'; }
};

const LiveChat: React.FC<LiveChatProps> = ({ selectedVoice, T, onClose, setMessages }) => {
    // --- State ---
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
    const [isMuted, setIsMuted] = useState(false);
    const [videoMode, setVideoMode] = useState<'off' | 'camera' | 'screen'>('off');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user'); 
    
    // UI Overlays
    const [liveGeneratedImage, setLiveGeneratedImage] = useState<string | null>(null);
    const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState<string | null>(null);
    const [suggestedLinks, setSuggestedLinks] = useState<{url: string, title: string}[]>([]);
    
    // --- Refs ---
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const pendingScreenStreamRef = useRef<MediaStream | null>(null); 

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const frameIntervalRef = useRef<any>(null);
    const isSendingFrameRef = useRef(false);
    
    // Audio Contexts
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    // History Tracking (For Chatbot Integration)
    const fullTranscriptRef = useRef<string>('');
    const recentTranscriptBufferRef = useRef<string>('');
    const sessionImagesRef = useRef<string[]>([]); // Stores base64 of images generated in session
    const sessionVideosRef = useRef<Set<string>>(new Set()); // Stores video URLs played in session

    // --- Helper: Initializing Audio Contexts Robustly ---
    const ensureAudioContexts = async () => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        
        // Input Context: Strict 16kHz for best STT performance with Gemini
        if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
            inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        }
        
        // Output Context: Standard rate (usually 44.1 or 48kHz)
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new AudioContextClass();
        }

        // Resume if suspended (browser autoplay policy)
        if (inputAudioContextRef.current.state === 'suspended') await inputAudioContextRef.current.resume();
        if (outputAudioContextRef.current.state === 'suspended') await outputAudioContextRef.current.resume();
    };

    // --- 1. Audio Stream Setup ---
    const initializeAudio = async () => {
        try {
            await ensureAudioContexts();
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true,
                    channelCount: 1 
                }, 
                video: false 
            });
            audioStreamRef.current = stream;
            return stream;
        } catch (err: any) {
            console.error("Audio init error:", err);
            setErrorMsg(err.name === 'NotAllowedError' ? T.microphonePermissionDenied : "Audio Access Error");
            setStatus('error');
            return null;
        }
    };

    // --- 2. Video/Screen Logic ---
    const toggleScreenShare = async () => {
        if (videoMode === 'screen') {
            setVideoMode('off');
        } else {
            try {
                // @ts-ignore
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
                pendingScreenStreamRef.current = stream;
                setVideoMode('screen');
            } catch (e: any) {
                // User cancelled or not allowed
            }
        }
    };

    useEffect(() => {
        let activeStream: MediaStream | null = null;

        const setupVideo = async () => {
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
            
            // Cleanup old stream
            if (videoStreamRef.current) { 
                videoStreamRef.current.getTracks().forEach(t => t.stop()); 
                videoStreamRef.current = null; 
            }

            if (videoMode === 'off') return;

            try {
                if (videoMode === 'camera') {
                    activeStream = await navigator.mediaDevices.getUserMedia({
                        video: { 
                            facingMode: currentFacingMode, 
                            width: { ideal: TRANSMISSION_WIDTH }, 
                            height: { ideal: Math.round(TRANSMISSION_WIDTH * 0.75) },
                            frameRate: { ideal: 15 } 
                        },
                        audio: false
                    });
                } else if (videoMode === 'screen') {
                    if (pendingScreenStreamRef.current) { 
                        activeStream = pendingScreenStreamRef.current; 
                        pendingScreenStreamRef.current = null; 
                    } else { 
                        // @ts-ignore
                        activeStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false }); 
                    }
                }

                if (!activeStream) { setVideoMode('off'); return; }

                videoStreamRef.current = activeStream;
                const videoTrack = activeStream.getVideoTracks()[0];
                videoTrack.onended = () => setVideoMode('off');

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = activeStream;
                    try { await localVideoRef.current.play(); } catch (e) {}
                }

                // Notify Model
                if (sessionPromiseRef.current) {
                    const msg = videoMode === 'camera' 
                        ? "SYSTEM: [Camera Active]. Describe what you see." 
                        : "SYSTEM: [Screen Share Active]. Analyze the screen.";
                    sessionPromiseRef.current.then(session => session.sendRealtimeInput({ 
                        content: { parts: [{ text: msg }], role: 'user' } 
                    }));
                }

            } catch (err: any) {
                console.error("Video setup error:", err);
                setVideoMode('off');
                if (err.name === 'NotAllowedError') setErrorMsg(T.cameraPermissionDenied);
            }
        };

        setupVideo();
        return () => { 
            if (activeStream) activeStream.getTracks().forEach(t => t.stop()); 
        };
    }, [videoMode, currentFacingMode, T]);


    // --- 3. Gemini Live Connection ---
    const connectToGemini = async (audioStream: MediaStream) => {
        try {
            const apiKey = getApiKey();
            if (!apiKey) throw new Error("API Key missing");
            
            const ai = new GoogleGenAI({ apiKey });
            
            const liveConfig = {
                responseModalities: [Modality.AUDIO],
                speechConfig: { 
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.apiName } } 
                },
                systemInstruction: `
                    IDENTITY: You are **Gimanoui** (جمانوي), a helpful AI assistant.
                    DEVELOPER: Developed by **Mano Habib**, an Egyptian developer.
                    
                    LANGUAGES: You speak and understand **ALL languages and dialects** (English, French, Spanish, Chinese, Arabic dialects, etc.).
                    - **ALWAYS match the user's language**.
                    - If the user speaks Egyptian Arabic, reply in **Egyptian Colloquial Arabic**.
                    - If they speak English, reply in English.
                    
                    CAPABILITIES & RULES:
                    1. **OFFICIAL LINKS**: 
                       - When asked for a song, video, or news, you **MUST** use the 'googleSearch' tool.
                       - Find the **OFFICIAL** YouTube link or Verified News Site.
                       - **ALWAYS** output the full URL in your response text.
                    
                    2. **IMAGES**: 
                       - If asked to draw/create an image, say "Sure" (in the user's language) and output: [GENERATE_IMAGE: <English Prompt>]
                    
                    3. **VISION**: 
                       - Describe camera/screen input if active.
                    
                    BEHAVIOR: Be fast, concise, and natural.
                `,
                outputAudioTranscription: {},
                inputAudioTranscription: {},
                tools: [{ googleSearch: {} }] 
            };

            let isSessionActive = false;

            const sessionPromise = ai.live.connect({
                model: LIVE_MODEL,
                config: liveConfig as any,
                callbacks: {
                    onopen: async () => {
                        console.log("Gemini Live Connected");
                        setStatus('connected');
                        isSessionActive = true;
                        setErrorMsg(null);

                        if (!inputAudioContextRef.current || !audioStream.active) return;

                        const source = inputAudioContextRef.current.createMediaStreamSource(audioStream);
                        const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = processor;

                        processor.onaudioprocess = (e) => {
                            if (!isSessionActive) return;
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmData = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                const s = Math.max(-1, Math.min(1, inputData[i]));
                                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                            }
                            sessionPromise.then(session => {
                                if (isSessionActive) {
                                    session.sendRealtimeInput({
                                        media: {
                                            mimeType: `audio/pcm;rate=${inputAudioContextRef.current?.sampleRate}`,
                                            data: encode(new Uint8Array(pcmData.buffer))
                                        }
                                    });
                                }
                            });
                        };

                        source.connect(processor);
                        processor.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.serverContent?.interrupted) {
                            outputSourcesRef.current.forEach(s => { try { s.stop(); s.disconnect(); } catch(e){} });
                            outputSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            return;
                        }

                        // 1. Play Audio
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData && outputAudioContextRef.current) {
                            try {
                                const ctx = outputAudioContextRef.current;
                                const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                                if (nextStartTimeRef.current < ctx.currentTime) nextStartTimeRef.current = ctx.currentTime;
                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(ctx.destination);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                outputSourcesRef.current.add(source);
                                source.onended = () => outputSourcesRef.current.delete(source);
                            } catch (e) { console.error("Audio decode error", e); }
                        }

                        // 2. Process Text
                        const modelText = msg.serverContent?.outputTranscription?.text;
                        const userText = msg.serverContent?.inputTranscription?.text;

                        if (userText) fullTranscriptRef.current += `User: ${userText}\n`;
                        if (modelText) {
                            fullTranscriptRef.current += `Gemanoy: ${modelText}\n`;
                            recentTranscriptBufferRef.current += modelText;
                            if (recentTranscriptBufferRef.current.length > 1000) {
                                recentTranscriptBufferRef.current = recentTranscriptBufferRef.current.slice(-1000);
                            }
                            const buffer = recentTranscriptBufferRef.current;

                            // A. Detect Image Gen
                            const imgMatch = buffer.match(/\[GENERATE_IMAGE:\s*(.*?)\]/);
                            if (imgMatch && imgMatch[1]) {
                                recentTranscriptBufferRef.current = buffer.replace(imgMatch[0], '');
                                handleGenerateImage(imgMatch[1]);
                            }

                            // B. Detect Links
                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                            const matches = modelText.match(urlRegex);
                            if (matches) {
                                matches.forEach(url => {
                                    // Official YouTube Check
                                    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
                                    if (ytMatch && ytMatch[1]) {
                                        setYoutubeEmbedUrl(`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`);
                                        sessionVideosRef.current.add(url); // Save to history
                                    }
                                    
                                    setSuggestedLinks(prev => {
                                        if (prev.some(l => l.url === url)) return prev;
                                        return [...prev, { url, title: formatLinkSource(url) }];
                                    });
                                });
                            }
                        }
                    },
                    onclose: () => { 
                        isSessionActive = false;
                        if (status !== 'closed') setStatus('error');
                    },
                    onerror: (err) => {
                        console.error("Session Error", err);
                        isSessionActive = false;
                        setStatus('error');
                        setErrorMsg("Connection Error");
                    }
                }
            });

            sessionPromiseRef.current = sessionPromise;

            // --- 4. Video Frame Loop ---
            let isFrameLoopActive = true;
            const sendFrameLoop = async () => {
                if (!isFrameLoopActive || !isSessionActive) return;
                const video = localVideoRef.current;
                const canvas = canvasRef.current;
                
                if (videoStreamRef.current?.active && video && canvas && !video.paused && video.readyState >= 2 && !isSendingFrameRef.current) {
                    isSendingFrameRef.current = true;
                    try {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            const aspect = video.videoHeight / video.videoWidth;
                            canvas.width = TRANSMISSION_WIDTH;
                            canvas.height = TRANSMISSION_WIDTH * aspect;
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            
                            const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1];
                            const session = await sessionPromise;
                            session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 }});
                        }
                    } catch (e) {} finally { isSendingFrameRef.current = false; }
                }
                frameIntervalRef.current = setTimeout(sendFrameLoop, FRAME_INTERVAL_MS);
            };
            sendFrameLoop();

            return () => { isFrameLoopActive = false; isSessionActive = false; };

        } catch (e: any) {
            console.error("Connect failed", e);
            setStatus('error');
            setErrorMsg(e.message || "Failed to connect");
        }
    };

    // --- Actions ---
    const handleGenerateImage = async (prompt: string) => {
        try {
            const imageData = await generateImage(prompt, '1:1');
            if (imageData) {
                setLiveGeneratedImage(`data:image/png;base64,${imageData}`);
                sessionImagesRef.current.push(imageData); // Save to history
            }
        } catch (e) { console.error("Gen Image Error", e); }
    };

    const handleStart = async () => {
        setStatus('connecting');
        const stream = await initializeAudio();
        if (stream) {
            await connectToGemini(stream);
        }
    };

    const handleClose = () => {
        setStatus('closed');
        
        // 1. Save History Logic (Text, Images, Videos)
        if (fullTranscriptRef.current.trim() || sessionImagesRef.current.length > 0) {
            
            let historyText = `🎙️ **Live Session Summary:**\n\n${fullTranscriptRef.current}`;
            
            // Append Video Links to text so Chat component renders them
            if (sessionVideosRef.current.size > 0) {
                historyText += `\n\n🎥 **Played Videos:**\n`;
                sessionVideosRef.current.forEach(url => {
                    historyText += `- ${url}\n`;
                });
            }

            const historyMessage: ChatMessage = {
                id: `live-${Date.now()}`,
                role: 'model',
                text: historyText,
                // Attach generated images
                media: sessionImagesRef.current.length > 0 
                    ? sessionImagesRef.current.map(b64 => ({ base64: b64, mimeType: 'image/png' }))
                    : undefined
            };

            setMessages(prev => [...prev, historyMessage]);
        }

        // 2. Cleanup Resources
        if (frameIntervalRef.current) clearTimeout(frameIntervalRef.current);
        if (sessionPromiseRef.current) sessionPromiseRef.current.then(s => s.close()).catch(() => {});
        if (scriptProcessorRef.current) { scriptProcessorRef.current.disconnect(); scriptProcessorRef.current = null; }
        if (inputAudioContextRef.current) inputAudioContextRef.current.close();
        if (outputAudioContextRef.current) outputAudioContextRef.current.close();
        if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
        if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
        
        onClose();
    };

    useEffect(() => {
        const timer = setTimeout(() => handleStart(), 100);
        return () => clearTimeout(timer);
    }, []);

    const isVideoVisible = videoMode !== 'off';

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
            
            {/* BACKGROUND LAYER */}
            <div className="absolute inset-0 z-0">
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className={`absolute inset-0 w-full h-full object-contain bg-black transition-opacity duration-300 ${isVideoVisible ? 'opacity-100' : 'opacity-0'}`}
                    style={{ transform: currentFacingMode === 'user' && videoMode === 'camera' ? 'scaleX(-1)' : 'none' }}
                />
                {!isVideoVisible && (
                    <div className="absolute inset-0 z-10">
                        <LuminousWavesBackground stream={audioStreamRef.current} />
                    </div>
                )}
            </div>

            {/* HEADER BRANDING - CLEANED UP (No Status Text below) */}
            <div className="absolute top-8 left-0 right-0 z-[80] flex justify-center pointer-events-none">
                <div className="bg-black/20 backdrop-blur-xl px-8 py-3 rounded-full border border-white/5 shadow-2xl">
                    <h1 className="text-sm font-extrabold tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-sm">
                        GMANOOY
                    </h1>
                </div>
            </div>

            {/* FLOATING LINK CARDS (Right Side) */}
            {suggestedLinks.length > 0 && (
                <div className="absolute top-24 right-4 z-[80] flex flex-col items-end gap-3 pointer-events-none w-full max-w-[280px]">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-2xl flex flex-col gap-2 w-full animate-in slide-in-from-right-10 pointer-events-auto shadow-2xl">
                         <div className="flex justify-between items-center pb-2 border-b border-white/10">
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Resources</span>
                            <button onClick={() => setSuggestedLinks([])} className="text-gray-400 hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
                         </div>
                         <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {suggestedLinks.map((link, idx) => (
                                <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="bg-white/5 hover:bg-cyan-500/20 border border-white/5 p-2 rounded-xl flex items-center gap-3 transition-all group">
                                    <div className="bg-black/50 p-1.5 rounded-lg text-cyan-400"><ShareIcon className="w-3 h-3" /></div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold text-white truncate">{link.title}</span>
                                        <span className="text-[9px] text-gray-400 truncate opacity-70">{link.url}</span>
                                    </div>
                                </a>
                            ))}
                         </div>
                    </div>
                </div>
            )}

            {/* YOUTUBE VIDEO OVERLAY (Center) */}
            {youtubeEmbedUrl && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:w-[600px] z-[85] animate-in zoom-in-95 fade-in duration-300">
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30 ring-1 ring-white/10">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src={youtubeEmbedUrl} 
                            title="YouTube" 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen
                            className="absolute inset-0"
                        />
                        <button onClick={() => setYoutubeEmbedUrl(null)} className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 shadow-lg scale-90 hover:scale-100 z-10"><XMarkIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            {/* GENERATED IMAGE OVERLAY */}
            {liveGeneratedImage && (
                <div className="absolute inset-0 z-[90] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-300">
                    <div className="relative max-w-md w-full bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/50">
                        <div className="absolute top-0 w-full p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
                             <span className="text-[10px] font-bold text-white bg-cyan-600 px-2 py-1 rounded">AI GENERATED</span>
                             <button onClick={() => setLiveGeneratedImage(null)} className="bg-black/50 text-white rounded-full p-2 hover:bg-red-500 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <img src={liveGeneratedImage} alt="AI Generated" className="w-full h-auto object-contain" />
                        <div className="p-4 bg-gray-900 flex justify-center">
                            <a href={liveGeneratedImage} download="gmanooy-gen.png" className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg"><DownloadIcon className="w-4 h-4" /> Download</a>
                        </div>
                    </div>
                </div>
            )}

            {/* ERROR MESSAGE */}
            {errorMsg && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-600/90 backdrop-blur-md px-6 py-2 rounded-full text-white text-xs font-bold shadow-xl animate-in fade-in flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> {errorMsg}
                </div>
            )}

            {/* BOTTOM CONTROLS */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[90] w-full max-w-md px-4">
                <div className="flex items-center justify-between gap-2 px-6 py-3 bg-gray-950/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl">
                    <button 
                        onClick={() => { if(audioStreamRef.current) { audioStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled); setIsMuted(!isMuted); }}} 
                        className={`p-3 rounded-full transition-all active:scale-95 ${isMuted ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/10 text-white'}`}
                    >
                        <Control3DIcon icon="mic" active={!isMuted} size="w-10 h-10" />
                    </button>
                    <button 
                        onClick={() => setVideoMode(prev => prev === 'camera' ? 'off' : 'camera')} 
                        disabled={videoMode === 'screen'} 
                        className={`p-3 rounded-full transition-all active:scale-95 ${videoMode === 'camera' ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        <Control3DIcon icon="cam" active={videoMode === 'camera'} size="w-10 h-10" />
                    </button>
                    {videoMode === 'camera' && (
                        <button 
                            onClick={() => setCurrentFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
                            className="p-3 rounded-full hover:bg-white/10 transition-all active:scale-95 animate-in zoom-in"
                        >
                            <Control3DIcon icon="switch" size="w-10 h-10" />
                        </button>
                    )}
                    <button 
                        onClick={toggleScreenShare} 
                        className={`p-3 rounded-full transition-all active:scale-95 ${videoMode === 'screen' ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10'}`}
                    >
                        <Control3DIcon icon="share" active={videoMode === 'screen'} size="w-10 h-10" />
                    </button>
                    <div className="w-[1px] h-8 bg-white/10 mx-1"></div>
                    <button onClick={handleClose} className="transition-transform hover:scale-110 active:scale-95"><EndCall3DIcon size="w-14 h-14" /></button>
                </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};

export default LiveChat;

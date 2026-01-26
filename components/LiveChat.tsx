
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from "@google/genai";
import { decode, decodeAudioData, encode, generateImage, generateVideo, getApiKey } from '../services/geminiService';
import { translations } from '../translations';
import type { Voice, ChatMessage } from '../types';
import { 
    EndCall3DIcon, 
    Control3DIcon,
    XMarkIcon, 
    ShareIcon,
    DownloadIcon,
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

interface TranscriptTurn {
    role: 'user' | 'model';
    text: string;
    images?: string[];
    videos?: string[]; // Store Veo URLs
}

const LiveChat: React.FC<LiveChatProps> = ({ selectedVoice, T, onClose, setMessages }) => {
    // --- State ---
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
    const [isMuted, setIsMuted] = useState(false);
    const [videoMode, setVideoMode] = useState<'off' | 'camera' | 'screen'>('off');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('user'); 
    
    // UI Overlays
    const [liveGeneratedImage, setLiveGeneratedImage] = useState<string | null>(null);
    const [liveGeneratedVideo, setLiveGeneratedVideo] = useState<string | null>(null); // For GIF/Veo
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
    
    // History Tracking
    const transcriptHistoryRef = useRef<TranscriptTurn[]>([]);
    const currentTurnRef = useRef<TranscriptTurn | null>(null);

    const ensureAudioContexts = async () => {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
            inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
        }
        if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
            outputAudioContextRef.current = new AudioContextClass();
        }
        if (inputAudioContextRef.current.state === 'suspended') await inputAudioContextRef.current.resume();
        if (outputAudioContextRef.current.state === 'suspended') await outputAudioContextRef.current.resume();
    };

    const initializeAudio = async () => {
        try {
            await ensureAudioContexts();
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }, 
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
            if (videoStreamRef.current) { 
                videoStreamRef.current.getTracks().forEach(t => t.stop()); 
                videoStreamRef.current = null; 
            }
            if (videoMode === 'off') return;

            try {
                if (videoMode === 'camera') {
                    activeStream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: currentFacingMode, width: { ideal: TRANSMISSION_WIDTH }, height: { ideal: Math.round(TRANSMISSION_WIDTH * 0.75) }, frameRate: { ideal: 15 } },
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

                if (sessionPromiseRef.current) {
                    const msg = videoMode === 'camera' ? "SYSTEM: [Camera Active]. Describe what you see." : "SYSTEM: [Screen Share Active]. Analyze the screen.";
                    sessionPromiseRef.current.then(session => session.sendRealtimeInput({ content: { parts: [{ text: msg }], role: 'user' } }));
                }
            } catch (err: any) {
                console.error("Video setup error:", err);
                setVideoMode('off');
                if (err.name === 'NotAllowedError') setErrorMsg(T.cameraPermissionDenied);
            }
        };
        setupVideo();
        return () => { if (activeStream) activeStream.getTracks().forEach(t => t.stop()); };
    }, [videoMode, currentFacingMode, T]);

    const connectToGemini = async (audioStream: MediaStream) => {
        try {
            const apiKey = getApiKey();
            if (!apiKey) throw new Error("API Key missing");
            const ai = new GoogleGenAI({ apiKey });
            
            const liveConfig = {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice.apiName } } },
                systemInstruction: `
                    IDENTITY: You are **Gimanoui** (جمانوي), developed by **Mano Habib**.
                    CAPABILITIES: Vision, Search, Image Gen, GIF/Video Gen.
                    
                    RULES: 
                    1. Be concise and fast.
                    2. If asked for a song or video, use 'googleSearch' to find the **valid** YouTube link. Return the full link in your response.
                    3. If asked for a GIF or animation, output [GENERATE_GIF: prompt].
                    4. If asked to draw, output [GENERATE_IMAGE: prompt].
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
                                    session.sendRealtimeInput({ media: { mimeType: `audio/pcm;rate=${inputAudioContextRef.current?.sampleRate}`, data: encode(new Uint8Array(pcmData.buffer)) } });
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
                        
                        // --- Enhanced History Tracking ---
                        const modelText = msg.serverContent?.outputTranscription?.text;
                        const userText = msg.serverContent?.inputTranscription?.text;
                        
                        // Handle User Input
                        if (userText) {
                            // If we were tracking a model turn, finalize it
                            if (currentTurnRef.current && currentTurnRef.current.role === 'model') {
                                transcriptHistoryRef.current.push({...currentTurnRef.current});
                                currentTurnRef.current = null;
                            }
                            // Start or append to user turn
                            if (!currentTurnRef.current || currentTurnRef.current.role !== 'user') {
                                currentTurnRef.current = { role: 'user', text: '' };
                            }
                            currentTurnRef.current.text += userText;
                        }

                        // Handle Model Output
                        if (modelText) {
                            // If we were tracking a user turn, finalize it
                            if (currentTurnRef.current && currentTurnRef.current.role === 'user') {
                                transcriptHistoryRef.current.push({...currentTurnRef.current});
                                currentTurnRef.current = null;
                            }
                             // Start or append to model turn
                            if (!currentTurnRef.current || currentTurnRef.current.role !== 'model') {
                                currentTurnRef.current = { role: 'model', text: '' };
                            }
                            currentTurnRef.current.text += modelText;

                            const buffer = currentTurnRef.current.text;

                            // GIF/Video Command
                            const gifMatch = buffer.match(/\[GENERATE_GIF:\s*(.*?)\]/);
                            if (gifMatch && gifMatch[1]) {
                                currentTurnRef.current.text = buffer.replace(gifMatch[0], '');
                                handleGenerateVideo(gifMatch[1]);
                            }

                            // Image Command
                            const imgMatch = buffer.match(/\[GENERATE_IMAGE:\s*(.*?)\]/);
                            if (imgMatch && imgMatch[1]) {
                                currentTurnRef.current.text = buffer.replace(imgMatch[0], '');
                                handleGenerateImage(imgMatch[1]);
                            }
                            
                            // Improved Link Detection - Catch ALL URLs
                            const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
                            const matches = modelText.match(urlRegex);
                            if (matches) {
                                matches.forEach(url => {
                                    // Clean URL
                                    let cleanUrl = url.startsWith('http') ? url : `https://${url}`;
                                    
                                    // Extract ID for YouTube embed
                                    const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
                                    if (ytMatch && ytMatch[1]) {
                                        setYoutubeEmbedUrl(`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`);
                                    }
                                    
                                    // Add to suggestions list (deduplicated)
                                    setSuggestedLinks(prev => {
                                        if (prev.some(l => l.url === cleanUrl)) return prev;
                                        return [...prev, { url: cleanUrl, title: formatLinkSource(cleanUrl) }];
                                    });
                                });
                            }
                        }

                        // Handle Turn Complete explicit signal
                        if (msg.serverContent?.turnComplete && currentTurnRef.current) {
                            // Finalize current turn if it has content
                            if (currentTurnRef.current.text.trim()) {
                                transcriptHistoryRef.current.push({...currentTurnRef.current});
                                currentTurnRef.current = null;
                            }
                        }

                    },
                    onclose: () => { isSessionActive = false; if (status !== 'closed') setStatus('error'); },
                    onerror: (err) => { isSessionActive = false; setStatus('error'); setErrorMsg("Connection Error"); }
                }
            });
            sessionPromiseRef.current = sessionPromise;
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
        } catch (e: any) { setStatus('error'); setErrorMsg(e.message || "Failed to connect"); }
    };

    const handleGenerateImage = async (prompt: string) => {
        try {
            const imageData = await generateImage(prompt, '1:1');
            if (imageData) {
                setLiveGeneratedImage(`data:image/png;base64,${imageData}`);
                // Attach image to current model turn if active
                if (currentTurnRef.current && currentTurnRef.current.role === 'model') {
                     if (!currentTurnRef.current.images) currentTurnRef.current.images = [];
                     currentTurnRef.current.images.push(imageData);
                } else {
                    const lastModelTurn = [...transcriptHistoryRef.current].reverse().find(t => t.role === 'model');
                    if (lastModelTurn) {
                        if (!lastModelTurn.images) lastModelTurn.images = [];
                        lastModelTurn.images.push(imageData);
                    }
                }
            }
        } catch (e) { console.error("Image Gen Error", e); }
    };

    const handleGenerateVideo = async (prompt: string) => {
        try {
            const videoUrl = await generateVideo(prompt);
            if (videoUrl) {
                setLiveGeneratedVideo(videoUrl);
                // Attach video to current model turn
                 if (currentTurnRef.current && currentTurnRef.current.role === 'model') {
                     if (!currentTurnRef.current.videos) currentTurnRef.current.videos = [];
                     currentTurnRef.current.videos.push(videoUrl);
                } else {
                    const lastModelTurn = [...transcriptHistoryRef.current].reverse().find(t => t.role === 'model');
                    if (lastModelTurn) {
                        if (!lastModelTurn.videos) lastModelTurn.videos = [];
                        lastModelTurn.videos.push(videoUrl);
                    }
                }
            }
        } catch (e) { console.error("Video Gen Error", e); }
    };

    const handleDisconnect = () => {
        setStatus('closed');
        
        // Finalize any pending turn
        if (currentTurnRef.current && currentTurnRef.current.text.trim()) {
            transcriptHistoryRef.current.push({...currentTurnRef.current});
        }
        
        const history = transcriptHistoryRef.current;
        const newMessages: ChatMessage[] = history.map((turn, index) => {
            const mediaItems = [];
            if (turn.images) turn.images.forEach(b64 => mediaItems.push({ base64: b64, mimeType: 'image/png' }));
            // Convert Video URL to media item for chat display (assuming mp4)
            if (turn.videos) turn.videos.forEach(url => mediaItems.push({ base64: url, mimeType: 'video/mp4' }));

            return {
                id: `live-${Date.now()}-${index}`,
                role: turn.role,
                text: turn.text.trim(),
                media: mediaItems.length > 0 ? mediaItems : undefined
            };
        });

        if (newMessages.length > 0) {
            setMessages(prev => [...prev, ...newMessages]);
        }
        
        onClose();
    };

    useEffect(() => {
        let cleanupAudio: (() => void) | undefined;
        initializeAudio().then(stream => {
            if (stream) {
                cleanupAudio = () => stream.getTracks().forEach(t => t.stop());
                connectToGemini(stream);
            }
        });
        return () => {
            if (cleanupAudio) cleanupAudio();
            if (scriptProcessorRef.current) { scriptProcessorRef.current.disconnect(); scriptProcessorRef.current = null; }
            if (inputAudioContextRef.current) { inputAudioContextRef.current.close(); inputAudioContextRef.current = null; }
            if (outputAudioContextRef.current) { outputAudioContextRef.current.close(); outputAudioContextRef.current = null; }
            if (frameIntervalRef.current) clearTimeout(frameIntervalRef.current);
            if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
            if (pendingScreenStreamRef.current) pendingScreenStreamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    const removeLink = (index: number) => {
        setSuggestedLinks(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col overflow-hidden text-white font-sans">
            {/* Background Layer: Visual Effect when Video is Off */}
            <div className={`absolute inset-0 z-0 transition-opacity duration-500 ${videoMode === 'off' ? 'opacity-100' : 'opacity-0'}`}>
                <LuminousWavesBackground stream={audioStreamRef.current} />
            </div>

            {/* Video Layer: Full Screen when Active */}
            <video 
                ref={localVideoRef} 
                muted 
                autoPlay 
                playsInline 
                className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${videoMode !== 'off' ? 'opacity-100' : 'opacity-0'}`} 
            />

            <canvas ref={canvasRef} className="hidden" />

            {/* HEADER - App Name Small & Colored - NO DOT */}
            <div className="absolute top-6 left-0 right-0 flex flex-col items-center justify-start z-10 pointer-events-none">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-sm tracking-wide">
                    {T.appName}
                </h2>
                {errorMsg && (
                    <div className="mt-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg backdrop-blur-md">
                        {errorMsg}
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-4 z-10 pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-center gap-4 w-full">
                    {youtubeEmbedUrl && (
                        <div className="relative w-full max-w-lg aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 bg-black animate-in zoom-in duration-300">
                            <button onClick={() => setYoutubeEmbedUrl(null)} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full z-20 hover:bg-red-500/80 transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                            <iframe src={youtubeEmbedUrl} className="w-full h-full" frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
                        </div>
                    )}
                    
                    {liveGeneratedVideo && !youtubeEmbedUrl && (
                        <div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in duration-500 bg-black">
                             <video src={liveGeneratedVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                             <button onClick={() => setLiveGeneratedVideo(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-1 rounded-full backdrop-blur-md"><XMarkIcon className="w-5 h-5"/></button>
                        </div>
                    )}

                    {liveGeneratedImage && !youtubeEmbedUrl && !liveGeneratedVideo && (
                        <div className="relative w-full max-w-md aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in duration-500">
                            <img src={liveGeneratedImage} alt="Live Generated" className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-end">
                                <a href={liveGeneratedImage} download={`live-gen-${Date.now()}.png`} className="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-colors"><DownloadIcon className="w-5 h-5" /></a>
                            </div>
                            <button onClick={() => setLiveGeneratedImage(null)} className="absolute top-2 right-2 bg-black/50 hover:bg-black/80 text-white p-1 rounded-full backdrop-blur-md"><XMarkIcon className="w-5 h-5"/></button>
                        </div>
                    )}
                    
                    {suggestedLinks.length > 0 && (
                        <div className="absolute right-4 bottom-32 flex flex-col gap-2 items-end max-w-[200px] pointer-events-auto">
                            {suggestedLinks.map((link, idx) => (
                                <div key={idx} className="flex items-center gap-1 animate-in slide-in-from-right duration-300">
                                    <a href={link.url} target="_blank" className="bg-black/60 backdrop-blur-md border border-gray-700 px-3 py-2 rounded-lg text-xs text-cyan-400 hover:bg-cyan-900/30 transition-colors flex items-center gap-2 shadow-lg">
                                        <ShareIcon className="w-3 h-3" /><span className="truncate max-w-[120px]">{link.title}</span>
                                    </a>
                                    <button onClick={() => removeLink(idx)} className="bg-red-500/80 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg backdrop-blur-sm">
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CONTROLS - Oval Container */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-max max-w-[90%]">
                <div 
                    className="flex items-center gap-5 bg-gray-900/60 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl transition-all duration-300"
                    dir="ltr"
                >
                    
                    {/* End Call - Leftmost */}
                    <button onClick={handleDisconnect} className="transform hover:scale-110 active:scale-95 transition-all">
                        <EndCall3DIcon size="w-10 h-10" />
                    </button>

                    {/* Screen Share - Moved to left/middle area */}
                    <button onClick={toggleScreenShare} className="transform hover:scale-110 active:scale-95 transition-all">
                        <Control3DIcon icon="share" active={videoMode === 'screen'} size="w-9 h-9" />
                    </button>

                    {/* Camera */}
                    <button onClick={() => {
                        if (videoMode === 'camera') setVideoMode('off');
                        else { setVideoMode('camera'); /* Keep existing facing mode */ }
                    }} className="transform hover:scale-110 active:scale-95 transition-all">
                        <Control3DIcon icon="cam" active={videoMode === 'camera'} size="w-9 h-9" />
                    </button>

                    {/* Flip Camera - Appears when camera is active */}
                    {videoMode === 'camera' && (
                         <button 
                            onClick={() => setCurrentFacingMode(prev => prev === 'user' ? 'environment' : 'user')} 
                            className="transform hover:scale-110 active:scale-95 transition-all animate-in zoom-in duration-300"
                        >
                            <Control3DIcon icon="switch" active={false} size="w-9 h-9" />
                        </button>
                    )}

                    {/* Mic - Moved to Rightmost */}
                    <button onClick={() => {
                        const tracks = audioStreamRef.current?.getAudioTracks();
                        if (tracks) { tracks.forEach(t => t.enabled = isMuted); setIsMuted(!isMuted); }
                    }} className="transform hover:scale-110 active:scale-95 transition-all">
                        <Control3DIcon icon="mic" active={!isMuted} size="w-9 h-9" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveChat;

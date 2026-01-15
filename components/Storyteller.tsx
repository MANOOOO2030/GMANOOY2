
// FIX: Removed non-existent createWavBlob from geminiService imports.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Voice, SpeechRecognition, SpeechRecognitionEvent } from '../types';
import { AVAILABLE_VOICES } from '../constants';
import { 
    generateSpeech, 
    decode, 
    generateSingleVoiceText, 
    getCorrectedText, 
    generatePodcastSpeech,
    audioBufferToWavBlob,
    decodeAudioData
} from '../services/geminiService';
import { Spinner, MicrophoneIcon, DownloadIcon, PlusIcon, XMarkIcon, UpAndDownArrowIcon, PersonIcon, UsersIcon, PodcastIcon } from './IconComponents';
import { translations } from '../translations';


const mapLanguageToCode = (lang: string): string => {
    const map: Record<string, string> = {
        'Egyptian Arabic': 'ar-EG',
        'English (US)': 'en-US',
        'Spanish': 'es-ES',
        'French': 'fr-FR',
    };
    return map[lang] || 'ar-EG';
}

interface DialogueSpeaker {
    id: number;
    name: string;
    voiceId: string;
}

interface StorytellerProps {
  selectedVoice: Voice;
  audioContext: AudioContext | null;
  theme: 'light' | 'dark';
  T: typeof translations.en;
  playGreeting: (voice: Voice) => void;
  resetTrigger: number;
}

// --- Audio Style Definitions ---
export const AUDIO_STYLES = [
    { id: 'realistic', labelKey: 'styleRealistic' },
    { id: 'dramatic', labelKey: 'styleDramatic' },
    { id: 'news', labelKey: 'styleNews' },
    { id: 'story_memory', labelKey: 'styleStoryMemory' },
    { id: 'podcast', labelKey: 'stylePodcast' },
    { id: 'song', labelKey: 'styleSong' },
];

// --- Custom Dropdown Component for Voices ---
const VoiceDropdown: React.FC<{
    selectedId?: string;
    onSelect: (voice: Voice) => void;
    theme: 'light' | 'dark';
    isRtl: boolean;
}> = ({ selectedId, onSelect, theme, isRtl }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentVoice = AVAILABLE_VOICES.find(v => v.id === selectedId) || AVAILABLE_VOICES[0];
    const bgClass = theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-300';
    const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const hoverClass = theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100';

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-md border ${bgClass} ${textClass} focus:ring-1 focus:ring-cyan-500 focus:outline-none h-10 transition-all`}
            >
                <span className="truncate flex-1 text-start font-medium">
                    {currentVoice.nameTranslations[isRtl ? 'ar' : 'en']}
                </span>
                <UpAndDownArrowIcon className="w-3 h-3 opacity-60 flex-shrink-0 mx-1" />
            </button>

            {isOpen && (
                <div className={`absolute top-full mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-md shadow-xl border z-50 ${bgClass}`}>
                    {AVAILABLE_VOICES.map((voice) => (
                        <div
                            key={voice.id}
                            onClick={(e) => {
                                e.stopPropagation(); 
                                onSelect(voice);
                                setIsOpen(false);
                            }}
                            className={`px-3 py-3 text-xs cursor-pointer flex items-center justify-between border-b border-gray-500/10 last:border-0 ${hoverClass} ${textClass} ${selectedId === voice.id ? 'font-bold text-cyan-400 bg-cyan-500/10' : ''}`}
                        >
                             <span>{voice.nameTranslations[isRtl ? 'ar' : 'en']}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Custom Dropdown for Styles ---
const StyleDropdown: React.FC<{
    selectedStyleId: string;
    onSelect: (styleId: string) => void;
    theme: 'light' | 'dark';
    T: any;
}> = ({ selectedStyleId, onSelect, theme, T }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = AUDIO_STYLES.find(s => s.id === selectedStyleId) || AUDIO_STYLES[0];
    const bgClass = theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-300';
    const textClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const hoverClass = theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-100';

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-md border ${bgClass} ${textClass} focus:ring-1 focus:ring-cyan-500 focus:outline-none h-10 transition-all`}
            >
                <div className="flex items-center gap-2 truncate">
                    <span className="opacity-60 text-[10px] uppercase tracking-wider">{T.styleLabel}:</span>
                    <span className="font-bold text-cyan-500">{T[selectedOption.labelKey]}</span>
                </div>
                <UpAndDownArrowIcon className="w-3 h-3 opacity-60 flex-shrink-0 mx-1" />
            </button>

            {isOpen && (
                <div className={`absolute top-full mt-1 left-0 right-0 max-h-56 overflow-y-auto rounded-md shadow-xl border z-50 ${bgClass}`}>
                    {AUDIO_STYLES.map((style) => (
                        <div
                            key={style.id}
                            onClick={(e) => {
                                e.stopPropagation(); 
                                onSelect(style.id);
                                setIsOpen(false);
                            }}
                            className={`px-3 py-3 text-xs cursor-pointer flex items-center justify-between border-b border-gray-500/10 last:border-0 ${hoverClass} ${textClass} ${selectedStyleId === style.id ? 'font-bold text-cyan-400 bg-cyan-500/10' : ''}`}
                        >
                             <span>{T[style.labelKey]}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MagicWandIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.5 5.6L10 7 7.5 8.4 6.1 10.9 4.7 8.4 2.2 7 4.7 5.6 6.1 3.1 7.5 5.6zm12 9.8L22 16.8l-2.5 1.4-1.4 2.5-1.4-2.5L14.2 16.8l2.5-1.4 1.4-2.5 1.4 2.5zM22 2l-2.5 1.4L18.1 5.9 16.7 3.4 14.2 2 16.7.6 18.1-1.9 19.5.6 22 2zm-9.3 11.3l-1.4-2.5L9.9 13.3l-2.5 1.4 2.5 1.4 1.4 2.5 1.4-2.5 2.5-1.4-2.5-1.4z"/>
    </svg>
);


const SoundCreator: React.FC<StorytellerProps> = ({ selectedVoice, audioContext, theme, T, playGreeting, resetTrigger }) => {
    const [activeTab, setActiveTab] = useState<'single' | 'group' | 'podcast'>('single');
    
    // Style State
    const [audioStyle, setAudioStyle] = useState<string>('realistic');

    const [activeDictationId, setActiveDictationId] = useState<string | number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [optimizationStatus, setOptimizationStatus] = useState<string | null>(null);
    
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1. Voice Message State
    const [singleScript, setSingleScript] = useState(''); 
    const [isSingleLoading, setIsSingleLoading] = useState(false);
    const [singleVoice, setSingleVoice] = useState<Voice>(selectedVoice);
    const [singleAudioUrl, setSingleAudioUrl] = useState<string | null>(null);
    const singleAudioBlobRef = useRef<Blob | null>(null);

    // 2. Group Message State
    const [groupScript, setGroupScript] = useState('');
    const [groupSpeakers, setGroupSpeakers] = useState<DialogueSpeaker[]>([
        { id: 1, name: '', voiceId: AVAILABLE_VOICES.find(v => v.gender === 'male')?.id || 'adam_pro' },
        { id: 2, name: '', voiceId: AVAILABLE_VOICES.find(v => v.gender === 'female')?.id || 'maya_soft' }
    ]);
    const [isGroupLoading, setIsGroupLoading] = useState(false);
    const [groupAudioUrl, setGroupAudioUrl] = useState<string | null>(null);
    const groupAudioBlobRef = useRef<Blob | null>(null);

    // 3. Create Podcasts State
    const [podcastScript, setPodcastScript] = useState('');
    const [podcastSpeakers, setPodcastSpeakers] = useState<DialogueSpeaker[]>([
        { id: 101, name: '', voiceId: AVAILABLE_VOICES.find(v => v.gender === 'male')?.id || 'leo_energetic' },
        { id: 102, name: '', voiceId: AVAILABLE_VOICES.find(v => v.gender === 'female')?.id || 'mariam_cheerful' }
    ]);
    const [isPodcastLoading, setIsPodcastLoading] = useState(false);
    const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
    const podcastAudioBlobRef = useRef<Blob | null>(null);

    const lastResetTriggerRef = useRef<number>(0);

    // Sync active voice with single voice
    useEffect(() => {
        setSingleVoice(selectedVoice);
    }, [selectedVoice]);

    useEffect(() => {
        if (resetTrigger > lastResetTriggerRef.current) {
            lastResetTriggerRef.current = resetTrigger;
            if (activeTab === 'single') {
                setSingleScript('');
                if (singleAudioUrl) URL.revokeObjectURL(singleAudioUrl);
                setSingleAudioUrl(null);
                singleAudioBlobRef.current = null;
            } else if (activeTab === 'group') {
                setGroupScript('');
                setGroupSpeakers([
                    { id: Date.now(), name: '', voiceId: AVAILABLE_VOICES[0].id },
                    { id: Date.now()+1, name: '', voiceId: AVAILABLE_VOICES[1].id }
                ]);
                if (groupAudioUrl) URL.revokeObjectURL(groupAudioUrl);
                setGroupAudioUrl(null);
                groupAudioBlobRef.current = null;
            } else if (activeTab === 'podcast') {
                setPodcastScript('');
                 setPodcastSpeakers([
                    { id: Date.now()+2, name: '', voiceId: AVAILABLE_VOICES[2].id },
                    { id: Date.now()+3, name: '', voiceId: AVAILABLE_VOICES[3].id }
                ]);
                if (podcastAudioUrl) URL.revokeObjectURL(podcastAudioUrl);
                setPodcastAudioUrl(null);
                podcastAudioBlobRef.current = null;
            }
            setAudioStyle('realistic');
            setError(null);
            setOptimizationStatus(null);
        }
    }, [resetTrigger, activeTab, singleAudioUrl, groupAudioUrl, podcastAudioUrl]);

    useEffect(() => {
        return () => {
            if (singleAudioUrl) URL.revokeObjectURL(singleAudioUrl);
            if (groupAudioUrl) URL.revokeObjectURL(groupAudioUrl);
            if (podcastAudioUrl) URL.revokeObjectURL(podcastAudioUrl);
            if (recognitionRef.current) recognitionRef.current.abort();
        }
    }, []);

    const handleDownload = () => {
        let blob = null;
        if (activeTab === 'single') blob = singleAudioBlobRef.current;
        else if (activeTab === 'group') blob = groupAudioBlobRef.current;
        else if (activeTab === 'podcast') blob = podcastAudioBlobRef.current;

        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gmanooy-${activeTab}-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const mixAudio = async (speechBase64: string): Promise<Blob> => {
        const offlineCtx = new OfflineAudioContext(1, 1, 24000); 
        const speechData = decode(speechBase64);
        const speechBuffer = await decodeAudioData(speechData, offlineCtx, 24000, 1);
        return audioBufferToWavBlob(speechBuffer);
    };

    const handleAutoFormat = async (text: string, setText: (t: string) => void) => {
        if (!text || !text.trim()) return;
        
        // Support very long audio scripts (50k+ characters)
        if (text.length > 50000) {
             return;
        }

        setOptimizationStatus("Correcting spelling & grammar..."); 
        try {
            const corrected = await getCorrectedText(text, selectedVoice.language);
            if (corrected && corrected !== text) {
                setText(corrected);
            }
        } catch (e) {
            console.error("Auto-format failed", e);
        } finally {
            setOptimizationStatus(null);
        }
    };

    useEffect(() => {
        let textToMonitor = '';
        let setTextFunc: (t: string) => void = () => {};

        if (activeTab === 'single') {
            textToMonitor = singleScript;
            setTextFunc = setSingleScript;
        } else if (activeTab === 'group') {
            textToMonitor = groupScript;
            setTextFunc = setGroupScript;
        } else {
            textToMonitor = podcastScript;
            setTextFunc = setPodcastScript;
        }

        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

        // Auto-correct debounce logic.
        if (textToMonitor && textToMonitor.trim().length > 3 && !activeDictationId && !isSingleLoading && !isGroupLoading && !isPodcastLoading) {
            typingTimerRef.current = setTimeout(() => {
                handleAutoFormat(textToMonitor, setTextFunc);
            }, 2500); 
        }
        return () => {
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        };
    }, [singleScript, groupScript, podcastScript, activeTab, activeDictationId, isSingleLoading, isGroupLoading, isPodcastLoading]);

    const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>, setText: (t: string) => void) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const currentText = e.currentTarget.value;
        
        const start = e.currentTarget.selectionStart;
        const end = e.currentTarget.selectionEnd;
        const newText = currentText.substring(0, start) + pastedText + currentText.substring(end);
        
        setText(newText);
        
        // Trigger immediate format for ALL pasted text regardless of length
        if (newText.trim().length > 0) {
            setOptimizationStatus("Correcting spelling & grammar...");
            handleAutoFormat(newText, setText);
        }
    };

    const handleDictation = (inputId: string | number, getText: () => string, setText: (text: string) => void) => {
        if (activeDictationId) {
            recognitionRef.current?.stop();
            return;
        }

        const textBeforeDictation = getText();
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech recognition is not supported in your browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = mapLanguageToCode(selectedVoice.language);
        recognition.interimResults = true;
        recognition.continuous = true;
        recognitionRef.current = recognition;
        
        let finalTranscriptForCorrection = '';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            let final = '';
            let interim = '';
            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            finalTranscriptForCorrection = final;
            setText((textBeforeDictation ? textBeforeDictation + ' ' : '') + final + interim);
            silenceTimerRef.current = setTimeout(() => recognition.stop(), 2000);
        };

        recognition.onend = async () => {
            setActiveDictationId(null);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            recognitionRef.current = null;
            const textToCorrect = finalTranscriptForCorrection.trim();
            if (textToCorrect) {
                setOptimizationStatus("Refining text...");
                try {
                    const corrected = await getCorrectedText(textToCorrect, selectedVoice.language);
                    setText((textBeforeDictation ? textBeforeDictation + ' ' : '') + corrected);
                } catch (e) { 
                    console.error("Failed to correct text:", e); 
                    setText((textBeforeDictation ? textBeforeDictation + ' ' : '') + textToCorrect);
                } finally {
                    setOptimizationStatus(null);
                }
            }
        };

        recognition.onerror = (event) => {
            setError(event.error === 'not-allowed' ? T.microphonePermissionDenied : `Speech error: ${event.error}`);
            setActiveDictationId(null);
            setOptimizationStatus(null);
        };
        
        setError(null);
        recognition.start();
        setActiveDictationId(inputId);
    };

    const handleGenerateSingle = async () => {
        if (!singleScript || isSingleLoading) return;
        setIsSingleLoading(true);
        setError(null);
        if (singleAudioUrl) URL.revokeObjectURL(singleAudioUrl);
        setSingleAudioUrl(null);
        singleAudioBlobRef.current = null;

        try {
            // If text is long, tell user we are processing chunks
            if (singleScript.length > 500) {
                setOptimizationStatus("Processing long text (Chunks)...");
            } else {
                setOptimizationStatus("Synthesizing...");
            }
            
            // Passing the selected style
            const rawSpeechBase64 = await generateSpeech(singleScript, singleVoice.apiName, singleVoice.language, "gemini-2.5-flash-preview-tts", audioStyle);
            
            if (rawSpeechBase64) {
                const finalBlob = await mixAudio(rawSpeechBase64);
                singleAudioBlobRef.current = finalBlob;
                setSingleAudioUrl(URL.createObjectURL(finalBlob));
            } else {
                throw new Error("Failed to generate audio.");
            }
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsSingleLoading(false);
            setOptimizationStatus(null);
        }
    };
    
    const handleMagicWrite = async () => {
        if (!singleScript.trim() || isSingleLoading) return;
        setIsSingleLoading(true);
        setError(null);
        setOptimizationStatus("Writing your story...");
        
        try {
            const creativePrompt = `Write a creative, poetic, and mature story based on this topic: "${singleScript}". Style: ${audioStyle}. Audience: Adults. Language: Authentic Egyptian Colloquial (Masri). Keep it expressive and dramatic.`;
            const storyText = await generateSingleVoiceText(creativePrompt, singleVoice);
            setSingleScript(storyText);
        } catch (err: any) {
            setError("Could not write story. " + err.message);
        } finally {
            setIsSingleLoading(false);
            setOptimizationStatus(null);
        }
    };

    const handleGenerateGroup = async () => {
        if (isGroupLoading || !groupScript.trim()) return;
        setIsGroupLoading(true);
        setError(null);
        if (groupAudioUrl) URL.revokeObjectURL(groupAudioUrl);
        setGroupAudioUrl(null);
        groupAudioBlobRef.current = null;
        
        try {
            setOptimizationStatus("Creating conversation...");
            const speakerVoices = groupSpeakers.map((s, i) => {
                const v = AVAILABLE_VOICES.find(voice => voice.id === s.voiceId);
                return { speaker: s.name.trim(), voiceApiName: v ? v.apiName : 'Fenrir' };
            });
            // Pass style to multi-speaker generation
            const rawSpeechBase64 = await generatePodcastSpeech(groupScript, speakerVoices, selectedVoice.language, audioStyle);
             if (rawSpeechBase64) {
                const finalBlob = await mixAudio(rawSpeechBase64);
                groupAudioBlobRef.current = finalBlob;
                setGroupAudioUrl(URL.createObjectURL(finalBlob));
            } else {
                throw new Error("Failed to generate audio.");
            }
        } catch (err: any) {
             setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsGroupLoading(false);
            setOptimizationStatus(null);
        }
    };

    const handleGeneratePodcast = async () => {
        if (isPodcastLoading || !podcastScript.trim()) return;
        setIsPodcastLoading(true);
        setError(null);
        if (podcastAudioUrl) URL.revokeObjectURL(podcastAudioUrl);
        setPodcastAudioUrl(null);
        podcastAudioBlobRef.current = null;
        
        try {
            setOptimizationStatus("Creating audio...");
            const speakerVoices = podcastSpeakers.map((s, i) => {
                const v = AVAILABLE_VOICES.find(voice => voice.id === s.voiceId);
                return { speaker: s.name.trim(), voiceApiName: v ? v.apiName : 'Fenrir' };
            });
            // Pass style to podcast generation
            const rawSpeechBase64 = await generatePodcastSpeech(podcastScript, speakerVoices, selectedVoice.language, audioStyle);
             if (rawSpeechBase64) {
                const finalBlob = await mixAudio(rawSpeechBase64);
                podcastAudioBlobRef.current = finalBlob;
                setPodcastAudioUrl(URL.createObjectURL(finalBlob));
            } else {
                throw new Error("Failed to generate audio.");
            }
        } catch (err: any) {
             setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsPodcastLoading(false);
            setOptimizationStatus(null);
        }
    };

    const manageSpeakers = (
        currentList: DialogueSpeaker[], 
        setList: React.Dispatch<React.SetStateAction<DialogueSpeaker[]>>, 
        action: 'add' | 'remove' | 'update', 
        id?: number, 
        field?: 'name' | 'voiceId', 
        value?: string
    ) => {
        if (action === 'add' && currentList.length < 4) {
            const newId = Date.now();
            const defaultVoice = AVAILABLE_VOICES[currentList.length % AVAILABLE_VOICES.length];
            setList([...currentList, { id: newId, name: '', voiceId: defaultVoice.id }]);
        } else if (action === 'remove' && id) {
            setList(currentList.filter(s => s.id !== id));
        } else if (action === 'update' && id && field && value !== undefined) {
            setList(currentList.map(s => s.id === id ? { ...s, [field]: value } : s));
        }
    };
    
    const onSingleVoiceSelect = (voice: Voice) => {
        setSingleVoice(voice);
        playGreeting(voice);
    };

    // Increased height (h-96) and min-height for long scripts support
    const textareaClasses = `${theme === 'dark' ? 'bg-black border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900'} w-full p-4 border rounded-lg focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-y shadow-sm text-base leading-loose`;
    const buttonClasses = (loading: boolean) => `self-center px-8 py-3 bg-cyan-500 text-white font-bold rounded-full hover:bg-cyan-600 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors text-sm shadow-lg ${loading ? 'cursor-wait' : ''}`;
    const micButtonClasses = (id: string | number) => activeDictationId === id ? 'text-red-500 animate-pulse scale-110' : (theme === 'dark' ? 'text-gray-400 hover:text-cyan-400' : 'text-gray-500 hover:text-blue-600');
    const playerContainerClasses = `${theme === 'dark' ? 'bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-800' : 'bg-white/50 backdrop-blur-sm border border-gray-200'} rounded-lg p-3 shadow-md`;
    const isRtl = selectedVoice.language === 'Egyptian Arabic';

    const tabButtonClasses = (tabName: string) => {
        const isActive = activeTab === tabName;
        const baseClasses = "flex flex-col items-center justify-center rounded-xl transition-all duration-200 border px-4 py-2 gap-1.5 min-w-[90px] max-w-[120px]"; 
        const colorClasses = isActive 
            ? "bg-cyan-600/20 text-cyan-400 border-cyan-500/50" 
            : (theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a] hover:bg-[#222] border-gray-800' : 'text-gray-600 bg-white hover:bg-gray-50 border-gray-200');
        return `${baseClasses} ${colorClasses}`;
    };
    
    const renderPlayer = (url: string | null, hasData: boolean) => (
        <div className={`flex flex-col gap-2 mt-2 ${playerContainerClasses}`}>
            {url && (
                <audio controls src={url} className="w-full h-10 focus:outline-none" />
            )}
             <div className="flex justify-end">
                 <button onClick={handleDownload} disabled={!hasData} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20" aria-label={T.downloadAudio} title={T.downloadAudio}>
                     <DownloadIcon className="w-5 h-5" /> Mb3
                 </button>
             </div>
        </div>
    );

    const renderSpeakerListUI = (
        speakersList: DialogueSpeaker[],
        setSpeakersList: React.Dispatch<React.SetStateAction<DialogueSpeaker[]>>,
        scriptText: string,
        setScriptText: React.Dispatch<React.SetStateAction<string>>,
        isLoading: boolean,
        handleGen: () => void,
        audioUrl: string | null,
        hasAudioData: boolean,
        tabKey: 'group' | 'podcast',
        placeholder: string,
        buttonText: string
    ) => (
        <div className="flex-grow flex flex-col space-y-4 overflow-y-auto w-full max-w-lg mx-auto py-2 scrollbar-hide">
            <div className="w-full mx-auto space-y-4">
                 {/* Style Selection for Groups/Podcasts */}
                <div className="w-full">
                    <StyleDropdown 
                        selectedStyleId={audioStyle}
                        onSelect={setAudioStyle}
                        theme={theme}
                        T={T}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {speakersList.map((speaker, index) => (
                        <div key={speaker.id} className={`${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border rounded-xl p-4 flex flex-col gap-3 shadow-md relative group`}>
                            {speakersList.length > 2 && (
                                <button onClick={() => manageSpeakers(speakersList, setSpeakersList, 'remove', speaker.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors z-10">
                                    <XMarkIcon className="w-4 h-4"/>
                                </button>
                            )}
                            <div className="w-full">
                                <input 
                                    type="text" 
                                    value={speaker.name} 
                                    onChange={(e) => manageSpeakers(speakersList, setSpeakersList, 'update', speaker.id, 'name', e.target.value)} 
                                    placeholder={T.guestNamePlaceholder.replace('{n}', (index + 1).toString())} 
                                    className={`w-full px-3 py-2 text-sm rounded-md focus:outline-none border border-gray-500/30 focus:border-cyan-500 transition-all placeholder-gray-500 ${theme === 'dark' ? 'bg-black text-white focus:ring-1 focus:ring-cyan-500' : 'bg-white text-gray-900'}`}
                                    style={{backgroundColor: theme === 'dark' ? '#000' : '#fff'}}
                                />
                            </div>
                            
                            <div className="w-full">
                                <VoiceDropdown 
                                    selectedId={speaker.voiceId} 
                                    onSelect={(v) => {
                                        manageSpeakers(speakersList, setSpeakersList, 'update', speaker.id, 'voiceId', v.id);
                                        playGreeting(v);
                                    }} 
                                    theme={theme} 
                                    isRtl={isRtl} 
                                />
                            </div>
                        </div>
                    ))}
                </div>
                {speakersList.length < 4 && (
                        <button onClick={() => manageSpeakers(speakersList, setSpeakersList, 'add')} className="mt-2 w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-500/30 rounded-xl hover:border-cyan-400/50 hover:text-cyan-400 transition-all text-xs uppercase tracking-wider font-medium hover:bg-cyan-500/5">
                            <PlusIcon className="w-4 h-4"/> {T.addGuest}
                        </button>
                )}
            </div>
            
            <div className="relative w-full flex flex-col mt-2">
                {/* Expanded Chat Box for Long Scripts - Increased height to h-96 (24rem) */}
                <textarea 
                    value={scriptText} 
                    onChange={(e) => setScriptText(e.target.value)} 
                    onPaste={(e) => handlePaste(e, setScriptText)}
                    placeholder={placeholder}
                    className={`${textareaClasses} h-96 min-h-[300px]`} 
                    disabled={isLoading || !!activeDictationId}
                    spellCheck={false}
                />
                <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} flex flex-col gap-2`}>
                    <button 
                        onClick={() => handleDictation(tabKey, () => scriptText, setScriptText)} 
                        className="p-2 rounded-full hover:bg-gray-500/10 transition-colors bg-black/20 backdrop-blur-sm" 
                        disabled={isLoading}
                        title="Dictate"
                    >
                        <MicrophoneIcon className={`w-5 h-5 ${micButtonClasses(tabKey)}`} />
                    </button>
                    <div className="absolute top-10 right-0 pointer-events-none opacity-50">
                         <MagicWandIcon className="w-4 h-4 text-cyan-500 animate-pulse" />
                    </div>
                </div>
            </div>

            <button onClick={handleGen} disabled={isLoading || !scriptText} className={buttonClasses(isLoading)}>
                {isLoading ? <div className="flex items-center gap-2"><Spinner /><span>Processing...</span></div> : buttonText}
            </button>

            {audioUrl && !isLoading && renderPlayer(audioUrl, hasAudioData)}
        </div>
    );
    
    return (
        <div className="flex flex-col h-full w-full p-4 space-y-2 overflow-hidden">
             <div className="flex justify-center gap-3 flex-shrink-0 items-center flex-wrap mb-2">
                <button onClick={() => setActiveTab('single')} className={tabButtonClasses('single')} title={T.singleConversation}>
                    <PersonIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-center leading-3">{T.singleConversation}</span>
                </button>
                <button onClick={() => setActiveTab('group')} className={tabButtonClasses('group')} title={T.createPodcast}>
                    <UsersIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-center leading-3">{T.createPodcast}</span>
                </button>
                <button onClick={() => setActiveTab('podcast')} className={tabButtonClasses('podcast')} title={T.sfxExperimental}>
                    <PodcastIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-center leading-3">{T.sfxExperimental}</span>
                </button>
             </div>
            
            {error && <p className="text-red-500 bg-red-900/20 p-2 rounded-md text-xs text-center flex-shrink-0">{error}</p>}
            {optimizationStatus && <p className="text-cyan-400 text-xs text-center flex-shrink-0 animate-pulse font-medium">{optimizationStatus}</p>}
            
            {/* VOICE MESSAGE TAB */}
            {activeTab === 'single' && (
                <div className="flex-grow flex flex-col space-y-6 max-w-lg mx-auto w-full overflow-y-auto py-2 scrollbar-hide">
                    <div className="flex flex-col gap-4">
                        <div className="w-full flex flex-col gap-3">
                            <StyleDropdown 
                                selectedStyleId={audioStyle}
                                onSelect={setAudioStyle}
                                theme={theme}
                                T={T}
                            />
                            <VoiceDropdown 
                                selectedId={singleVoice.id} 
                                onSelect={onSingleVoiceSelect} 
                                theme={theme} 
                                isRtl={isRtl} 
                            />
                        </div>
                        
                        <div className="relative w-full">
                            {/* Expanded Chat Box for Single Voice - Increased height */}
                            <textarea 
                                value={singleScript} 
                                onChange={(e) => setSingleScript(e.target.value)} 
                                onPaste={(e) => handlePaste(e, setSingleScript)}
                                placeholder={T.promptPlaceholder} 
                                className={`${textareaClasses} h-96 min-h-[300px]`} 
                                style={{direction: isRtl ? 'rtl' : 'ltr' }} 
                                disabled={isSingleLoading || !!activeDictationId} 
                                spellCheck={false}
                            />
                            <div className={`absolute top-3 ${isRtl ? 'left-3' : 'right-3'} flex flex-col gap-2`}>
                                <button 
                                    onClick={() => handleDictation('single', () => singleScript, setSingleScript)} 
                                    className="p-2 rounded-full hover:bg-gray-500/10 transition-colors bg-black/20 backdrop-blur-sm" 
                                    disabled={isSingleLoading}
                                    title="Dictate"
                                >
                                    <MicrophoneIcon className={`w-5 h-5 ${micButtonClasses('single')}`} />
                                </button>
                                {/* Magic Wand Button - Now Interactive */}
                                <button
                                     onClick={handleMagicWrite}
                                     disabled={isSingleLoading || !singleScript}
                                     className="p-2 rounded-full hover:bg-cyan-500/10 transition-colors bg-black/20 backdrop-blur-sm"
                                     title="Magic Story Generator"
                                >
                                     <MagicWandIcon className={`w-5 h-5 ${singleScript ? 'text-cyan-400 hover:text-cyan-300' : 'text-gray-600'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={handleGenerateSingle} disabled={isSingleLoading || !singleScript} className={buttonClasses(isSingleLoading)}>
                        {isSingleLoading ? <div className="flex items-center gap-2"><Spinner /><span>Processing...</span></div> : T.generateAudio}
                    </button>
                    {singleAudioUrl && !isSingleLoading && renderPlayer(singleAudioUrl, !!singleAudioBlobRef.current)}
                </div>
            )}
            
            {activeTab === 'group' && renderSpeakerListUI(
                groupSpeakers, 
                setGroupSpeakers, 
                groupScript, 
                setGroupScript, 
                isGroupLoading, 
                handleGenerateGroup, 
                groupAudioUrl, 
                !!groupAudioBlobRef.current, 
                'group',
                "What is the conversation about? (Scene Topic)",
                "Create Joint Conversation"
            )}
            
            {activeTab === 'podcast' && renderSpeakerListUI(
                podcastSpeakers, 
                setPodcastSpeakers, 
                podcastScript, 
                setPodcastScript, 
                isPodcastLoading, 
                handleGeneratePodcast, 
                podcastAudioUrl, 
                !!podcastAudioBlobRef.current, 
                'podcast',
                T.podcastScriptPlaceholder,
                T.generatePodcast
            )}
        </div>
    );
};

export default SoundCreator;

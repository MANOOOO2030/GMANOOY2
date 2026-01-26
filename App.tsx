
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Page, Voice, ChatMessage, ImageGenState } from './types';
import { AVAILABLE_VOICES } from './constants';
import { translations } from './translations';
import SettingsMenu from './components/SettingsMenu';
import MediaAnalysis from './components/MediaAnalysis';
import SoundCreator from './components/SoundCreator';
import ImageGenerator from './components/ImageGenerator';
import LiveChat from './components/LiveChat';
import Chat from './components/Chat';
import { CreatePicturesIcon, AnalyzeMediaIcon, CreateSoundIcon, IconDefs, ChatIcon, NewChatIcon, DownloadIcon } from './components/IconComponents';
import { generateSpeech, decode, decodeAudioData, isQuotaExceeded } from './services/geminiService';

const initialImageGenState: ImageGenState = {
    mode: 'create', createPrompt: '', createAspectRatio: '1:1', createGeneratedImage: null,
    editPrompt: '', editImageFiles: [], editGeneratedImage: null, editAspectRatio: '1:1'
};

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>(Page.Chat);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');
    const [appLanguage, setAppLanguage] = useState<string>('ar');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const T = useMemo(() => translations[appLanguage as keyof typeof translations] || translations.ar, [appLanguage]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [imageGenState, setImageGenState] = useState<ImageGenState>(initialImageGenState);
    
    // Independent reset triggers for each section
    const [soundResetTrigger, setSoundResetTrigger] = useState<number>(0);
    const [analysisResetTrigger, setAnalysisResetTrigger] = useState<number>(0);
    
    // Updated default voice to Layla (Female)
    const [selectedVoice, setSelectedVoice] = useState<Voice>(() => {
        const saved = localStorage.getItem('gmanooy_voice');
        return AVAILABLE_VOICES.find(v => v.id === saved) || AVAILABLE_VOICES.find(v => v.id === 'layla_soft') || AVAILABLE_VOICES[0];
    });

    useEffect(() => {
        document.documentElement.dir = appLanguage === 'ar' || appLanguage === 'default' ? 'rtl' : 'ltr';
        document.body.className = theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-black';
    }, [theme, appLanguage]);

    const initAudio = () => {
        if (!audioContext) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            setAudioContext(ctx);
        } else if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    };

    const playGreeting = async (voice: Voice) => {
        if (isQuotaExceeded()) return;
        const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) setAudioContext(ctx);
        const b64 = await generateSpeech(voice.greeting, voice.apiName, voice.language);
        if (b64) {
            const buf = await decodeAudioData(decode(b64), ctx, 24000, 1);
            const src = ctx.createBufferSource();
            src.buffer = buf; src.connect(ctx.destination); src.start();
        }
    };

    const handleVoiceChange = (id: string) => {
        const v = AVAILABLE_VOICES.find(v => v.id === id);
        if (v) { setSelectedVoice(v); localStorage.setItem('gmanooy_voice', id); playGreeting(v); }
    };

    const handleNewChat = () => {
        if (currentPage === Page.Chat) {
            setMessages([]);
        } else if (currentPage === Page.Pictures) {
            setImageGenState(initialImageGenState);
        } else if (currentPage === Page.Sound) {
            setSoundResetTrigger(prev => prev + 1);
        } else if (currentPage === Page.Analysis) {
            setAnalysisResetTrigger(prev => prev + 1);
        }
    };

    const navButtonClass = (isActive: boolean) => 
        `flex flex-col items-center justify-center gap-1 w-full py-2 transition-colors ${isActive ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-400'}`;

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden" onClick={initAudio}>
            <IconDefs />
            
            {/* Header - Hidden when in Live Chat */}
            {currentPage !== Page.Live && (
                <header className={`flex justify-between items-center p-2 border-b z-20 ${theme === 'dark' ? 'border-gray-800 bg-black/90' : 'bg-white border-gray-200'}`}>
                    <button 
                        onClick={handleNewChat}
                        className="flex flex-col items-center gap-0.5 p-1 rounded-lg text-cyan-400 active:scale-95 transition-transform"
                    >
                        <NewChatIcon className="w-5 h-5"/>
                        <span className="text-[10px] font-bold">{T.headerNewChat}</span>
                    </button>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">{T.appName}</h1>
                    <SettingsMenu 
                        theme={theme} 
                        setTheme={setTheme} 
                        selectedVoice={selectedVoice} 
                        appLanguage={appLanguage} 
                        effectiveAppLanguage={appLanguage} 
                        setAppLanguage={setAppLanguage} 
                        onVoiceChange={handleVoiceChange} 
                        playGreeting={playGreeting} 
                        installPrompt={deferredPrompt} 
                        onInstall={() => deferredPrompt?.prompt()} 
                        T={T} 
                        menuPosition="top" // Expands downward
                    />
                </header>
            )}
            
            <main className="flex-1 relative overflow-hidden">
                {/* 
                   Render all main pages but toggle visibility using CSS.
                   This preserves the state (input text, uploaded files, generated results)
                   when navigating between tabs. 
                */}
                <div className={`h-full w-full ${currentPage === Page.Chat ? 'block' : 'hidden'}`}>
                    <Chat 
                        selectedVoice={selectedVoice} 
                        theme={theme} 
                        T={T} 
                        onStartLiveChat={() => setCurrentPage(Page.Live)} 
                        audioContext={audioContext} 
                        messages={messages} 
                        setMessages={setMessages} 
                        effectiveAppLanguage={appLanguage} 
                        isActive={currentPage === Page.Chat} 
                    />
                </div>
                
                <div className={`h-full w-full ${currentPage === Page.Pictures ? 'block' : 'hidden'}`}>
                    <ImageGenerator 
                        theme={theme} 
                        T={T} 
                        effectiveAppLanguage={appLanguage} 
                        state={imageGenState} 
                        setState={setImageGenState} 
                    />
                </div>

                <div className={`h-full w-full ${currentPage === Page.Sound ? 'block' : 'hidden'}`}>
                    <SoundCreator 
                        selectedVoice={selectedVoice} 
                        audioContext={audioContext} 
                        theme={theme} 
                        T={T} 
                        playGreeting={playGreeting} 
                        resetTrigger={soundResetTrigger} 
                        isActive={currentPage === Page.Sound}
                    />
                </div>

                <div className={`h-full w-full ${currentPage === Page.Analysis ? 'block' : 'hidden'}`}>
                    <MediaAnalysis 
                        theme={theme} 
                        T={T} 
                        effectiveAppLanguage={appLanguage} 
                        resetTrigger={analysisResetTrigger} 
                    />
                </div>

                {/* LiveChat is ephemeral and resource-heavy, so it is conditionally rendered */}
                {currentPage === Page.Live && (
                    <LiveChat 
                        selectedVoice={selectedVoice} 
                        T={T} 
                        onClose={() => setCurrentPage(Page.Chat)} 
                        setMessages={setMessages} 
                    />
                )}
            </main>
            
            {/* Navigation Bar - Hidden when in Live Chat */}
            {currentPage !== Page.Live && (
                <nav className={`flex justify-around items-end pb-safe pt-2 border-t z-20 ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}>
                    <button onClick={() => setCurrentPage(Page.Chat)} className={navButtonClass(currentPage === Page.Chat)}>
                        <ChatIcon className="w-6 h-6"/>
                        <span className="text-[10px] font-medium leading-tight">{T.navChat}</span>
                    </button>
                    <button onClick={() => setCurrentPage(Page.Pictures)} className={navButtonClass(currentPage === Page.Pictures)}>
                        <CreatePicturesIcon className="w-6 h-6"/>
                        <span className="text-[10px] font-medium leading-tight">{T.navPictures}</span>
                    </button>
                    <button onClick={() => setCurrentPage(Page.Sound)} className={navButtonClass(currentPage === Page.Sound)}>
                        <CreateSoundIcon className="w-6 h-6"/>
                        <span className="text-[10px] font-medium leading-tight">{T.navSound}</span>
                    </button>
                    <button onClick={() => setCurrentPage(Page.Analysis)} className={navButtonClass(currentPage === Page.Analysis)}>
                        <AnalyzeMediaIcon className="w-6 h-6"/>
                        <span className="text-[10px] font-medium leading-tight">{T.navAnalysis}</span>
                    </button>
                </nav>
            )}
        </div>
    );
};
export default App;

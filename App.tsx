
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
    const [resetTrigger, setResetTrigger] = useState<number>(0);
    
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

    return (
        <div className="h-[100dvh] flex flex-col overflow-hidden" onClick={initAudio}>
            <IconDefs />
            <header className={`flex justify-between items-center p-2 border-b ${theme === 'dark' ? 'border-gray-800 bg-black/90' : 'bg-white border-gray-200'}`}>
                <button 
                    onClick={() => { if(currentPage === Page.Chat) setMessages([]); else if(currentPage === Page.Sound) setResetTrigger(Date.now()); }}
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
            <main className="flex-1 relative overflow-hidden">
                {currentPage === Page.Chat && <Chat selectedVoice={selectedVoice} theme={theme} T={T} onStartLiveChat={() => setCurrentPage(Page.Live)} audioContext={audioContext} messages={messages} setMessages={setMessages} effectiveAppLanguage={appLanguage} isActive={true} />}
                {currentPage === Page.Pictures && <ImageGenerator theme={theme} T={T} effectiveAppLanguage={appLanguage} state={imageGenState} setState={setImageGenState} />}
                {currentPage === Page.Sound && <SoundCreator selectedVoice={selectedVoice} audioContext={audioContext} theme={theme} T={T} playGreeting={playGreeting} resetTrigger={resetTrigger} />}
                {currentPage === Page.Analysis && <MediaAnalysis theme={theme} T={T} effectiveAppLanguage={appLanguage} resetTrigger={resetTrigger} />}
                {currentPage === Page.Live && <LiveChat selectedVoice={selectedVoice} T={T} onClose={() => setCurrentPage(Page.Chat)} setMessages={setMessages} />}
            </main>
            <nav className={`flex justify-around p-2 border-t ${theme === 'dark' ? 'bg-black border-gray-800' : 'bg-white border-gray-200'}`}>
                <button onClick={() => setCurrentPage(Page.Chat)} className={currentPage === Page.Chat ? 'text-cyan-400' : 'text-gray-500'}><ChatIcon className="w-6 h-6"/><span className="text-[10px] block">{T.navChat}</span></button>
                <button onClick={() => setCurrentPage(Page.Pictures)} className={currentPage === Page.Pictures ? 'text-cyan-400' : 'text-gray-500'}><CreatePicturesIcon className="w-6 h-6"/><span className="text-[10px] block">{T.navPictures}</span></button>
                <button onClick={() => setCurrentPage(Page.Sound)} className={currentPage === Page.Sound ? 'text-cyan-400' : 'text-gray-500'}><CreateSoundIcon className="w-6 h-6"/><span className="text-[10px] block">{T.navSound}</span></button>
                <button onClick={() => setCurrentPage(Page.Analysis)} className={currentPage === Page.Analysis ? 'text-cyan-400' : 'text-gray-500'}><AnalyzeMediaIcon className="w-6 h-6"/><span className="text-[10px] block">{T.navAnalysis}</span></button>
            </nav>
        </div>
    );
};
export default App;


import React, { useState, useRef, useEffect } from 'react';
import type { Voice } from '../types';
import { AVAILABLE_VOICES } from '../constants';
import { generateSpeech, decode, generateSingleVoiceText, getCorrectedText, generatePodcastSpeech, audioBufferToWavBlob, decodeAudioData } from '../services/geminiService';
import { Spinner, MicrophoneIcon, DownloadIcon, PlusIcon, XMarkIcon, PersonIcon, UsersIcon, PodcastIcon } from './IconComponents';
import { translations } from '../translations';

const AUDIO_STYLES = [
    { id: 'realistic', labelKey: 'styleRealistic' },
    { id: 'dramatic', labelKey: 'styleDramatic' },
    { id: 'news', labelKey: 'styleNews' },
    { id: 'podcast', labelKey: 'stylePodcast' }
];

const SoundCreator: React.FC<any> = ({ selectedVoice, audioContext, theme, T, resetTrigger }) => {
    const [activeTab, setActiveTab] = useState<'single' | 'group'>('single');
    const [script, setScript] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [speakers, setSpeakers] = useState([{ id: 1, name: 'A', voiceId: AVAILABLE_VOICES[0].id }, { id: 2, name: 'B', voiceId: AVAILABLE_VOICES[1].id }]);
    const [style, setStyle] = useState('realistic');

    useEffect(() => { setScript(''); setAudioUrl(null); }, [resetTrigger, activeTab]);

    const handleGenerate = async () => {
        if(!script.trim()) return;
        setLoading(true); setAudioUrl(null);
        try {
            let b64: string | null = null;
            if (activeTab === 'single') {
                b64 = await generateSpeech(script, selectedVoice.apiName, selectedVoice.language, "gemini-2.5-flash-preview-tts", style);
            } else {
                const spks = speakers.map(s => ({ speaker: s.name, voiceApiName: AVAILABLE_VOICES.find(v=>v.id===s.voiceId)?.apiName || 'Fenrir' }));
                b64 = await generatePodcastSpeech(script, spks, selectedVoice.language, style);
            }
            if(b64) {
                const blob = await audioBufferToWavBlob(await decodeAudioData(decode(b64), new OfflineAudioContext(1,1,24000), 24000, 1));
                setAudioUrl(URL.createObjectURL(blob));
            }
        } catch(e) { console.error(e); } finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col h-full p-4 overflow-y-auto">
            <div className="flex gap-2 mb-4">
                <button onClick={() => setActiveTab('single')} className={`flex-1 p-2 rounded-lg border ${activeTab === 'single' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-gray-700 text-gray-500'}`}><PersonIcon className="mx-auto w-5 h-5"/>{T.singleConversation}</button>
                <button onClick={() => setActiveTab('group')} className={`flex-1 p-2 rounded-lg border ${activeTab === 'group' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'border-gray-700 text-gray-500'}`}><UsersIcon className="mx-auto w-5 h-5"/>{T.createPodcast}</button>
            </div>
            
            <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">{T.styleLabel}</label>
                <select value={style} onChange={e => setStyle(e.target.value)} className={`w-full p-2 rounded border ${theme === 'dark' ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-300'}`}>
                    {AUDIO_STYLES.map(s => <option key={s.id} value={s.id}>{T[s.labelKey]}</option>)}
                </select>
            </div>

            {activeTab === 'group' && (
                <div className="space-y-2 mb-4">
                    {speakers.map((s, i) => (
                        <div key={s.id} className="flex gap-2">
                            <input value={s.name} onChange={e => setSpeakers(prev => prev.map(p => p.id === s.id ? { ...p, name: e.target.value } : p))} placeholder={`Speaker ${i+1}`} className={`flex-1 p-2 rounded border ${theme === 'dark' ? 'bg-black border-gray-700 text-white' : 'bg-white'}`} />
                            <select value={s.voiceId} onChange={e => setSpeakers(prev => prev.map(p => p.id === s.id ? { ...p, voiceId: e.target.value } : p))} className={`flex-1 p-2 rounded border ${theme === 'dark' ? 'bg-black border-gray-700 text-white' : 'bg-white'}`}>
                                {AVAILABLE_VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            )}

            <textarea value={script} onChange={e => setScript(e.target.value)} placeholder={activeTab === 'single' ? T.promptPlaceholder : T.podcastScriptPlaceholder} className={`w-full h-40 p-3 rounded-lg border mb-4 ${theme === 'dark' ? 'bg-black border-gray-700 text-white' : 'bg-white border-gray-300'}`} />
            
            <button onClick={handleGenerate} disabled={loading} className="w-full py-3 bg-cyan-600 text-white rounded-lg font-bold disabled:opacity-50">
                {loading ? <Spinner /> : (activeTab === 'single' ? T.generateAudio : T.generatePodcast)}
            </button>

            {audioUrl && (
                <div className="mt-4 p-3 border rounded-lg flex flex-col gap-2">
                    <audio controls src={audioUrl} className="w-full" />
                    <a href={audioUrl} download="audio.wav" className="text-cyan-400 text-sm flex items-center gap-1 self-end"><DownloadIcon className="w-4 h-4"/> Download</a>
                </div>
            )}
        </div>
    );
};
export default SoundCreator;


import React, { useState, useRef, useEffect } from 'react';
import { analyzeMediaContent } from '../services/geminiService';
import type { AnalysisResult } from '../types';
import { Spinner, UploadIcon, ClipboardIcon, CheckIcon } from './IconComponents';
import { translations } from '../translations';

interface MediaAnalysisProps {
  theme: 'light' | 'dark';
  T: typeof translations.en;
  effectiveAppLanguage: string;
  resetTrigger: number;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

const MediaAnalysis: React.FC<MediaAnalysisProps> = ({ theme, T, effectiveAppLanguage, resetTrigger }) => {
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'audio' | 'video' | null>(null);
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (resetTrigger === 0) return;
        setMediaFile(null);
        setMediaSrc(null);
        setMediaType(null);
        setAnalysisResult(null);
        setError(null);
        setCopied(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [resetTrigger]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const isVideo = file.type.startsWith('video/');
            const isAudio = file.type.startsWith('audio/');
            
            if (isVideo || isAudio) {
                setMediaFile(file);
                setMediaSrc(URL.createObjectURL(file));
                setMediaType(isVideo ? 'video' : 'audio');
                setError(null);
                // Persist previous analysis result until new analysis starts
            } else {
                setMediaFile(null);
                setMediaSrc(null);
                setMediaType(null);
                setError('Please upload a valid Audio or Video file.');
            }
        }
    };

    const handleAnalyze = async () => {
        if (!mediaFile) return;
        
        if (mediaFile.size > 200 * 1024 * 1024) { // Soft limit check for browser perf
            setError('File is too large. Please try a smaller file (under 200MB) for browser stability.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const base64 = await fileToBase64(mediaFile);
            const result = await analyzeMediaContent(base64, mediaFile.type);
            if (result) {
                setAnalysisResult(result);
            } else {
                throw new Error('AI analysis returned empty results.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Analysis failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyTranscript = () => {
        if (!analysisResult?.transcript) return;
        const textToCopy = analysisResult.transcript.map(line => `[${line.speaker}] ${line.text}`).join('\n\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const containerClasses = theme === 'dark' ? 'bg-[#111] border border-gray-800' : 'bg-white/50 border';
    const textClasses = theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
    const titleClasses = theme === 'dark' ? 'text-cyan-300' : 'text-blue-600';
    const buttonClasses = 'w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2';
    const speakerLabelClasses = theme === 'dark' ? 'text-cyan-400 bg-cyan-900/20' : 'text-blue-600 bg-blue-50';

    return (
        <div className={`flex flex-col h-full p-4 md:p-6 overflow-y-auto ${textClasses}`}>
            {/* Header */}
            <div className="text-center mb-6 flex-shrink-0">
                <h2 className={`text-3xl font-bold ${titleClasses}`}>{T.analysisTitle}</h2>
                <p className="mt-2 max-w-xl mx-auto opacity-80">{T.analysisDescription}</p>
            </div>

            <div className="max-w-3xl mx-auto w-full space-y-6 pb-10">
                
                {/* Upload Section */}
                <div className={`p-6 rounded-xl space-y-4 text-center border-dashed border-2 ${theme === 'dark' ? 'border-gray-700 hover:border-cyan-500' : 'border-gray-300 hover:border-blue-500'} transition-colors`}>
                    <input
                        type="file"
                        accept="audio/*,video/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="hidden"
                    />
                    
                    {!mediaSrc ? (
                         <div className="flex flex-col items-center gap-3 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                <UploadIcon className="w-8 h-8 opacity-70" />
                            </div>
                            <div className="space-y-1">
                                <span className="font-semibold block">{T.analysisUploadPrompt}</span>
                                <span className="text-xs opacity-60 block">{T.analysisLimitation}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center gap-4">
                             {mediaType === 'video' ? (
                                <video controls src={mediaSrc} className="w-full max-h-64 rounded-lg bg-black" />
                             ) : (
                                <audio controls src={mediaSrc} className="w-full" />
                             )}
                             <button onClick={() => {setMediaFile(null); setMediaSrc(null); /* Kept Analysis Result */}} className="text-sm text-red-500 hover:underline">Remove File</button>
                        </div>
                    )}
                </div>

                {/* Action Button - Visible whenever file is uploaded, regardless of previous result */}
                {mediaFile && (
                    <button onClick={handleAnalyze} disabled={isLoading} className={buttonClasses}>
                        {isLoading ? <><Spinner /> Smart Analysis...</> : T.analyzeButton}
                    </button>
                )}

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-center text-sm">
                        {error}
                    </div>
                )}

                {/* Results Section */}
                {analysisResult && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Summary Card */}
                        <div className={`p-5 rounded-xl ${containerClasses} shadow-lg`}>
                            <h3 className={`text-lg font-bold mb-3 uppercase tracking-wide ${titleClasses}`}>{T.summaryTitle}</h3>
                            <p className="leading-relaxed opacity-90 whitespace-pre-wrap text-sm md:text-base">
                                {analysisResult.summary}
                            </p>
                        </div>

                        {/* Transcript Card */}
                        <div className={`rounded-xl ${containerClasses} shadow-lg overflow-hidden flex flex-col`}>
                            <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'} bg-opacity-50`}>
                                <h3 className={`text-lg font-bold uppercase tracking-wide ${titleClasses}`}>{T.transcriptTitle}</h3>
                            </div>
                            
                            <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {analysisResult.transcript.map((line, idx) => (
                                    <div key={idx} className="flex flex-col gap-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md self-start ${speakerLabelClasses}`}>
                                            {line.speaker}
                                        </span>
                                        <p className="text-sm md:text-base leading-relaxed pl-2 border-l-2 border-gray-500/20 whitespace-pre-wrap">
                                            {line.text}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Footer with Copy Button */}
                            <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800 bg-gray-900/30' : 'border-gray-200 bg-gray-50'} flex justify-center`}>
                                <button 
                                    onClick={handleCopyTranscript}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-colors ${copied ? 'bg-green-500 text-white' : (theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white border hover:bg-gray-50 text-gray-800')}`}
                                >
                                    {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                                    {copied ? T.copied : T.copyTranscript}
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaAnalysis;

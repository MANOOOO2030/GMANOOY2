
import React, { useState, useRef, useEffect } from 'react';
import { generateImage, getCorrectedText, editImage } from '../services/geminiService';
import type { SpeechRecognition, SpeechRecognitionEvent, ImageGenState } from '../types';
import { Spinner, DownloadIcon, CreatePicturesIcon, MicrophoneIcon, UploadIcon, XMarkIcon, VideoCameraIcon } from './IconComponents';
import { translations } from '../translations';

interface ImageGeneratorProps {
  theme: 'light' | 'dark';
  T: typeof translations.en;
  effectiveAppLanguage: string;
  state: ImageGenState;
  setState: React.Dispatch<React.SetStateAction<ImageGenState>>;
}

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

const getSpeechLang = (appLang: string): string => {
    const map: Record<string, string> = {
        'ar': 'ar-EG',
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR'
    };
    return map[appLang] || 'en-US';
};

const ImageGenerator: React.FC<ImageGeneratorProps> = ({ theme, T, effectiveAppLanguage, state, setState }) => {
    // Independent Loading/Error States for Parallel Operation
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [editError, setEditError] = useState<string | null>(null);

    const [isDictating, setIsDictating] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { 
        mode, 
        createPrompt, 
        createAspectRatio, 
        createGeneratedImage, 
        editPrompt, 
        editImageFiles, 
        editGeneratedImage, 
        editAspectRatio 
    } = state;

    const setMode = (newMode: 'create' | 'edit') => {
        setState(prev => ({ ...prev, mode: newMode }));
        // Clear dictation when switching modes to prevent cross-talk
        if (isDictating) {
            recognitionRef.current?.stop();
            setIsDictating(false);
        }
    };

    // Use separate state based on mode to allow independent operation
    const currentPrompt = mode === 'create' ? createPrompt : editPrompt;
    const currentAspectRatio = mode === 'create' ? createAspectRatio : editAspectRatio;
    const currentImage = mode === 'create' ? createGeneratedImage : editGeneratedImage;
    
    const isLoading = mode === 'create' ? isCreating : isEditing;
    const error = mode === 'create' ? createError : editError;

    const updateState = (field: keyof ImageGenState, value: any) => {
        setState(prev => ({ ...prev, [field]: value }));
    };
    
    const handleZoom = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoomLevel(prev => prev === 1 ? 2.5 : 1);
    };

    const handleGenerate = async () => {
        if (!createPrompt || isCreating) return;
        setIsCreating(true);
        setCreateError(null);
        updateState('createGeneratedImage', null);

        try {
            const correctedPrompt = await getCorrectedText(createPrompt, effectiveAppLanguage);
            updateState('createPrompt', correctedPrompt);
            
            const imageData = await generateImage(correctedPrompt, createAspectRatio);
            if (imageData) {
                updateState('createGeneratedImage', `data:image/png;base64,${imageData}`);
            } else {
                throw new Error("The model did not return an image. Please try a different prompt.");
            }
        } catch (err: any) {
            setCreateError(err.message || 'An unknown error occurred.');
            console.error("Image generation failed:", err);
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleEdit = async () => {
        if (!editPrompt || editImageFiles.length === 0 || isEditing) return;
        setIsEditing(true);
        setEditError(null);
        updateState('editGeneratedImage', null);
        
        try {
            const correctedPrompt = await getCorrectedText(editPrompt, effectiveAppLanguage);
            updateState('editPrompt', correctedPrompt);
            
            const finalPrompt = `${correctedPrompt} . Aspect ratio ${editAspectRatio}`;
            
            const imageData = await editImage(editImageFiles.map(f => ({ base64: f.base64, mimeType: f.mimeType })), finalPrompt);
             if (imageData) {
                updateState('editGeneratedImage', `data:image/png;base64,${imageData}`);
            } else {
                throw new Error("The model did not return an edited image. This may be due to safety filters or prompt complexity.");
            }
        } catch (err: any) {
             setEditError(err.message || 'An unknown error occurred.');
             console.error("Image editing failed:", err);
        } finally {
            setIsEditing(false);
        }
    };

    const handleDictation = () => {
        if (isDictating) {
            recognitionRef.current?.stop();
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const msg = "Speech recognition is not supported in your browser.";
            if(mode === 'create') setCreateError(msg);
            else setEditError(msg);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = getSpeechLang(effectiveAppLanguage);
        recognition.interimResults = true;
        recognition.continuous = true;
        recognitionRef.current = recognition;

        let finalTranscriptForCorrection = '';
        // Capture the text at the start of this dictation session
        const initialText = currentPrompt || ''; 
        const targetField = mode === 'create' ? 'createPrompt' : 'editPrompt';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            let interim = '';
            let final = '';
            for (let i = 0; i < event.results.length; ++i) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            finalTranscriptForCorrection = final;
            
            // Determine spacing: if initial text exists and doesn't end with space, add one.
            const prefix = initialText && !initialText.endsWith(' ') ? initialText + ' ' : initialText;
            const newText = prefix + final + interim;
            
            updateState(targetField, newText);
            
            // Increased timeout to 2 seconds (2000ms) to allow pauses in speech
            silenceTimerRef.current = setTimeout(() => recognition.stop(), 2000);
        };

        recognition.onend = async () => {
            setIsDictating(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            recognitionRef.current = null;
            
            const textToCorrect = finalTranscriptForCorrection.trim();
            if (textToCorrect) {
                try {
                    // Correct only the new text, then append it to the initial text
                    const corrected = await getCorrectedText(textToCorrect, recognition.lang);
                    const prefix = initialText && !initialText.endsWith(' ') ? initialText + ' ' : initialText;
                    updateState(targetField, prefix + corrected);
                } catch (e) { 
                    console.error("Failed to correct text:", e);
                    // Fallback is already handled by onresult, but we ensure consistency here
                    const prefix = initialText && !initialText.endsWith(' ') ? initialText + ' ' : initialText;
                    updateState(targetField, prefix + textToCorrect);
                }
            }
        };

        recognition.onerror = (event) => {
            const msg = event.error === 'not-allowed' ? T.microphonePermissionDenied : `Speech recognition error: ${event.error}`;
            if(mode === 'create') setCreateError(msg);
            else setEditError(msg);
            setIsDictating(false);
        };
        
        if(mode === 'create') setCreateError(null);
        else setEditError(null);

        recognition.start();
        setIsDictating(true);
    };
    
    const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles: { base64: string; mimeType: string; preview: string }[] = [];
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > 5 * 1024 * 1024) {
                    setEditError(T.fileTooLarge);
                    continue;
                }
                try {
                    const base64 = await fileToBase64(file);
                    const preview = URL.createObjectURL(file);
                    newFiles.push({ base64, mimeType: file.type, preview });
                } catch(err) {
                    setEditError('Failed to read one or more files.');
                }
            }
            
            updateState('editImageFiles', [...editImageFiles, ...newFiles]);
        }
        if(e.target) e.target.value = '';
    };

    const removeImage = (index: number) => {
        const newFiles = [...editImageFiles];
        newFiles.splice(index, 1);
        updateState('editImageFiles', newFiles);
    }

    const inputClasses = theme === 'dark' ? 'bg-[#111] border-gray-800 text-white' : 'bg-white border-gray-300 text-gray-900';
    const buttonClasses = 'w-full py-3.5 bg-cyan-600 text-white text-base font-bold rounded-xl hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-900/20 active:scale-[0.98]';
    const micButtonClasses = isDictating ? 'text-red-500 animate-pulse' : (theme === 'dark' ? 'text-gray-400 hover:text-cyan-400' : 'text-gray-500 hover:text-blue-600');
    
    return (
        <div className={`flex flex-col h-full ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Preview Modal */}
             {previewImage && (
                <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => { setPreviewImage(null); setZoomLevel(1); }}>
                    <div 
                        className={`relative transition-transform duration-300 ease-out ${zoomLevel > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} 
                        style={{ transform: `scale(${zoomLevel})` }}
                        onClick={handleZoom}
                    >
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-screen object-contain" />
                    </div>
                    {zoomLevel === 1 && (
                        <>
                        <button onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }} className="absolute top-4 right-4 p-2 bg-gray-800/50 text-white rounded-full hover:bg-gray-700 backdrop-blur-md z-10"><XMarkIcon className="w-6 h-6"/></button>
                        <a href={previewImage} download={`gmanooy-image-${Date.now()}.png`} onClick={(e) => e.stopPropagation()} className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-cyan-600 text-white rounded-full shadow-lg hover:bg-cyan-500 flex items-center gap-2 transition-transform active:scale-95 backdrop-blur-md border border-cyan-400/30 z-10"><DownloadIcon className="w-5 h-5"/><span className="text-sm font-medium">{T.imageGeneratorDownloadButton}</span></a>
                        </>
                    )}
                </div>
            )}

            {/* Header Title Area */}
            <div className={`flex-shrink-0 text-center py-3 border-b ${theme === 'dark' ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'}`}>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500' : 'text-blue-600'}`}>
                    {T.imageGeneratorTitle}
                </h2>
            </div>

            {/* Tabs */}
            <div className={`flex w-full flex-shrink-0 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
                <button 
                    onClick={() => setMode('create')} 
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mode === 'create' ? (theme === 'dark' ? 'border-cyan-500 text-cyan-400' : 'border-blue-500 text-blue-600') : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                    {T.tabCreate}
                </button>
                <button 
                    onClick={() => setMode('edit')} 
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mode === 'edit' ? (theme === 'dark' ? 'border-cyan-500 text-cyan-400' : 'border-blue-500 text-blue-600') : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                    {T.tabEdit}
                </button>
            </div>

            {/* Scrollable Content (No Padding on Container for Full Width) */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="flex flex-col min-h-full pb-4">
                    
                    {/* EDIT MODE: Image Upload Section */}
                    {mode === 'edit' && (
                        <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-200'}`}>
                            <label className="font-bold text-xs mb-3 block opacity-80 uppercase tracking-wider">{T.uploadImageToEdit}</label>
                             <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                 {/* Large Upload Button */}
                                <div className={`flex-shrink-0 w-20 h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer ${theme === 'dark' ? 'border-gray-700 hover:border-cyan-500 bg-gray-900/50' : 'border-gray-300 hover:border-blue-500 bg-gray-50'} transition-all relative group`} title="Upload Files">
                                     <UploadIcon className="w-8 h-8 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                     <input type="file" ref={fileInputRef} onChange={handleFilesChange} accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>

                                {/* Large Camera Button */}
                                <div className={`flex-shrink-0 w-20 h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer ${theme === 'dark' ? 'border-gray-700 hover:border-cyan-500 bg-gray-900/50' : 'border-gray-300 hover:border-blue-500 bg-gray-50'} transition-all relative group`} title="Take Photo">
                                     <VideoCameraIcon className="w-8 h-8 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                     <input type="file" onChange={handleFilesChange} accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>

                                {/* Image Previews */}
                                {editImageFiles.map((img, index) => (
                                    <div key={index} className="relative flex-shrink-0 w-20 h-20 group">
                                        <img src={img.preview} alt={`Upload ${index}`} className="w-full h-full object-cover rounded-xl border border-gray-700 shadow-md" />
                                        <button 
                                            onClick={() => removeImage(index)} 
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg scale-0 group-hover:scale-100 transition-transform"
                                        >
                                            <XMarkIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {/* Prompt Section - Full Width */}
                    <div className="p-4 space-y-5">
                        <div className="space-y-2">
                            <label className="font-bold text-xs opacity-80 uppercase tracking-wider ml-1">
                                {mode === 'create' ? T.imageGeneratorPromptLabel : T.editInstructionPlaceholder}
                            </label>
                            <div className="relative w-full">
                                <textarea
                                    id="image-prompt"
                                    value={currentPrompt}
                                    onChange={(e) => updateState(mode === 'create' ? 'createPrompt' : 'editPrompt', e.target.value)}
                                    placeholder={mode === 'create' ? T.imageGeneratorPromptPlaceholder : T.editInstructionPlaceholder}
                                    className={`w-full h-36 p-4 pr-12 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none text-base leading-relaxed shadow-sm ${inputClasses}`}
                                    disabled={isLoading || isDictating}
                                    spellCheck={false}
                                />
                                 <button 
                                    onClick={handleDictation}
                                    className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'}`}
                                    disabled={isLoading}
                                >
                                    <MicrophoneIcon className={`w-5 h-5 ${micButtonClasses}`} />
                                </button>
                            </div>
                        </div>
                        
                        {/* Aspect Ratio */}
                        <div className="space-y-2">
                             <label className="font-bold text-xs opacity-80 uppercase tracking-wider ml-1">{T.imageGeneratorAspectRatioLabel}</label>
                             <div className="flex flex-wrap gap-2">
                                {aspectRatios.map(ar => (
                                    <button 
                                        key={ar}
                                        onClick={() => updateState(mode === 'create' ? 'createAspectRatio' : 'editAspectRatio', ar)}
                                        className={`flex-1 min-w-[60px] py-2.5 rounded-lg text-xs font-bold transition-all border ${currentAspectRatio === ar ? 'bg-cyan-600 border-cyan-500 text-white shadow-md' : (theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}`}
                                    >
                                        {ar}
                                    </button>
                                ))}
                             </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {/* Generate Button */}
                        <button 
                            onClick={mode === 'create' ? handleGenerate : handleEdit} 
                            disabled={isLoading || !currentPrompt.trim() || (mode === 'edit' && editImageFiles.length === 0)} 
                            className={buttonClasses}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Spinner />
                                    <span>{T.imageGeneratorLoadingMessage}</span>
                                </div>
                            ) : (
                                mode === 'create' ? T.imageGeneratorGenerateButton : T.editButton
                            )}
                        </button>
                    </div>

                    {/* Result Area */}
                    {currentImage && !isLoading && (
                        <div className="px-4 pb-8">
                            <div className="relative group w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
                                 <img 
                                    src={currentImage} 
                                    alt="Generated" 
                                    className="w-full h-auto object-contain bg-black/40 cursor-zoom-in" 
                                    onClick={() => { setPreviewImage(currentImage); setZoomLevel(1); }}
                                 />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;

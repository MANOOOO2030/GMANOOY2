
import React, { useState, useRef, useEffect } from 'react';
import type { Voice } from '../types';
import { AVAILABLE_VOICES, SUPPORTED_LANG_CODES } from '../constants';
import { SettingsIcon, UpAndDownArrowIcon, DownloadIcon } from './IconComponents';
import { translations } from '../translations';


interface SettingsMenuProps {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    selectedVoice: Voice;
    appLanguage: string;
    effectiveAppLanguage: string;
    setAppLanguage: (language: string) => void;
    onVoiceChange: (voiceId: string) => void;
    playGreeting: (voice: Voice) => void;
    installPrompt: any;
    onInstall: () => void;
    T: typeof translations.en;
    menuPosition: 'top' | 'bottom';
    className?: string; // Added prop for custom styling
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({
    theme,
    setTheme,
    selectedVoice,
    appLanguage,
    effectiveAppLanguage,
    setAppLanguage,
    onVoiceChange,
    playGreeting,
    installPrompt,
    onInstall,
    T,
    menuPosition,
    className,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
    
    const menuRef = useRef<HTMLDivElement>(null);
    const voiceDropdownRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close main menu if click is outside
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
            
            // Close voice dropdown if click is outside the dropdown container
            if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
                setIsVoiceDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const availableVoicesForLang = AVAILABLE_VOICES; 
    
    const groupedVoices = {
        men: availableVoicesForLang.filter(v => v.gender === 'male'),
        women: availableVoicesForLang.filter(v => v.gender === 'female'),
        children: availableVoicesForLang.filter(v => v.gender === 'child'),
    };


    // Updated darker dropdown background for pure black theme
    const dropdownClasses = theme === 'dark' 
        ? 'bg-[#111] border-gray-800 text-white shadow-cyan-900/20'
        : 'bg-white border-gray-200 text-black';

    const selectClasses = theme === 'dark'
        ? 'bg-[#1a1a1a] border-gray-800 text-white hover:bg-[#222]'
        : 'bg-gray-100 border-gray-300 text-black';
        
    const isRtl = effectiveAppLanguage === 'ar';
    const transformClass = theme === 'dark'
        ? (isRtl ? '-translate-x-5' : 'translate-x-5')
        : 'translate-x-0';

    const renderVoiceList = (voices: Voice[]) => {
        return voices.map((voice) => (
            <li
                key={voice.id}
                onClick={(e) => {
                    e.stopPropagation();
                    onVoiceChange(voice.id);
                    // Keeps dropdown open for previewing multiple voices
                }}
                className={`px-3 py-2 cursor-pointer truncate ${theme === 'dark' ? 'hover:bg-[#222]' : 'hover:bg-gray-200'} ${selectedVoice.id === voice.id ? 'font-bold text-cyan-400' : ''}`}
                role="option"
                aria-selected={selectedVoice.id === voice.id}
            >
                {voice.nameTranslations[effectiveAppLanguage] || voice.name}
            </li>
        ));
    };
    
    const menuPositionClasses = menuPosition === 'bottom'
        ? 'bottom-full ltr:right-0 rtl:left-0 mb-2 origin-bottom'
        : 'top-full ltr:right-0 rtl:left-0 mt-2 origin-top';

    return (
        <div ref={menuRef} className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={className || `flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-[#111]' : 'hover:bg-gray-200'}`} 
                aria-label={T.settings}
            >
                <SettingsIcon className="w-6 h-6" />
                <span className="text-[10px] leading-none font-medium">{T.settings}</span>
            </button>
           
            {isOpen && (
            <div 
                className={`absolute ${menuPositionClasses} w-72 p-4 rounded-lg shadow-2xl border ${dropdownClasses} z-50 animate-in fade-in zoom-in duration-200`}
            >
                <div className="space-y-5">
                    {/* Title */}
                    <h3 className="text-lg font-semibold text-center">{T.settings}</h3>

                    {/* Install App Button (Only shows if installable) */}
                    {installPrompt && (
                        <button
                            onClick={onInstall}
                            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full font-bold transition-all ${theme === 'dark' ? 'bg-cyan-600 text-white hover:bg-cyan-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                        >
                            <DownloadIcon className="w-5 h-5" />
                            <span>{T.installApp}</span>
                        </button>
                    )}

                    {/* Theme Setting (SIM) - Moved to Top */}
                    <div>
                        <label className="block text-sm font-medium text-center mb-2">{T.theme}</label>
                        <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
                            <span className={`text-sm font-medium transition-colors ${theme === 'light' ? 'text-blue-600' : 'text-gray-400'}`}>{T.light}</span>
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`relative inline-flex flex-shrink-0 items-center h-6 rounded-full w-11 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    theme === 'dark'
                                    ? 'bg-cyan-600 focus:ring-cyan-500 focus:ring-offset-black'
                                    : 'bg-gray-300 focus:ring-blue-500 focus:ring-offset-white'
                                }`}
                                role="switch"
                                aria-checked={theme === 'dark'}
                                aria-label="Toggle theme"
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${transformClass}`}
                                />
                            </button>
                            <span className={`text-sm font-medium transition-colors ${theme === 'dark' ? 'text-cyan-400' : 'text-gray-500'}`}>{T.dark}</span>
                        </div>
                    </div>

                     {/* Voice Setting - Middle */}
                     <div>
                        <label className="block text-sm font-medium mb-1">{T.voice}</label>
                         <div 
                            ref={voiceDropdownRef}
                            className="relative"
                        >
                            <button
                                type="button"
                                onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none flex justify-between items-center text-left ${selectClasses}`}
                                aria-haspopup="listbox"
                                aria-expanded={isVoiceDropdownOpen}
                            >
                                <span className="truncate">
                                    {selectedVoice.nameTranslations[effectiveAppLanguage] || selectedVoice.name}
                                </span>
                                <UpAndDownArrowIcon className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Dropdown drops down */}
                            {isVoiceDropdownOpen && (
                                <div className={`absolute top-full mt-2 w-full origin-top animate-in fade-in slide-in-from-top-2 duration-200`}>
                                    <ul
                                        className={`max-h-60 overflow-y-auto rounded-md shadow-lg border z-10 ${dropdownClasses}`}
                                        role="listbox"
                                    >
                                        {groupedVoices.men.length > 0 && (
                                            <>
                                                <li className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 bg-inherit">{T.voiceSectionMen}</li>
                                                {renderVoiceList(groupedVoices.men)}
                                            </>
                                        )}
                                        {groupedVoices.women.length > 0 && (
                                            <>
                                                <li className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mt-2 sticky top-0 bg-inherit">{T.voiceSectionWomen}</li>
                                                {renderVoiceList(groupedVoices.women)}
                                            </>
                                        )}
                                        {groupedVoices.children.length > 0 && (
                                            <>
                                                <li className="px-3 py-1 text-xs font-bold text-gray-500 uppercase tracking-wider mt-2 sticky top-0 bg-inherit">{T.voiceSectionChildren}</li>
                                                {renderVoiceList(groupedVoices.children)}
                                            </>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* App Language Setting - Bottom */}
                    <div>
                        <label htmlFor="language-select" className="block text-sm font-medium mb-1">{T.appLanguage}</label>
                        <select
                            id="language-select"
                            value={appLanguage}
                            onChange={(e) => setAppLanguage(e.target.value)}
                            className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none ${selectClasses}`}
                        >
                            {SUPPORTED_LANG_CODES.map((code) => (
                                <option key={code} value={code}>
                                    {T[code as keyof typeof T]}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
};

export default SettingsMenu;

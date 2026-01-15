
import React from 'react';

export const IconDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="soundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#f472b6" />
      </linearGradient>
      <linearGradient id="picturesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id="analysisGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
      
      {/* 3D Sphere Gradients - Android Style */}
      <radialGradient id="grad-red-sphere" cx="35%" cy="35%" r="80%" fx="35%" fy="35%">
        <stop offset="0%" stopColor="#ff5252" />
        <stop offset="40%" stopColor="#d50000" />
        <stop offset="100%" stopColor="#b71c1c" />
      </radialGradient>
      
      <radialGradient id="grad-dark-sphere" cx="35%" cy="35%" r="80%" fx="35%" fy="35%">
        <stop offset="0%" stopColor="#607d8b" />
        <stop offset="40%" stopColor="#263238" />
        <stop offset="100%" stopColor="#102027" />
      </radialGradient>

      <radialGradient id="grad-active-sphere" cx="35%" cy="35%" r="80%" fx="35%" fy="35%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#cfd8dc" />
      </radialGradient>

      {/* Deep Drop Shadow for 3D Pop */}
      <filter id="sphere-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.6"/>
      </filter>
      
      {/* Inner Bevel/Glow for Glossy Look */}
      <filter id="gloss-highlight">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur"/>
        <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1" specularExponent="20" lightingColor="#white" result="specOut">
            <fePointLight x="-5000" y="-10000" z="20000"/>
        </feSpecularLighting>
        <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut"/>
        <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litPaint"/>
      </filter>
    </defs>
  </svg>
);

const iconStyle = { }; 
const defaultSize = "w-5 h-5";

// --- 3D STYLIZED ICONS FOR LIVE CHAT ---

// End Call: The requested Android-style Red 3D Button
export const EndCall3DIcon = ({ className = "", size = "w-16 h-16" }: { className?: string, size?: string }) => (
    <svg className={`${size} ${className}`} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter: 'url(#sphere-shadow)'}}>
        {/* Main Red Sphere Body */}
        <circle cx="32" cy="32" r="28" fill="url(#grad-red-sphere)" />
        
        {/* Glossy Highlight (Top Left) */}
        <ellipse cx="22" cy="18" rx="10" ry="6" transform="rotate(-45 22 18)" fill="white" fillOpacity="0.3" />
        
        {/* Bottom Reflection */}
        <path d="M15 45 Q 32 58 49 45" stroke="white" strokeOpacity="0.1" strokeWidth="2" fill="none" />
        
        {/* White Phone Handset (Hang Up Position - Wide and Curved) */}
        <path d="M42 27.5C39.5 25.0 35.8 24.0 32 24.0C28.2 24.0 24.5 25.0 22 27.5L25.5 31.0C26.0 31.5 26.8 31.6 27.5 31.2C29.0 30.4 30.5 30.0 32 30.0C33.5 30.0 35.0 30.4 36.5 31.2C37.2 31.6 38.0 31.5 38.5 31.0L42 27.5Z" fill="white" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.2))"/>
    </svg>
);

// Control Button: 3D Sphere base (Dark/Glassy)
export const Control3DIcon = ({ 
    icon, 
    active = false, 
    className = "", 
    size = "w-12 h-12"
}: { 
    icon: 'mic' | 'cam' | 'share' | 'switch', 
    active?: boolean, 
    className?: string,
    size?: string
}) => {
    // Active = White Sphere, Inactive = Dark Sphere
    const fillUrl = active ? "url(#grad-active-sphere)" : "url(#grad-dark-sphere)";
    const iconColor = active ? "#1f2937" : "white";

    return (
        <svg className={`${size} ${className}`} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter: 'url(#sphere-shadow)'}}>
            <circle cx="32" cy="32" r="28" fill={fillUrl} />
            {/* Gloss Highlight */}
            <ellipse cx="24" cy="18" rx="8" ry="5" transform="rotate(-45 24 18)" fill="white" fillOpacity={active ? "0.6" : "0.15"} />
            
            <g transform="translate(16, 16) scale(1)">
                {icon === 'mic' && <MicPath color={iconColor} slashed={!active} />}
                {icon === 'cam' && <CamPath color={iconColor} slashed={!active} />}
                {icon === 'share' && <SharePath color={iconColor} active={active} />}
                {icon === 'switch' && <SwitchPath color={iconColor} />}
            </g>
        </svg>
    );
};

const MicPath = ({ color, slashed }: { color: string, slashed: boolean }) => (
    <g stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M16 4C16 1.79 14.21 0 12 0C9.79 0 8 1.79 8 4V12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12V4Z" fill={slashed ? "none" : color} stroke={slashed ? color : "none"} />
        <path d="M16 4C16 1.79 14.21 0 12 0C9.79 0 8 1.79 8 4V12C8 14.21 9.79 16 12 16C14.21 16 16 14.21 16 12V4Z" stroke={color} fill="none"/>
        <path d="M23 10V12C23 18.07 18.07 23 12 23C5.93 23 1 18.07 1 12V10" />
        <path d="M12 23V29" />
        <path d="M6 29H18" />
        {slashed && <line x1="2" y1="2" x2="28" y2="28" stroke="#ef4444" strokeWidth="3" />}
    </g>
);

const CamPath = ({ color, slashed }: { color: string, slashed: boolean }) => (
    <g stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M26 8L20 12.2V9C20 7.34 18.66 6 17 6H3C1.34 6 0 7.34 0 9V21C0 22.66 1.34 24 3 24H17C18.66 24 20 22.66 20 21V17.8L26 22V8Z" fill={slashed ? "none" : color} stroke={slashed ? color : "none"} />
        <path d="M26 8L20 12.2V9C20 7.34 18.66 6 17 6H3C1.34 6 0 7.34 0 9V21C0 22.66 1.34 24 3 24H17C18.66 24 20 22.66 20 21V17.8L26 22V8Z" stroke={color} fill="none" />
        {slashed && <line x1="2" y1="2" x2="28" y2="28" stroke="#ef4444" strokeWidth="3" />}
    </g>
);

const SharePath = ({ color, active }: { color: string, active: boolean }) => (
    <g stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M7 26H17" />
        <path d="M12 20V26" />
        {active && <circle cx="20" cy="8" r="3" fill="#ef4444" stroke="none" />}
    </g>
);

const SwitchPath = ({ color }: { color: string }) => (
    <g stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M26 14C26 7.37 20.63 2 14 2V5C18.97 5 23 9.03 23 14C23 18.97 18.97 23 14 23V26C20.63 26 26 20.63 26 14Z" />
        <path d="M14 2L18 6L14 10" />
        <path d="M2 14C2 20.63 7.37 26 14 26V23C9.03 23 5 18.97 5 14C5 9.03 9.03 5 14 5V2C7.37 2 2 7.37 2 14Z" />
        <path d="M14 26L10 22L14 18" />
    </g>
);

// --- END 3D ICONS ---

export const ChatIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#iconGradient)" style={iconStyle}>
      <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
    </svg>
);

export const MicrophoneIcon = ({ className = defaultSize }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path>
  </svg>
);

export const StopIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"></path>
    </svg>
);

export const PlayIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"></path>
    </svg>
);

export const MusicIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
);

export const PlayCircleIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
    </svg>
);

export const PauseCircleIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


export const SettingsIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#iconGradient)" style={iconStyle}>
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
);

export const Spinner = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const UpAndDownArrowIcon = ({ className = defaultSize }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6 6z"/>
  </svg>
);

export const CreatePicturesIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={iconStyle}>
        <path fill="url(#picturesGradient)" d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8.5 13.5l-3-4-4 5H5V6h14v9l-5.5-7.5z"/>
    </svg>
);

export const AnalyzeMediaIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#analysisGradient)" style={iconStyle}>
        <path d="M16 6h2v12h-2V6zm-4-4h2v16h-2V2zm-4 8h2v8H8v-8zM4 14h2v4H4v-4z"/>
        <path d="M20 20H4V4h16V2H4C2.9 2 2 2.9 2 4v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V12h-2v8z" opacity="0.4"/>
    </svg>
);

export const CreateSoundIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#soundGradient)" style={iconStyle}>
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
    </svg>
);

export const VideoCameraIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
    </svg>
);

export const EndCallSimpleIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// Start Call (Open): Red 3D Sphere (Modified)
export const StartLiveIcon = ({ className = "w-12 h-12" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{filter: 'url(#sphere-shadow)'}}>
        {/* 3D Red Sphere */}
        <circle cx="32" cy="32" r="28" fill="url(#grad-red-sphere)" />
        {/* Gloss */}
        <ellipse cx="22" cy="18" rx="10" ry="6" transform="rotate(-45 22 18)" fill="white" fillOpacity="0.4" />
        {/* Video Icon inside - White */}
        <path d="M42 26L36 30.2V27C36 25.34 34.66 24 33 24H17C15.34 24 14 25.34 14 27V37C14 38.66 15.34 40 17 40H33C34.66 40 36 38.66 36 37V33.8L42 38V26Z" fill="white" filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.3))"/>
    </svg>
);

export const MuteIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
    </svg>
);

export const UnmuteIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.43 4.43l-1.1-1.1c-.24.11-.5.2-.77.2-1.66 0-3-1.34-3-3V5c0-.83.34-1.58.88-2.12L7.36 4.41C6.54 5.42 6 6.66 6 8v3c0 3.03 2.02 5.56 4.81 6.21L11 21h2v-1.79l.99-.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .27 0 .53-.09.77-.2l2.06 2.06c-.71.52-1.52.9-2.42 1.12V21h2v-3.28c.9-.22 1.71-.6 2.42-1.12l2.73 2.73L21 19.73l-1.41-1.41L4.27 3z"/>
    </svg>
);

export const VideoCameraOffIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2z"/>
    </svg>
);


export const UploadIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export const DownloadIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

export const SendIcon = ({ className = defaultSize }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
  </svg>
);

export const ScreenShareIcon = ({ className = defaultSize }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 16V6h16v10H4zm10-5.41V13h-2v-2.41L8.41 14 7 12.59 10.59 9 7 5.41 8.41 4 12 7.59 15.59 4 17 5.41 13.41 9z"/>
  </svg>
);

export const SwitchCameraIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.691v4.992h-4.992m0 0l-3.181-3.183a8.25 8.25 0 0111.664 0l3.181 3.183" />
    </svg>
);

export const PlusIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#iconGradient)" style={iconStyle}>
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
);

export const SpeakerWaveIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

export const SpeakerXMarkIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l-2.25 2.25M19.5 12l2.25-2.25M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);

export const ClipboardIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
);

export const CheckIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

export const ShareIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186a2.25 2.25 0 100-2.186" />
    </svg>
);

export const XMarkIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const NewChatIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="url(#iconGradient)" style={iconStyle}>
        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
    </svg>
);

export const PersonIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

export const UsersIcon = ({ className = defaultSize }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
);

export const PodcastIcon = ({ className = defaultSize }: { className?: string }) => (
     <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c-3.87 0-7 3.13-7 7 0 2.74 1.57 5.12 3.83 6.26V19H6v2h12v-2h-2.83v-3.74C17.43 14.12 19 11.74 19 9c0-3.87-3.13-7-7-7zm0 12c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
        <circle cx="12" cy="9" r="3"/>
    </svg>
);

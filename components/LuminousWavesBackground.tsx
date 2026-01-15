
import React, { useRef, useEffect } from 'react';

interface LuminousWavesBackgroundProps {
  stream: MediaStream | null;
}

const LuminousWavesBackground: React.FC<LuminousWavesBackgroundProps> = ({ stream }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);
    
    // 3D Sphere Configuration
    const spherePoints = useRef<{x: number, y: number, z: number, baseR: number}[]>([]);
    const rotation = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initialize 3D Sphere Points
        if (spherePoints.current.length === 0) {
            const numPoints = 600;
            for (let i = 0; i < numPoints; i++) {
                // Fibonacci Sphere Algorithm for even distribution
                const y = 1 - (i / (numPoints - 1)) * 2;
                const radiusAtY = Math.sqrt(1 - y * y);
                const theta = i * Math.PI * (3 - Math.sqrt(5)); // Golden angle

                const x = Math.cos(theta) * radiusAtY;
                const z = Math.sin(theta) * radiusAtY;

                spherePoints.current.push({ x, y, z, baseR: Math.random() * 2 + 1 });
            }
        }

        let animationFrameId: number;

        const render = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;
            
            // Audio Analysis
            let audioLevel = 0;
            if (analyserRef.current && dataArrayRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                // Calculate average volume (focus on bass/mids for impact)
                const relevantData = dataArrayRef.current.slice(0, 30); 
                const sum = relevantData.reduce((a, b) => a + b, 0);
                audioLevel = sum / relevantData.length / 255.0; // 0.0 to 1.0
            }

            // Dynamics
            const pulse = 1 + (audioLevel * 1.5); // Expansion factor
            const sphereRadius = Math.min(w, h) * 0.35 * pulse; 
            
            // Rotation
            rotation.current.y += 0.005;
            rotation.current.x += 0.002;

            // Background
            const bgGradient = ctx.createRadialGradient(cx, cy, sphereRadius * 0.5, cx, cy, w);
            bgGradient.addColorStop(0, '#0f172a'); // Slate-900 center
            bgGradient.addColorStop(1, '#000000'); // Black edges
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, w, h);

            // Draw Sphere Points
            spherePoints.current.forEach(p => {
                // Rotate Point
                let x = p.x;
                let y = p.y;
                let z = p.z;

                // Rotate Y
                const cosY = Math.cos(rotation.current.y);
                const sinY = Math.sin(rotation.current.y);
                const x1 = x * cosY - z * sinY;
                const z1 = z * cosY + x * sinY;

                // Rotate X
                const cosX = Math.cos(rotation.current.x);
                const sinX = Math.sin(rotation.current.x);
                const y2 = y * cosX - z1 * sinX;
                const z2 = z1 * cosX + y * sinX;

                // Perspective Project
                const perspective = 300 / (300 + z2); // Simple perspective
                const screenX = cx + x1 * sphereRadius * perspective;
                const screenY = cy + y2 * sphereRadius * perspective;
                const scale = perspective * p.baseR;

                // Draw
                const alpha = (z2 + 1) / 2; // Fade points at back
                if (alpha > 0) {
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, scale * (1 + audioLevel), 0, Math.PI * 2);
                    
                    // Core Color Logic based on audio
                    if (audioLevel > 0.3 && Math.random() > 0.8) {
                        ctx.fillStyle = '#ffffff'; // Sparkle white on loud audio
                    } else {
                        // Gradient from Cyan to Purple based on position
                        const r = Math.floor(100 + (x1 + 1) * 70); // Red channel varies
                        const g = Math.floor(200 + (y2 + 1) * 55);
                        const b = 255;
                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    }
                    
                    ctx.fill();
                    
                    // Connect lines if loud enough (Neural effect)
                    if (audioLevel > 0.4 && Math.random() > 0.95) {
                         ctx.beginPath();
                         ctx.moveTo(cx, cy);
                         ctx.lineTo(screenX, screenY);
                         ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.2})`; // Cyan glow
                         ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    // Audio Analyzer Setup
    useEffect(() => {
        if (!stream) {
            analyserRef.current = null;
            return;
        }
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6; 
        
        source.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        return () => {
            source.disconnect();
            if (audioCtx.state !== 'closed') audioCtx.close();
        };
    }, [stream]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10 bg-black" />;
};

export default LuminousWavesBackground;

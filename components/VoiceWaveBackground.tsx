import React, { useRef, useEffect } from 'react';

interface VoiceWaveBackgroundProps {
  stream: MediaStream | null;
}

const VoiceWaveBackground: React.FC<VoiceWaveBackgroundProps> = ({ stream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream?.getAudioTracks().length || !canvasRef.current) {
        return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#ec4899'); // pink-500
      gradient.addColorStop(0.5, '#22d3ee'); // cyan-400
      gradient.addColorStop(1, '#3b82f6'); // blue-600
      
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;

      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // data is 0-255, 128 is the center "silence"
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }
      
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      source.disconnect();
      if (audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
      }
    };
  }, [stream]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full -z-10 bg-gradient-to-b from-[#0f172a] to-[#020617]" />;
};

export default VoiceWaveBackground;
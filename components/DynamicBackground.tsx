import React from 'react';

const DynamicBackground: React.FC = () => {
  return (
    <>
      <style>{`
        @keyframes move {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(20px) translateX(10px); }
        }
        @keyframes move2 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-15px) translateX(-15px); }
        }
         @keyframes move3 {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(10px) translateX(-20px); }
        }
      `}</style>
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-[#0f172a] to-[#020617] -z-20 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full filter blur-3xl" style={{animation: 'move 15s ease-in-out infinite alternate'}}></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl" style={{animation: 'move2 18s ease-in-out infinite alternate'}}></div>
        <div className="absolute -bottom-1/2 left-1/4 w-80 h-80 bg-purple-600/20 rounded-full filter blur-3xl" style={{animation: 'move3 20s ease-in-out infinite alternate'}}></div>
      </div>
    </>
  );
};
export default DynamicBackground;
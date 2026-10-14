import React from 'react';
import { 
  MapPin, 
  Camera, 
  Music, 
  FileText, 
  Heart,
  Navigation,
  Compass
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const MemoryVisualPanel = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`relative w-full h-full min-h-[380px] lg:min-h-[480px] flex flex-col justify-between p-5 sm:p-8 overflow-hidden rounded-3xl border-4 border-[#1a2c35] transition-all duration-300
      ${
        isDark
          ? 'bg-[#0a2327] text-white shadow-[0_12px_0_0_#041a1d,0_12px_0_4px_#1a2c35]'
          : 'bg-[#ffb72b] text-[#1a2c35] shadow-[0_12px_0_0_#a35d10,0_12px_0_4px_#1a2c35]'
      }
    `}>
      {/* Background Chunky Waves / Topography Curves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating Cartoon Clouds */}
        <div className="absolute top-6 left-8 animate-cloud opacity-90">
          <svg width="68" height="38" viewBox="0 0 68 38" fill="none">
            <path
              d="M18 35H52C59.7 35 66 28.7 66 21C66 13.8 60.5 7.8 53.5 7.1C51.6 3 47.4 0 42.5 0C37.2 0 32.8 3.5 31.4 8.3C29.6 6.8 27.2 6 24.5 6C18.7 6 14 10.7 14 16.5C14 17.1 14.1 17.6 14.2 18.2C6.3 19.3 0 26.2 0 34.5C0 35 0.5 35 1 35H18Z"
              fill={isDark ? '#0e3439' : '#ffffff'}
              stroke="#1a2c35"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <div className="absolute top-16 right-10 animate-cloud opacity-80" style={{ animationDelay: '2s' }}>
          <svg width="50" height="28" viewBox="0 0 68 38" fill="none">
            <path
              d="M18 35H52C59.7 35 66 28.7 66 21C66 13.8 60.5 7.8 53.5 7.1C51.6 3 47.4 0 42.5 0C37.2 0 32.8 3.5 31.4 8.3C29.6 6.8 27.2 6 24.5 6C18.7 6 14 10.7 14 16.5C14 17.1 14.1 17.6 14.2 18.2C6.3 19.3 0 26.2 0 34.5C0 35 0.5 35 1 35H18Z"
              fill={isDark ? '#0e3439' : '#ffffff'}
              stroke="#1a2c35"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* Wavy bottom water layer like Chunky Duck banner */}
        <div className="absolute -bottom-1 -left-2 -right-2">
          <svg viewBox="0 0 800 180" className="w-full h-32 preserve-3d" preserveAspectRatio="none">
            <path
              d="M 0,50 Q 200,10 400,60 T 800,40 L 800,180 L 0,180 Z"
              fill={isDark ? '#041a1d' : '#02a896'}
              stroke="#1a2c35"
              strokeWidth="3.5"
            />
            <path
              d="M 0,80 Q 240,40 480,90 T 800,70 L 800,180 L 0,180 Z"
              fill={isDark ? '#021012' : '#028577'}
              stroke="#1a2c35"
              strokeWidth="3.5"
              opacity="0.85"
            />
          </svg>
        </div>
      </div>

      {/* Floating 3D Memory Showcase */}
      <div className="relative z-10 my-auto py-6 flex flex-col items-center">
        {/* Connected dashed trail */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-full h-full max-w-lg" viewBox="0 0 400 300" fill="none">
            <path
              d="M 80 70 Q 200 120 320 80"
              stroke="#1a2c35"
              strokeWidth="3.5"
              strokeDasharray="8 6"
            />
            <path
              d="M 200 140 Q 190 220 110 240"
              stroke="#1a2c35"
              strokeWidth="3.5"
              strokeDasharray="6 6"
            />
            <path
              d="M 200 140 Q 280 190 310 230"
              stroke="#1a2c35"
              strokeWidth="3.5"
              strokeDasharray="6 6"
            />
          </svg>
        </div>

        {/* Center Main 3D Memory Pin: Kyoto */}
        <div className="relative group cursor-pointer animate-bob z-20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-[#02a896] dark:bg-[#ffb72b] border-4 border-[#1a2c35] shadow-[0_8px_0_0_#076159,0_8px_0_4px_#1a2c35] dark:shadow-[0_8px_0_0_#a35d10,0_8px_0_4px_#1a2c35] flex flex-col items-center justify-center text-[#1a2c35] transition-all hover:-translate-y-1 hover:shadow-[0_12px_0_0_#076159,0_12px_0_4px_#1a2c35] active:translate-y-2 active:shadow-none">
            <MapPin className="w-8 h-8 fill-[#ffb72b] dark:fill-[#02a896] text-[#1a2c35]" strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-wider font-chunky text-white dark:text-[#1a2c35]">
              Kyoto
            </span>
          </div>
          
          {/* Audio snippet tag attached with 3D tactile pop */}
          <div className="absolute -bottom-3 -right-5 bg-white text-[#1a2c35] px-3 py-1 rounded-full border-3 border-[#1a2c35] shadow-[0_4px_0_0_#cbd5e1,0_4px_0_3px_#1a2c35] text-[11px] font-black font-chunky flex items-center gap-1.5 transition-transform hover:scale-105">
            <Music className="w-3.5 h-3.5 text-[#ffb72b] fill-current" />
            <span>audio.wav</span>
          </div>
        </div>

        {/* Floating 3D Polaroid Photo 1 - Left Top */}
        <div className="absolute -left-2 sm:left-2 top-0 animate-bob-reverse z-10 group cursor-pointer">
          <div className="w-28 sm:w-34 p-2 bg-white text-[#1a2c35] rounded-2xl border-3.5 border-[#1a2c35] shadow-[0_6px_0_0_#cbd5e1,0_6px_0_3.5px_#1a2c35] rotate-[-7deg] transition-all hover:rotate-0 hover:-translate-y-1">
            <div className="h-16 sm:h-20 bg-[#02a896] rounded-xl overflow-hidden relative border-2 border-[#1a2c35] flex items-center justify-center">
              <Camera className="w-7 h-7 text-white drop-shadow" />
              <span className="absolute bottom-1 right-2 text-[10px] font-black text-white bg-[#1a2c35] px-2 py-0.5 rounded-full">
                Rome
              </span>
            </div>
            <div className="pt-1.5 flex items-center justify-between">
              <span className="text-xs font-black font-chunky truncate">Summer Gelato</span>
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-[#1a2c35] shrink-0" />
            </div>
          </div>
        </div>

        {/* Floating 3D Polaroid Photo 2 - Right Top */}
        <div className="absolute -right-2 sm:right-2 top-2 animate-bob z-10 group cursor-pointer">
          <div className="w-26 sm:w-32 p-2 bg-white text-[#1a2c35] rounded-2xl border-3.5 border-[#1a2c35] shadow-[0_6px_0_0_#cbd5e1,0_6px_0_3.5px_#1a2c35] rotate-[9deg] transition-all hover:rotate-0 hover:-translate-y-1">
            <div className="h-14 sm:h-18 bg-[#ffb72b] rounded-xl overflow-hidden relative border-2 border-[#1a2c35] flex items-center justify-center">
              <Navigation className="w-6 h-6 text-[#1a2c35] drop-shadow" />
              <span className="absolute bottom-1 left-2 text-[10px] font-black text-white bg-[#1a2c35] px-2 py-0.5 rounded-full">
                Yosemite
              </span>
            </div>
            <div className="pt-1.5 flex items-center justify-between">
              <span className="text-[11px] font-black font-chunky">Dawn Hike</span>
              <span className="text-[9px] bg-[#02a896] text-white px-1.5 py-0.5 rounded-full font-black border border-[#1a2c35]">4K</span>
            </div>
          </div>
        </div>

        {/* Floating 3D Note - Bottom Left */}
        <div className="absolute left-2 sm:left-6 bottom-2 animate-bob z-15 hidden sm:block">
          <div className="bg-[#ffeb85] text-[#1a2c35] px-4 py-2.5 rounded-2xl border-3 border-[#1a2c35] shadow-[0_6px_0_0_#d8be30,0_6px_0_3px_#1a2c35] -rotate-6 flex items-center gap-2 transition-transform hover:rotate-0">
            <FileText className="w-4 h-4 text-[#1a2c35] shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-black font-chunky">Journal Note</span>
              <span className="text-[10px] font-bold text-[#1a2c35]/80">"Sunset on the pier"</span>
            </div>
          </div>
        </div>

        {/* Floating 3D Badge - Bottom Right */}
        <div className="absolute right-2 sm:right-6 bottom-4 animate-bob-reverse z-15">
          <div className="bg-[#02a896] text-white px-3.5 py-2 rounded-2xl border-3 border-[#1a2c35] shadow-[0_6px_0_0_#076159,0_6px_0_3px_#1a2c35] rotate-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-white" />
            <span className="text-xs font-black font-chunky">12 memories pinned</span>
          </div>
        </div>
      </div>

      {/* Bottom 3D Chunky Feature Card */}
      <div className={`relative z-10 rounded-2xl p-3 border-3.5 border-[#1a2c35] transition-colors
        ${
          isDark 
            ? 'bg-[#0f343a] text-white shadow-[0_5px_0_0_#041a1d,0_5px_0_3.5px_#1a2c35]' 
            : 'bg-white text-[#1a2c35] shadow-[0_5px_0_0_#a35d10,0_5px_0_3.5px_#1a2c35]'
        }
      `}>
        <h3 className="font-chunky text-base sm:text-lg font-black flex items-center gap-2">
          <span>STAY CURIOUS. GO FURTHER.</span>
          <span>🦆</span>
        </h3>
        <p className="text-xs font-semibold mt-0.5 leading-relaxed opacity-90">
          Bold creativity meets your geographic memory vault. Relive travels, soundscapes, and photos.
        </p>
      </div>
    </div>
  );
};

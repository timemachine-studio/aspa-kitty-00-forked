import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Loader2, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { AI_PERSONAS } from '../../config/constants';
import { useAuth } from '../../context/AuthContext';
import { uploadGeneratedMusic } from '../../services/music/musicService';

interface MusicComposeCardProps {
  content: string;
  isStreamingActive: boolean;
  personaColor: string;
  displayPersona: keyof typeof AI_PERSONAS;
}

interface ParsedMusicData {
  songName: string;
  style: string;
  lyrics: string;
  coverPrompt: string;
}

const formatTime = (time: number) => {
  if (isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

interface MusicPlayerVariationProps {
  parsedData: ParsedMusicData;
  seed: number;
  personaColor: string;
  themeText: string;
}

function MusicPlayerVariation({ parsedData, seed, personaColor, themeText }: MusicPlayerVariationProps) {
  const { user } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [audioLoading, setAudioLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const promptAudio = `Style: ${parsedData.style}. Lyrics: ${parsedData.lyrics}`;
    const encodedAudioPrompt = encodeURIComponent(promptAudio);
    const audio = `/api/music?prompt=${encodedAudioPrompt}&seed=${seed}`;

    const encodedImagePrompt = encodeURIComponent(parsedData.coverPrompt);
    const image = `/api/musicCover?prompt=${encodedImagePrompt}&width=1024&height=1024&seed=${seed}`;

    setAudioUrl(audio);
    setImageUrl(image);
    setAudioLoading(true);
    setImageLoading(true);
    setIsSaved(false);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [parsedData, seed]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handleEnded = () => setIsPlaying(false);
    const handleCanPlayThrough = () => {
      setAudioLoading(false);
      setDuration(audioEl.duration);
    };
    const handleLoadedData = () => {
      // Fallback: if canplaythrough hasn't fired yet, mark as ready
      setAudioLoading(false);
      if (audioEl.duration && !isNaN(audioEl.duration)) {
        setDuration(audioEl.duration);
      }
    };
    const handlePlaying = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime);
    const handleLoadedMetadata = () => setDuration(audioEl.duration);
    const handleError = (e: Event) => {
      console.error('Audio element error:', (e.target as HTMLAudioElement)?.error);
      setAudioLoading(false);
    };

    audioEl.addEventListener('ended', handleEnded);
    audioEl.addEventListener('canplaythrough', handleCanPlayThrough);
    audioEl.addEventListener('loadeddata', handleLoadedData);
    audioEl.addEventListener('playing', handlePlaying);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioEl.addEventListener('error', handleError);

    // If the audio is already ready (cached/fast response), handle it immediately
    if (audioEl.readyState >= 2) {
      setAudioLoading(false);
      if (audioEl.duration && !isNaN(audioEl.duration)) {
        setDuration(audioEl.duration);
      }
    }

    return () => {
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.removeEventListener('canplaythrough', handleCanPlayThrough);
      audioEl.removeEventListener('loadeddata', handleLoadedData);
      audioEl.removeEventListener('playing', handlePlaying);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioEl.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleDownload = async () => {
    if (!audioUrl || !parsedData) return;
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${parsedData.songName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${seed}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download audio', e);
    }
  };

  useEffect(() => {
    const saveToMemory = async () => {
      if (!user || isSaved || isSaving || audioLoading || imageLoading || !audioUrl || !imageUrl || !parsedData) return;

      setIsSaving(true);
      try {
        const [audioRes, imageRes] = await Promise.all([
          fetch(audioUrl),
          fetch(imageUrl)
        ]);

        const audioBlob = await audioRes.blob();
        const imageBlob = await imageRes.blob();

        const result = await uploadGeneratedMusic(
          user.id,
          parsedData.songName,
          parsedData.style,
          parsedData.lyrics,
          parsedData.coverPrompt,
          audioBlob,
          imageBlob
        );

        if (result) {
          setIsSaved(true);
        }
      } catch (error) {
        console.error('Failed to save music to memory:', error);
      } finally {
        setIsSaving(false);
      }
    };

    saveToMemory();
  }, [audioLoading, imageLoading, user, isSaved, isSaving, audioUrl, imageUrl, parsedData]);

  return (
    <div className={`p-4 md:p-6 rounded-3xl bg-black/5 backdrop-blur-md border border-white/10 shadow-xl flex flex-col md:flex-row gap-6 items-center`}>
      {/* Cover Art */}
      <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-2xl group flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Song Cover"
            className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
            onLoad={() => setImageLoading(false)}
          />
        ) : (
          <div className="w-full h-full bg-black/10 flex items-center justify-center">
            <Loader2 className={`w-8 h-8 animate-spin ${personaColor}`} />
          </div>
        )}

        {imageLoading && imageUrl && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className={`w-8 h-8 animate-spin ${personaColor}`} />
          </div>
        )}

        {/* Style Tag Overlay */}
        <div className="absolute bottom-2 left-2 right-2 text-center">
          <span className="inline-block px-2 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-medium text-white/90 border border-white/20 shadow-lg truncate max-w-full">
            {parsedData.style}
          </span>
        </div>
      </div>

      {/* Audio Controls */}
      <div className="flex-1 w-full flex flex-col justify-center space-y-4">

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className={`text-lg font-bold ${themeText}`}>{parsedData.songName}</span>
            <span className={`text-xs ${personaColor} opacity-80 flex items-center gap-1`}>
              {isSaving ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving to Memories...</>
              ) : isSaved ? (
                <><CheckCircle2 className="w-3 h-3" /> Saved to Memories</>
              ) : (
                'AI Generated Track'
              )}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={audioLoading || !audioUrl}
              className={`p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors border border-white/5 disabled:opacity-50`}
              title="Download MP3"
            >
              <Download className={`w-4 h-4 ${themeText} opacity-70`} />
            </button>
          </div>
        </div>

        {/* Player Scrubber */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono opacity-60">
            <span className={themeText}>{formatTime(currentTime)}</span>
            <span className={themeText}>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={audioLoading}
            className={`w-full h-1.5 appearance-none rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            style={{
              background: `linear-gradient(to right, ${personaColor.includes('pink') ? '#ec4899' : personaColor.includes('cyan') ? '#06b6d4' : '#a855f7'} ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%)`,
            }}
          />
        </div>

        {/* Main Play Button */}
        <div className="flex justify-center mt-2">
          <button
            onClick={togglePlay}
            disabled={audioLoading && !!audioUrl}
            className={`w-14 h-14 rounded-full bg-gradient-to-tr ${personaColor.includes('pink') ? 'from-pink-600 to-pink-400' : personaColor.includes('cyan') ? 'from-cyan-600 to-cyan-400' : 'from-purple-600 to-purple-400'} shadow-lg shadow-${personaColor.split('-')[1]}-500/30 flex items-center justify-center text-white hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100`}
          >
            {audioLoading && audioUrl ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 ml-1 fill-current" />
            )}
          </button>
        </div>

      </div>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="auto" />
      )}
    </div>
  );
}

export function MusicComposeCard({ content, isStreamingActive, personaColor, displayPersona }: MusicComposeCardProps) {
  const { theme } = useTheme();

  const [parsedData, setParsedData] = useState<ParsedMusicData | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);

  const [seeds, setSeeds] = useState<number[]>([]);
  const initialSeedSet = useRef(false);

  // Parse JSON — only depends on content, NOT seeds.length
  // This prevents re-creating parsedData (new object ref) when seeds change,
  // which was causing all existing MusicPlayerVariation components to reset.
  useEffect(() => {
    if (!content) return;

    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;

      const data: Partial<ParsedMusicData> = {};

      const songNameMatch = jsonString.match(/"songName"\s*:\s*"([^"]+)"/);
      if (songNameMatch) data.songName = songNameMatch[1];

      const styleMatch = jsonString.match(/"style"\s*:\s*"([^"]+)"/);
      if (styleMatch) data.style = styleMatch[1];

      const coverPromptMatch = jsonString.match(/"coverPrompt"\s*:\s*"([^"]+)"/);
      if (coverPromptMatch) data.coverPrompt = coverPromptMatch[1];

      const lyricsMatch = jsonString.match(/"lyrics"\s*:\s*"([\s\S]*?)"(?=\s*,|\s*\})/);
      if (lyricsMatch) {
        data.lyrics = lyricsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }

      if (data.songName && data.style && data.lyrics && data.coverPrompt) {
        setParsedData(data as ParsedMusicData);
        if (!initialSeedSet.current) {
          initialSeedSet.current = true;
          setSeeds([Math.floor(Math.random() * 1000000)]);
        }
      }
    } catch (e) {
      console.error('Failed to parse music data', e);
    }
  }, [content]);

  const handleRegenerate = () => {
    setSeeds(prev => [...prev, Math.floor(Math.random() * 1000000)]);
  };

  if (!parsedData) {
    if (isStreamingActive) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4">
          <Loader2 className={`w-8 h-8 animate-spin ${personaColor}`} />
          <p className={`text-sm ${theme.text} opacity-60`}>Composing your song...</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto my-6 space-y-6">
      {/* Heading */}
      <h2 className={`text-3xl font-bold text-center ${theme.text}`}>
        {parsedData.songName}
      </h2>

      {/* Main Player Cards */}
      <div className="space-y-4">
        {seeds.map((seed) => (
          <motion.div
            key={seed}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <MusicPlayerVariation
              parsedData={parsedData}
              seed={seed}
              personaColor={personaColor}
              themeText={theme.text}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center mt-2">
        <button
          onClick={handleRegenerate}
          className={`flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors border border-white/10 ${theme.text} opacity-80 hover:opacity-100 text-sm font-medium`}
        >
          <RefreshCw className="w-4 h-4" /> Try a different melody
        </button>
      </div>

      {/* Lyrics Toggle */}
      <div className="text-center mt-2">
        <span
          onClick={() => setShowLyrics(!showLyrics)}
          className={`cursor-pointer font-bold ${personaColor} hover:opacity-80 transition-opacity text-sm`}
        >
          {showLyrics ? 'Hide Lyrics' : 'View Lyrics'}
        </span>
      </div>

      {/* Expandable Lyrics */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`p-6 rounded-2xl bg-black/5 backdrop-blur-sm border border-white/5 ${theme.text}`}>
              <pre className="font-sans whitespace-pre-wrap text-center leading-relaxed">
                {parsedData.lyrics}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

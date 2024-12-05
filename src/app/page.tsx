'use client';

import { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaFolder, FaPlay, FaPause } from 'react-icons/fa';
import AudioMotionAnalyzer from 'audiomotion-analyzer';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioMotionRef = useRef<AudioMotionAnalyzer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedDirHandle, setSelectedDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  useEffect(() => {
    return () => {
      if (audioMotionRef.current) {
        audioMotionRef.current.destroy();
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const visualize = (stream: MediaStream) => {
    if (!containerRef.current) return;

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    
    source.connect(analyserRef.current);

    if (audioMotionRef.current) {
      audioMotionRef.current.destroy();
    }

    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = 0;
    analyserRef.current.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    audioMotionRef.current = new AudioMotionAnalyzer(containerRef.current, {
      source: analyserRef.current,
      connectSpeakers: false,
      alphaBars: false,
      ansiBands: false,
      barSpace: 0.1,
      bgAlpha: 0,
      channelLayout: "single",
      colorMode: "bar-level",
      fadePeaks: false,
      fftSize: 4096,
      fillAlpha: 0.2,
      frequencyScale: "log",
      gradient: "prism",
      gravity: 3.8,
      ledBars: false,
      linearAmplitude: true,
      linearBoost: 1.6,
      lineWidth: 2,
      loRes: false,
      lumiBars: true,
      maxDecibels: -35,
      maxFPS: 0,
      maxFreq: 16000,
      minDecibels: -85,
      minFreq: 30,
      mirror: 0,
      mode: 6,
      noteLabels: false,
      outlineBars: false,
      overlay: true,
      peakFadeTime: 750,
      peakHoldTime: 500,
      peakLine: false,
      radial: false,
      radialInvert: false,
      radius: 0.35,
      reflexAlpha: 1,
      reflexBright: 1,
      reflexFit: true,
      reflexRatio: 0.5,
      roundBars: true,
      showBgColor: false,
      showFPS: false,
      showPeaks: false,
      showScaleX: false,
      showScaleY: false,
      smoothing: 0.8,
      spinSpeed: 1,
      splitGradient: true,
      trueLeds: true,
      useCanvas: true,
      volume: 0,
      weightingFilter: "D"
    });
  };

  const handleFolderSelect = async () => {
    try {
      // @ts-expect-error - showDirectoryPicker is experimental
      const dirHandle = await window.showDirectoryPicker();
      setSelectedPath(dirHandle.name);
      setSelectedDirHandle(dirHandle);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError('Error al seleccionar la carpeta: ' + err.message);
      }
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRecording = async () => {
    try {
      if (!isRecording) {
        if (!selectedPath) {
          setError('Por favor, selecciona una carpeta de destino primero');
          return;
        }
        setError(null);
        setSuccessMessage(null);
        setAudioURL(null);

        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });

        visualize(stream);
        
        // Intentamos usar el formato más compatible
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 128000
        });
        
        chunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          try {
            const audioBlob = new Blob(chunksRef.current, { type: mimeType });
            const fileName = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
            
            // Crear URL para previsualización
            const url = URL.createObjectURL(audioBlob);
            setAudioURL(url);

            try {
              if (selectedDirHandle) {
                // Si hay una carpeta seleccionada, guardamos ahí
                const fileHandle = await selectedDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(audioBlob);
                await writable.close();
                setSuccessMessage('¡Grabación guardada exitosamente en la carpeta seleccionada!');
              } else {
                // Si no hay carpeta seleccionada, mostramos el selector
                // @ts-expect-error - showDirectoryPicker is experimental
                const dirHandle = await window.showDirectoryPicker();
                const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(audioBlob);
                await writable.close();
                setSuccessMessage('¡Grabación guardada exitosamente!');
              }
            } catch {
              // Si falla el guardado en carpeta, descargamos como antes
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              a.click();
              setSuccessMessage('Grabación descargada exitosamente');
            }
          } catch (err) {
            setError('Error al guardar la grabación');
            console.error('Error saving recording:', err);
          }
        };

        // Configuramos para que genere chunks cada 250ms para mejor calidad
        mediaRecorderRef.current.start(250);
        setIsRecording(true);
      } else {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (audioMotionRef.current) {
          audioMotionRef.current.destroy();
        }
        if (audioContextRef.current?.state !== 'closed') {
          await audioContextRef.current?.close();
        }
        setIsRecording(false);
      }
    } catch (err) {
      setError('Por favor permite el acceso al micrófono para grabar audio');
      console.error('Error accessing microphone:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [isRecording, audioURL]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      <div className="text-center w-full">
        <div className="flex flex-col items-center space-y-4 mb-8">
          <button
            onClick={handleFolderSelect}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-md"
          >
            <FaFolder className="w-5 h-5" />
            Seleccionar carpeta de destino
          </button>
          {selectedPath && (
            <p className="text-sm text-gray-600 mt-2">
              Carpeta seleccionada: {selectedPath}
            </p>
          )}
        </div>

        <div 
          ref={containerRef} 
          className="w-full h-64 bg-white shadow-xl overflow-hidden mb-8"
          style={{ 
            backgroundColor: 'white'
          }}
        />

        <div className="flex flex-col items-center space-y-8 max-w-2xl mx-auto">
          <div className="space-y-6">
            <button
              onClick={handleRecording}
              className={`p-8 rounded-full transition-all duration-300 shadow-lg ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación'}
            >
              {isRecording ? (
                <FaStop className="w-8 h-8 text-white" />
              ) : (
                <FaMicrophone className="w-8 h-8 text-white" />
              )}
            </button>
            
            <p className="text-xl font-medium text-gray-800">
              {isRecording ? 'Grabación en curso...' : 'Haz clic para comenzar a grabar'}
            </p>
          </div>

          {audioURL && !isRecording && (
            <div className="space-y-4 w-full">
              <button
                onClick={handlePlayPause}
                className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors shadow-md mx-auto"
              >
                {isPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5" />}
                {isPlaying ? 'Pausar' : 'Reproducir'} grabación
              </button>
              <audio
                ref={audioRef}
                src={audioURL}
                onEnded={() => setIsPlaying(false)}
                className="w-full mt-4"
                controls
              />
            </div>
          )}
          
          {error && (
            <p className="text-red-500 mt-4" role="alert">{error}</p>
          )}
          
          {successMessage && (
            <p className="text-green-500 font-medium mt-4" role="status">{successMessage}</p>
          )}
        </div>
      </div>
    </main>
  );
}

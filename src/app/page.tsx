'use client';

import { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaStop, FaFolder, FaPlay, FaPause } from 'react-icons/fa';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const visualize = (stream: MediaStream) => {
    if (!canvasRef.current) return;

    audioContextRef.current = new AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    analyserRef.current.fftSize = 2048;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    if (!canvasCtx) return;

    const draw = () => {
      if (!analyserRef.current || !canvasCtx) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgb(200, 200, 200)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  const handleFolderSelect = async () => {
    try {
      // @ts-expect-error - showDirectoryPicker is experimental
      const dirHandle = await window.showDirectoryPicker();
      setSelectedPath(dirHandle.name);
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
              // @ts-expect-error - showDirectoryPicker is experimental
              const dirHandle = await window.showDirectoryPicker({
                startIn: selectedPath,
              });
              const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(audioBlob);
              await writable.close();
              setSuccessMessage('¡Grabación guardada exitosamente!');
            } catch {
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
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center space-y-6 w-full max-w-md">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={handleFolderSelect}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <FaFolder className="w-4 h-4" />
            Seleccionar carpeta de destino
          </button>
          {selectedPath && (
            <p className="text-sm text-gray-600">
              Carpeta seleccionada: {selectedPath}
            </p>
          )}
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-24 bg-white rounded-lg shadow-inner"
            width={300}
            height={96}
          />
        </div>

        <button
          onClick={handleRecording}
          className={`p-8 rounded-full transition-all duration-300 ${
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
        
        <p className="text-lg font-medium">
          {isRecording ? 'Grabación en curso...' : 'Haz clic para comenzar a grabar'}
        </p>

        {audioURL && !isRecording && (
          <div className="space-y-2">
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors mx-auto"
            >
              {isPlaying ? <FaPause className="w-4 h-4" /> : <FaPlay className="w-4 h-4" />}
              {isPlaying ? 'Pausar' : 'Reproducir'} grabación
            </button>
            <audio
              ref={audioRef}
              src={audioURL}
              onEnded={() => setIsPlaying(false)}
              className="w-full mt-2"
              controls
            />
          </div>
        )}
        
        {error && (
          <p className="text-red-500" role="alert">{error}</p>
        )}
        
        {successMessage && (
          <p className="text-green-500 font-medium" role="status">{successMessage}</p>
        )}
      </div>
    </main>
  );
}

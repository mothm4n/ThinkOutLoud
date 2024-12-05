'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Folder, Play, Pause } from 'lucide-react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

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
      toast.success("Carpeta seleccionada", {
        description: `Se ha seleccionado la carpeta: ${dirHandle.name}`,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError('Error al seleccionar la carpeta: ' + err.message);
        toast.error("Error", {
          description: 'Error al seleccionar la carpeta: ' + err.message,
        });
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
          toast.error("Error", {
            description: 'Por favor, selecciona una carpeta de destino primero',
          });
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
            
            const url = URL.createObjectURL(audioBlob);
            setAudioURL(url);

            try {
              if (selectedDirHandle) {
                const fileHandle = await selectedDirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(audioBlob);
                await writable.close();
                toast.success("¡Éxito!", {
                  description: '¡Grabación guardada exitosamente en la carpeta seleccionada!',
                });
              } else {
                // @ts-expect-error - showDirectoryPicker is experimental
                const dirHandle = await window.showDirectoryPicker();
                const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(audioBlob);
                await writable.close();
                toast.success("¡Éxito!", {
                  description: '¡Grabación guardada exitosamente!',
                });
              }
            } catch {
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              a.click();
              toast.success("¡Éxito!", {
                description: 'Grabación descargada exitosamente',
              });
            }
          } catch (err) {
            setError('Error al guardar la grabación');
            toast.error("Error", {
              description: 'Error al guardar la grabación',
            });
            console.error('Error saving recording:', err);
          }
        };

        mediaRecorderRef.current.start(250);
        setIsRecording(true);
        toast.info("Grabación iniciada", {
          description: "La grabación ha comenzado...",
        });
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
        toast.info("Grabación detenida", {
          description: "La grabación ha finalizado",
        });
      }
    } catch (err) {
      setError('Por favor permite el acceso al micrófono para grabar audio');
      toast.error("Error", {
        description: 'Por favor permite el acceso al micrófono para grabar audio',
      });
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
    <main className="container mx-auto px-4 py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Grabadora de Audio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-6">
            <Button
              onClick={handleFolderSelect}
              variant="outline"
              size="lg"
              className="w-full max-w-md"
            >
              <Folder className="mr-2 h-5 w-5" />
              Seleccionar carpeta de destino
            </Button>

            {selectedPath && (
              <p className="text-sm text-muted-foreground">
                Carpeta seleccionada: {selectedPath}
              </p>
            )}

            <div 
              ref={containerRef} 
              className="w-full h-64 rounded-lg border bg-card"
            />

            <div className="flex flex-col items-center space-y-4 w-full">
              <Button
                onClick={handleRecording}
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className={`rounded-full p-8 ${isRecording ? 'animate-pulse' : ''}`}
              >
                {isRecording ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>

              <p className="text-xl font-medium text-card-foreground">
                {isRecording ? 'Grabación en curso...' : 'Haz clic para comenzar a grabar'}
              </p>

              {audioURL && !isRecording && (
                <div className="space-y-4 w-full">
                  <Button
                    onClick={handlePlayPause}
                    variant="secondary"
                    size="lg"
                    className="w-full max-w-md mx-auto"
                  >
                    {isPlaying ? (
                      <Pause className="mr-2 h-5 w-5" />
                    ) : (
                      <Play className="mr-2 h-5 w-5" />
                    )}
                    {isPlaying ? 'Pausar' : 'Reproducir'} grabación
                  </Button>
                  <audio
                    ref={audioRef}
                    src={audioURL}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full"
                    controls
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

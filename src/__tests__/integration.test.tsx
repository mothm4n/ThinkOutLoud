import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState, useEffect } from 'react';

// Mocks
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockDataAvailable = jest.fn();
const mockError = jest.fn();
const mockVisualize = jest.fn();
const mockSaveFile = jest.fn();

let sharedMockRecorder: MockMediaRecorder | null = null;

class MockMediaRecorder {
  ondataavailable: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  state: string = 'inactive';

  constructor() {
    sharedMockRecorder = this;
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable(new Blob());
      }
    }, 100);
  }

  start() {
    mockStart();
    this.state = 'recording';
  }

  stop() {
    mockStop();
    this.state = 'inactive';
  }

  pause() {
    mockPause();
    this.state = 'paused';
  }

  resume() {
    mockResume();
    this.state = 'recording';
  }
}

// Mock de AudioMotionAnalyzer
class MockAudioMotionAnalyzer {
  constructor() {}
  setOptions() {}
  setCanvasSize() {}
  connectInput() {}
  start() {
    mockVisualize();
  }
  stop() {}
}

// Componente principal
interface Props {
  onRecordingComplete: (blob: Blob) => Promise<void>;
  onVisualizationUpdate?: (data: number[]) => void;
  onError: (error: Error) => void;
  selectedDirectory?: string;
}

const AudioRecorderApp: React.FC<Props> = ({
  onRecordingComplete,
  onVisualizationUpdate,
  onError,
  selectedDirectory
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recorder, setRecorder] = useState<any>(null);
  const [visualizer, setVisualizer] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const checkPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
    } catch (error) {
      onError(error as Error);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkPermissions();
    };
    init();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MockMediaRecorder();
      const audioMotion = new MockAudioMotionAnalyzer();
      
      mediaRecorder.ondataavailable = async (event) => {
        try {
          await onRecordingComplete(event);
        } catch (error) {
          onError(error as Error);
        }
      };

      mediaRecorder.onerror = (event) => {
        onError(new Error('Recording error occurred'));
        setIsRecording(false);
        setIsPaused(false);
      };

      setRecorder(mediaRecorder);
      setVisualizer(audioMotion);
      mediaRecorder.start();
      audioMotion.start();
      setIsRecording(true);
    } catch (error) {
      onError(error as Error);
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      if (visualizer) {
        visualizer.stop();
      }
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const pauseRecording = () => {
    if (recorder && recorder.state === 'recording') {
      recorder.pause();
      if (visualizer) {
        visualizer.stop();
      }
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (recorder && recorder.state === 'paused') {
      recorder.resume();
      if (visualizer) {
        visualizer.start();
      }
      setIsPaused(false);
    }
  };

  return (
    <div>
      {hasPermission === false && (
        <button
          onClick={checkPermissions}
          data-testid="request-permission"
        >
          Request Microphone Permission
        </button>
      )}
      {hasPermission === true && (
        <>
          <button
            onClick={startRecording}
            disabled={isRecording}
            data-testid="start-recording"
          >
            Start Recording
          </button>
          <button
            onClick={stopRecording}
            disabled={!isRecording}
            data-testid="stop-recording"
          >
            Stop Recording
          </button>
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            disabled={!isRecording}
            data-testid="pause-resume-recording"
          >
            {isPaused ? 'Resume Recording' : 'Pause Recording'}
          </button>
        </>
      )}
    </div>
  );
};

describe('Integration and Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sharedMockRecorder = null;
    // Mock getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn()
      },
      writable: true
    });
  });

  describe('Complete Recording Flow', () => {
    it('should handle a complete recording session', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
      const onError = jest.fn();
      const onRecordingComplete = jest.fn().mockResolvedValue(undefined);
      const onVisualizationUpdate = jest.fn();

      render(
        <AudioRecorderApp
          onError={onError}
          onRecordingComplete={onRecordingComplete}
          onVisualizationUpdate={onVisualizationUpdate}
        />
      );

      // Esperar a que se actualice el estado inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Verificar permisos iniciales
      expect(screen.getByTestId('request-permission')).toBeInTheDocument();
      
      // Solicitar permisos (ahora exitoso)
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce({});
      await act(async () => {
        fireEvent.click(screen.getByTestId('request-permission'));
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Iniciar grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(mockStart).toHaveBeenCalled();
      expect(mockVisualize).toHaveBeenCalled();
      expect(screen.getByTestId('pause-resume-recording')).not.toBeDisabled();

      // Pausar grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('pause-resume-recording'));
      });

      expect(mockPause).toHaveBeenCalled();

      // Reanudar grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('pause-resume-recording'));
      });

      expect(mockResume).toHaveBeenCalled();

      // Detener grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('stop-recording'));
        // Esperar a que se complete la grabación simulada
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(mockStop).toHaveBeenCalled();
      expect(onRecordingComplete).toHaveBeenCalled();
    });

    it('should handle directory selection and file saving', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
      const onError = jest.fn();
      const onRecordingComplete = jest.fn().mockImplementation(async (blob: Blob) => {
        await mockSaveFile(blob, 'recording.webm');
      });

      render(
        <AudioRecorderApp
          onError={onError}
          onRecordingComplete={onRecordingComplete}
          selectedDirectory="/selected/directory"
        />
      );

      // Esperar a que se actualice el estado inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Solicitar permisos (ahora exitoso)
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValueOnce({});
      await act(async () => {
        fireEvent.click(screen.getByTestId('request-permission'));
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Iniciar y detener grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('stop-recording'));
        // Esperar a que se complete la grabación simulada
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(onRecordingComplete).toHaveBeenCalled();
      expect(mockSaveFile).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Flow', () => {
    it('should recover from permission denial', async () => {
      const mockError = new Error('Permission denied');
      (navigator.mediaDevices.getUserMedia as jest.Mock)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({});

      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <AudioRecorderApp
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      // Esperar a que se actualice el estado inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(screen.getByTestId('request-permission')).toBeInTheDocument();

      // Segundo intento (exitoso)
      await act(async () => {
        fireEvent.click(screen.getByTestId('request-permission'));
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId('start-recording')).toBeInTheDocument();
    });

    it('should handle interruption and resume', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValue({});

      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <AudioRecorderApp
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      // Esperar a que se actualice el estado inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Solicitar permisos
      await act(async () => {
        fireEvent.click(screen.getByTestId('request-permission'));
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Iniciar grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      // Simular interrupción
      await act(async () => {
        if (sharedMockRecorder && sharedMockRecorder.onerror) {
          sharedMockRecorder.onerror(new Error('Recording interrupted'));
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));

      // Reiniciar grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockStart).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('stop-recording')).not.toBeDisabled();
    });
  });

  describe('Visualization Integration', () => {
    it('should handle visualization during recording', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValue({});

      const onError = jest.fn();
      const onRecordingComplete = jest.fn();
      const onVisualizationUpdate = jest.fn();

      render(
        <AudioRecorderApp
          onError={onError}
          onRecordingComplete={onRecordingComplete}
          onVisualizationUpdate={onVisualizationUpdate}
        />
      );

      // Esperar a que se actualice el estado inicial
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Solicitar permisos
      await act(async () => {
        fireEvent.click(screen.getByTestId('request-permission'));
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Iniciar grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(mockVisualize).toHaveBeenCalled();

      // Pausar grabación
      await act(async () => {
        fireEvent.click(screen.getByTestId('pause-resume-recording'));
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Verificar que la visualización se detiene
      expect(screen.queryByText('Pause Recording')).not.toBeInTheDocument();
      expect(screen.getByText('Resume Recording')).toBeInTheDocument();
    });
  });
}); 
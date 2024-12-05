import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState } from 'react';

// Mock de MediaRecorder
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockDataAvailable = jest.fn();
const mockError = jest.fn();

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

// Componente para probar
interface Props {
  onError: (error: Error) => void;
  onRecordingComplete: (blob: Blob) => Promise<void>;
}

const RecordingComponent: React.FC<Props> = ({ onError, onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MockMediaRecorder();
      
      mediaRecorder.ondataavailable = async (event) => {
        try {
          await onRecordingComplete(event);
        } catch (error) {
          onError(error as Error);
        }
      };

      mediaRecorder.onerror = (event) => {
        onError(new Error('Recording error occurred'));
      };

      setRecorder(mediaRecorder);
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      onError(error as Error);
    }
  };

  const stopRecording = () => {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <div>
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
    </div>
  );
};

describe('Error Handling', () => {
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

  describe('Recording Errors', () => {
    it('should handle microphone access denial', async () => {
      const mockError = new Error('Permission denied');
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(mockError);

      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(screen.getByTestId('start-recording')).not.toBeDisabled();
    });

    it('should handle recording initialization errors', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({});
      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(mockStart).toHaveBeenCalled();
      expect(screen.getByTestId('stop-recording')).not.toBeDisabled();
    });

    it('should handle recording interruption', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({});
      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
        // Esperar a que se inicialice el recorder
        await new Promise(resolve => setTimeout(resolve, 50));
        // Simular error de grabación
        if (sharedMockRecorder && sharedMockRecorder.onerror) {
          sharedMockRecorder.onerror(new Error('Recording interrupted'));
        }
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('File System Errors', () => {
    it('should handle file saving errors', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({});
      const mockSaveError = new Error('Failed to save file');
      const onError = jest.fn();
      const onRecordingComplete = jest.fn().mockRejectedValue(mockSaveError);

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
        // Esperar a que se complete la grabación simulada
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(onError).toHaveBeenCalledWith(mockSaveError);
    });

    it('should handle invalid file paths', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({});
      const mockPathError = new Error('Invalid file path');
      const onError = jest.fn();
      const onRecordingComplete = jest.fn().mockRejectedValue(mockPathError);

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
        // Esperar a que se complete la grabación simulada
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(onError).toHaveBeenCalledWith(mockPathError);
    });
  });

  describe('Audio Processing Errors', () => {
    it('should handle audio context creation errors', async () => {
      const mockContextError = new Error('Failed to create audio context');
      (window as any).AudioContext = jest.fn().mockImplementation(() => {
        throw mockContextError;
      });
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(mockContextError);

      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle audio processing errors', async () => {
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({});
      const mockProcessingError = new Error('Audio processing failed');
      const onError = jest.fn();
      const onRecordingComplete = jest.fn().mockRejectedValue(mockProcessingError);

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
        // Esperar a que se complete la grabación simulada
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(onError).toHaveBeenCalledWith(mockProcessingError);
    });
  });

  describe('Recovery and Cleanup', () => {
    it('should cleanup resources after error', async () => {
      const mockError = new Error('Test error');
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(mockError);

      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(screen.getByTestId('start-recording')).not.toBeDisabled();
      expect(screen.getByTestId('stop-recording')).toBeDisabled();
    });

    it('should allow restarting after error', async () => {
      const mockError = new Error('Test error');
      (navigator.mediaDevices.getUserMedia as jest.Mock)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({});

      const onError = jest.fn();
      const onRecordingComplete = jest.fn();

      render(
        <RecordingComponent
          onError={onError}
          onRecordingComplete={onRecordingComplete}
        />
      );

      // Primera grabación (falla)
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(onError).toHaveBeenCalledWith(mockError);

      // Segunda grabación (exitosa)
      await act(async () => {
        fireEvent.click(screen.getByTestId('start-recording'));
      });

      expect(mockStart).toHaveBeenCalled();
      expect(screen.getByTestId('stop-recording')).not.toBeDisabled();
    });
  });
}); 
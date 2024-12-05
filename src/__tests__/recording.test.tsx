import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState } from 'react';

// Mock MediaRecorder
let mediaRecorderInstance: any = null;
const mockStart = jest.fn();
const mockStop = jest.fn();

class MockMediaRecorder {
  start = mockStart;
  stop = mockStop;
  state = 'recording';
  stream: any;
  eventHandlers: Record<string, Function[]> = {};

  constructor(stream: any) {
    this.stream = stream;
    mediaRecorderInstance = this;
  }

  addEventListener(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  removeEventListener(event: string) {
    delete this.eventHandlers[event];
  }

  dispatchEvent(event: string, data: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }
}

(global as any).MediaRecorder = MockMediaRecorder;

// Recording component for testing
interface Props {
  onRecordingComplete: (blob: Blob) => void;
  onError: (error: Error) => void;
}

const RecordingComponent: React.FC<Props> = ({ onRecordingComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MockMediaRecorder(stream);
      
      mediaRecorder.addEventListener('dataavailable', (event: any) => {
        if (event.data.size > 0) {
          onRecordingComplete(event.data);
        }
      });

      mediaRecorder.addEventListener('error', () => {
        onError(new Error('Recording failed'));
      });

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
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
        data-testid="start-button"
      >
        Start Recording
      </button>
      <button 
        onClick={stopRecording} 
        disabled={!isRecording}
        data-testid="stop-button"
      >
        Stop Recording
      </button>
      <div data-testid="status">
        {isRecording ? 'Recording...' : 'Not Recording'}
      </div>
    </div>
  );
};

describe('Recording Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mediaRecorderInstance = null;
  });

  it('should start recording when start button is clicked', async () => {
    const mockStream = { id: 'test-stream' };
    const onRecordingComplete = jest.fn();
    const onError = jest.fn();

    (global.navigator as any).mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    render(<RecordingComponent onRecordingComplete={onRecordingComplete} onError={onError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(mockStart).toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('Recording...');
  });

  it('should stop recording when stop button is clicked', async () => {
    const mockStream = { id: 'test-stream' };
    const onRecordingComplete = jest.fn();
    const onError = jest.fn();

    (global.navigator as any).mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    render(<RecordingComponent onRecordingComplete={onRecordingComplete} onError={onError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    expect(mediaRecorderInstance).not.toBeNull();
    expect(mediaRecorderInstance.state).toBe('recording');

    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-button'));
    });

    expect(mockStop).toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('Not Recording');
  });

  it('should handle recording errors', async () => {
    const mockStream = { id: 'test-stream' };
    const onRecordingComplete = jest.fn();
    const onError = jest.fn();

    (global.navigator as any).mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    render(<RecordingComponent onRecordingComplete={onRecordingComplete} onError={onError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    expect(mediaRecorderInstance).not.toBeNull();
    mediaRecorderInstance.dispatchEvent('error', { type: 'error' });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should handle data available event', async () => {
    const mockStream = { id: 'test-stream' };
    const mockBlob = new Blob(['test-data'], { type: 'audio/webm' });
    const onRecordingComplete = jest.fn();
    const onError = jest.fn();

    (global.navigator as any).mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    };

    render(<RecordingComponent onRecordingComplete={onRecordingComplete} onError={onError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    expect(mediaRecorderInstance).not.toBeNull();
    mediaRecorderInstance.dispatchEvent('dataavailable', { data: mockBlob });

    expect(onRecordingComplete).toHaveBeenCalledWith(mockBlob);
  });
}); 
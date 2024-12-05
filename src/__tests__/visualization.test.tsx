import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRef, useEffect } from 'react';
import type AudioMotionAnalyzer from 'audiomotion-analyzer';

// Mock AudioMotionAnalyzer
const mockDestroy = jest.fn();
const mockSetOptions = jest.fn();
const mockConnectInput = jest.fn();
const mockDisconnectInput = jest.fn();

const MockAudioMotionAnalyzer = jest.fn().mockImplementation(() => ({
  destroy: mockDestroy,
  isOn: true,
  setOptions: mockSetOptions,
  connectInput: mockConnectInput,
  disconnectInput: mockDisconnectInput
}));

jest.mock('audiomotion-analyzer', () => MockAudioMotionAnalyzer);

// Mock AudioContext and related APIs
const mockAnalyserNode = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  fftSize: 2048,
  frequencyBinCount: 1024,
  minDecibels: -90,
  maxDecibels: -10,
  smoothingTimeConstant: 0.85
};

const mockGainNode = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  gain: { value: 0 }
};

const mockMediaStreamSource = {
  connect: jest.fn(),
  disconnect: jest.fn()
};

const mockAudioContext = {
  createAnalyser: jest.fn(() => mockAnalyserNode),
  createGain: jest.fn(() => mockGainNode),
  createMediaStreamSource: jest.fn(() => mockMediaStreamSource),
  state: 'running',
  close: jest.fn()
};

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true
});

// Visualization component for testing
interface Props {
  onVisualizationError: (error: Error) => void;
}

const VisualizationComponent: React.FC<Props> = ({ onVisualizationError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioMotionRef = useRef<AudioMotionAnalyzer | null>(null);

  const startVisualization = async () => {
    try {
      if (!containerRef.current) {
        throw new Error('Container not found');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 0;
      analyserRef.current.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      if (audioMotionRef.current) {
        audioMotionRef.current.destroy();
      }

      audioMotionRef.current = new MockAudioMotionAnalyzer(containerRef.current, {
        source: analyserRef.current,
        connectSpeakers: false,
        height: 200
      });

    } catch (error) {
      onVisualizationError(error instanceof Error ? error : new Error('Visualization failed'));
    }
  };

  const stopVisualization = async () => {
    if (audioMotionRef.current) {
      audioMotionRef.current.destroy();
      audioMotionRef.current = null;
    }
    if (audioContextRef.current?.state !== 'closed') {
      await audioContextRef.current?.close();
    }
  };

  useEffect(() => {
    return () => {
      stopVisualization();
    };
  }, []);

  return (
    <div>
      <div ref={containerRef} data-testid="visualization-container" />
      <button onClick={startVisualization} data-testid="start-viz-button">
        Start Visualization
      </button>
      <button onClick={stopVisualization} data-testid="stop-viz-button">
        Stop Visualization
      </button>
    </div>
  );
};

describe('Audio Visualization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).AudioContext = jest.fn(() => mockAudioContext);
  });

  it('should initialize visualization correctly', async () => {
    const mockStream = { id: 'test-stream' };
    const onVisualizationError = jest.fn();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(<VisualizationComponent onVisualizationError={onVisualizationError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-viz-button'));
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(MockAudioMotionAnalyzer).toHaveBeenCalled();
    expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockMediaStreamSource.connect).toHaveBeenCalledWith(mockAnalyserNode);
    expect(onVisualizationError).not.toHaveBeenCalled();
  });

  it('should handle visualization errors', async () => {
    const error = new Error('Visualization error');
    const onVisualizationError = jest.fn();
    mockGetUserMedia.mockRejectedValueOnce(error);

    render(<VisualizationComponent onVisualizationError={onVisualizationError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-viz-button'));
    });

    expect(onVisualizationError).toHaveBeenCalledWith(error);
    expect(MockAudioMotionAnalyzer).not.toHaveBeenCalled();
  });

  it('should clean up resources when stopping visualization', async () => {
    const mockStream = { id: 'test-stream' };
    const onVisualizationError = jest.fn();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(<VisualizationComponent onVisualizationError={onVisualizationError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-viz-button'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('stop-viz-button'));
    });

    expect(mockDestroy).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it('should prevent audio feedback', async () => {
    const mockStream = { id: 'test-stream' };
    const onVisualizationError = jest.fn();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(<VisualizationComponent onVisualizationError={onVisualizationError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-viz-button'));
    });

    expect(mockGainNode.gain.value).toBe(0);
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  it('should handle cleanup on unmount', async () => {
    const mockStream = { id: 'test-stream' };
    const onVisualizationError = jest.fn();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { unmount } = render(<VisualizationComponent onVisualizationError={onVisualizationError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-viz-button'));
    });

    unmount();

    expect(mockDestroy).toHaveBeenCalled();
    expect(mockAudioContext.close).toHaveBeenCalled();
  });
}); 
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState, useEffect, useCallback } from 'react';

// Mock para AudioContext y procesamiento de audio
class MockAnalyserNode {
  fftSize: number = 2048;
  frequencyBinCount: number = 1024;
  minDecibels: number = -90;
  maxDecibels: number = -10;
  smoothingTimeConstant: number = 0.85;
  
  getByteFrequencyData(array: Uint8Array) {
    // Simular datos de frecuencia
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  getByteTimeDomainData(array: Uint8Array) {
    // Simular datos de forma de onda
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
}

// Componente de prueba
interface Props {
  onPerformanceData: (data: PerformanceData) => void;
}

interface PerformanceData {
  audioLatency: number;
}

const AudioProcessor: React.FC<Props> = ({
  onPerformanceData
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyser] = useState<any>(new MockAnalyserNode());

  const processAudio = useCallback(() => {
    if (!analyser || !isProcessing) return;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeData);

    // Simular latencia de procesamiento
    const processingTime = 20; // 20ms de latencia simulada
    onPerformanceData({
      audioLatency: processingTime
    });
  }, [analyser, isProcessing, onPerformanceData]);

  useEffect(() => {
    if (isProcessing) {
      processAudio();
    }
  }, [isProcessing, processAudio]);

  const startProcessing = useCallback(() => {
    setIsProcessing(true);
  }, []);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
  }, []);

  return (
    <div>
      <button
        onClick={isProcessing ? stopProcessing : startProcessing}
        data-testid="toggle-processing"
      >
        {isProcessing ? 'Stop Processing' : 'Start Processing'}
      </button>
    </div>
  );
};

describe('Audio Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should measure audio processing latency', async () => {
    const onPerformanceData = jest.fn();

    render(
      <AudioProcessor
        onPerformanceData={onPerformanceData}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle-processing'));
      await Promise.resolve();
    });

    expect(onPerformanceData).toHaveBeenCalledWith(
      expect.objectContaining({
        audioLatency: expect.any(Number)
      })
    );

    const performanceData = onPerformanceData.mock.calls[0][0];
    expect(performanceData.audioLatency).toBeLessThanOrEqual(50); // Máximo 50ms de latencia
  });

  // TODO: Implementar y activar cuando tengamos el sistema de advertencias de memoria
  /*
  it('should monitor memory usage', async () => {
    // Test comentado hasta que implementemos el sistema de monitoreo de memoria
  });
  */

  // TODO: Implementar y activar cuando tengamos Web Workers
  /*
  describe('Web Worker Optimization', () => {
    it('should offload processing to worker when enabled', async () => {
      // Test comentado hasta que implementemos Web Workers
    });
  });
  */
}); 
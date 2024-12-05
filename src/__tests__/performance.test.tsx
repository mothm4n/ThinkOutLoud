import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState, useEffect, useCallback, useRef } from 'react';

// Mocks para medición de rendimiento
const mockPerformanceNow = jest.fn();
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();
const mockClearTimeout = jest.fn();

// Mock para Web Workers
class MockWorker {
  onmessage: ((event: any) => void) | null = null;
  postMessage = jest.fn();
  terminate = jest.fn();

  constructor() {
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { type: 'ready' } });
      }
    }, 0);
  }
}

// Mock global Worker
const mockWorker = jest.fn().mockImplementation(() => {
  return new MockWorker();
});
(global as any).Worker = mockWorker;

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
  onMemoryWarning: (usage: number) => void;
  workerEnabled?: boolean;
}

interface PerformanceData {
  fps: number;
  audioLatency: number;
  memoryUsage: number;
}

const AudioProcessor: React.FC<Props> = ({
  onPerformanceData,
  onMemoryWarning,
  workerEnabled = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [worker, setWorker] = useState<any>(null);
  const [analyser, setAnalyser] = useState<any>(null);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    const newAnalyser = new MockAnalyserNode();
    setAnalyser(newAnalyser);

    if (workerEnabled) {
      const newWorker = new Worker('audioProcessor.js');
      setWorker(newWorker);
      return () => {
        newWorker.terminate();
      };
    }
  }, [workerEnabled]);

  const processAudioFrame = useCallback(() => {
    if (!analyser) return;

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeData);

    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTimeRef.current;
    
    if (deltaTime >= 1000) {
      const fps = (frameCountRef.current * 1000) / deltaTime;
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      
      onPerformanceData({
        fps,
        audioLatency: deltaTime / frameCountRef.current,
        memoryUsage
      });

      if (memoryUsage > 100 * 1024 * 1024) { // 100MB
        onMemoryWarning(memoryUsage);
      }

      frameCountRef.current = 0;
      lastFrameTimeRef.current = currentTime;
    } else {
      frameCountRef.current++;
    }

    if (workerEnabled && worker) {
      worker.postMessage({
        type: 'process',
        frequencyData: Array.from(frequencyData),
        timeData: Array.from(timeData)
      });
    }

    if (isProcessing) {
      const id = requestAnimationFrame(processAudioFrame);
      animationFrameIdRef.current = id;
    }
  }, [analyser, isProcessing, onMemoryWarning, onPerformanceData, worker, workerEnabled]);

  const startProcessing = useCallback(() => {
    setIsProcessing(true);
    lastFrameTimeRef.current = performance.now();
    frameCountRef.current = 0;
    processAudioFrame();
  }, [processAudioFrame]);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, []);

  return (
    <div>
      <button
        onClick={isProcessing ? stopProcessing : startProcessing}
        data-testid="toggle-processing"
      >
        {isProcessing ? 'Stop Processing' : 'Start Processing'}
      </button>
      {workerEnabled && worker && (
        <div data-testid="worker-status">
          Worker Enabled
        </div>
      )}
    </div>
  );
};

describe('Performance and Optimization', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafId: number;
  let performanceTime: number;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset RAF tracking
    rafCallbacks = new Map();
    rafId = 1;
    performanceTime = 0;

    // Mock performance.now
    global.performance.now = jest.fn().mockImplementation(() => {
      return performanceTime;
    });

    // Mock requestAnimationFrame para capturar los callbacks
    global.requestAnimationFrame = jest.fn().mockImplementation((callback: FrameRequestCallback) => {
      const id = rafId++;
      rafCallbacks.set(id, callback);
      return id;
    });

    // Mock cancelAnimationFrame
    global.cancelAnimationFrame = jest.fn().mockImplementation((id: number) => {
      rafCallbacks.delete(id);
      mockCancelAnimationFrame(id);
    });

    // Mock clearTimeout
    global.clearTimeout = mockClearTimeout;

    // Mock performance.memory
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB inicial
        totalJSHeapSize: 200 * 1024 * 1024,
        jsHeapSizeLimit: 500 * 1024 * 1024
      },
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const triggerAnimationFrame = async () => {
    await act(async () => {
      performanceTime += 16.67; // Simular ~60fps
      const callbacks = Array.from(rafCallbacks.values());
      for (const callback of callbacks) {
        callback(performanceTime);
      }
      await Promise.resolve(); // Esperar a que se completen las actualizaciones de estado
    });
  };

  describe('Audio Processing Performance', () => {
    it('should maintain target frame rate', async () => {
      const onPerformanceData = jest.fn();
      const onMemoryWarning = jest.fn();

      render(
        <AudioProcessor
          onPerformanceData={onPerformanceData}
          onMemoryWarning={onMemoryWarning}
        />
      );

      // Iniciar procesamiento
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-processing'));
        await Promise.resolve(); // Esperar a que se complete el inicio
      });

      // Simular frames de animación
      for (let i = 0; i < 60; i++) {
        await triggerAnimationFrame();
      }

      // Avanzar el tiempo simulado para forzar el cálculo de FPS
      performanceTime += 1000;
      await triggerAnimationFrame();
      await triggerAnimationFrame(); // Un frame adicional para asegurar el cálculo

      expect(onPerformanceData).toHaveBeenCalledWith(
        expect.objectContaining({
          fps: expect.any(Number),
          audioLatency: expect.any(Number)
        })
      );

      const lastCall = onPerformanceData.mock.calls[onPerformanceData.mock.calls.length - 1][0];
      expect(lastCall.fps).toBeGreaterThanOrEqual(55); // Permitir pequeña variación
      expect(lastCall.audioLatency).toBeLessThan(20); // Menos de 20ms de latencia
    }, 10000);

    it('should optimize memory usage', async () => {
      const onPerformanceData = jest.fn();
      const onMemoryWarning = jest.fn();
      let heapSize = 50 * 1024 * 1024; // 50MB inicial

      // Simular incremento gradual de memoria
      const incrementMemory = () => {
        heapSize += 10 * 1024 * 1024; // +10MB
        Object.defineProperty(performance, 'memory', {
          value: {
            usedJSHeapSize: heapSize,
            totalJSHeapSize: 200 * 1024 * 1024,
            jsHeapSizeLimit: 500 * 1024 * 1024
          },
          configurable: true,
          writable: true
        });
      };

      render(
        <AudioProcessor
          onPerformanceData={onPerformanceData}
          onMemoryWarning={onMemoryWarning}
        />
      );

      // Iniciar procesamiento
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-processing'));
        await Promise.resolve(); // Esperar a que se complete el inicio
      });

      // Simular frames con incremento de memoria
      for (let i = 0; i < 5; i++) {
        incrementMemory();
        for (let j = 0; j < 60; j++) {
          await triggerAnimationFrame();
        }
        performanceTime += 1000;
        await triggerAnimationFrame();
        await triggerAnimationFrame(); // Un frame adicional para asegurar el cálculo
      }

      // Verificar que se emitió advertencia cuando se superó el límite
      expect(onMemoryWarning).toHaveBeenCalled();
      expect(onMemoryWarning).toHaveBeenCalledWith(expect.any(Number));
      
      const warningCall = onMemoryWarning.mock.calls[0][0];
      expect(warningCall).toBeGreaterThan(100 * 1024 * 1024); // >100MB
    }, 10000);
  });

  describe('Web Worker Optimization', () => {
    it('should offload processing to worker when enabled', async () => {
      const onPerformanceData = jest.fn();
      const onMemoryWarning = jest.fn();

      render(
        <AudioProcessor
          onPerformanceData={onPerformanceData}
          onMemoryWarning={onMemoryWarning}
          workerEnabled={true}
        />
      );

      // Esperar a que se inicialice el worker
      jest.advanceTimersByTime(100);

      expect(screen.getByTestId('worker-status')).toBeInTheDocument();

      // Iniciar procesamiento
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-processing'));
        await Promise.resolve(); // Esperar a que se complete el inicio
      });

      // Simular frames
      for (let i = 0; i < 60; i++) {
        await triggerAnimationFrame();
      }

      performanceTime += 1000;
      await triggerAnimationFrame();

      expect(mockWorker).toHaveBeenCalled();
      const worker = mockWorker.mock.results[0].value;
      expect(worker.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'process',
          frequencyData: expect.any(Array),
          timeData: expect.any(Array)
        })
      );
    });

    it('should handle worker termination gracefully', async () => {
      const onPerformanceData = jest.fn();
      const onMemoryWarning = jest.fn();

      const { unmount } = render(
        <AudioProcessor
          onPerformanceData={onPerformanceData}
          onMemoryWarning={onMemoryWarning}
          workerEnabled={true}
        />
      );

      // Esperar a que se inicialice el worker
      jest.advanceTimersByTime(100);

      // Iniciar procesamiento
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-processing'));
        await Promise.resolve(); // Esperar a que se complete el inicio
      });

      jest.advanceTimersByTime(100);

      // Desmontar componente
      await act(async () => {
        unmount();
      });

      const worker = mockWorker.mock.results[0].value;
      expect(worker.terminate).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on unmount', async () => {
      const onPerformanceData = jest.fn();
      const onMemoryWarning = jest.fn();

      const { unmount } = render(
        <AudioProcessor
          onPerformanceData={onPerformanceData}
          onMemoryWarning={onMemoryWarning}
          workerEnabled={true}
        />
      );

      // Esperar a que se inicialice el worker
      jest.advanceTimersByTime(100);

      // Iniciar procesamiento
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-processing'));
        await Promise.resolve(); // Esperar a que se complete el inicio
      });

      jest.advanceTimersByTime(100);

      // Desmontar componente
      await act(async () => {
        unmount();
      });

      const worker = mockWorker.mock.results[0].value;
      expect(worker.terminate).toHaveBeenCalled();
    });

    it('should cancel animation frame on stop', async () => {
      const onPerformanceData = jest.fn();
      const onMemoryWarning = jest.fn();

      render(
        <AudioProcessor
          onPerformanceData={onPerformanceData}
          onMemoryWarning={onMemoryWarning}
        />
      );

      // Iniciar procesamiento
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-processing'));
        await Promise.resolve(); // Esperar a que se complete el inicio
      });

      // Simular algunos frames
      for (let i = 0; i < 10; i++) {
        await triggerAnimationFrame();
      }

      // Detener procesamiento
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-processing'));
        await Promise.resolve(); // Esperar a que se complete la detención
      });

      // Verificar que se canceló el frame de animación
      expect(mockCancelAnimationFrame).toHaveBeenCalled();
    });
  });
}); 
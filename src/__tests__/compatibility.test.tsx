import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState, useEffect } from 'react';

// Mock para diferentes User Agents
const mockUserAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
};

// Mock para MediaRecorder
const mockIsTypeSupported = jest.fn();

interface Props {
  onCompatibilityCheck: (result: {
    isCompatible: boolean;
    issues: string[];
  }) => void;
}

const CompatibilityComponent: React.FC<Props> = ({ onCompatibilityCheck }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const checkCompatibility = async () => {
    setIsChecking(true);
    const newIssues: string[] = [];

    // Verificar soporte de MediaRecorder
    if (!('MediaRecorder' in window)) {
      newIssues.push('MediaRecorder API not supported');
    } else {
      // Verificar formatos soportados
      const formats = ['audio/webm', 'audio/webm;codecs=opus'];
      const supportedFormats = formats.filter(format => mockIsTypeSupported(format));
      if (supportedFormats.length === 0) {
        newIssues.push('No supported audio formats found');
      }
    }

    // Verificar soporte de AudioContext
    if (!('AudioContext' in window)) {
      newIssues.push('Web Audio API not supported');
    }

    // Verificar soporte de File System Access API
    if (!('showDirectoryPicker' in window)) {
      newIssues.push('File System Access API not supported');
    }

    setIssues(newIssues);
    setIsChecking(false);
    onCompatibilityCheck({
      isCompatible: newIssues.length === 0,
      issues: newIssues
    });
  };

  return (
    <div>
      <button
        onClick={checkCompatibility}
        disabled={isChecking}
        data-testid="check-compatibility"
      >
        Check Compatibility
      </button>
      {issues.length > 0 && (
        <ul data-testid="issues-list">
          {issues.map((issue, index) => (
            <li key={index} data-testid="issue-item">{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

describe('Compatibility and Performance', () => {
  const originalUserAgent = window.navigator.userAgent;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTypeSupported.mockReturnValue(true);
    (window as any).AudioContext = jest.fn();
    (window as any).showDirectoryPicker = jest.fn();
    (window as any).MediaRecorder = {
      isTypeSupported: mockIsTypeSupported
    };
  });

  afterEach(() => {
    // Restaurar User Agent original
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
  });

  describe('Browser Compatibility', () => {
    it.each(Object.entries(mockUserAgents))(
      'should check compatibility in %s',
      async (browser, userAgent) => {
        Object.defineProperty(window.navigator, 'userAgent', {
          value: userAgent,
          configurable: true
        });

        const onCompatibilityCheck = jest.fn();
        render(<CompatibilityComponent onCompatibilityCheck={onCompatibilityCheck} />);

        await act(async () => {
          fireEvent.click(screen.getByTestId('check-compatibility'));
          // Esperar a que se actualice el estado
          await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(onCompatibilityCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            isCompatible: true,
            issues: []
          })
        );
      }
    );

    it('should detect missing MediaRecorder support', async () => {
      const originalMediaRecorder = (window as any).MediaRecorder;
      delete (window as any).MediaRecorder;

      const onCompatibilityCheck = jest.fn();
      render(<CompatibilityComponent onCompatibilityCheck={onCompatibilityCheck} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('check-compatibility'));
        // Esperar a que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId('issues-list')).toBeInTheDocument();
      expect(screen.getByText('MediaRecorder API not supported')).toBeInTheDocument();

      // Restaurar MediaRecorder
      (window as any).MediaRecorder = originalMediaRecorder;
    });

    it('should detect unsupported audio formats', async () => {
      mockIsTypeSupported.mockReturnValue(false);

      const onCompatibilityCheck = jest.fn();
      render(<CompatibilityComponent onCompatibilityCheck={onCompatibilityCheck} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('check-compatibility'));
        // Esperar a que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getByTestId('issues-list')).toBeInTheDocument();
      expect(screen.getByText('No supported audio formats found')).toBeInTheDocument();
    });
  });

  describe('Performance Checks', () => {
    it('should verify WebM format support', async () => {
      mockIsTypeSupported.mockImplementation(format => format.includes('webm'));

      const onCompatibilityCheck = jest.fn();
      render(<CompatibilityComponent onCompatibilityCheck={onCompatibilityCheck} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('check-compatibility'));
        // Esperar a que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(mockIsTypeSupported).toHaveBeenCalledWith('audio/webm');
      expect(mockIsTypeSupported).toHaveBeenCalledWith('audio/webm;codecs=opus');
      expect(onCompatibilityCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          isCompatible: true
        })
      );
    });

    it('should handle multiple compatibility checks', async () => {
      const onCompatibilityCheck = jest.fn();
      render(<CompatibilityComponent onCompatibilityCheck={onCompatibilityCheck} />);

      // Primera verificación
      await act(async () => {
        fireEvent.click(screen.getByTestId('check-compatibility'));
        // Esperar a que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(onCompatibilityCheck).toHaveBeenCalledTimes(1);

      // Segunda verificación
      await act(async () => {
        fireEvent.click(screen.getByTestId('check-compatibility'));
        // Esperar a que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(onCompatibilityCheck).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('check-compatibility')).not.toBeDisabled();
    });
  });
}); 
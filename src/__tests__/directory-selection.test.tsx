import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState } from 'react';

// Mock showDirectoryPicker
const mockShowDirectoryPicker = jest.fn();
(global as any).showDirectoryPicker = mockShowDirectoryPicker;

interface Props {
  onDirectorySelect: (path: string) => void;
  onError: (error: Error) => void;
  onRecordingStart: () => void;
}

const DirectorySelectionComponent: React.FC<Props> = ({ 
  onDirectorySelect, 
  onError,
  onRecordingStart 
}) => {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSelectDirectory = async () => {
    try {
      const dirHandle = await mockShowDirectoryPicker();
      const path = dirHandle.name;
      setSelectedPath(path);
      onDirectorySelect(path);
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to select directory'));
    }
  };

  const handleStartRecording = () => {
    if (!selectedPath) {
      onError(new Error('Please select a directory first'));
      return;
    }
    setIsRecording(true);
    onRecordingStart();
  };

  return (
    <div>
      <button 
        onClick={handleSelectDirectory}
        data-testid="select-directory"
      >
        Select Directory
      </button>
      {selectedPath && (
        <div data-testid="selected-path">
          Selected: {selectedPath}
        </div>
      )}
      <button
        onClick={handleStartRecording}
        disabled={!selectedPath || isRecording}
        data-testid="start-recording"
      >
        Start Recording
      </button>
    </div>
  );
};

describe('Directory Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should select directory successfully', async () => {
    const onDirectorySelect = jest.fn();
    const onError = jest.fn();
    const onRecordingStart = jest.fn();
    const mockPath = 'test-directory';

    mockShowDirectoryPicker.mockResolvedValueOnce({
      name: mockPath
    });

    render(
      <DirectorySelectionComponent
        onDirectorySelect={onDirectorySelect}
        onError={onError}
        onRecordingStart={onRecordingStart}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-directory'));
    });

    expect(mockShowDirectoryPicker).toHaveBeenCalled();
    expect(onDirectorySelect).toHaveBeenCalledWith(mockPath);
    expect(screen.getByTestId('selected-path')).toHaveTextContent(mockPath);
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle directory selection errors', async () => {
    const onDirectorySelect = jest.fn();
    const onError = jest.fn();
    const onRecordingStart = jest.fn();
    const error = new Error('Permission denied');

    mockShowDirectoryPicker.mockRejectedValueOnce(error);

    render(
      <DirectorySelectionComponent
        onDirectorySelect={onDirectorySelect}
        onError={onError}
        onRecordingStart={onRecordingStart}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-directory'));
    });

    expect(mockShowDirectoryPicker).toHaveBeenCalled();
    expect(onDirectorySelect).not.toHaveBeenCalled();
    expect(screen.queryByTestId('selected-path')).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should prevent recording without directory selection', async () => {
    const onDirectorySelect = jest.fn();
    const onError = jest.fn();
    const onRecordingStart = jest.fn();

    render(
      <DirectorySelectionComponent
        onDirectorySelect={onDirectorySelect}
        onError={onError}
        onRecordingStart={onRecordingStart}
      />
    );

    const startButton = screen.getByTestId('start-recording');
    expect(startButton).toBeDisabled();

    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(onRecordingStart).not.toHaveBeenCalled();
  });

  it('should allow recording after directory selection', async () => {
    const onDirectorySelect = jest.fn();
    const onError = jest.fn();
    const onRecordingStart = jest.fn();
    const mockPath = 'test-directory';

    mockShowDirectoryPicker.mockResolvedValueOnce({
      name: mockPath
    });

    render(
      <DirectorySelectionComponent
        onDirectorySelect={onDirectorySelect}
        onError={onError}
        onRecordingStart={onRecordingStart}
      />
    );

    // Seleccionar directorio
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-directory'));
    });

    const startButton = screen.getByTestId('start-recording');
    expect(startButton).not.toBeDisabled();

    // Iniciar grabación
    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(onRecordingStart).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('should disable recording button while recording', async () => {
    const onDirectorySelect = jest.fn();
    const onError = jest.fn();
    const onRecordingStart = jest.fn();
    const mockPath = 'test-directory';

    mockShowDirectoryPicker.mockResolvedValueOnce({
      name: mockPath
    });

    render(
      <DirectorySelectionComponent
        onDirectorySelect={onDirectorySelect}
        onError={onError}
        onRecordingStart={onRecordingStart}
      />
    );

    // Seleccionar directorio
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-directory'));
    });

    // Iniciar grabación
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-recording'));
    });

    expect(screen.getByTestId('start-recording')).toBeDisabled();
  });
}); 
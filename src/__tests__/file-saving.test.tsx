import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState, useRef } from 'react';

// Mock showDirectoryPicker
const mockShowDirectoryPicker = jest.fn();
(global as any).showDirectoryPicker = mockShowDirectoryPicker;

// Mock FileSystemFileHandle
const mockCreateWritable = jest.fn();
const mockWrite = jest.fn();
const mockClose = jest.fn();

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

interface Props {
  onSaveComplete: (path: string) => void;
  onSaveError: (error: Error) => void;
}

const FileSavingComponent: React.FC<Props> = ({ onSaveComplete, onSaveError }) => {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [recording, setRecording] = useState<Blob | null>(null);

  const saveRecording = async () => {
    if (!recording) {
      onSaveError(new Error('No recording available'));
      return;
    }

    try {
      const fileName = `recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
      
      // Intenta guardar en la carpeta seleccionada
      try {
        const dirHandle = await showDirectoryPicker({
          startIn: selectedPath
        });
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(recording);
        await writable.close();
        onSaveComplete(selectedPath + '/' + fileName);
      } catch (error) {
        // Si falla el guardado en la carpeta, descarga el archivo
        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        onSaveComplete('downloads/' + fileName);
      }
    } catch (error) {
      onSaveError(error instanceof Error ? error : new Error('Failed to save recording'));
    }
  };

  const selectFolder = async () => {
    try {
      const dirHandle = await showDirectoryPicker();
      setSelectedPath(dirHandle.name);
    } catch (error) {
      onSaveError(error instanceof Error ? error : new Error('Failed to select folder'));
    }
  };

  // Simula una grabación para testing
  const simulateRecording = () => {
    const mockAudioData = new Blob(['test audio data'], { type: 'audio/webm' });
    setRecording(mockAudioData);
  };

  return (
    <div>
      <button onClick={selectFolder} data-testid="select-folder">
        Select Folder
      </button>
      <button onClick={simulateRecording} data-testid="simulate-recording">
        Simulate Recording
      </button>
      <button 
        onClick={saveRecording} 
        disabled={!recording}
        data-testid="save-recording"
      >
        Save Recording
      </button>
      {selectedPath && (
        <div data-testid="selected-path">Selected: {selectedPath}</div>
      )}
    </div>
  );
};

describe('File Saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should attempt to save file in selected directory first', async () => {
    const onSaveComplete = jest.fn();
    const onSaveError = jest.fn();
    const mockDirHandle = {
      name: 'test-folder',
      getFileHandle: jest.fn().mockResolvedValue({
        createWritable: jest.fn().mockResolvedValue({
          write: mockWrite,
          close: mockClose
        })
      })
    };

    mockShowDirectoryPicker
      .mockResolvedValueOnce(mockDirHandle) // Para la selección de carpeta
      .mockResolvedValueOnce(mockDirHandle); // Para el guardado

    render(<FileSavingComponent onSaveComplete={onSaveComplete} onSaveError={onSaveError} />);

    // Seleccionar carpeta
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-folder'));
    });

    // Simular grabación
    await act(async () => {
      fireEvent.click(screen.getByTestId('simulate-recording'));
    });

    // Intentar guardar
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-recording'));
    });

    expect(mockShowDirectoryPicker).toHaveBeenCalledTimes(2);
    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
    expect(onSaveComplete).toHaveBeenCalledWith(expect.stringContaining('test-folder'));
    expect(onSaveError).not.toHaveBeenCalled();
  });

  it('should fallback to download if directory saving fails', async () => {
    const onSaveComplete = jest.fn();
    const onSaveError = jest.fn();
    
    // Primera llamada exitosa (selección de carpeta), segunda falla (guardado)
    mockShowDirectoryPicker
      .mockResolvedValueOnce({ name: 'test-folder' })
      .mockRejectedValueOnce(new Error('Permission denied'));

    render(<FileSavingComponent onSaveComplete={onSaveComplete} onSaveError={onSaveError} />);

    // Seleccionar carpeta
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-folder'));
    });

    // Simular grabación
    await act(async () => {
      fireEvent.click(screen.getByTestId('simulate-recording'));
    });

    // Intentar guardar
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-recording'));
    });

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
    expect(onSaveComplete).toHaveBeenCalledWith(expect.stringContaining('downloads'));
    expect(onSaveError).not.toHaveBeenCalled();
  });

  it('should handle errors when no recording is available', async () => {
    const onSaveComplete = jest.fn();
    const onSaveError = jest.fn();

    render(<FileSavingComponent onSaveComplete={onSaveComplete} onSaveError={onSaveError} />);

    const saveButton = screen.getByTestId('save-recording');
    expect(saveButton).toBeDisabled();
    expect(onSaveComplete).not.toHaveBeenCalled();
  });

  it('should handle folder selection errors', async () => {
    const onSaveComplete = jest.fn();
    const onSaveError = jest.fn();
    
    mockShowDirectoryPicker.mockRejectedValueOnce(new Error('Permission denied'));

    render(<FileSavingComponent onSaveComplete={onSaveComplete} onSaveError={onSaveError} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-folder'));
    });

    expect(onSaveError).toHaveBeenCalledWith(expect.any(Error));
    expect(screen.queryByTestId('selected-path')).not.toBeInTheDocument();
  });
}); 
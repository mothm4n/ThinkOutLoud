import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useEffect } from 'react';

// Mock showDirectoryPicker
const mockShowDirectoryPicker = jest.fn();
global.showDirectoryPicker = mockShowDirectoryPicker;

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn()
};
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
});

// Mock component for testing permissions
const PermissionsComponent = ({ onFolderSelect, onStartRecording }) => {
  const handleFolderSelect = async () => {
    try {
      const directoryHandle = await showDirectoryPicker();
      onFolderSelect(directoryHandle);
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      onStartRecording(stream);
    } catch (error) {
      console.error('Failed to get microphone access:', error);
    }
  };

  return (
    <div>
      <button onClick={handleFolderSelect} data-testid="select-folder">
        Select Folder
      </button>
      <button onClick={handleStartRecording} data-testid="start-recording">
        Start Recording
      </button>
    </div>
  );
};

describe('Permissions Management', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Folder Selection', () => {
    it('should request folder permissions when selecting folder', async () => {
      const mockFolder = { name: 'test-folder' };
      mockShowDirectoryPicker.mockResolvedValueOnce(mockFolder);
      const onFolderSelect = jest.fn();
      
      render(<PermissionsComponent onFolderSelect={onFolderSelect} onStartRecording={() => {}} />);
      
      const button = screen.getByTestId('select-folder');
      await fireEvent.click(button);
      
      expect(mockShowDirectoryPicker).toHaveBeenCalled();
      expect(onFolderSelect).toHaveBeenCalledWith(mockFolder);
    });

    it('should handle folder permission denial', async () => {
      mockShowDirectoryPicker.mockRejectedValueOnce(new Error('Permission denied'));
      const onFolderSelect = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<PermissionsComponent onFolderSelect={onFolderSelect} onStartRecording={() => {}} />);
      
      const button = screen.getByTestId('select-folder');
      await fireEvent.click(button);
      
      expect(mockShowDirectoryPicker).toHaveBeenCalled();
      expect(onFolderSelect).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to select folder:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Microphone Permissions', () => {
    it('should request microphone permissions when starting recording', async () => {
      const mockStream = { id: 'test-stream' };
      mockMediaDevices.getUserMedia.mockResolvedValueOnce(mockStream);
      const onStartRecording = jest.fn();
      
      render(<PermissionsComponent onFolderSelect={() => {}} onStartRecording={onStartRecording} />);
      
      const button = screen.getByTestId('start-recording');
      await fireEvent.click(button);
      
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(onStartRecording).toHaveBeenCalledWith(mockStream);
    });

    it('should handle microphone permission denial', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValueOnce(new Error('Permission denied'));
      const onStartRecording = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<PermissionsComponent onFolderSelect={() => {}} onStartRecording={onStartRecording} />);
      
      const button = screen.getByTestId('start-recording');
      await fireEvent.click(button);
      
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(onStartRecording).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get microphone access:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
}); 
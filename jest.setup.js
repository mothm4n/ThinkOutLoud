// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the AudioContext and MediaRecorder
beforeAll(() => {
  global.AudioContext = jest.fn().mockImplementation(() => ({
    createMediaStreamDestination: jest.fn(),
    createMediaStreamSource: jest.fn(),
    createAnalyser: jest.fn(),
  }));

  global.MediaRecorder = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    state: 'inactive',
    addEventListener: jest.fn(),
  }));
}); 
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Test Setup', () => {
  it('should work properly', () => {
    render(<div data-testid="test-element">Test Setup Working</div>);
    expect(screen.getByTestId('test-element')).toBeInTheDocument();
    expect(screen.getByText('Test Setup Working')).toBeVisible();
  });

  it('should have mocked AudioContext', () => {
    expect(global.AudioContext).toBeDefined();
    const audioContext = new AudioContext();
    expect(audioContext.createAnalyser).toBeDefined();
  });

  it('should have mocked MediaRecorder', () => {
    expect(global.MediaRecorder).toBeDefined();
    const mediaRecorder = new MediaRecorder({} as MediaStream);
    expect(mediaRecorder.start).toBeDefined();
    expect(mediaRecorder.state).toBe('inactive');
  });
}); 
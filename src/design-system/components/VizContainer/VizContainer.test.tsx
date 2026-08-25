import { render } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { VizContainer } from './VizContainer';

const observe = vi.fn();
const disconnect = vi.fn();

class StubResizeObserver {
  observe = observe;
  unobserve = vi.fn();
  disconnect = disconnect;
}

beforeEach(() => {
  observe.mockClear();
  disconnect.mockClear();
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
});

afterEach(() => vi.unstubAllGlobals());

describe('VizContainer', () => {
  it('disconnects its observer on unmount', () => {
    const { unmount } = render(<VizContainer>chart</VizContainer>);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();

    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('keeps one observer across re-renders', () => {
    const { rerender } = render(<VizContainer title="A">chart</VizContainer>);
    rerender(<VizContainer title="B">chart</VizContainer>);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
  });
});

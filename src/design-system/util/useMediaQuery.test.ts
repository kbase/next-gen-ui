import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';
import { setMedia } from '../../test/setup';

describe('useMediaQuery', () => {
  it('reads the query', () => {
    const { result } = renderHook(() => useMediaQuery('(any-pointer: fine)'));
    expect(result.current).toBe(true);
  });

  it('re-renders when the query changes', () => {
    const { result } = renderHook(() => useMediaQuery('(any-pointer: fine)'));
    expect(result.current).toBe(true);

    act(() => setMedia('(any-pointer: fine)', false));

    expect(result.current).toBe(false);
  });

  it('reads false for a query nothing answers', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 900px)'));
    expect(result.current).toBe(false);
  });
});

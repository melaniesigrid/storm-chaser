import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeProvider';

/**
 * Single read point for theme state.
 *
 * Every colour, font family and radius in the app resolves through here, so no
 * screen ever knows which theme is active: it asks for a named token and gets
 * whatever the current theme defines. That is what makes a third theme a data
 * change rather than a UI change.
 */
export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used inside a ThemeProvider');
  }

  return value;
}

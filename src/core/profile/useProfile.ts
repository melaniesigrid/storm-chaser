import { useContext } from 'react';

import { ProfileContext, type ProfileContextValue } from './ProfileProvider';

/** Single read point for the chaser's own details. */
export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);

  if (!value) {
    throw new Error('useProfile must be used inside a ProfileProvider');
  }

  return value;
}

import {useCallback, useMemo} from 'react';
import {useAppContext} from '../../../context/AppContext';
import {
  ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY,
  useRoteiroTypographyState,
  type RoteiroTypography,
} from './roteiroTypography';

/** Tipografia do roteiro ligada à preferência da conta (vale em todos os roteiros). */
export function useRoteiroTypography(userId: string | null | undefined) {
  const {state, dispatch} = useAppContext();
  const setPreference = useCallback((value: RoteiroTypography) => {
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {key: ROTEIRO_TYPOGRAPHY_PREFERENCE_KEY, value},
    });
  }, [dispatch]);
  const store = useMemo(() => ({
    preferences: state.preferences ?? {},
    setPreference,
  }), [setPreference, state.preferences]);
  return useRoteiroTypographyState(userId, store);
}

// Whether balances are shown or masked, everywhere at once. A preference,
// not a secret: it lives in AsyncStorage and survives restarts, so a member
// who hides their balances on the bus does not see them flash on the next
// open.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'balances.hidden';

interface BalanceVisibility {
  hidden: boolean;
  toggle: () => void;
}

const Context = createContext<BalanceVisibility>({ hidden: false, toggle: () => undefined });

export function BalanceVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (raw === '1') setHidden(true);
      })
      .catch(() => undefined);
  }, []);

  const toggle = useCallback(() => {
    setHidden(current => {
      const next = !current;
      AsyncStorage.setItem(KEY, next ? '1' : '0').catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBalanceVisibility(): BalanceVisibility {
  return useContext(Context);
}

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const HeaderActionsContext = createContext();

export const HeaderActionsProvider = ({ children }) => {
  const [actions, setActions] = useState(null);

  const registerActions = useCallback((newActions) => {
    setActions(newActions);
    return () => setActions(null);
  }, []);

  const value = useMemo(() => ({ actions, registerActions }), [actions, registerActions]);

  return (
    <HeaderActionsContext.Provider value={value}>
      {children}
    </HeaderActionsContext.Provider>
  );
};

export const useHeaderActions = (newActions) => {
  const context = useContext(HeaderActionsContext);
  if (!context) {
    throw new Error('useHeaderActions must be used within a HeaderActionsProvider');
  }

  const { registerActions } = context;

  useEffect(() => {
    if (newActions) {
      return registerActions(newActions);
    }
  }, [newActions, registerActions]);

  return context;
};

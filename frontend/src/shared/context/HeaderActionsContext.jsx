import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const HeaderActionsStateContext = createContext();
const HeaderActionsApiContext = createContext();

export const HeaderActionsProvider = ({ children }) => {
  const [actions, setActions] = useState(null);

  const registerActions = useCallback((newActions) => {
    setActions(newActions);
    return () => setActions(null);
  }, []);

  const stateValue = useMemo(() => ({ actions }), [actions]);
  const apiValue = useMemo(() => ({ registerActions }), [registerActions]);

  return (
    <HeaderActionsStateContext.Provider value={stateValue}>
      <HeaderActionsApiContext.Provider value={apiValue}>
        {children}
      </HeaderActionsApiContext.Provider>
    </HeaderActionsStateContext.Provider>
  );
};

export const useHeaderActions = () => {
  const context = useContext(HeaderActionsStateContext);
  if (!context) {
    throw new Error('useHeaderActions must be used within a HeaderActionsProvider');
  }
  return context;
};

export const useRegisterHeaderActions = (newActions) => {
  const context = useContext(HeaderActionsApiContext);
  if (!context) {
    throw new Error('useRegisterHeaderActions must be used within a HeaderActionsProvider');
  }
  const { registerActions } = context;

  useEffect(() => {
    if (newActions) {
      return registerActions(newActions);
    }
  }, [newActions, registerActions]);
};

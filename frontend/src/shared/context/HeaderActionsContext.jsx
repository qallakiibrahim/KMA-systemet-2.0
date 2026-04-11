import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

const HeaderActionsStateContext = createContext();
const HeaderActionsApiContext = createContext();

export const HeaderActionsProvider = ({ children }) => {
  const [actions, setActions] = useState(null);
  const [centerTools, setCenterTools] = useState(null);
  const [rightPanel, setRightPanel] = useState(null);

  const registerActions = useCallback((newActions) => {
    setActions(newActions);
    return () => setActions(null);
  }, []);

  const registerCenterTools = useCallback((newTools) => {
    setCenterTools(newTools);
    return () => setCenterTools(null);
  }, []);

  const registerRightPanel = useCallback((newPanel) => {
    setRightPanel(newPanel);
    return () => setRightPanel(null);
  }, []);

  const stateValue = useMemo(() => ({ actions, centerTools, rightPanel }), [actions, centerTools, rightPanel]);
  const apiValue = useMemo(() => ({ registerActions, registerCenterTools, registerRightPanel }), [registerActions, registerCenterTools, registerRightPanel]);

  const memoizedChildren = useMemo(() => children, [children]);

  return (
    <HeaderActionsStateContext.Provider value={stateValue}>
      <HeaderActionsApiContext.Provider value={apiValue}>
        {memoizedChildren}
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
    return registerActions(newActions);
  }, [newActions, registerActions]);
};

export const useRegisterCenterTools = (newTools) => {
  const context = useContext(HeaderActionsApiContext);
  if (!context) {
    throw new Error('useRegisterCenterTools must be used within a HeaderActionsProvider');
  }
  const { registerCenterTools } = context;

  useEffect(() => {
    return registerCenterTools(newTools);
  }, [newTools, registerCenterTools]);
};

export const useRegisterRightPanel = (newPanel) => {
  const context = useContext(HeaderActionsApiContext);
  if (!context) {
    throw new Error('useRegisterRightPanel must be used within a HeaderActionsProvider');
  }
  const { registerRightPanel } = context;

  useEffect(() => {
    return registerRightPanel(newPanel);
  }, [newPanel, registerRightPanel]);
};

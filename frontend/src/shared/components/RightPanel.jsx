import React from 'react';
import { X } from 'lucide-react';
import { useHeaderActions } from '../context/HeaderActionsContext';
import '../styles/RightPanel.css';

const RightPanel = () => {
  const { rightPanel } = useHeaderActions();

  if (!rightPanel) return null;

  return (
    <aside className="right-panel">
      <div className="right-panel-content">
        {rightPanel}
      </div>
    </aside>
  );
};

export default RightPanel;

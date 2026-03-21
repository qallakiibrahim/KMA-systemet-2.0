import React from 'react';
import { useDeadlines } from '../api/useDeadlines';

const DeadlineChecker = () => {
  // The hook handles the logic on mount and interval
  useDeadlines();
  return null; // This component doesn't render anything
};

export default DeadlineChecker;

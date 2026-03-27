import React from 'react';
import { Key, ExternalLink } from 'lucide-react';
import './KeySelectionOverlay.css';

const KeySelectionOverlay = ({ onKeySelected }) => {
  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        // After opening the dialog, we assume the user might have selected a key
        // We notify the parent to re-check
        onKeySelected();
      } catch (error) {
        console.error('Error opening key dialog:', error);
      }
    } else {
      alert('AI Studio API Key dialog is not available in this environment.');
    }
  };

  return (
    <div className="key-selection-overlay">
      <div className="key-selection-content">
        <div className="key-icon-wrapper">
          <Key size={48} />
        </div>
        <h2>Anslut AI-nyckel</h2>
        <p>
          För att använda AI-funktionerna i SafeQMS behöver du ansluta din egen Gemini API-nyckel från Google Cloud.
        </p>
        
        <div className="key-info-box">
          <p>
            Detta säkerställer att du har full kontroll över dina kostnader och din data.
          </p>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="billing-link"
          >
            Läs mer om prissättning <ExternalLink size={14} />
          </a>
        </div>

        <button className="select-key-btn" onClick={handleOpenKeyDialog}>
          Välj API-nyckel
        </button>
        
        <p className="key-footer-note">
          Du behöver bara göra detta en gång. Nyckeln sparas säkert av plattformen.
        </p>
      </div>
    </div>
  );
};

export default KeySelectionOverlay;

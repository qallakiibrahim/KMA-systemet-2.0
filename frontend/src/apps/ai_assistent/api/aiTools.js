import { db } from '../../../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy
} from 'firebase/firestore';

/**
 * Tool implementations for the AI Assistant to access Firestore data.
 */

export const aiToolsImplementation = {
  get_processes: async ({ company_id }) => {
    console.log('AI Tool: get_processes', { company_id });
    const collRef = collection(db, 'processes');
    const q = query(collRef, where('company_id', '==', company_id), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  get_risks: async ({ company_id }) => {
    console.log('AI Tool: get_risks', { company_id });
    const collRef = collection(db, 'risker');
    const q = query(collRef, where('company_id', '==', company_id), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  get_tasks: async ({ company_id }) => {
    console.log('AI Tool: get_tasks', { company_id });
    const collRef = collection(db, 'tasks');
    const q = query(collRef, where('company_id', '==', company_id), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  get_documents: async ({ company_id }) => {
    console.log('AI Tool: get_documents', { company_id });
    const collRef = collection(db, 'documents');
    const q = query(collRef, where('company_id', '==', company_id), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  get_calendar_events: async ({ company_id }) => {
    console.log('AI Tool: get_calendar_events', { company_id });
    const collRef = collection(db, 'calendar_events');
    const q = query(collRef, where('company_id', '==', company_id), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  get_avvikelser: async ({ company_id }) => {
    console.log('AI Tool: get_avvikelser', { company_id });
    const collRef = collection(db, 'avvikelser');
    const q = query(collRef, where('company_id', '==', company_id), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

/**
 * Tool declarations for the Gemini API.
 */
export const aiToolDeclarations = [
  {
    name: 'get_processes',
    description: 'Hämtar alla processer för användarens företag.',
    parameters: {
      type: 'OBJECT',
      properties: {
        company_id: {
          type: 'STRING',
          description: 'Företagets ID (hämtas automatiskt från användarprofilen).'
        }
      },
      required: ['company_id']
    }
  },
  {
    name: 'get_risks',
    description: 'Hämtar alla risker för användarens företag.',
    parameters: {
      type: 'OBJECT',
      properties: {
        company_id: {
          type: 'STRING',
          description: 'Företagets ID.'
        }
      },
      required: ['company_id']
    }
  },
  {
    name: 'get_tasks',
    description: 'Hämtar alla uppgifter för användarens företag.',
    parameters: {
      type: 'OBJECT',
      properties: {
        company_id: {
          type: 'STRING',
          description: 'Företagets ID.'
        }
      },
      required: ['company_id']
    }
  },
  {
    name: 'get_documents',
    description: 'Hämtar alla dokument för användarens företag.',
    parameters: {
      type: 'OBJECT',
      properties: {
        company_id: {
          type: 'STRING',
          description: 'Företagets ID.'
        }
      },
      required: ['company_id']
    }
  },
  {
    name: 'get_calendar_events',
    description: 'Hämtar alla kalenderhändelser för användarens företag.',
    parameters: {
      type: 'OBJECT',
      properties: {
        company_id: {
          type: 'STRING',
          description: 'Företagets ID.'
        }
      },
      required: ['company_id']
    }
  },
  {
    name: 'get_avvikelser',
    description: 'Hämtar alla avvikelser (icke-överensstämmelser) för användarens företag.',
    parameters: {
      type: 'OBJECT',
      properties: {
        company_id: {
          type: 'STRING',
          description: 'Företagets ID.'
        }
      },
      required: ['company_id']
    }
  }
];

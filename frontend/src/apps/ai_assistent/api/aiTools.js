import { supabase } from '../../../supabase';

/**
 * Tool implementations for the AI Assistant to access Supabase data.
 */

export const aiToolsImplementation = {
  get_processes: async ({ company_id }) => {
    console.log('AI Tool: get_processes', { company_id });
    const { data, error } = await supabase
      .from('processes')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  get_risks: async ({ company_id }) => {
    console.log('AI Tool: get_risks', { company_id });
    const { data, error } = await supabase
      .from('risks')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  get_tasks: async ({ company_id }) => {
    console.log('AI Tool: get_tasks', { company_id });
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  get_documents: async ({ company_id }) => {
    console.log('AI Tool: get_documents', { company_id });
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  get_calendar_events: async ({ company_id }) => {
    console.log('AI Tool: get_calendar_events', { company_id });
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('company_id', company_id)
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  get_avvikelser: async ({ company_id }) => {
    console.log('AI Tool: get_avvikelser', { company_id });
    const { data, error } = await supabase
      .from('avvikelser')
      .select('*')
      .eq('company_id', company_id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
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

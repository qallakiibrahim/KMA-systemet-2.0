import { supabase } from '../../supabase';

/**
 * Skickar ett e-postmeddelande genom att lägga till ett dokument i 'mail'-tabellen.
 * Detta kräver att man sätter upp en Edge Function eller extern tjänst (t.ex. Resend)
 * som lyssnar på ändringar i denna tabell.
 * 
 * @param {string} toEmail - Mottagarens e-postadress
 * @param {string} subject - Ämnesrad
 * @param {string} htmlContent - Innehållet i mailet (HTML-format)
 */
export const sendEmailNotification = async (toEmail, subject, htmlContent) => {
  if (!toEmail) return;

  try {
    const { error } = await supabase
      .from('mail')
      .insert([{
        to: toEmail,
        message: {
          subject: subject,
          html: htmlContent,
        }
      }]);
      
    if (error) throw error;
    console.log('E-postnotis köad för skickning till:', toEmail);
  } catch (error) {
    console.error('Kunde inte köa e-postnotis:', error);
  }
};

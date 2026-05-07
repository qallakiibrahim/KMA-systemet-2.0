import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Skickar ett e-postmeddelande genom att lägga till ett dokument i 'mail'-kollektionen.
 * Detta fungerar bäst med Firebase-tillägget "Trigger Email from Firestore".
 * 
 * @param {string} toEmail - Mottagarens e-postadress
 * @param {string} subject - Ämnesrad
 * @param {string} htmlContent - Innehållet i mailet (HTML-format)
 */
export const sendEmailNotification = async (toEmail, subject, htmlContent) => {
  if (!toEmail) return;

  try {
    await addDoc(collection(db, 'mail'), {
      to: toEmail,
      message: {
        subject: subject,
        html: htmlContent,
      },
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
      
    console.log('E-postnotis köad för skickning till:', toEmail);
  } catch (error) {
    console.error('Kunde inte köa e-postnotis:', error);
  }
};

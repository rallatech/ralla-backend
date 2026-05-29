import admin from 'firebase-admin';

let db = null;

const initializeFirebase = () => {
  if (!admin.apps.length) {
    // Handle private key - it might come with \n escape sequences or actual newlines
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Trim only leading/trailing whitespace but preserve internal structure
    privateKey = privateKey.trim();
    
    // Trim all other environment variables to remove any trailing whitespace/newlines
    const serviceAccount = {
      type: "service_account",
      project_id: (process.env.FIREBASE_PROJECT_ID || '').trim(),
      private_key_id: (process.env.FIREBASE_PRIVATE_KEY_ID || '').trim(),
      privateKey: privateKey
      client_email: (process.env.FIREBASE_CLIENT_EMAIL || '').trim(),
      client_id: (process.env.FIREBASE_CLIENT_ID || '').trim(),
      auth_uri: (process.env.FIREBASE_AUTH_URI || '').trim(),
      token_uri: (process.env.FIREBASE_TOKEN_URI || '').trim(),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  
  if (!db) {
    db = admin.firestore();
  }
  return db;
};

export default initializeFirebase;

// Configurazione Firebase (Console Firebase → Impostazioni progetto → Le tue app → Web).
// Questi valori sono pubblici per design: la sicurezza è data dai provider abilitati,
// dai domini autorizzati e (se usati) dalle regole di Firestore, non dalla segretezza della chiave.
export const firebaseConfig = {
    apiKey: "AIzaSyAQpf7efo2K-2biS_M2vAEGQL8hSSVU7xE",
    authDomain: "app-quiz-4d93b.firebaseapp.com",
    projectId: "app-quiz-4d93b",
    storageBucket: "app-quiz-4d93b.firebasestorage.app",
    messagingSenderId: "462622793680",
    appId: "1:462622793680:web:0e4f2e73c0907b1a41e3d5"
};

// Provider di accesso mostrati nella schermata di login.
// Ogni provider va abilitato anche in Firebase Console → Authentication → Sign-in method.
export const authProviders = {
    google: true,
    facebook: true,
    email: true
};

// Opzionale: limita l'accesso a specifici indirizzi email (vuoto = chiunque si autentichi).
// Nota: è un controllo lato client, utile per scoraggiare, non una protezione assoluta.
export const allowedEmails = [];

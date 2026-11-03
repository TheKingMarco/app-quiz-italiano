# Quiz Master

Web app statica (GitHub Pages) per allenarsi sui test di amministrazione.

## Struttura

| File | Contenuto |
|------|-----------|
| `index.html` | Markup di tutte le schermate e delle modali |
| `style.css` | Stili, tema chiaro/scuro e animazioni |
| `app.js` | Logica dell'app (modulo ES): login, quiz, storico, errori |
| `firebase-config.js` | Configurazione Firebase e provider di accesso abilitati |
| `questions.js` | Database delle domande (`window.QUIZ_DATABASE`), caricato solo dopo il login |

## Funzionalità

- Accesso con Google, Facebook o email/password (Firebase Authentication)
- Modalità **Allenamento** (correzione immediata) e **Simulazione esame** (risposte modificabili, esito finale)
- Navigazione avanti/indietro, panoramica numerata delle domande con salto diretto, domande "segnate"
- Anteprima live dell'andamento: risposte date, corrette, errate, percentuale, barra di avanzamento
- Timer con tempo limite opzionale, numero di domande configurabile, mescolamento risposte
- Salvataggio automatico del quiz in corso e ripresa dalla home
- Revisione finale con filtri (errate, saltate, segnate) e "Ripeti solo errori"
- Banca degli errori per utente con ripasso dedicato
- Storico con grafico dell'andamento e miglior risultato per materia
- Ricerca materie, tema chiaro/scuro, scorciatoie da tastiera (1–4 / A–D, ← →, F)

## Configurazione Firebase

1. [Firebase Console](https://console.firebase.google.com/) → progetto `app-quiz-4d93b` (o uno nuovo, aggiornando `firebase-config.js`).
2. **Authentication → Sign-in method**: abilita *Google*, *Email/Password* e *Facebook*.
   - Facebook: crea un'app su [developers.facebook.com](https://developers.facebook.com/), copia App ID e App Secret in Firebase e incolla l'URI di redirect OAuth fornito da Firebase (`https://app-quiz-4d93b.firebaseapp.com/__/auth/handler`) nelle impostazioni di *Facebook Login* dell'app.
3. **Authentication → Settings → Authorized domains**: aggiungi il dominio GitHub Pages (es. `thekingmarco.github.io`) ed eventuali domini personalizzati.
4. Per disattivare un provider imposta `false` in `authProviders`; per limitare l'accesso a utenti specifici compila `allowedEmails`.

## Nota sulla sicurezza

GitHub Pages serve solo file statici: il login impedisce l'uso dell'app a chi non è autenticato, ma `questions.js` resta scaricabile da chi conosce l'URL diretto. Per proteggere davvero le domande occorre spostarle su un backend con controllo di accesso (es. Firestore con regole `allow read: if request.auth != null`).

## Sviluppo locale

```bash
python3 -m http.server 8000
# apri http://localhost:8000 (localhost è già tra i domini autorizzati di Firebase)
```

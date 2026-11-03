import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth, onAuthStateChanged, signOut,
    GoogleAuthProvider, FacebookAuthProvider,
    signInWithPopup, signInWithRedirect, getRedirectResult,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    sendPasswordResetEmail, sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { firebaseConfig, authProviders, allowedEmails } from './firebase-config.js';

// =====================================================================
// COSTANTI E UTILITÀ
// =====================================================================
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const PRACTICE_AUTO_ADVANCE_MS = 900;

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

function percentColor(pct) {
    if (pct >= 80) return 'var(--green)';
    if (pct >= 60) return 'var(--amber)';
    return 'var(--red)';
}

// localStorage protetto: in navigazione privata può lanciare eccezioni
const storage = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignorato */ }
    },
    remove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignorato */ }
    }
};

let toastTimer;
function toast(message) {
    const t = $('toast');
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function bump(node) {
    node.classList.remove('bump');
    void node.offsetWidth; // riavvia l'animazione
    node.classList.add('bump');
}

// =====================================================================
// NAVIGAZIONE TRA SCHERMATE
// =====================================================================
const screens = {
    loading: $('loading-screen'),
    auth: $('auth-screen'),
    home: $('home-screen'),
    subject: $('subject-screen'),
    quiz: $('quiz-screen'),
    end: $('end-screen'),
    history: $('history-screen')
};
let currentScreen = 'loading';

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    currentScreen = name;
    $('top-bar').classList.toggle('hidden', name === 'auth' || name === 'loading');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================================================
// TEMA
// =====================================================================
$('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('qm-theme', dark ? 'dark' : 'light'); } catch (e) { /* ignorato */ }
});

// =====================================================================
// MODALI
// =====================================================================
function openModal(id) {
    $(id).classList.remove('hidden');
}
function closeModal(id) {
    $(id).classList.add('hidden');
}
function isModalOpen() {
    return document.querySelector('.modal:not(.hidden)') !== null;
}
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) closeModal(modal.id);
    });
});

let confirmHandler = null;
function confirmDialog(title, text, okLabel, onConfirm) {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = text;
    $('confirm-ok-btn').textContent = okLabel;
    confirmHandler = onConfirm;
    openModal('confirm-modal');
}
$('confirm-ok-btn').addEventListener('click', () => {
    closeModal('confirm-modal');
    if (confirmHandler) confirmHandler();
    confirmHandler = null;
});

// =====================================================================
// AUTENTICAZIONE (Firebase)
// =====================================================================
let auth = null;
let currentUser = null;
let isRegisterMode = false;

const AUTH_ERRORS = {
    'auth/popup-closed-by-user': 'Accesso annullato.',
    'auth/cancelled-popup-request': 'Accesso annullato.',
    'auth/account-exists-with-different-credential': 'Esiste già un account con questa email ma con un altro metodo di accesso. Usa il metodo con cui ti sei registrato.',
    'auth/invalid-credential': 'Email o password non corrette.',
    'auth/invalid-email': 'Indirizzo email non valido.',
    'auth/user-disabled': 'Questo account è stato disabilitato.',
    'auth/user-not-found': 'Nessun account con questa email.',
    'auth/wrong-password': 'Email o password non corrette.',
    'auth/email-already-in-use': 'Email già registrata: accedi invece di registrarti.',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri.',
    'auth/too-many-requests': 'Troppi tentativi. Riprova tra qualche minuto.',
    'auth/network-request-failed': 'Errore di rete. Controlla la connessione.',
    'auth/unauthorized-domain': 'Dominio non autorizzato: aggiungilo in Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'Metodo di accesso non abilitato in Firebase Console.'
};

function showAuthMessage(message, isInfo = false) {
    const box = $('auth-error');
    box.textContent = message;
    box.classList.toggle('info', isInfo);
    box.classList.remove('hidden');
}

function handleAuthError(error) {
    console.error('Auth error:', error);
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
    showAuthMessage(AUTH_ERRORS[error.code] || 'Errore durante l\'accesso. Riprova.');
}

function setAuthBusy(busy) {
    document.querySelectorAll('#auth-screen button').forEach(b => { b.disabled = busy; });
}

async function signInWithProvider(providerName) {
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
    if (providerName === 'google') provider.setCustomParameters({ prompt: 'select_account' });
    $('auth-error').classList.add('hidden');
    setAuthBusy(true);
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
            await signInWithRedirect(auth, provider);
            return;
        }
        handleAuthError(error);
    } finally {
        setAuthBusy(false);
    }
}

function initAuthUI() {
    $('google-signin-btn').classList.toggle('hidden', !authProviders.google);
    $('facebook-signin-btn').classList.toggle('hidden', !authProviders.facebook);
    $('email-auth-block').classList.toggle('hidden', !authProviders.email);
    if (!authProviders.google && !authProviders.facebook) {
        $('email-auth-block').querySelector('.divider').classList.add('hidden');
    }

    $('google-signin-btn').addEventListener('click', () => signInWithProvider('google'));
    $('facebook-signin-btn').addEventListener('click', () => signInWithProvider('facebook'));

    $('toggle-register-btn').addEventListener('click', () => {
        isRegisterMode = !isRegisterMode;
        $('email-submit-btn').textContent = isRegisterMode ? 'Crea account' : 'Accedi';
        $('toggle-register-btn').textContent = isRegisterMode ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati';
        $('password-input').autocomplete = isRegisterMode ? 'new-password' : 'current-password';
        $('auth-error').classList.add('hidden');
    });

    $('email-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('email-input').value.trim();
        const password = $('password-input').value;
        if (!email || password.length < 6) {
            showAuthMessage('Inserisci un\'email valida e una password di almeno 6 caratteri.');
            return;
        }
        $('auth-error').classList.add('hidden');
        setAuthBusy(true);
        try {
            if (isRegisterMode) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                sendEmailVerification(cred.user).catch(() => { /* non bloccante */ });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            handleAuthError(error);
        } finally {
            setAuthBusy(false);
        }
    });

    $('reset-password-btn').addEventListener('click', async () => {
        const email = $('email-input').value.trim();
        if (!email) {
            showAuthMessage('Inserisci la tua email nel campo sopra, poi premi di nuovo "Password dimenticata?".');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            showAuthMessage('Se l\'email è registrata riceverai un link per reimpostare la password.', true);
        } catch (error) {
            handleAuthError(error);
        }
    });
}

function isEmailAllowed(user) {
    if (!allowedEmails || allowedEmails.length === 0) return true;
    const email = (user.email || '').toLowerCase();
    return allowedEmails.map(e => e.toLowerCase()).includes(email);
}

// Menu utente
$('user-menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = $('user-menu');
    menu.classList.toggle('hidden');
    $('user-menu-btn').setAttribute('aria-expanded', String(!menu.classList.contains('hidden')));
});
document.addEventListener('click', () => $('user-menu').classList.add('hidden'));
$('signout-btn').addEventListener('click', () => {
    stopTimer();
    saveSession();
    signOut(auth);
});

function renderUser(user) {
    const name = user.displayName || (user.email ? user.email.split('@')[0] : 'Utente');
    $('user-name').textContent = name;
    $('user-email').textContent = user.email || '';
    $('welcome-name').textContent = name;
    const avatar = $('user-avatar');
    if (user.photoURL) {
        avatar.src = user.photoURL;
    } else {
        const initial = encodeURIComponent(name.charAt(0).toUpperCase());
        avatar.src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='16' fill='%236366f1'/><text x='16' y='21' font-size='15' font-family='sans-serif' font-weight='700' text-anchor='middle' fill='white'>${initial}</text></svg>`;
    }
}

// =====================================================================
// CARICAMENTO DOMANDE (solo dopo il login)
// =====================================================================
let quizDatabase = null;
let databasePromise = null;

function loadQuestions() {
    if (quizDatabase) return Promise.resolve(quizDatabase);
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'questions.js';
        script.onload = () => {
            quizDatabase = window.QUIZ_DATABASE;
            delete window.QUIZ_DATABASE;
            resolve(quizDatabase);
        };
        script.onerror = () => {
            databasePromise = null;
            reject(new Error('Impossibile caricare le domande'));
        };
        document.body.appendChild(script);
    });
    return databasePromise;
}

// =====================================================================
// DATI UTENTE (storico, errori, sessione in corso)
// =====================================================================
const userKey = (name) => `qm:${currentUser.uid}:${name}`;

function getHistory() { return storage.get(userKey('history'), []); }
function setHistory(h) { storage.set(userKey('history'), h); }
function getMistakes() { return storage.get(userKey('mistakes'), {}); }
function setMistakes(m) { storage.set(userKey('mistakes'), m); }

const mistakeId = (q) => `${q.subject}::${q.question}`;

// Importa lo storico della vecchia versione (chiave globale "quizHistory")
function migrateLegacyHistory() {
    const legacy = storage.get('quizHistory', null);
    if (!Array.isArray(legacy) || legacy.length === 0) return;
    const history = getHistory();
    legacy.forEach(item => history.push({
        subject: item.subject,
        mode: 'practice',
        score: item.score,
        total: item.totalQuestions,
        correct: item.score,
        wrong: item.totalQuestions - item.score,
        skipped: 0,
        duration: null,
        date: item.date
    }));
    setHistory(history);
    storage.remove('quizHistory');
}

// =====================================================================
// DASHBOARD
// =====================================================================
function renderHome() {
    const history = getHistory();
    const mistakesCount = Object.keys(getMistakes()).length;
    const answered = history.reduce((sum, h) => sum + (h.correct + h.wrong), 0);
    const avg = history.length
        ? Math.round(history.reduce((sum, h) => sum + (h.total ? h.score / h.total : 0), 0) / history.length * 100)
        : null;

    $('stat-quizzes').textContent = history.length;
    $('stat-average').textContent = avg === null ? '–' : `${avg}%`;
    $('stat-answered').textContent = answered;
    $('stat-mistakes').textContent = mistakesCount;
    $('go-to-mistakes-btn').disabled = mistakesCount === 0;

    const session = storage.get(userKey('session'), null);
    const banner = $('resume-banner');
    if (session && session.questions && session.questions.length) {
        const done = session.answers.filter(a => a !== null).length;
        $('resume-info').textContent = `${session.subjectLabel} · ${done}/${session.questions.length} risposte · ${session.mode === 'exam' ? 'Simulazione esame' : 'Allenamento'}`;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
    showScreen('home');
}

$('resume-btn').addEventListener('click', () => {
    const session = storage.get(userKey('session'), null);
    if (!session) return;
    quiz = session;
    beginQuiz(false);
});
$('discard-resume-btn').addEventListener('click', () => {
    confirmDialog('Scartare il quiz?', 'Il quiz in sospeso verrà eliminato senza salvare il risultato.', 'Scarta', () => {
        storage.remove(userKey('session'));
        renderHome();
    });
});

// =====================================================================
// MATERIE
// =====================================================================
function subjectStats() {
    const stats = {};
    getHistory().forEach(h => {
        const pct = h.total ? Math.round(h.score / h.total * 100) : 0;
        const s = stats[h.subject] || (stats[h.subject] = { attempts: 0, best: 0 });
        s.attempts++;
        s.best = Math.max(s.best, pct);
    });
    return stats;
}

function renderSubjects() {
    const list = $('subject-list');
    const query = $('subject-search').value.trim().toLowerCase();
    const stats = subjectStats();
    list.innerHTML = '';
    let shown = 0;

    Object.keys(quizDatabase).forEach(subject => {
        if (query && !subject.toLowerCase().includes(query)) return;
        const card = el('button', 'subject-card');
        card.style.animationDelay = `${Math.min(shown, 15) * 25}ms`;
        card.appendChild(el('h3', 'text-lg font-bold', subject));
        card.appendChild(el('p', 'text-sm text-slate-500 dark:text-slate-400', `${quizDatabase[subject].length} domande`));

        const s = stats[subject];
        if (s) {
            const best = el('span', 'subject-best', `★ ${s.best}%`);
            best.style.color = percentColor(s.best);
            best.title = `Miglior risultato su ${s.attempts} tentativ${s.attempts === 1 ? 'o' : 'i'}`;
            card.appendChild(best);
            const bar = el('div', 'mini-bar');
            const fill = el('i');
            fill.style.width = `${s.best}%`;
            bar.appendChild(fill);
            card.appendChild(bar);
        }
        card.addEventListener('click', () => openSetup({
            label: subject,
            pool: quizDatabase[subject].map(q => ({ ...q, subject }))
        }));
        list.appendChild(card);
        shown++;
    });
    $('no-subject-message').classList.toggle('hidden', shown > 0);
}

$('subject-search').addEventListener('input', renderSubjects);

// =====================================================================
// CONFIGURAZIONE QUIZ
// =====================================================================
let pendingSetup = null;
let selectedCount = '40';

function openSetup(setup) {
    pendingSetup = setup;
    $('setup-title').textContent = setup.label;
    $('setup-subtitle').textContent = `${setup.pool.length} domande disponibili`;
    document.querySelectorAll('#question-count button').forEach(b => {
        const n = b.dataset.count;
        b.disabled = n !== 'all' && Number(n) > setup.pool.length;
        b.classList.toggle('opacity-40', b.disabled);
    });
    const activeBtn = document.querySelector(`#question-count button[data-count="${selectedCount}"]`);
    if (!activeBtn || activeBtn.disabled) selectCount('all');
    openModal('setup-modal');
}

function selectCount(count) {
    selectedCount = count;
    document.querySelectorAll('#question-count button').forEach(b => b.classList.toggle('active', b.dataset.count === count));
}

$('question-count').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && !btn.disabled) selectCount(btn.dataset.count);
});

$('start-quiz-btn').addEventListener('click', () => {
    closeModal('setup-modal');
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const shuffleOptions = $('shuffle-options').checked;
    const timeLimit = Number($('timer-select').value) * 60;
    createQuiz(pendingSetup, { mode, shuffleOptions, timeLimit, count: selectedCount });
});

// =====================================================================
// QUIZ: STATO
// =====================================================================
// quiz = { subjectLabel, mode, settings, questions[], answers[], flagged[], current, elapsed, timeLimit }
let quiz = null;
let timerInterval = null;
let autoAdvanceTimer = null;
let lastResult = null;

function createQuiz(setup, settings) {
    const pool = shuffleArray([...setup.pool]);
    const count = settings.count === 'all' ? pool.length : Math.min(Number(settings.count), pool.length);
    const questions = pool.slice(0, count).map(q => ({
        subject: q.subject,
        question: q.question,
        options: settings.shuffleOptions ? shuffleArray([...q.options]) : [...q.options],
        answer: q.answer
    }));
    quiz = {
        subjectLabel: setup.label,
        mode: settings.mode,
        settings,
        setup: { label: setup.label, subjects: [...new Set(setup.pool.map(q => q.subject))] },
        questions,
        answers: new Array(questions.length).fill(null),
        flagged: new Array(questions.length).fill(false),
        current: 0,
        elapsed: 0,
        timeLimit: settings.timeLimit || 0
    };
    beginQuiz(true);
}

function beginQuiz(isNew) {
    screens.quiz.classList.toggle('exam-mode', quiz.mode === 'exam');
    $('quiz-subject').textContent = quiz.subjectLabel;
    $('quiz-mode-badge').textContent = quiz.mode === 'exam' ? 'Simulazione esame' : 'Allenamento';
    $('live-total').textContent = quiz.questions.length;
    $('live-correct-chip').classList.toggle('hidden', quiz.mode === 'exam');
    $('live-wrong-chip').classList.toggle('hidden', quiz.mode === 'exam');
    $('live-percent-chip').classList.toggle('hidden', quiz.mode === 'exam');
    buildPalette();
    showScreen('quiz');
    renderQuestion('next');
    startTimer();
    if (isNew) saveSession();
}

function saveSession() {
    if (quiz && currentUser) storage.set(userKey('session'), quiz);
}

function isCorrect(i) {
    const a = quiz.answers[i];
    return a !== null && quiz.questions[i].options[a] === quiz.questions[i].answer;
}

function isLocked(i) {
    return quiz.mode === 'practice' && quiz.answers[i] !== null;
}

// =====================================================================
// QUIZ: TIMER
// =====================================================================
function startTimer() {
    stopTimer();
    const timerEl = $('timer');
    timerEl.classList.remove('hidden');
    const tick = () => {
        const text = $('timer-text');
        if (quiz.timeLimit) {
            const remaining = quiz.timeLimit - quiz.elapsed;
            text.textContent = formatDuration(remaining);
            timerEl.classList.toggle('warning', remaining <= 60);
            if (remaining <= 0) {
                stopTimer();
                toast('Tempo scaduto!');
                finishQuiz();
            }
        } else {
            text.textContent = formatDuration(quiz.elapsed);
        }
    };
    tick();
    timerInterval = setInterval(() => {
        quiz.elapsed++;
        tick();
        if (quiz && quiz.elapsed % 5 === 0) saveSession();
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

// =====================================================================
// QUIZ: RENDER
// =====================================================================
function buildPalette() {
    const palette = $('question-palette');
    palette.innerHTML = '';
    quiz.questions.forEach((_, i) => {
        const b = el('button', '', String(i + 1));
        b.addEventListener('click', () => goTo(i));
        palette.appendChild(b);
    });
}

function updatePalette() {
    const buttons = $('question-palette').children;
    quiz.questions.forEach((_, i) => {
        const b = buttons[i];
        const answered = quiz.answers[i] !== null;
        let cls = '';
        if (answered) {
            if (quiz.mode === 'practice') cls = isCorrect(i) ? 'p-correct' : 'p-wrong';
            else cls = 'p-answered';
        }
        if (quiz.flagged[i]) cls += ' p-flagged';
        if (i === quiz.current) cls += ' p-current';
        b.className = cls.trim();
        b.title = `Domanda ${i + 1}${answered ? ' · risposta data' : ''}${quiz.flagged[i] ? ' · segnata' : ''}`;
    });
}

function updateLiveStats() {
    const answered = quiz.answers.filter(a => a !== null).length;
    let correct = 0;
    quiz.answers.forEach((a, i) => { if (a !== null && isCorrect(i)) correct++; });
    const wrong = answered - correct;
    const flagged = quiz.flagged.filter(Boolean).length;

    const set = (id, value) => {
        const node = $(id);
        if (node.textContent !== String(value)) {
            node.textContent = value;
            bump(node.parentElement);
        }
    };
    set('live-answered', answered);
    set('live-correct', correct);
    set('live-wrong', wrong);
    set('live-flagged', flagged);
    set('live-percent', answered ? Math.round(correct / answered * 100) : 0);
    $('progress-answered').style.width = `${answered / quiz.questions.length * 100}%`;
}

function renderQuestion(direction) {
    clearTimeout(autoAdvanceTimer);
    const i = quiz.current;
    const q = quiz.questions[i];
    const card = $('question-card');

    card.classList.remove('q-enter-next', 'q-enter-prev');
    void card.offsetWidth;
    card.classList.add(direction === 'prev' ? 'q-enter-prev' : 'q-enter-next');

    $('question-counter').textContent = `Domanda ${i + 1} di ${quiz.questions.length}`;
    $('question-text').textContent = q.question;

    const flagBtn = $('flag-btn');
    flagBtn.classList.toggle('active', quiz.flagged[i]);
    flagBtn.setAttribute('aria-pressed', String(quiz.flagged[i]));

    const container = $('answer-options');
    container.innerHTML = '';
    container.classList.toggle('locked', isLocked(i));

    q.options.forEach((option, idx) => {
        const btn = el('button', 'answer-btn');
        btn.setAttribute('role', 'radio');
        btn.appendChild(el('span', 'answer-key', LETTERS[idx]));
        btn.appendChild(el('span', 'answer-text', option));
        btn.appendChild(el('span', 'feedback-icon'));
        btn.addEventListener('click', () => selectAnswer(idx));
        container.appendChild(btn);
    });
    paintAnswers(false);

    $('prev-btn').disabled = i === 0;
    const isLast = i === quiz.questions.length - 1;
    $('next-btn').innerHTML = isLast
        ? '<span class="hidden sm:inline">Vai al riepilogo</span> ✓'
        : '<span class="hidden sm:inline">Successiva</span> →';

    updatePalette();
    updateLiveStats();
}

function paintAnswers(justAnswered) {
    const i = quiz.current;
    const q = quiz.questions[i];
    const selected = quiz.answers[i];
    const buttons = $('answer-options').children;
    const hint = $('answer-hint');
    hint.classList.add('hidden');

    Array.from(buttons).forEach((btn, idx) => {
        btn.classList.remove('selected', 'correct', 'incorrect', 'dimmed', 'just-answered');
        btn.setAttribute('aria-checked', String(selected === idx));
        const icon = btn.querySelector('.feedback-icon');
        icon.textContent = '';

        if (quiz.mode === 'exam') {
            if (selected === idx) btn.classList.add('selected');
            return;
        }
        if (selected === null) return;

        const optionIsAnswer = q.options[idx] === q.answer;
        if (optionIsAnswer) {
            btn.classList.add('correct');
            icon.textContent = '✓';
            if (justAnswered && selected === idx) btn.classList.add('just-answered');
        } else if (selected === idx) {
            btn.classList.add('incorrect');
            icon.textContent = '✗';
        } else {
            btn.classList.add('dimmed');
        }
    });

    if (quiz.mode === 'practice' && selected !== null) {
        const ok = isCorrect(i);
        hint.textContent = ok ? 'Risposta corretta!' : 'Risposta errata: la risposta corretta è evidenziata in verde.';
        hint.style.color = ok ? 'var(--green)' : 'var(--red)';
        hint.classList.remove('hidden');
    }
    $('answer-options').classList.toggle('locked', isLocked(i));
}

// =====================================================================
// QUIZ: AZIONI
// =====================================================================
function selectAnswer(idx) {
    const i = quiz.current;
    if (isLocked(i)) return;

    if (quiz.mode === 'exam' && quiz.answers[i] === idx) {
        quiz.answers[i] = null; // clic sulla risposta già scelta = deseleziona
    } else {
        quiz.answers[i] = idx;
    }
    paintAnswers(true);
    updatePalette();
    updateLiveStats();
    saveSession();

    if (quiz.mode === 'practice' && isCorrect(i)) {
        autoAdvanceTimer = setTimeout(() => {
            if (quiz && quiz.current === i && i < quiz.questions.length - 1) next();
        }, PRACTICE_AUTO_ADVANCE_MS);
    }
}

function goTo(index) {
    if (index < 0 || index >= quiz.questions.length || index === quiz.current) return;
    const direction = index > quiz.current ? 'next' : 'prev';
    quiz.current = index;
    saveSession();
    renderQuestion(direction);
}

function next() {
    if (quiz.current === quiz.questions.length - 1) {
        requestFinish();
    } else {
        goTo(quiz.current + 1);
    }
}

function prev() {
    goTo(quiz.current - 1);
}

function toggleFlag() {
    const i = quiz.current;
    quiz.flagged[i] = !quiz.flagged[i];
    const flagBtn = $('flag-btn');
    flagBtn.classList.toggle('active', quiz.flagged[i]);
    flagBtn.setAttribute('aria-pressed', String(quiz.flagged[i]));
    updatePalette();
    updateLiveStats();
    saveSession();
}

function requestFinish() {
    const unanswered = quiz.answers.filter(a => a === null).length;
    const flagged = quiz.flagged.filter(Boolean).length;
    if (unanswered === 0 && flagged === 0) {
        confirmDialog('Terminare il quiz?', 'Hai risposto a tutte le domande.', 'Vedi risultato', finishQuiz);
        return;
    }
    const parts = [];
    if (unanswered) parts.push(`${unanswered} domand${unanswered === 1 ? 'a senza risposta' : 'e senza risposta'}`);
    if (flagged) parts.push(`${flagged} segnat${flagged === 1 ? 'a' : 'e'} per revisione`);
    confirmDialog('Terminare il quiz?', `Hai ancora ${parts.join(' e ')}. Le domande senza risposta verranno contate come errate.`, 'Termina comunque', finishQuiz);
}

$('prev-btn').addEventListener('click', prev);
$('next-btn').addEventListener('click', next);
$('flag-btn').addEventListener('click', toggleFlag);
$('finish-btn').addEventListener('click', requestFinish);
$('exit-quiz-btn').addEventListener('click', () => {
    stopTimer();
    clearTimeout(autoAdvanceTimer);
    saveSession();
    toast('Progresso salvato: puoi riprendere dalla home.');
    renderHome();
});
$('toggle-palette-btn').addEventListener('click', () => {
    const wrap = $('palette-wrap');
    const open = wrap.classList.toggle('open');
    $('toggle-palette-btn').textContent = open ? 'Panoramica ▴' : 'Panoramica ▾';
    $('toggle-palette-btn').setAttribute('aria-expanded', String(open));
    try { localStorage.setItem('qm-palette-open', open ? '1' : '0'); } catch (e) { /* ignorato */ }
});
try {
    if (localStorage.getItem('qm-palette-open') === '1') $('toggle-palette-btn').click();
} catch (e) { /* ignorato */ }

// Scorciatoie da tastiera
document.addEventListener('keydown', (e) => {
    if (isModalOpen()) {
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => closeModal(m.id));
        return;
    }
    if (currentScreen !== 'quiz' || !quiz) return;
    if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key.toLowerCase();
    const optionCount = quiz.questions[quiz.current].options.length;
    const numeric = Number(key);
    const letterIdx = LETTERS.map(l => l.toLowerCase()).indexOf(key);

    if (numeric >= 1 && numeric <= optionCount) selectAnswer(numeric - 1);
    else if (letterIdx >= 0 && letterIdx < optionCount) selectAnswer(letterIdx);
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (key === 'f') toggleFlag();
});

// =====================================================================
// RISULTATI
// =====================================================================
function finishQuiz() {
    if (!quiz) return;
    closeModal('confirm-modal');
    confirmHandler = null;
    stopTimer();
    clearTimeout(autoAdvanceTimer);
    const total = quiz.questions.length;
    let correct = 0, wrong = 0, skipped = 0;
    const details = quiz.questions.map((q, i) => {
        const a = quiz.answers[i];
        let status;
        if (a === null) { skipped++; status = 'skipped'; }
        else if (isCorrect(i)) { correct++; status = 'correct'; }
        else { wrong++; status = 'wrong'; }
        return { ...q, chosen: a === null ? null : q.options[a], status, flagged: quiz.flagged[i] };
    });

    // Aggiorna la banca errori: aggiunge le sbagliate/saltate, rimuove quelle ora corrette
    const mistakes = getMistakes();
    details.forEach(d => {
        const id = mistakeId(d);
        if (d.status === 'correct') delete mistakes[id];
        else mistakes[id] = { subject: d.subject, question: d.question, options: d.options, answer: d.answer };
    });
    setMistakes(mistakes);

    const history = getHistory();
    history.push({
        subject: quiz.subjectLabel,
        mode: quiz.mode,
        score: correct,
        total,
        correct,
        wrong,
        skipped,
        duration: quiz.elapsed,
        date: new Date().toISOString()
    });
    setHistory(history);

    lastResult = { details, setup: quiz.setup, settings: quiz.settings, label: quiz.subjectLabel };
    storage.remove(userKey('session'));
    renderResults({ correct, wrong, skipped, total, duration: quiz.elapsed });
    quiz = null;
}

function renderResults({ correct, wrong, skipped, total, duration }) {
    const pct = total ? Math.round(correct / total * 100) : 0;
    $('end-subject-title').textContent = lastResult.label;
    $('end-title').textContent = pct >= 80 ? 'Ottimo lavoro! 🎉' : pct >= 60 ? 'Buon risultato!' : 'Continua ad allenarti!';
    $('final-score').textContent = `${correct} / ${total}`;
    $('end-correct').textContent = correct;
    $('end-wrong').textContent = wrong;
    $('end-skipped').textContent = skipped;
    $('end-time').textContent = formatDuration(duration);
    $('retry-wrong-btn').disabled = wrong + skipped === 0;

    const ring = $('score-ring-fill');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    ring.style.stroke = percentColor(pct);
    showScreen('end');

    requestAnimationFrame(() => requestAnimationFrame(() => {
        ring.style.transition = '';
        ring.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - pct / 100);
    }));
    animateNumber($('final-percent'), pct, '%');

    setReviewFilter('all');
    if (pct >= 80) launchConfetti();
}

function animateNumber(node, target, suffix = '') {
    const start = performance.now();
    const duration = 1200;
    const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        node.textContent = `${Math.round(target * eased)}${suffix}`;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function setReviewFilter(filter) {
    document.querySelectorAll('#review-filter button').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    renderReview(filter);
}

function renderReview(filter) {
    const list = $('review-list');
    list.innerHTML = '';
    const items = lastResult.details
        .map((d, i) => ({ ...d, index: i }))
        .filter(d => filter === 'all' || (filter === 'flagged' ? d.flagged : d.status === filter));

    if (items.length === 0) {
        list.appendChild(el('p', 'text-center text-slate-500 dark:text-slate-400 py-6', 'Nessuna domanda in questa categoria.'));
        return;
    }
    items.forEach((d, n) => {
        const item = el('div', `review-item r-${d.status}`);
        item.style.animationDelay = `${Math.min(n, 12) * 30}ms`;
        const head = el('p', 'text-xs font-bold text-slate-400 mb-1', `Domanda ${d.index + 1}${d.flagged ? ' · ⚑ segnata' : ''}`);
        item.appendChild(head);
        item.appendChild(el('p', 'font-semibold', d.question));

        if (d.status !== 'correct') {
            const yours = el('p', 'review-answer');
            yours.appendChild(el('span', 'font-bold text-rose-500 shrink-0', d.chosen === null ? '–' : '✗'));
            yours.appendChild(el('span', 'text-slate-500 dark:text-slate-400', d.chosen === null ? 'Nessuna risposta' : d.chosen));
            item.appendChild(yours);
        }
        const right = el('p', 'review-answer');
        right.appendChild(el('span', 'font-bold text-emerald-500 shrink-0', '✓'));
        right.appendChild(el('span', '', d.answer));
        item.appendChild(right);
        list.appendChild(item);
    });
}

$('review-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) setReviewFilter(btn.dataset.filter);
});

$('retry-wrong-btn').addEventListener('click', () => {
    const pool = lastResult.details.filter(d => d.status !== 'correct')
        .map(d => ({ subject: d.subject, question: d.question, options: d.options, answer: d.answer }));
    if (pool.length === 0) return;
    createQuiz({ label: `${lastResult.label} · errori`, pool }, { ...lastResult.settings, count: 'all', timeLimit: 0 });
});

$('restart-btn').addEventListener('click', () => {
    const subjects = lastResult.setup.subjects;
    if (subjects.length === 1 && quizDatabase[subjects[0]]) {
        openSetup({ label: subjects[0], pool: quizDatabase[subjects[0]].map(q => ({ ...q, subject: subjects[0] })) });
    } else {
        showSubjects();
    }
});
$('back-to-subjects-btn-end').addEventListener('click', showSubjects);

// =====================================================================
// RIPASSO ERRORI
// =====================================================================
$('go-to-mistakes-btn').addEventListener('click', () => {
    const pool = Object.values(getMistakes());
    if (pool.length === 0) {
        toast('Nessun errore da ripassare. Ottimo!');
        return;
    }
    openSetup({ label: 'Ripasso errori', pool });
});

// =====================================================================
// STORICO
// =====================================================================
function renderHistory() {
    const history = getHistory().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const list = $('history-list');
    list.innerHTML = '';
    $('no-history-message').classList.toggle('hidden', history.length > 0);
    $('clear-history-btn').classList.toggle('hidden', history.length === 0);
    $('history-chart-card').classList.toggle('hidden', history.length < 2);

    // Grafico: ultimi 30 quiz in ordine cronologico
    const chart = $('history-chart');
    chart.innerHTML = '';
    history.slice(0, 30).reverse().forEach((h, n) => {
        const pct = h.total ? Math.round(h.score / h.total * 100) : 0;
        const bar = el('div');
        bar.style.height = `${Math.max(pct, 3)}%`;
        bar.style.animationDelay = `${n * 20}ms`;
        bar.title = `${h.subject}: ${pct}%`;
        chart.appendChild(bar);
    });

    history.forEach((h, n) => {
        const pct = h.total ? Math.round(h.score / h.total * 100) : 0;
        const item = el('div', 'history-item');
        item.style.animationDelay = `${Math.min(n, 12) * 30}ms`;

        const score = el('div', 'history-score', `${pct}%`);
        score.style.background = `color-mix(in srgb, ${percentColor(pct)} 15%, transparent)`;
        score.style.color = percentColor(pct);
        item.appendChild(score);

        const info = el('div', 'flex-1 min-w-0');
        info.appendChild(el('p', 'font-bold truncate', h.subject));
        const date = new Date(h.date).toLocaleString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const meta = [date, h.mode === 'exam' ? 'Esame' : 'Allenamento'];
        if (h.duration) meta.push(formatDuration(h.duration));
        info.appendChild(el('p', 'text-xs text-slate-500 dark:text-slate-400', meta.join(' · ')));
        item.appendChild(info);

        item.appendChild(el('p', 'font-extrabold text-lg shrink-0', `${h.score}/${h.total}`));
        list.appendChild(item);
    });
    showScreen('history');
}

$('go-to-history-btn').addEventListener('click', renderHistory);
$('clear-history-btn').addEventListener('click', () => {
    confirmDialog('Cancellare lo storico?', 'Verranno eliminati tutti i risultati salvati e la lista degli errori. L\'operazione non è reversibile.', 'Cancella', () => {
        setHistory([]);
        setMistakes({});
        renderHistory();
        toast('Storico cancellato.');
    });
});

// =====================================================================
// COLLEGAMENTI GENERALI
// =====================================================================
function showSubjects() {
    $('subject-search').value = '';
    renderSubjects();
    showScreen('subject');
}

$('go-to-subjects-btn').addEventListener('click', showSubjects);
document.querySelectorAll('.back-home').forEach(b => b.addEventListener('click', renderHome));
$('brand-btn').addEventListener('click', () => {
    if (currentScreen === 'quiz') {
        $('exit-quiz-btn').click();
    } else {
        renderHome();
    }
});

window.addEventListener('beforeunload', saveSession);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveSession(); });

// =====================================================================
// CORIANDOLI
// =====================================================================
function launchConfetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = $('confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#38bdf8'];
    const pieces = Array.from({ length: 160 }, () => ({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 14,
        vy: Math.random() * -14 - 4,
        size: Math.random() * 8 + 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)]
    }));
    const start = performance.now();
    const frame = (now) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.vy += 0.35;
            p.vx *= 0.99;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        });
        if (now - start < 3500) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    requestAnimationFrame(frame);
}

// =====================================================================
// AVVIO
// =====================================================================
function boot() {
    window.__qmBooted = true;
    initAuthUI();
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        auth.languageCode = 'it';
    } catch (error) {
        console.error(error);
        showScreen('auth');
        showAuthMessage('Configurazione Firebase non valida: controlla firebase-config.js.');
        return;
    }

    getRedirectResult(auth).catch(handleAuthError);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            currentUser = null;
            quiz = null;
            stopTimer();
            showScreen('auth');
            return;
        }
        if (!isEmailAllowed(user)) {
            await signOut(auth);
            showAuthMessage('Questo account non è autorizzato ad accedere all\'app.');
            return;
        }

        currentUser = user;
        renderUser(user);
        $('loading-text').textContent = 'Caricamento domande…';
        showScreen('loading');
        try {
            await loadQuestions();
        } catch (error) {
            $('loading-text').textContent = 'Errore nel caricamento delle domande. Ricarica la pagina.';
            return;
        }
        migrateLegacyHistory();
        renderHome();
    });
}

boot();

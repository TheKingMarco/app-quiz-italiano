// Add your Firebase configuration here
const firebaseConfig = {
    apiKey: "AIzaSyAQpf7efo2K-2biS_M2vAEGQL8hSSVU7xE",
    authDomain: "app-quiz-4d93b.firebaseapp.com",
    projectId: "app-quiz-4d93b",
    storageBucket: "app-quiz-4d93b.firebasestorage.app",
    messagingSenderId: "462622793680",
    appId: "1:462622793680:web:0e4f2e73c0907b1a41e3d5"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

document.addEventListener('DOMContentLoaded', () => {

    // --- DATABASE DELLE DOMANDE ---
    const quizDatabase = {
        "Grammatica Italiana": [
            { question: "Quando si usa il futuro anteriore indicativo?", options: ["Il futuro anteriore indica un evento futuro che si sta compiendo mentre parliamo.", "Il futuro anteriore indica un evento futuro che potrebbe avvenire.", "Il futuro anteriore indica un evento futuro che deve ancora avvenire.", "Il futuro anteriore indica un evento futuro che si è già compiuto o si compirà, prima che se ne realizzi un altro nel futuro."], answer: "Il futuro anteriore indica un evento futuro che si è già compiuto o si compirà, prima che se ne realizzi un altro nel futuro." },
            { question: "In quale frase manca il presente indicativo?", options: ["Luca non viene al lago con noi, perché non ha finito i compiti.", "Dopo aver raggiunto i genitori, Davide andò subito in spiaggia.", "Signora dove si trova Corso Cavour?", "Le lezioni iniziano alle 8 e terminano alle 13."], answer: "Dopo aver raggiunto i genitori, Davide andò subito in spiaggia." },
            { question: "\"Congiura\" è:", options: ["Un nome ottenuto mediante prefisso.", "Un nome ottenuto mediante suffisso.", "Un nome ottenuto mediante prefisso e suffisso.", "Un nome ottenuto mediante derivazione immediata (cioè senza suffisso)."], answer: "Un nome ottenuto mediante derivazione immediata (cioè senza suffisso)." }
        ],
        "Educazione Civica": [
            { question: "A norma della Costituzione, tutti sono tenuti a concorrere alle spese pubbliche:", options: ["in ragione della loro capacità contributiva", "indipendentemente dalla loro capacità contributiva", "indipendentemente dal proprio reddito netto", "indipendentemente dal loro reddito lordo"], answer: "in ragione della loro capacità contributiva" },
            { question: "A norma della Costituzione, la proprietà:", options: ["è solo privata", "è solo pubblica", "è pubblica o privata", "non è disciplinata dal nostro ordinamento giuridico"], answer: "è pubblica o privata" },
            { question: "A norma della Costituzione, il Senato, salvi i seggi assegnati alla circoscrizione Estero, è eletto:", options: ["a base universale", "a base nazionale", "a base regionale", "a base provinciale"], answer: "a base regionale" }
        ]
    };

    // --- ELEMENTI DEL DOM ---
    const screens = {
        auth: document.getElementById('auth-screen'),
        home: document.getElementById('home-screen'),
        subject: document.getElementById('subject-screen'),
        quiz: document.getElementById('quiz-screen'),
        end: document.getElementById('end-screen'),
        history: document.getElementById('history-screen')
    };

    const subjectList = document.getElementById('subject-list');
    const questionCounter = document.getElementById('question-counter');
    const scoreDisplay = document.getElementById('score-display');
    const progressBar = document.getElementById('progress-bar');
    const questionText = document.getElementById('question-text');
    const answerOptions = document.getElementById('answer-options');
    const finalScore = document.getElementById('final-score');
    const endSubjectTitle = document.getElementById('end-subject-title');

    const historyList = document.getElementById('history-list');
    const noHistoryMessage = document.getElementById('no-history-message');

    // Buttons
    const googleSigninBtn = document.getElementById('google-signin-btn');
    const signOutBtn = document.getElementById('signout-btn');
    const goToSubjectsBtn = document.getElementById('go-to-subjects-btn');
    const restartBtn = document.getElementById('restart-btn');
    const backToSubjectsBtnQuiz = document.getElementById('back-to-subjects-btn-quiz');
    const backToSubjectsBtnEnd = document.getElementById('back-to-subjects-btn-end');
    const goToHistoryBtn = document.getElementById('go-to-history-btn');
    const backFromHistoryBtn = document.getElementById('back-from-history-btn');

    // Display elements for user info
    const userDisplay = document.getElementById('user-display');

    // --- VARIABILI DI STATO DEL QUIZ ---
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let currentSubject = '';
    const TOTAL_QUESTIONS = 40;

    // --- FUNZIONI DI NAVIGAZIONE ---
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        screens[screenName].classList.remove('hidden');
    }

    // --- FUNZIONI DI AUTENTICAZIONE ---
    function handleSignIn() {
        auth.signInWithPopup(googleProvider)
            .catch(error => {
                console.error("Sign-in failed:", error.message);
                alert("Errore durante l'accesso. Riprova.");
            });
    }

    function handleSignOut() {
        auth.signOut()
            .then(() => {
                console.log("User signed out.");
            })
            .catch(error => {
                console.error("Sign-out failed:", error.message);
            });
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            console.log("User signed in:", user.displayName);
            userDisplay.textContent = `Benvenuto, ${user.displayName}!`;
            showScreen('home');
        } else {
            // User is signed out
            console.log("No user signed in.");
            showScreen('auth');
        }
    });

    // --- FUNZIONI PRINCIPALI ---
    function initializeSubjectMenu() {
        subjectList.innerHTML = '';
        for (const subject in quizDatabase) {
            const button = document.createElement('button');
            button.className = 'w-full p-5 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border-2 border-transparent hover:border-indigo-500 transition-all duration-200 cursor-pointer transform hover:-translate-y-1';
            button.innerHTML = `<h3 class="text-xl font-bold">${subject}</h3><p class="text-gray-600 dark:text-gray-400">${quizDatabase[subject].length} domande disponibili</p>`;
            button.addEventListener('click', () => startQuiz(subject));
            subjectList.appendChild(button);
        }
    }

    function startQuiz(subject) {
        currentSubject = subject;
        currentQuestionIndex = 0;
        score = 0;
        const allQuestions = quizDatabase[subject];
        shuffleArray(allQuestions);
        currentQuestions = allQuestions.slice(0, Math.min(TOTAL_QUESTIONS, allQuestions.length));
        showScreen('quiz');
        displayQuestion();
    }

    function displayQuestion() {
        answerOptions.innerHTML = '';
        answerOptions.classList.remove('disabled-options');
        const question = currentQuestions[currentQuestionIndex];
        
        questionText.textContent = question.question;
        questionCounter.textContent = `Domanda ${currentQuestionIndex + 1} di ${currentQuestions.length}`;
        scoreDisplay.textContent = `Punteggio: ${score}`;
        progressBar.style.width = `${((currentQuestionIndex) / currentQuestions.length) * 100}%`;

        const shuffledOptions = [...question.options];
        shuffleArray(shuffledOptions);

        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.className = 'answer-btn w-full p-4 text-left bg-gray-200 dark:bg-gray-700 rounded-lg border-2 border-transparent';
            
            const textSpan = document.createElement('span');
            textSpan.textContent = option;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'feedback-icon';
            
            button.appendChild(textSpan);
            button.appendChild(iconSpan);
            
            button.addEventListener('click', handleAnswer);
            answerOptions.appendChild(button);
        });
    }

    function handleAnswer(e) {
        const selectedButton = e.currentTarget;
        const selectedAnswer = selectedButton.querySelector('span:first-child').textContent;
        const correctAnswer = currentQuestions[currentQuestionIndex].answer;

        answerOptions.classList.add('disabled-options');
        
        const iconSpan = selectedButton.querySelector('.feedback-icon');

        if (selectedAnswer === correctAnswer) {
            score++;
            selectedButton.classList.add('correct');
            iconSpan.textContent = '✓';
            iconSpan.classList.add('icon-correct');
        } else {
            selectedButton.classList.add('incorrect');
            iconSpan.textContent = '✗';
            iconSpan.classList.add('icon-incorrect');
            
            Array.from(answerOptions.children).forEach(button => {
                if (button.querySelector('span:first-child').textContent === correctAnswer) {
                    button.classList.add('correct');
                    const correctIcon = button.querySelector('.feedback-icon');
                    correctIcon.textContent = '✓';
                    correctIcon.classList.add('icon-correct');
                }
            });
        }
        
        scoreDisplay.textContent = `Punteggio: ${score}`;
        progressBar.style.width = `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%`;

        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuestions.length) {
                displayQuestion();
            } else {
                endQuiz();
            }
        }, 1500);
    }
    
    function saveQuizResult() {
        const quizResult = {
            subject: currentSubject,
            score: score,
            totalQuestions: currentQuestions.length,
            date: new Date().toISOString()
        };

        const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
        history.push(quizResult);
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    function endQuiz() {
        saveQuizResult();
        showScreen('end');
        finalScore.textContent = `${score} / ${currentQuestions.length}`;
        endSubjectTitle.textContent = `Materia: ${currentSubject}`;
    }

    function displayHistory() {
        const history = JSON.parse(localStorage.getItem('quizHistory')) || [];
        historyList.innerHTML = '';
        noHistoryMessage.classList.add('hidden');

        if (history.length === 0) {
            noHistoryMessage.classList.remove('hidden');
        } else {
            history.sort((a, b) => new Date(b.date) - new Date(a.date));

            history.forEach(item => {
                const quizItem = document.createElement('div');
                quizItem.className = 'p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow';
                const date = new Date(item.date).toLocaleDateString('it-IT', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                
                quizItem.innerHTML = `
                    <p class="text-lg font-bold">${item.subject}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${date}</p>
                    <p class="mt-2 text-xl font-extrabold text-indigo-600 dark:text-indigo-400">Punteggio: ${item.score} / ${item.totalQuestions}</p>
                `;
                historyList.appendChild(quizItem);
            });
        }
        showScreen('history');
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- EVENT LISTENERS ---
    googleSigninBtn.addEventListener('click', handleSignIn);
    signOutBtn.addEventListener('click', handleSignOut);
    goToSubjectsBtn.addEventListener('click', () => {
        initializeSubjectMenu();
        showScreen('subject');
    });
    
    const goBack = () => showScreen('subject');
    backToSubjectsBtnQuiz.addEventListener('click', goBack);
    backToSubjectsBtnEnd.addEventListener('click', goBack);

    restartBtn.addEventListener('click', () => startQuiz(currentSubject));

    goToHistoryBtn.addEventListener('click', displayHistory);
    backFromHistoryBtn.addEventListener('click', () => showScreen('subject'));
    
    // The initial screen is now determined by Firebase auth state
    // No need to call showScreen('home') or similar here.
});
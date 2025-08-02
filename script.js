document.addEventListener('DOMContentLoaded', () => {

    // --- DATABASE DELLE DOMANDE ---
    const quizDatabase = {
        "Grammatica Italiana": [
            { question: "Quando si usa il futuro anteriore indicativo?", options: ["Il futuro anteriore indica un evento futuro che si sta compiendo mentre parliamo.", "Il futuro anteriore indica un evento futuro che potrebbe avvenire.", "Il futuro anteriore indica un evento futuro che deve ancora avvenire.", "Il futuro anteriore indica un evento futuro che si è già compiuto o si compirà, prima che se ne realizzi un altro nel futuro."], answer: "Il futuro anteriore indica un evento futuro che si è già compiuto o si compirà, prima che se ne realizzi un altro nel futuro." },
            { question: "In quale frase manca il presente indicativo?", options: ["Luca non viene al lago con noi, perché non ha finito i compiti.", "Dopo aver raggiunto i genitori, Davide andò subito in spiaggia.", "Signora dove si trova Corso Cavour?", "Le lezioni iniziano alle 8 e terminano alle 13."], answer: "Dopo aver raggiunto i genitori, Davide andò subito in spiaggia." },
            // ... other questions
            { question: "\"Congiura\" è:", options: ["Un nome ottenuto mediante prefisso.", "Un nome ottenuto mediante suffisso.", "Un nome ottenuto mediante prefisso e suffisso.", "Un nome ottenuto mediante derivazione immediata (cioè senza suffisso)."], answer: "Un nome ottenuto mediante derivazione immediata (cioè senza suffisso)." }
        ],
        "Educazione Civica": [
            { question: "A norma della Costituzione, tutti sono tenuti a concorrere alle spese pubbliche:", options: ["in ragione della loro capacità contributiva", "indipendentemente dalla loro capacità contributiva", "indipendentemente dal proprio reddito netto", "indipendentemente dal loro reddito lordo"], answer: "in ragione della loro capacità contributiva" },
            { question: "A norma della Costituzione, la proprietà:", options: ["è solo privata", "è solo pubblica", "è pubblica o privata", "non è disciplinata dal nostro ordinamento giuridico"], answer: "è pubblica o privata" },
            // ... other questions
            { question: "A norma della Costituzione, il Senato, salvi i seggi assegnati alla circoscrizione Estero, è eletto:", options: ["a base universale", "a base nazionale", "a base regionale", "a base provinciale"], answer: "a base regionale" }
        ]
    };

    // --- ELEMENTI DEL DOM ---
    const screens = {
        home: document.getElementById('home-screen'),
        subject: document.getElementById('subject-screen'),
        quiz: document.getElementById('quiz-screen'),
        end: document.getElementById('end-screen')
    };

    const subjectList = document.getElementById('subject-list');
    const questionCounter = document.getElementById('question-counter');
    const scoreDisplay = document.getElementById('score-display');
    const progressBar = document.getElementById('progress-bar');
    const questionText = document.getElementById('question-text');
    const answerOptions = document.getElementById('answer-options');
    const finalScore = document.getElementById('final-score');
    const endSubjectTitle = document.getElementById('end-subject-title');

    // Buttons
    const goToSubjectsBtn = document.getElementById('go-to-subjects-btn');
    const restartBtn = document.getElementById('restart-btn');
    const backToSubjectsBtnQuiz = document.getElementById('back-to-subjects-btn-quiz');
    const backToSubjectsBtnEnd = document.getElementById('back-to-subjects-btn-end');

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

    /**
     * Displays the current question and its shuffled answer options.
     * This function is updated to include spans for text and icons.
     */
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
            // Added 'answer-btn' class from CSS for new hover effects
            button.className = 'answer-btn w-full p-4 text-left bg-gray-200 dark:bg-gray-700 rounded-lg border-2 border-transparent';
            
            // Create separate spans for text and icon
            const textSpan = document.createElement('span');
            textSpan.textContent = option;

            const iconSpan = document.createElement('span');
            iconSpan.className = 'feedback-icon'; // Initially hidden
            
            button.appendChild(textSpan);
            button.appendChild(iconSpan);
            
            button.addEventListener('click', handleAnswer);
            answerOptions.appendChild(button);
        });
    }

    /**
     * Handles the user's answer selection.
     * This function is updated to manage the feedback icons.
     */
    function handleAnswer(e) {
        const selectedButton = e.currentTarget; // Use currentTarget to get the button element
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
            
            // Highlight the correct answer for the user
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

    function endQuiz() {
        showScreen('end');
        finalScore.textContent = `${score} / ${currentQuestions.length}`;
        endSubjectTitle.textContent = `Materia: ${currentSubject}`;
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- EVENT LISTENERS ---
    goToSubjectsBtn.addEventListener('click', () => showScreen('subject'));
    
    const goBack = () => showScreen('subject');
    backToSubjectsBtnQuiz.addEventListener('click', goBack);
    backToSubjectsBtnEnd.addEventListener('click', goBack);

    restartBtn.addEventListener('click', () => startQuiz(currentSubject));

    // --- INIZIALIZZAZIONE ---
    initializeSubjectMenu();
    showScreen('home');
});
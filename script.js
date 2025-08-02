document.addEventListener('DOMContentLoaded', () => {

    // --- DATABASE DELLE DOMANDE ---
    // A structured object to hold questions for different subjects.
    // The keys are the subject names that will appear on the selection screen.
    const quizDatabase = {
        "Grammatica Italiana": [
            { question: "Quando si usa il futuro anteriore indicativo?", options: ["Il futuro anteriore indica un evento futuro che si sta compiendo mentre parliamo.", "Il futuro anteriore indica un evento futuro che potrebbe avvenire.", "Il futuro anteriore indica un evento futuro che deve ancora avvenire.", "Il futuro anteriore indica un evento futuro che si è già compiuto o si compirà, prima che se ne realizzi un altro nel futuro."], answer: "Il futuro anteriore indica un evento futuro che si è già compiuto o si compirà, prima che se ne realizzi un altro nel futuro." },
            { question: "In quale frase manca il presente indicativo?", options: ["Luca non viene al lago con noi, perché non ha finito i compiti.", "Dopo aver raggiunto i genitori, Davide andò subito in spiaggia.", "Signora dove si trova Corso Cavour?", "Le lezioni iniziano alle 8 e terminano alle 13."], answer: "Dopo aver raggiunto i genitori, Davide andò subito in spiaggia." },
            { question: "Nella frase \"Ognuno di noi porterà dei dolci per la festa. Se anche tu portassi qualcosa, ci faresti un piacere\", da che cosa può essere sostituita l'espressione \"ci faresti?\".", options: ["Faresti a noi.", "Faresti con noi.", "Faresti noi.", "Faresti di noi."], answer: "Faresti a noi." },
            { question: "Quale delle seguenti definizioni è corretta e completa?", options: ["La preposizione è una parte variabile del discorso che si premette ad una parola per collegarla e metterla in relazione ad un'altra.", "La preposizione è una parte variabile del discorso che si premette ad un verbo per collegarlo e metterlo in relazione ad un altro.", "La preposizione è una parte invariabile del discorso che si premette ad una parola per collegarla e metterla in relazione ad un'altra.", "La preposizione è una parte invariabile del discorso che si premette ad una parola."], answer: "La preposizione è una parte invariabile del discorso che si premette ad una parola per collegarla e metterla in relazione ad un'altra." },
            { question: "Quale tra questi aggettivi presenta lo stesso grado di ottimo?", options: ["Massimo.", "Superiore.", "Maggiore.", "Grande."], answer: "Massimo." },
            { question: "Quale tra i seguenti è un articolo determinativo, femminile, singolare?", options: ["Una", "La", "I", "Lo"], answer: "La" },
            { question: "Quale tra i seguenti è un articolo indeterminativo, maschile, singolare?", options: ["Lo", "Gli", "Una", "Un"], answer: "Un" },
            // ... many more CIGAA questions ...
            { question: "\"Congiura\" è:", options: ["Un nome ottenuto mediante prefisso.", "Un nome ottenuto mediante suffisso.", "Un nome ottenuto mediante prefisso e suffisso.", "Un nome ottenuto mediante derivazione immediata (cioè senza suffisso)."], answer: "Un nome ottenuto mediante derivazione immediata (cioè senza suffisso)." }
        ],
        "Educazione Civica": [
            { question: "A norma della Costituzione, tutti sono tenuti a concorrere alle spese pubbliche:", options: ["in ragione della loro capacità contributiva", "indipendentemente dalla loro capacità contributiva", "indipendentemente dal proprio reddito netto", "indipendentemente dal loro reddito lordo"], answer: "in ragione della loro capacità contributiva" },
            { question: "A norma della Costituzione, la proprietà:", options: ["è solo privata", "è solo pubblica", "è pubblica o privata", "non è disciplinata dal nostro ordinamento giuridico"], answer: "è pubblica o privata" },
            { question: "I contingenti militari delle missioni di peace-keeping dell'ONU si chiamano anche:", options: ["berretti verdi", "caschi verdi", "caschi rossi", "caschi blu"], answer: "caschi blu" },
            { question: "La giustizia è amministrata:", options: ["in nome del Capo dello Stato", "in nome del popolo", "in nome del Governo", "in nome di Dio"], answer: "in nome del popolo" },
            { question: "Quale, fra i seguenti organi, ha il compito di dichiarare l'incostituzionalità delle leggi?", options: ["La Corte d'Assise", "Il Governo", "Il Tribunale di Roma", "La Corte costituzionale"], answer: "La Corte costituzionale" },
            { question: "Un referendum popolare per l'abrogazione di una legge statale è indetto se viene richiesto da almeno:", options: ["100.000 elettori", "1 milione di elettori", "50.000 elettori", "500.000 elettori"], answer: "500.000 elettori" },
            // ... many more GDCIA questions ...
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

    /**
     * Shows the specified screen and hides all others.
     * @param {string} screenName The key of the screen to show ('home', 'subject', 'quiz', 'end').
     */
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.add('hidden'));
        screens[screenName].classList.remove('hidden');
    }

    // --- FUNZIONI PRINCIPALI ---

    /**
     * Populates the subject selection screen with buttons for each subject in the database.
     */
    function initializeSubjectMenu() {
        subjectList.innerHTML = '';
        for (const subject in quizDatabase) {
            const button = document.createElement('button');
            button.className = 'w-full p-5 text-left bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border-2 border-transparent hover:border-indigo-500 transition-all duration-200 cursor-pointer';
            button.innerHTML = `<h3 class="text-xl font-bold">${subject}</h3><p class="text-gray-600 dark:text-gray-400">${quizDatabase[subject].length} domande disponibili</p>`;
            button.addEventListener('click', () => startQuiz(subject));
            subjectList.appendChild(button);
        }
    }

    /**
     * Starts the quiz for a selected subject.
     * @param {string} subject The name of the subject to start the quiz for.
     */
    function startQuiz(subject) {
        // Set current subject and reset state
        currentSubject = subject;
        currentQuestionIndex = 0;
        score = 0;

        // Get questions for the subject, shuffle them, and take the first 40
        const allQuestions = quizDatabase[subject];
        shuffleArray(allQuestions);
        currentQuestions = allQuestions.slice(0, TOTAL_QUESTIONS);

        // Navigate to the quiz screen and display the first question
        showScreen('quiz');
        displayQuestion();
    }

    /**
     * Displays the current question and its shuffled answer options.
     */
    function displayQuestion() {
        // Clear previous options and re-enable clicks
        answerOptions.innerHTML = '';
        answerOptions.classList.remove('disabled-options');

        const question = currentQuestions[currentQuestionIndex];
        
        // Update UI elements
        questionText.textContent = question.question;
        questionCounter.textContent = `Domanda ${currentQuestionIndex + 1} di ${TOTAL_QUESTIONS}`;
        scoreDisplay.textContent = `Punteggio: ${score}`;
        progressBar.style.width = `${((currentQuestionIndex) / TOTAL_QUESTIONS) * 100}%`;

        // Shuffle options and create buttons
        const shuffledOptions = [...question.options];
        shuffleArray(shuffledOptions);

        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'w-full p-4 text-left bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg border-2 border-transparent transition-all duration-200';
            button.addEventListener('click', handleAnswer);
            answerOptions.appendChild(button);
        });
    }

    /**
     * Handles the user's answer selection.
     * @param {Event} e The click event from the answer button.
     */
    function handleAnswer(e) {
        const selectedButton = e.target;
        const selectedAnswer = selectedButton.textContent;
        const correctAnswer = currentQuestions[currentQuestionIndex].answer;

        // Disable further clicks
        answerOptions.classList.add('disabled-options');

        // Check answer and apply styles
        if (selectedAnswer === correctAnswer) {
            score++;
            selectedButton.classList.add('correct');
        } else {
            selectedButton.classList.add('incorrect');
            // Highlight the correct answer for the user
            Array.from(answerOptions.children).forEach(button => {
                if (button.textContent === correctAnswer) {
                    button.classList.add('correct');
                }
            });
        }
        
        // Update score and progress bar
        scoreDisplay.textContent = `Punteggio: ${score}`;
        progressBar.style.width = `${((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100}%`;

        // Move to the next question or end the quiz after a delay
        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < TOTAL_QUESTIONS) {
                displayQuestion();
            } else {
                endQuiz();
            }
        }, 1500); // 1.5-second delay to show feedback
    }

    /**
     * Ends the quiz and displays the final score screen.
     */
    function endQuiz() {
        showScreen('end');
        finalScore.textContent = `${score} / ${TOTAL_QUESTIONS}`;
        endSubjectTitle.textContent = `Materia: ${currentSubject}`;
    }

    // --- FUNZIONI DI UTILITÀ ---

    /**
     * Shuffles an array in place using the Fisher-Yates algorithm.
     * @param {Array} array The array to shuffle.
     */
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
    showScreen('home'); // Start on the home screen
});
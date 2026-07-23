 // REPLACE WITH YOUR SUPABASE CREDENTIALS
    const SUPABASE_URL = 'https://hpcseeboydgfiledqrxl.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwY3NlZWJveWRnZmlsZWRxcnhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjUyNzMsImV4cCI6MjEwMDM0MTI3M30.aYBF7ct6tariXX6i6tBkto8b7Doc5UG2ist3y7m7gDg';
    
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allQuestions = [];
let questions = [];
let currentIndex = 0;
let userAnswers = {};
let reviewStatus = {};
let isSubmitted = false;
let timeRemaining = 3600;
let timerInterval = null;
let isSignUpMode = false;
let currentUser = null;

function cleanNewlines(str) {
  if (!str) return '';
  return str.replace(/\\n/g, '\n');
}

async function initQuiz() {
  checkUserSession();
  try {
    const { data, error } = await db
      .from('questions')
      .select('*')
      .eq('paper_id', '2026_07_JAN_SHIFT1')
      .order('id', { ascending: true });

    if (error) throw error;

    allQuestions = data.map(q => ({
      id: q.id,
      unit: q.unit,
      question_text: cleanNewlines(q.question_text),
      layout_text: cleanNewlines(q.layout_text),
      options: [cleanNewlines(q.option_a), cleanNewlines(q.option_b), cleanNewlines(q.option_c), cleanNewlines(q.option_d)],
      correct_option: q.correct_option,
      ai_hint: cleanNewlines(q.ai_hint)
    }));

    filterQuestions();
    startTimer();
  } catch (err) {
    alert("Failed to load questions from Supabase: " + err.message);
  }
}

function filterQuestions() {
  const selectedUnit = document.getElementById('unit-filter').value;
  questions = selectedUnit === 'ALL' ? [...allQuestions] : allQuestions.filter(q => q.unit === selectedUnit);

  currentIndex = 0;
  userAnswers = new Array(questions.length).fill(null);
  reviewStatus = new Array(questions.length).fill(false);
  isSubmitted = false;

  document.getElementById('submit-btn').classList.remove('hidden');
  document.getElementById('review-btn').classList.remove('hidden');

  renderPalette();
  if (questions.length > 0) loadQuestion(0);
}

function loadQuestion(index) {
  if (questions.length === 0) return;
  currentIndex = index;
  const q = questions[index];

  document.getElementById('question-number').innerText = `Question ${index + 1} of ${questions.length}`;
  document.getElementById('question-unit').innerText = q.unit || "General";
  document.getElementById('question-text').innerText = q.question_text;

  const layoutContainer = document.getElementById('layout-container');
  const layoutText = document.getElementById('layout-text');
  if (q.layout_text && q.layout_text.trim() !== "") {
    layoutText.innerText = q.layout_text;
    if (q.layout_text.includes('┌') || q.layout_text.includes('├')) {
      layoutText.classList.add('ascii-table');
    } else {
      layoutText.classList.remove('ascii-table');
    }
    layoutContainer.classList.remove('hidden');
  } else {
    layoutContainer.classList.add('hidden');
  }

  const optionsContainer = document.getElementById('options-container');
  optionsContainer.innerHTML = '';

  q.options.forEach((optText, optIdx) => {
    const isSelected = userAnswers[index] === optIdx;
    let borderClass = isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300';
    
    if (isSubmitted) {
      if (optIdx === q.correct_option) {
        borderClass = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold';
      } else if (isSelected && optIdx !== q.correct_option) {
        borderClass = 'border-rose-600 bg-rose-50 text-rose-900';
      }
    }

    const optDiv = document.createElement('div');
    optDiv.className = `p-4 border-2 rounded-lg cursor-pointer transition flex items-center gap-3 ${borderClass}`;
    optDiv.onclick = () => selectOption(optIdx);

    optDiv.innerHTML = `
      <div class="w-5 h-5 rounded-full border-2 border-slate-400 flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600 bg-indigo-600' : ''}">
        ${isSelected ? '<div class="w-2 h-2 bg-white rounded-full"></div>' : ''}
      </div>
      <span class="text-sm sm:text-base">${optText}</span>
    `;
    optionsContainer.appendChild(optDiv);
  });

  const hintContainer = document.getElementById('hint-container');
  if (isSubmitted) {
    document.getElementById('hint-text').innerText = q.ai_hint;
    hintContainer.classList.remove('hidden');
  } else {
    hintContainer.classList.add('hidden');
  }

  document.getElementById('prev-btn').disabled = index === 0;
  renderPalette();
}

function selectOption(optIdx) {
  if (isSubmitted) return;
  userAnswers[currentIndex] = optIdx;
  loadQuestion(currentIndex);
}

function toggleReview() {
  if (isSubmitted) return;
  reviewStatus[currentIndex] = !reviewStatus[currentIndex];
  renderPalette();
}

function navigate(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < questions.length) loadQuestion(newIndex);
}

function renderPalette() {
  const grid = document.getElementById('palette-grid');
  grid.innerHTML = '';

  questions.forEach((_, idx) => {
    let btnColor = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
    if (idx === currentIndex) {
      btnColor = 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-900 ring-offset-1';
    } else if (reviewStatus[idx]) {
      btnColor = 'bg-amber-400 text-amber-950 font-bold';
    } else if (userAnswers[idx] !== null) {
      btnColor = 'bg-emerald-500 text-white font-bold';
    }

    const btn = document.createElement('button');
    btn.className = `w-9 h-9 text-xs rounded-lg transition flex items-center justify-center ${btnColor}`;
    btn.innerText = idx + 1;
    btn.onclick = () => loadQuestion(idx);
    grid.appendChild(btn);
  });
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timeRemaining = 3600;
  timerInterval = setInterval(() => {
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      submitTest();
    } else {
      timeRemaining--;
      const mins = Math.floor(timeRemaining / 60);
      const secs = timeRemaining % 60;
      document.getElementById('timer-display').innerText = 
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// AUTHENTICATION FUNCTIONS
async function checkUserSession() {
  const { data: { user } } = await db.auth.getUser();
  if (user) {
    currentUser = user;
    document.getElementById('user-email-display').innerText = user.email;
    document.getElementById('user-pill').classList.remove('hidden');
    document.getElementById('auth-btn').classList.add('hidden');
  } else {
    currentUser = null;
    document.getElementById('user-pill').classList.add('hidden');
    document.getElementById('auth-btn').classList.remove('hidden');
  }
}

function toggleAuthModal() {
  document.getElementById('auth-modal').classList.toggle('hidden');
}

function switchAuthMode() {
  isSignUpMode = !isSignUpMode;
  document.getElementById('auth-title').innerText = isSignUpMode ? "Student Registration" : "Student Login";
  document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Sign Up" : "Login";
  document.getElementById('auth-toggle-text').innerText = isSignUpMode ? "Already have an account?" : "Don't have an account?";
  document.getElementById('auth-toggle-btn').innerText = isSignUpMode ? "Login" : "Sign Up";
}

async function handleAuthSubmit() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    if (isSignUpMode) {
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) throw error;
      alert("Registration successful! You are now logged in.");
    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    toggleAuthModal();
    checkUserSession();
  } catch (err) {
    alert("Authentication Error: " + err.message);
  }
}

async function handleLogout() {
  await db.auth.signOut();
  checkUserSession();
  alert("Logged out successfully.");
}

// SUBMISSION & HISTORY FUNCTIONS
async function submitTest() {
  if (!currentUser) {
    alert("Please log in first so your test performance can be saved to your profile!");
    toggleAuthModal();
    return;
  }

  if (!isSubmitted && !confirm("Are you sure you want to submit your test?")) return;

  isSubmitted = true;
  clearInterval(timerInterval);

  let score = 0;
  let unitStats = {};

  questions.forEach((q, idx) => {
    const isCorrect = userAnswers[idx] === q.correct_option;
    if (isCorrect) score++;

    if (!unitStats[q.unit]) unitStats[q.unit] = { total: 0, correct: 0 };
    unitStats[q.unit].total++;
    if (isCorrect) unitStats[q.unit].correct++;
  });

  const percentage = ((score / questions.length) * 100).toFixed(2);
  const timeTaken = 3600 - timeRemaining;
  const selectedUnit = document.getElementById('unit-filter').value;

  try {
    const { error } = await db.from('test_submissions').insert([{
      user_id: currentUser.id,
      user_email: currentUser.email,
      paper_id: '2026_07_JAN_SHIFT1',
      test_mode: selectedUnit === 'ALL' ? 'Full Test' : selectedUnit,
      total_questions: questions.length,
      correct_answers: score,
      score_percentage: parseFloat(percentage),
      time_taken_seconds: timeTaken,
      unit_breakdown: unitStats
    }]);

    if (error) throw error;
  } catch (err) {
    console.error("Error saving submission:", err.message);
  }

  alert(`Test Submitted Successfully!\nScore: ${score} / ${questions.length} (${percentage}%)\nTime: ${Math.floor(timeTaken / 60)} mins ${timeTaken % 60} secs`);

  document.getElementById('submit-btn').classList.add('hidden');
  document.getElementById('review-btn').classList.add('hidden');
  loadQuestion(0);
}

async function toggleHistoryModal() {
  const modal = document.getElementById('history-modal');
  modal.classList.toggle('hidden');

  if (!modal.classList.contains('hidden')) {
    if (!currentUser) {
      document.getElementById('history-list').innerHTML = `<p class="text-sm text-slate-500">Please log in to view your test history.</p>`;
      return;
    }

    const { data, error } = await db
      .from('test_submissions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('submitted_at', { ascending: false });

    const container = document.getElementById('history-list');
    if (error || !data || data.length === 0) {
      container.innerHTML = `<p class="text-sm text-slate-500">No test attempts recorded yet.</p>`;
      return;
    }

    container.innerHTML = data.map(item => `
      <div class="p-4 border rounded-xl bg-slate-50 flex justify-between items-center">
        <div>
          <span class="text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">${item.test_mode}</span>
          <p class="text-xs text-slate-500 mt-1">${new Date(item.submitted_at).toLocaleString()}</p>
        </div>
        <div class="text-right">
          <span class="text-lg font-bold text-slate-800">${item.correct_answers} / ${item.total_questions}</span>
          <span class="text-xs font-semibold block text-emerald-600">${item.score_percentage}% Score</span>
        </div>
      </div>
    `).join('');
  }
}

window.onload = initQuiz;
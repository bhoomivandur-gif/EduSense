// --- GLOBAL NAVIGATION ---
window.switchTab = function(viewId, element) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    element.classList.add('active');
};

window.openTutor = () => document.getElementById('tutorModal').style.display = 'flex';
window.closeTutor = () => document.getElementById('tutorModal').style.display = 'none';

window.handleLogout = async function() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
};

// --- DATA INITIALIZATION ---
async function init() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // 1. Fetching data from the 'profiles' table
    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        console.error("Profile load error:", error);
        return;
    }

    // 2. Weighted Score Logic
    const { data: assessments } = await supabaseClient
        .from('assessments')
        .select('score, difficulty_weight')
        .eq('user_id', user.id)
        .eq('status', 'Completed');

    if (assessments && assessments.length > 0) {
        const totalWeighted = assessments.reduce((acc, curr) => acc + (curr.score * (curr.difficulty_weight || 1)), 0);
        const average = totalWeighted / assessments.length;
        document.getElementById('overallScore').innerText = `${Math.round(average)}%`;
    }

    // 3. Update Stats (EXACT IDs from your HTML)
    const currentCredits = profile.credit_points || 0; 
    const currentLL = profile.learning_level || 1;

    // Update numbers
    if (document.getElementById('creditVal')) document.getElementById('creditVal').innerText = currentCredits;
    if (document.getElementById('llVal')) document.getElementById('llVal').innerText = currentLL;
    
    // 4. Update Header & Other UI (Fixed Syntax: Now inside init)
    if (document.getElementById('realNameDisplay')) {
        document.getElementById('realNameDisplay').innerText = profile.full_name || "Harshiv";
    }
    
    if (document.getElementById('streakReal')) {
        document.getElementById('streakReal').innerText = `${profile.streak || 0} days`;
    }
    
    if (document.getElementById('wellbeingReal')) {
        document.getElementById('wellbeingReal').innerText = profile.wellbeing_index || 0;
    }
    
    renderProgress(profile);
    setupChatListeners();
}
    // 5. Update other UI elements
    document.getElementById('streakReal').innerText = `${profile.streak || 0} days`;
    document.getElementById('wellbeingReal').innerText = profile.wellbeing_index || 0;
    
    renderProgress(profile);

function renderProgress(profile) {
    const container = document.getElementById('progress-container');
    if (!container) return;

    const subjects = [
        { name: 'Java Programming', prog: profile.java_progress || 0, col: '#f89820' },
        { name: 'Python', prog: profile.python_progress || 0, col: '#3776ab' },
        { name: 'Cloud Computing', prog: profile.cloud_progress || 0, col: '#4A90E2' }
    ];

    container.innerHTML = subjects.map(s => `
        <div style="margin-bottom:20px">
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:6px;">
                <span style="font-weight:600">${s.name}</span>
                <span style="color:var(--text-light)">${s.prog}%</span>
            </div>
            <div class="progress-bar"><div class="fill" style="width:${s.prog}%; background:${s.col}"></div></div>
        </div>`).join('');
}

// --- QUIZ & ASSESSMENT LOGIC ---
const quizData = [
    { q: "1. Which of these is a Python List?", options: ["[1, 2]", "{1, 2}", "(1, 2)", "<1, 2>"], a: "[1, 2]" },
    { q: "2. Which keyword is used to create a function?", options: ["func", "define", "def", "function"], a: "def" },
    { q: "3. How do you start a comment in Python?", options: ["//", "/*", "#", "--"], a: "#" },
    { q: "4. What is the correct file extension for Python?", options: [".pyt", ".py", ".pt", ".python"], a: ".py" },
    { q: "5. Which of these is used for a multi-line string?", options: ["'''", "###", "---", "&&&"], a: "'''" },
    { q: "6. What is the output of 2 ** 3?", options: ["6", "8", "9", "5"], a: "8" },
    { q: "7. Which operator is used for 'floor division'?", options: ["/", "%", "//", "**"], a: "//" },
    { q: "8. How do you create a dictionary?", options: ["[]", "{}", "()", "<>"], a: "{}" },
    { q: "9. Which method removes whitespace from start/end?", options: ["trim()", "strip()", "cut()", "clean()"], a: "strip()" },
    { q: "10. What is the default return value of a function?", options: ["0", "False", "None", "Null"], a: "None" }
];

window.startQuiz = function() {
    const main = document.querySelector('.main-content');
    let quizHtml = `
        <div class="panel" style="max-width: 800px; margin: 0 auto; padding: 40px; background: #f0f2f5;">
            <h1 style="margin-bottom: 10px;">Python Basics Assessment</h1>
            <form id="quizForm">
    `;

    quizData.forEach((item, index) => {
        quizHtml += `
            <div class="panel" style="margin-bottom: 20px; border: 1px solid #ddd;">
                <p style="font-weight: 600; margin-bottom: 15px;">${item.q}</p>
                <div style="display: grid; gap: 10px;">
                    ${item.options.map(opt => `
                        <label><input type="radio" name="q${index}" value="${opt}" required> ${opt}</label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    quizHtml += `
            <button type="submit" class="btn-primary" style="width: 100%; padding: 15px;">Submit Quiz</button>
        </form>
    </div>`;

    main.innerHTML = quizHtml;

    document.getElementById('quizForm').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        let correctCount = 0;
        quizData.forEach((item, index) => {
            if (formData.get(`q${index}`) === item.a) correctCount++;
        });
        const finalScore = (correctCount / quizData.length) * 100;
        await submitFinalScore(finalScore);
    };
};

async function submitFinalScore(score) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    // Applying Difficulty Weight for Python Basics
    const weight = 1.2;

    await supabaseClient.from('assessments').insert([{ 
        user_id: user.id, 
        score: score, 
        subject: 'Python',
        difficulty_weight: weight
    }]);

    await supabaseClient.from('profiles')
        .update({ python_progress: score }) 
        .eq('id', user.id);

    await updateStudentMetrics(score / 2); 

    alert(`EduSense: Quiz Submitted! Progress: ${score}%`);
    location.reload(); 
}

async function updateStudentMetrics(pointsToAdd) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: profile } = await supabaseClient.from('profiles').select('credit_points').eq('id', user.id).single();
    const newPoints = (profile.credit_points || 0) + pointsToAdd;
    await supabaseClient.from('profiles').update({ credit_points: newPoints }).eq('id', user.id);
}

// --- AI TUTOR INTERACTIVE LOGIC ---
window.sendChat = function() {
    const input = document.getElementById('chatInput');
    const chatBox = document.getElementById('ai-chat-box');
    const userMessage = input.value.trim();

    if (!userMessage || !chatBox) return;

    chatBox.innerHTML += `<div style="text-align: right; margin-bottom: 10px;"><span style="background: var(--primary); color: white; padding: 8px; border-radius: 8px; display: inline-block;">${userMessage}</span></div>`;
    input.value = '';

    setTimeout(() => {
        let botResponse = "I'm here to help! Try asking about Python or your Credit Points.";
        if (userMessage.toLowerCase().includes("python")) botResponse = "Focus on Indentation and Lists for Python Basics!";
        if (userMessage.toLowerCase().includes("credit")) botResponse = "Earn 500 credits to level up to LL 2!";
        
        chatBox.innerHTML += `<div style="text-align: left; margin-bottom: 10px;"><span style="background: #eee; padding: 8px; border-radius: 8px; display: inline-block;">🤖 ${botResponse}</span></div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 600);
};

function setupChatListeners() {
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChat();
    });
}

window.updateWellbeing = async function(status) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    let score = status === 'Great' ? 95 : status === 'Good' ? 80 : status === 'Okay' ? 60 : 40;
    await supabaseClient.from('profiles').update({ wellbeing: score }).eq('id', user.id);
    document.getElementById('wellbeingReal').innerText = score;
};

init();
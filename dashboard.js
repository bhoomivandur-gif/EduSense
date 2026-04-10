// --- GLOBAL NAVIGATION ---
window.switchTab = function(viewId, element) {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    
    // Show selected section
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
    }

    // Update Sidebar
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    if (element) element.classList.add('active');
};

window.openTutor = () => document.getElementById('tutorModal').style.display = 'flex';
window.closeTutor = () => document.getElementById('tutorModal').style.display = 'none';

window.handleLogout = async function() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
};

// --- DATA INITIALIZATION ---
async function init() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // Fetch profile - using maybeSingle() to prevent crash if row is missing
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) console.warn("Profile fetch error:", error);

        // Update UI Elements Safely
        const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
        
        setVal('realNameDisplay', profile?.full_name || "Harshiv");
        setVal('creditVal', profile?.credit_points || 0);
        setVal('llVal', profile?.learning_level || 1);
        setVal('streakReal', `${profile?.streak || 0} days`);
        setVal('wellbeingReal', profile?.wellbeing_index || 0);

        // Render Progress Bars
        renderProgress(profile || {});
        
        // Load Overall Score from assessments
        const { data: assessments } = await supabaseClient
            .from('assessments')
            .select('score, difficulty_weight')
            .eq('user_id', user.id);

        if (assessments?.length > 0) {
            const total = assessments.reduce((acc, curr) => acc + (curr.score * (curr.difficulty_weight || 1)), 0);
            setVal('overallScore', `${Math.round(total / assessments.length)}%`);
        }

        setupChatListeners();
    } catch (e) {
        console.error("Critical Init Error:", e);
    }
}

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
                <span style="color:#666">${s.prog}%</span>
            </div>
            <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
                <div style="width:${s.prog}%; background:${s.col}; height:100%;"></div>
            </div>
        </div>`).join('');
}

// --- QUIZ LOGIC ---
const quizData = [
    { q: "Which of these is a Python List?", options: ["[1, 2]", "{1, 2}", "(1, 2)", "<1, 2>"], a: "[1, 2]" },
    { q: "Which keyword is used to create a function?", options: ["func", "define", "def", "function"], a: "def" },
    { q: "How do you start a comment in Python?", options: ["//", "/*", "#", "--"], a: "#" },
    { q: "What is the correct file extension for Python?", options: [".pyt", ".py", ".pt", ".python"], a: ".py" },
    { q: "Which of these is used for a multi-line string?", options: ["'''", "###", "---", "&&&"], a: "'''" },
    { q: "What is the output of 2 ** 3?", options: ["6", "8", "9", "5"], a: "8" },
    { q: "Which operator is used for 'floor division'?", options: ["/", "%", "//", "**"], a: "//" },
    { q: "How do you create a dictionary?", options: ["[]", "{}", "()", "<>"], a: "{}" },
    { q: "Which method removes whitespace from start/end?", options: ["trim()", "strip()", "cut()", "clean()"], a: "strip()" },
    { q: "What is the default return value of a function?", options: ["0", "False", "None", "Null"], a: "None" }
];

window.startQuiz = function() {
    const main = document.querySelector('.main-content');
    let html = `<div class="panel" style="max-width:800px; margin:20px auto; padding:30px;">
        <h2>Python Basics Assessment</h2>
        <form id="quizForm">`;

    quizData.forEach((item, i) => {
        html += `<div style="margin-bottom:20px; padding:15px; border-bottom:1px solid #eee;">
            <p><strong>${i+1}. ${item.q}</strong></p>
            ${item.options.map(opt => `<label style="display:block; margin:5px 0;">
                <input type="radio" name="q${i}" value="${opt}" required> ${opt}
            </label>`).join('')}
        </div>`;
    });

    html += `<button type="submit" class="btn-primary" style="width:100%; padding:15px;">Submit Quiz</button></form></div>`;
    main.innerHTML = html;

    document.getElementById('quizForm').onsubmit = async (e) => {
        e.preventDefault();
        alert("Checking answers... please wait.");
        
        const formData = new FormData(e.target);
        let correct = 0;
        quizData.forEach((item, i) => { if(formData.get(`q${i}`) === item.a) correct++; });
        
        const score = (correct / quizData.length) * 100;
        await submitFinalScore(score);
    };
};

async function submitFinalScore(score) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        // 1. Record Assessment
        await supabaseClient.from('assessments').insert([{ 
            user_id: user.id, score, subject: 'Python', status: 'Completed' 
        }]);

        // 2. Update Progress & Credits
        const { data: profile } = await supabaseClient.from('profiles').select('credit_points').eq('id', user.id).single();
        const newPoints = (profile?.credit_points || 0) + (score === 100 ? 50 : score/2);

        await supabaseClient.from('profiles').update({ 
            python_progress: score, 
            credit_points: newPoints 
        }).eq('id', user.id);

        alert(`Quiz Submitted! Final Score: ${score}%`);
        location.reload();
    } catch (err) {
        console.error("Submission Error:", err);
        alert("Error saving score. Check console.");
    }
}

// Start app
init();
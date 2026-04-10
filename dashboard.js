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
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // 1. Fetch Profile for general stats
   // Change .single() to .maybeSingle() to prevent the crash
const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle(); 

if (error) {
    console.error("Profile error:", error);
    return;
}

// If profile is null, the script won't crash now
if (!profile) {
    document.getElementById('realNameDisplay').innerText = "Guest User";
    return; 
}
    // 2. Fetch Assessments for the REAL Overall Score
    const { data: assessments } = await supabaseClient
        .from('assessments')
        .select('score')
        .eq('user_id', user.id);

    // 3. Update User Header
    const name = profile.full_name || "Student";
    document.getElementById('realNameDisplay').innerText = name;
    document.getElementById('greeting').innerText = `Good morning, ${name.split(' ')[0]} 👋`;
    document.getElementById('userInitials').innerText = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    // 4. Update Stats with REAL Logic
    let average = 0;
    if (assessments && assessments.length > 0) {
        average = assessments.reduce((acc, curr) => acc + curr.score, 0) / assessments.length;
        document.getElementById('overallScore').innerText = `${Math.round(average)}%`;
    } else {
        document.getElementById('overallScore').innerText = `0%`; 
    }

    const creditPoints = profile.credit_points || 0;
    const calculatedLL = Math.floor(creditPoints / 500) + 1;
    
    document.getElementById('streakReal').innerText = `${profile.streak || 0} days`;
    document.getElementById('wellbeingReal').innerText = profile.wellbeing || 0;
    document.getElementById('creditVal').innerText = creditPoints;
    document.getElementById('llVal').innerText = calculatedLL;

    // 5. Render Subject Progress Bars
    renderProgress(profile);

    // 6. Adaptive EduSense Insights
    const adaptiveMessage = document.getElementById('adaptive-hint');
    if (adaptiveMessage) {
        if (average < 50 && assessments.length > 0) {
            adaptiveMessage.innerText = "⚠️ EduSense Notice: Your score is a bit low. Try the 'Python' modules again!";
        } else if (creditPoints > 100) {
            adaptiveMessage.innerText = "🌟 EduSense Insight: Great progress! You're on track to reach Learning Level 2.";
        } else {
            adaptiveMessage.innerText = "🚀 Welcome to EduSense! Complete a quiz to start your adaptive journey.";
        }
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
                <span style="color:var(--text-light)">${s.prog}%</span>
            </div>
            <div class="progress-bar"><div class="fill" style="width:${s.prog}%; background:${s.col}"></div></div>
        </div>`).join('');
}

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
            <div style="background: var(--primary); height: 10px; border-radius: 8px 8px 0 0; margin: -40px -40px 30px -40px;"></div>
            <h1 style="margin-bottom: 10px;">Python Basics Assessment</h1>
            <p style="color: #666; margin-bottom: 30px;">Complete all 10 questions to earn your credits.</p>
            <form id="quizForm">
    `;

    quizData.forEach((item, index) => {
        quizHtml += `
            <div class="panel" style="margin-bottom: 20px; border: 1px solid #ddd;">
                <p style="font-weight: 600; font-size: 16px; margin-bottom: 15px;">${item.q}</p>
                <div style="display: grid; gap: 10px;">
                    ${item.options.map(opt => `
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 4px; transition: 0.2s;">
                            <input type="radio" name="q${index}" value="${opt}" required style="width: 18px; height: 18px;">
                            ${opt}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });

    quizHtml += `
            <button type="submit" class="btn-primary" style="width: 100%; padding: 15px; font-size: 18px; margin-top: 20px;">Submit Quiz</button>
            <button type="button" onclick="location.reload()" style="width: 100%; background: none; border: none; color: #666; margin-top: 15px; cursor: pointer;">Cancel</button>
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
    
    // 1. Save to Assessments for the Overall Score calculation
    await supabaseClient.from('assessments').insert([{ 
        user_id: user.id, 
        score: score, 
        subject: 'Python' 
    }]);

    // 2. Update the specific profile column for the progress bar
    // Use 'python_progress' to match your renderProgress mapping
    await supabaseClient.from('profiles')
        .update({ python_progress: score }) 
        .eq('id', user.id);

    // 3. Update Credit Points
    await updateStudentMetrics(score / 2); 

    alert(`EduSense: Quiz Submitted! Your Python progress is now ${score}%.`);
    location.reload(); 
}

async function updateStudentMetrics(pointsToAdd) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: profile } = await supabaseClient.from('profiles').select('credit_points').eq('id', user.id).single();
    const newPoints = (profile.credit_points || 0) + pointsToAdd;
    await supabaseClient.from('profiles').update({ credit_points: newPoints }).eq('id', user.id);
}

window.updateWellbeing = async function(status) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    let score = status === 'Great' ? 95 : status === 'Good' ? 80 : status === 'Okay' ? 60 : 40;
    const { error } = await supabaseClient.from('profiles').update({ wellbeing: score }).eq('id', user.id);
    if (!error) {
        document.getElementById('wellbeingReal').innerText = score;
        alert(`EduSense: Mood logged as ${status}!`);
    }
};

init();
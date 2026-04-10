const SUPABASE_URL = 'https://rdyagifyaxnmanuwauxj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wfckj6DpJUSBfX1xpvRrjA_BlnO76aO';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;

    if (!email || !password || !fullName) {
        alert("Please fill in all fields.");
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        alert("Signup Error: " + error.message);
    } else if (data.user) {
        // Insert into the profiles table so dashboard can find the name
        const { error: profileError } = await supabaseClient.from('profiles').insert([
            { 
                id: data.user.id, 
                full_name: fullName, 
                credits: 263, 
                streak: 12, 
                overall_score: 84 
            }
        ]);
        if (profileError) console.error("Profile creation error:", profileError);
        alert("Signup successful! You can now login.");
    }
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        alert("Login Error: " + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
}
// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            this.onAuthStateChange(true);
        } else {
            this.onAuthStateChange(false);
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.onAuthStateChange(true);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.onAuthStateChange(false);
            }
        });
    }

    onAuthStateChange(authenticated) {
        if (window.location.pathname.includes('course.html')) {
            this.handleCoursePageAuth(authenticated);
        } else if (window.location.pathname.includes('login.html')) {
            this.handleLoginPageAuth(authenticated);
        }
    }

    handleCoursePageAuth(authenticated) {
        const authRequired = document.getElementById('authRequired');
        const dashboard = document.getElementById('dashboard');
        const progressSection = document.getElementById('progress');
        const userEmail = document.getElementById('userEmail');

        if (authenticated) {
            authRequired.style.display = 'none';
            dashboard.style.display = 'block';
            progressSection.style.display = 'block';
            userEmail.textContent = this.currentUser.email;
            
            // Initialize LMS if it exists
            if (window.lmsManager) {
                window.lmsManager.loadUserData();
            }
        } else {
            authRequired.style.display = 'block';
            dashboard.style.display = 'none';
            progressSection.style.display = 'none';
        }
    }

    handleLoginPageAuth(authenticated) {
        if (authenticated) {
            window.location.href = 'course.html';
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signUp(email, password, name) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name
                    }
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signInWithProvider(provider) {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}/course.html`
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/login.html`
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Initialize Auth Manager
const authManager = new AuthManager();

// Login Page Event Handlers
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const resetForm = document.getElementById('resetPasswordForm');
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        const showLoginFromReset = document.getElementById('showLoginFromReset');
        const forgotPassword = document.getElementById('forgotPassword');
        const googleLogin = document.getElementById('googleLogin');
        const githubLogin = document.getElementById('githubLogin');
        const authMessage = document.getElementById('authMessage');

        // Form Toggles
        showSignup?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').parentElement.style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
            resetForm.parentElement.style.display = 'none';
        });

        showLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').parentElement.style.display = 'block';
            document.getElementById('signupForm').style.display = 'none';
            resetForm.parentElement.style.display = 'none';
        });

        showLoginFromReset?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').parentElement.style.display = 'block';
            document.getElementById('signupForm').style.display = 'none';
            resetForm.parentElement.style.display = 'none';
        });

        forgotPassword?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').parentElement.style.display = 'none';
            document.getElementById('signupForm').style.display = 'none';
            resetForm.parentElement.style.display = 'block';
        });

        // Login Form
        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('loginBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const result = await authManager.signIn(email, password);

            if (result.success) {
                showMessage('🎉 Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'course.html';
                }, 1000);
            } else {
                showMessage(`❌ ${result.error}`, 'error');
            }

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        });

        // Register Form
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('signupBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                showMessage('❌ Passwords do not match', 'error');
                return;
            }

            if (password.length < 6) {
                showMessage('❌ Password must be at least 6 characters', 'error');
                return;
            }

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            const result = await authManager.signUp(email, password, name);

            if (result.success) {
                showMessage('🎉 Account created! Please check your email for verification.', 'success');
                setTimeout(() => {
                    window.location.href = 'course.html';
                }, 2000);
            } else {
                showMessage(`❌ ${result.error}`, 'error');
            }

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        });

        // Reset Password Form
        resetForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('resetBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            const email = document.getElementById('resetEmail').value;

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            const result = await authManager.resetPassword(email);

            if (result.success) {
                showMessage('📧 Password reset link sent to your email!', 'success');
            } else {
                showMessage(`❌ ${result.error}`, 'error');
            }

            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        });

        // OAuth Login
        googleLogin?.addEventListener('click', async () => {
            const result = await authManager.signInWithProvider('google');
            if (!result.success) {
                showMessage(`❌ ${result.error}`, 'error');
            }
        });

        githubLogin?.addEventListener('click', async () => {
            const result = await authManager.signInWithProvider('github');
            if (!result.success) {
                showMessage(`❌ ${result.error}`, 'error');
            }
        });

        function showMessage(message, type) {
            authMessage.textContent = message;
            authMessage.className = `form-message ${type}`;
            authMessage.style.display = 'block';
            
            setTimeout(() => {
                authMessage.style.display = 'none';
            }, 5000);
        }
    });
}

// Course Page Event Handlers
if (window.location.pathname.includes('course.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            const result = await authManager.signOut();
            if (result.success) {
                window.location.href = 'login.html';
            }
        });
    });
}

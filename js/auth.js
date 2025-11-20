// Supabase Configuration
const SUPABASE_URL = 'https://usooclimfkregwrtmdki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb29jbGltZmtyZWd3cnRtZGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Nzg2MTEsImV4cCI6MjA3OTA1NDYxMX0.43Wy4GS_DSx4IWXmFKg5wz0YwmV7lsadWcm0ysCcfe0';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.extractedAccessToken = "";
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
            console.log('Auth state changed:', event);
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
        const userEmail = document.getElementById('userEmail');

        if (authenticated) {
            authRequired.style.display = 'none';
            dashboard.style.display = 'block';
            userEmail.textContent = this.currentUser.email;
            
            if (window.lmsManager) {
                window.lmsManager.loadUserData();
            }
        } else {
            authRequired.style.display = 'block';
            dashboard.style.display = 'none';
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

    async signUp(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    emailRedirectTo: window.location.origin + '/login.html'
                }
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/login.html'
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Profile management methods
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getUserCourses(userId) {
        try {
            const { data, error } = await supabase
                .from('user_courses')
                .select(`
                    *,
                    courses (*)
                `)
                .eq('user_id', userId)
                .eq('payment_status', 'completed');

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getUserProgress(userId) {
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select(`
                    *,
                    course_modules (*)
                `)
                .eq('user_id', userId);

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
}

// Initialize Auth Manager
const authManager = new AuthManager();

// Login Page Event Handlers
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('loginFormElement');
        const registerForm = document.getElementById('registerForm');
        const resetForm = document.getElementById('resetPasswordForm');
        const resetTokenForm = document.getElementById('resetTokenFormElement');
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        const showLoginFromReset = document.getElementById('showLoginFromReset');
        const showResetFromToken = document.getElementById('showResetFromToken');
        const forgotPassword = document.getElementById('forgotPassword');
        const resetUrlInput = document.getElementById('resetUrl');
        const authMessage = document.getElementById('authMessage');

        // Form Toggles
        showSignup?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'block';
            document.getElementById('resetForm').style.display = 'none';
            document.getElementById('resetTokenForm').style.display = 'none';
            clearMessage();
        });

        showLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('resetForm').style.display = 'none';
            document.getElementById('resetTokenForm').style.display = 'none';
            clearMessage();
        });

        // Replace the forgotPassword event handler
forgotPassword?.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Get the email from login form if available
    const email = document.getElementById('email')?.value || '';
    
    // Create WhatsApp message with prefilled email
    const message = `Hi, I need help recovering my password. My email is: ${email || 'not provided'}`;
    const whatsappUrl = `https://wa.me/917504704502?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
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

            if (!email || !password) {
                showMessage('Please fill in all fields', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            if (!isValidEmail(email)) {
                showMessage('Please enter a valid email address', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            const result = await authManager.signIn(email, password);

            if (result.success) {
                showMessage('🎉 Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'course.html';
                }, 1000);
            } else {
                handleAuthError(result.error);
            }

            resetButtonState(submitBtn, btnText, btnLoading);
        });

        // Register Form
        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('signupBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (!email || !password || !confirmPassword) {
                showMessage('Please fill in all fields', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            if (!isValidEmail(email)) {
                showMessage('Please enter a valid email address', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            if (password.length < 6) {
                showMessage('Password must be at least 6 characters', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            const result = await authManager.signUp(email, password);

            if (result.success) {
                showMessage('🎉 Account created! Please check your email to confirm your account.', 'success');
                
                registerForm.reset();
                setTimeout(() => {
                    document.getElementById('loginForm').style.display = 'block';
                    document.getElementById('signupForm').style.display = 'none';
                    showMessage('✅ Please check your email and confirm your account, then login.', 'success');
                }, 3000);
            } else {
                handleAuthError(result.error);
            }

            resetButtonState(submitBtn, btnText, btnLoading);
        });

        // Password Reset Request Form
        resetForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('resetBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            const email = document.getElementById('resetEmail').value;

            if (!email) {
                showMessage('Please enter your email address', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            if (!isValidEmail(email)) {
                showMessage('Please enter a valid email address', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            const result = await authManager.resetPassword(email);

            if (result.success) {
                showMessage('📧 Password reset link sent! Check your email and paste the URL below.', 'success');
                
                resetForm.reset();
                document.getElementById('resetForm').style.display = 'none';
                document.getElementById('resetTokenForm').style.display = 'block';
            } else {
                handleAuthError(result.error);
            }

            resetButtonState(submitBtn, btnText, btnLoading);
        });

        // Password Reset Token Form - UPDATED APPROACH
        resetTokenForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('resetTokenBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            const resetUrl = document.getElementById('resetUrl').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (!resetUrl || !newPassword || !confirmNewPassword) {
                showMessage('Please fill in all fields', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            if (newPassword.length < 6) {
                showMessage('Password must be at least 6 characters', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showMessage('Passwords do not match', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            let recoveryToken = authManager.extractedAccessToken;
            if (!recoveryToken) {
                recoveryToken = authManager.extractTokenFromUrl(resetUrl);
            }

            if (!recoveryToken) {
                showMessage('❌ Please paste a valid reset URL containing a token', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            showMessage('🔄 Processing password reset...', 'info');

            // Try the recovery token approach first
            let result = await authManager.updatePasswordWithRecovery(recoveryToken, newPassword);
            
            // If that fails, try the direct approach
            if (!result.success) {
                showMessage('🔄 Trying alternative method...', 'info');
                result = await authManager.updatePasswordDirect(recoveryToken, newPassword);
            }

            if (result.success) {
                showMessage('✅ Password reset successfully! You can now login with your new password.', 'success');
                
                setTimeout(() => {
                    document.getElementById('resetTokenForm').style.display = 'none';
                    document.getElementById('loginForm').style.display = 'block';
                    resetTokenForm.reset();
                    authManager.extractedAccessToken = "";
                }, 3000);
            } else {
                handleAuthError(result.error);
            }

            resetButtonState(submitBtn, btnText, btnLoading);
        });

        function handleAuthError(error) {
            console.error('Auth error:', error);
            
            if (error.includes('Invalid login credentials')) {
                showMessage('❌ Invalid email or password', 'error');
            } else if (error.includes('Email not confirmed')) {
                showMessage('📧 Please confirm your email before logging in', 'error');
            } else if (error.includes('already registered')) {
                showMessage('❌ An account with this email already exists', 'error');
            } else if (error.includes('invalid token') || error.includes('expired')) {
                showMessage('❌ Invalid or expired reset token. Please request a new reset link.', 'error');
            } else if (error.includes('Password should be at least 6 characters')) {
                showMessage('❌ Password must be at least 6 characters', 'error');
            } else if (error.includes('Auth session missing')) {
                showMessage('❌ Please use the recovery token from your email, not an access token.', 'error');
            } else {
                showMessage('❌ ' + error, 'error');
            }
        }

        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }

        function showMessage(message, type) {
            authMessage.textContent = message;
            authMessage.className = `form-message ${type}`;
            authMessage.style.display = 'block';
            
            if (type === 'success') {
                setTimeout(() => {
                    authMessage.style.display = 'none';
                }, 8000);
            }
        }

        function clearMessage() {
            authMessage.style.display = 'none';
        }

        function resetButtonState(button, text, loading) {
            text.style.display = 'inline';
            loading.style.display = 'none';
            button.disabled = false;
        }

        console.log('Auth system initialized with Supabase credentials');
    });
}

// Course Page Event Handlers
if (window.location.pathname.includes('course.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            const result = await authManager.signOut();
            if (result.success) {
                window.location.href = 'login.html';
            } else {
                alert('Logout failed: ' + result.error);
            }
        });
    });
}

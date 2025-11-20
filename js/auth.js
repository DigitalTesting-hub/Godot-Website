// Supabase Configuration - USING YOUR CREDENTIALS
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
            
            // Initialize LMS if it exists
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

    // COMPLETELY FIXED: Use direct REST API call without auth session
    async updatePasswordWithToken(accessToken, newPassword) {
        try {
            console.log("Updating password with access token:", accessToken.substring(0, 20) + "...");
            
            const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    password: newPassword
                })
            });

            const data = await response.json();
            console.log("Password update response:", { status: response.status, data });
            
            if (!response.ok) {
                const errorMsg = data.error_description || data.msg || data.error || 'Password update failed';
                throw new Error(errorMsg);
            }

            return { success: true, data };
        } catch (error) {
            console.error("Password update error:", error);
            return { success: false, error: error.message };
        }
    }

    // Validate the access token before using it
    async validateAccessToken(accessToken) {
        try {
            console.log("Validating access token:", accessToken.substring(0, 20) + "...");
            
            const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            console.log("Token validation response:", { status: response.status, data });
            
            if (response.ok) {
                return { 
                    valid: true, 
                    user: data,
                    message: 'Token is valid'
                };
            } else {
                return { 
                    valid: false, 
                    error: data.error_description || data.msg || 'Invalid token',
                    status: response.status
                };
            }
        } catch (error) {
            console.error("Token validation error:", error);
            return { 
                valid: false, 
                error: error.message 
            };
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

    // Extract access token from URL (same as your Godot method)
    extractAccessTokenFromUrl(url) {
        console.log("Attempting to extract access token from URL: ", url);
        
        // Method 1: Try to extract access_token parameter (most common)
        var access_token_start = url.indexOf("access_token=");
        if (access_token_start !== -1) {
            access_token_start += 13;  // Length of "access_token="
            var access_token_end = url.indexOf("&", access_token_start);
            if (access_token_end === -1) {
                access_token_end = url.length;
            }
            
            var token = url.substring(access_token_start, access_token_end);
            console.log("Extracted access_token: ", token);
            return token;
        }
        
        // Method 2: Try to extract token parameter
        var token_start = url.indexOf("token=");
        if (token_start !== -1) {
            token_start += 6;  // Length of "token="
            var token_end = url.indexOf("&", token_start);
            if (token_end === -1) {
                token_end = url.length;
            }
            
            var token = url.substring(token_start, token_end);
            console.log("Extracted token: ", token);
            return token;
        }

        // Method 3: Try to extract from hash fragment (common in OAuth)
        var hash_start = url.indexOf("#");
        if (hash_start !== -1) {
            var hash_params = url.substring(hash_start + 1);
            var params = new URLSearchParams(hash_params);
            if (params.has('access_token')) {
                var token = params.get('access_token');
                console.log("Extracted access_token from hash: ", token);
                return token;
            }
        }
        
        console.log("No access token found in URL");
        return "";
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

        forgotPassword?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('resetForm').style.display = 'block';
            document.getElementById('resetTokenForm').style.display = 'none';
            clearMessage();
        });

        showLoginFromReset?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('resetForm').style.display = 'none';
            document.getElementById('resetTokenForm').style.display = 'none';
            clearMessage();
        });

        showResetFromToken?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('signupForm').style.display = 'none';
            document.getElementById('resetForm').style.display = 'block';
            document.getElementById('resetTokenForm').style.display = 'none';
            clearMessage();
        });

        // Auto-detect URL paste and extract access token
        resetUrlInput?.addEventListener('input', function(e) {
            const url = e.target.value;
            if (url.includes('http') && (url.includes('access_token=') || url.includes('token=') || url.includes('#'))) {
                const token = authManager.extractAccessTokenFromUrl(url);
                if (token) {
                    authManager.extractedAccessToken = token;
                    showMessage('✅ Access token automatically extracted from URL! Validating token...', 'success');
                    
                    // Validate the token immediately
                    authManager.validateAccessToken(token).then(validation => {
                        if (validation.valid) {
                            showMessage('✅ Token is valid! You can now set your new password.', 'success');
                            e.target.value = "✅ Valid token detected - Ready for password reset!";
                        } else {
                            showMessage('❌ Invalid or expired token: ' + validation.error, 'error');
                            e.target.value = "❌ Invalid token - Please request a new reset link";
                        }
                    });
                    
                    // Keep the visual feedback
                    setTimeout(() => {
                        if (e.target.value.includes("✅")) {
                            e.target.value = "Access token ready (validated)";
                        }
                    }, 3000);
                }
            }
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

            // Validation
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
                
                // Clear form
                registerForm.reset();
                
                // Switch back to login after delay
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
                
                // Clear form and switch to token entry form
                resetForm.reset();
                document.getElementById('resetForm').style.display = 'none';
                document.getElementById('resetTokenForm').style.display = 'block';
                
                // Show detailed instructions
                showMessage('📧 Check your email for the reset link. Paste the entire URL in the field below - we will automatically extract the access token.', 'success');
            } else {
                handleAuthError(result.error);
            }

            resetButtonState(submitBtn, btnText, btnLoading);
        });

        // Password Reset Token Form - COMPLETELY FIXED
        resetTokenForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('resetTokenBtn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');

            const resetUrl = document.getElementById('resetUrl').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            // Validation
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

            // Use extracted token or try to extract from URL
            let accessToken = authManager.extractedAccessToken;
            if (!accessToken) {
                accessToken = authManager.extractAccessTokenFromUrl(resetUrl);
            }

            if (!accessToken) {
                showMessage('❌ Please paste a valid reset URL containing an access token', 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;

            showMessage('🔄 Validating token and updating password...', 'info');

            // Validate token first
            const validation = await authManager.validateAccessToken(accessToken);
            if (!validation.valid) {
                showMessage('❌ Invalid or expired reset token: ' + validation.error, 'error');
                resetButtonState(submitBtn, btnText, btnLoading);
                return;
            }

            showMessage('✅ Token valid! Updating password...', 'success');

            // Use the fixed update method
            const result = await authManager.updatePasswordWithToken(accessToken, newPassword);

            if (result.success) {
                showMessage('✅ Password reset successfully! You can now login with your new password.', 'success');
                
                // Clear everything and redirect to login
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
                showMessage('❌ Session expired. Please use the password reset link from your email.', 'error');
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
            
            // Only auto-hide success messages after longer delay
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
        // Logout button
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

// auth.js - Fixed with Proper CORS Handling and POST Method
class AuthManager {
    constructor() {
        this.supabaseUrl = 'https://usooclimfkregwrtmdki.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb29jbGltZmtyZWd3cnRtZGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Nzg2MTEsImV4cCI6MjA3OTA1NDYxMX0.43Wy4GS_DSx4IWXmFKg5wz0YwmV7lsadWcm0ysCcfe0';
        this.supabase = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Dynamically load Supabase if not available
            if (typeof window.supabase === 'undefined') {
                await this.loadSupabase();
            }
            
            this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });

            await this.checkAuthState();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('AuthManager initialization failed:', error);
            this.handleAuthError(error);
        }
    }

    async loadSupabase() {
        return new Promise((resolve, reject) => {
            if (typeof window.supabase !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async checkAuthState() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                throw error;
            }

            if (session && session.user) {
                this.currentUser = session.user;
                this.onAuthSuccess(session.user);
            } else {
                this.onAuthFailure();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.onAuthFailure();
        }
    }

    async login(email, password) {
        try {
            this.showLoadingState('login');
            
            // Validate inputs
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (!password || password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                throw error;
            }

            this.currentUser = data.user;
            this.onAuthSuccess(data.user);
            return { success: true, user: data.user };

        } catch (error) {
            console.error('Login error:', error);
            this.handleAuthError(error);
            return { success: false, error: error.message };
        } finally {
            this.hideLoadingState('login');
        }
    }

    async register(email, password, confirmPassword) {
        try {
            this.showLoadingState('register');
            
            // Validation
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            if (!password || password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            const { data, error } = await this.supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login.html`,
                    data: {
                        email: email.trim()
                    }
                }
            });

            if (error) {
                throw error;
            }

            // Create user profile immediately
            if (data.user) {
                await this.createUserProfile(data.user.id, email.trim());
            }

            this.showMessage('🎉 Account created successfully! Please check your email to confirm your account.', 'success');
            return { success: true, user: data.user };

        } catch (error) {
            console.error('Registration error:', error);
            this.handleAuthError(error);
            return { success: false, error: error.message };
        } finally {
            this.hideLoadingState('register');
        }
    }

    async createUserProfile(userId, email) {
        try {
            const { error } = await this.supabase
                .from('profiles')
                .insert([{
                    id: userId,
                    email: email,
                    subscription_tier: 'free',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);

            if (error) {
                console.warn('Profile creation warning (might already exist):', error);
                // Continue anyway - profile might exist
            } else {
                console.log('✅ User profile created successfully');
            }
        } catch (error) {
            console.error('Profile creation error:', error);
            // Non-critical error, continue
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.onLogoutSuccess();
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('Logout failed: ' + error.message, 'error');
        }
    }

    async resetPassword(email) {
        try {
            this.showLoadingState('reset');
            
            if (!this.validateEmail(email)) {
                throw new Error('Please enter a valid email address');
            }

            const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/login.html`
            });

            if (error) {
                throw error;
            }

            this.showMessage('📧 Password reset link sent! Check your email.', 'success');
            return { success: true };

        } catch (error) {
            console.error('Password reset error:', error);
            this.handleAuthError(error);
            return { success: false, error: error.message };
        } finally {
            this.hideLoadingState('reset');
        }
    }

    async updatePassword(accessToken, newPassword) {
        try {
            this.showLoadingState('passwordUpdate');
            
            if (!newPassword || newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            }, {
                accessToken: accessToken
            });

            if (error) {
                throw error;
            }

            this.showMessage('✅ Password updated successfully! You can now login.', 'success');
            return { success: true };

        } catch (error) {
            console.error('Password update error:', error);
            this.handleAuthError(error);
            return { success: false, error: error.message };
        } finally {
            this.hideLoadingState('passwordUpdate');
        }
    }

    // Utility Methods
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email?.trim());
    }

    showLoadingState(formType) {
        const buttons = {
            login: document.getElementById('loginBtn'),
            register: document.getElementById('signupBtn'),
            reset: document.getElementById('resetBtn'),
            passwordUpdate: document.getElementById('resetTokenBtn')
        };

        const button = buttons[formType];
        if (button) {
            const btnText = button.querySelector('.btn-text');
            const btnLoading = button.querySelector('.btn-loading');
            
            if (btnText && btnLoading) {
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline';
                button.disabled = true;
            }
        }
    }

    hideLoadingState(formType) {
        const buttons = {
            login: document.getElementById('loginBtn'),
            register: document.getElementById('signupBtn'),
            reset: document.getElementById('resetBtn'),
            passwordUpdate: document.getElementById('resetTokenBtn')
        };

        const button = buttons[formType];
        if (button) {
            const btnText = button.querySelector('.btn-text');
            const btnLoading = button.querySelector('.btn-loading');
            
            if (btnText && btnLoading) {
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                button.disabled = false;
            }
        }
    }

    showMessage(message, type) {
        // Try multiple possible message element IDs
        const messageElement = document.getElementById('authMessage') || 
                              document.getElementById('formMessage') ||
                              this.createMessageElement();
        
        messageElement.textContent = message;
        messageElement.className = `form-message ${type}`;
        messageElement.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }

    createMessageElement() {
        const messageElement = document.createElement('div');
        messageElement.id = 'authMessage';
        messageElement.className = 'form-message';
        messageElement.style.display = 'none';
        
        // Try to insert near forms
        const forms = document.querySelectorAll('.auth-form, .lead-form');
        if (forms.length > 0) {
            forms[0].parentNode.insertBefore(messageElement, forms[0].nextSibling);
        } else {
            document.body.appendChild(messageElement);
        }
        
        return messageElement;
    }

    handleAuthError(error) {
        console.error('Auth error:', error);
        
        const errorMessages = {
            'Invalid login credentials': '❌ Invalid email or password',
            'Email not confirmed': '📧 Please confirm your email before logging in',
            'User already registered': '❌ An account with this email already exists',
            'Password should be at least 6 characters': '❌ Password must be at least 6 characters',
            'Invalid email': '❌ Please enter a valid email address'
        };

        const friendlyMessage = errorMessages[error.message] || `❌ ${error.message}`;
        this.showMessage(friendlyMessage, 'error');
    }

    onAuthSuccess(user) {
        console.log('Auth success:', user.email);
        this.showMessage('🎉 Authentication successful! Redirecting...', 'success');
        
        // Update UI elements
        this.updateAuthUI(user);
        
        // Redirect after short delay
        setTimeout(() => {
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname.includes('index.html')) {
                window.location.href = 'course.html';
            }
        }, 1000);
    }

    onAuthFailure() {
        console.log('No active session');
        // Don't show error message for normal non-authenticated state
    }

    onLogoutSuccess() {
        console.log('Logout successful');
        this.showMessage('👋 Logged out successfully', 'success');
        
        // Redirect to login after short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    updateAuthUI(user) {
        // Update user info in various elements
        const userElements = [
            document.getElementById('userEmail'),
            document.getElementById('displayEmail'),
            document.getElementById('mobileUserEmail')
        ];

        userElements.forEach(element => {
            if (element) element.textContent = user.email;
        });
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email')?.value;
                const password = document.getElementById('password')?.value;
                await this.login(email, password);
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('signupEmail')?.value;
                const password = document.getElementById('signupPassword')?.value;
                const confirmPassword = document.getElementById('confirmPassword')?.value;
                await this.register(email, password, confirmPassword);
            });
        }

        // Logout buttons
        const logoutButtons = [
            document.getElementById('logoutBtn'),
            document.getElementById('mobileLogoutBtn')
        ];

        logoutButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', () => this.logout());
            }
        });

        // Form toggles
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');

        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleForms('signup');
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleForms('login');
            });
        }
    }

    toggleForms(showForm) {
        const forms = {
            login: document.getElementById('loginForm'),
            signup: document.getElementById('signupForm'),
            reset: document.getElementById('resetForm'),
            resetToken: document.getElementById('resetTokenForm')
        };

        // Hide all forms first
        Object.values(forms).forEach(form => {
            if (form) form.style.display = 'none';
        });

        // Show the requested form
        if (forms[showForm]) {
            forms[showForm].style.display = 'block';
        }

        // Clear any existing messages
        this.showMessage('', '');
    }

    // Cross-platform POST method for external APIs
    async makePostRequest(url, data, options = {}) {
        const defaultOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(data)
        };

        const fetchOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, fetchOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('POST request failed:', error);
            throw error;
        }
    }
}

// Initialize Auth Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
    
    // Set up auth state change listener
    if (window.supabase) {
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
            
            if (window.authManager) {
                window.authManager.checkAuthState();
            }
        });
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}

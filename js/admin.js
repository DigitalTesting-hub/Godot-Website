// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.courses = [];
        this.students = [];
        this.filteredCourses = [];
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        await this.checkAdminAuth();
        await this.loadDashboardData();
        this.setupEventListeners();
        this.renderDashboard();
    }

    async checkAdminAuth() {
        console.log('🔐 Checking admin auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user) {
            console.log('👤 User session found:', session.user.email);
            this.currentUser = session.user;
            
            const isAdmin = await this.checkAdminRole(session.user.id);
            console.log('🛡️ Admin check result:', isAdmin);
            
            if (!isAdmin) {
                console.log('❌ Access denied - not admin');
                this.redirectToLogin('Access denied. Admin privileges required.');
                return;
            }
            
            this.currentUser = session.user;
            document.getElementById('adminEmail').textContent = session.user.email;
            document.getElementById('mobileAdminEmail').textContent = session.user.email;
            console.log('✅ Admin access granted');
            
        } else {
            console.log('❌ No user session found');
            this.redirectToLogin('Please login to access admin panel.');
        }
    }

    async checkAdminRole(userId) {
        // Simple email-based admin check
        const adminEmails = ['graphicyin@gmail.com'];
        
        if (!this.currentUser || !this.currentUser.email) {
            console.log('❌ No current user or email found');
            return false;
        }
        
        const isAdmin = adminEmails.includes(this.currentUser.email.toLowerCase());
        console.log('🛡️ Admin check for', this.currentUser.email, ':', isAdmin);
        return isAdmin;
    }

    redirectToLogin(message = '') {
        console.log('🔀 Redirecting to login:', message);
        if (message) {
            localStorage.setItem('adminLoginMessage', message);
        }
        window.location.href = 'admin-login.html';
    }

    setupEventListeners() {
        // Logout buttons
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('mobileAdminLogoutBtn').addEventListener('click', () => this.logout());

        // Course form
        document.getElementById('courseForm').addEventListener('submit', (e) => this.handleCourseSubmit(e));

        // Mobile menu
        this.setupMobileMenu();
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileCloseBtn = document.getElementById('mobileCloseBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.openMobileMenu());
        }
        if (mobileCloseBtn) {
            mobileCloseBtn.addEventListener('click', () => this.closeMobileMenu());
        }
        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', () => this.closeMobileMenu());
        }
    }

    openMobileMenu() {
        document.getElementById('mobileMenu').classList.add('active');
        document.getElementById('mobileMenuOverlay').classList.add('active');
        document.body.classList.add('menu-open');
    }

    closeMobileMenu() {
        document.getElementById('mobileMenu').classList.remove('active');
        document.getElementById('mobileMenuOverlay').classList.remove('active');
        document.body.classList.remove('menu-open');
    }

    async loadDashboardData() {
        await this.loadCourses();
        await this.loadStats();
        await this.loadStudents();
    }

    async loadCourses() {
        try {
            this.showLoading('courses');
            
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            this.courses = data || [];
            this.filteredCourses = [...this.courses];
            this.renderCourses();
            
        } catch (error) {
            console.error('Error loading courses:', error);
            this.showMessage('Error loading courses: ' + error.message, 'error');
            this.courses = [];
            this.filteredCourses = [];
        }
    }

    async loadStats() {
        try {
            // Get total students
            const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
            if (!usersError) {
                document.getElementById('totalStudents').textContent = users.users.length;
            }

            // Get total courses and active courses
            const { data: courses, error: coursesError } = await supabase
                .from('courses')
                .select('id, is_active');
            
            if (!coursesError) {
                document.getElementById('totalCourses').textContent = courses.length;
                const activeCourses = courses.filter(course => course.is_active).length;
                document.getElementById('activeCourses').textContent = activeCourses;
            }

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadStudents() {
        try {
            // Get all users
            const { data: users, error } = await supabase.auth.admin.listUsers();
            
            if (error) throw error;
            
            // Get user profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*');

            if (profileError) throw profileError;

            // Combine user data with profiles
            this.students = users.users.map(user => {
                const profile = profiles.find(p => p.id === user.id) || {};
                return {
                    ...user,
                    ...profile
                };
            });

            this.renderStudents();
            
        } catch (error) {
            console.error('Error loading students:', error);
            this.students = [];
        }
    }

    // COURSES CRUD OPERATIONS
    async handleCourseSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('courseSubmitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Show loading state
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        submitBtn.disabled = true;

        const courseId = document.getElementById('courseId').value;
        const courseData = {
            title: document.getElementById('courseTitle').value,
            description: document.getElementById('courseDescription').value,
            required_tier: document.getElementById('courseTier').value,
            price: parseFloat(document.getElementById('coursePrice').value),
            status: document.getElementById('courseStatus').value,
            is_active: document.getElementById('courseActive').checked
        };

        try {
            if (courseId) {
                // Update existing course
                const { error } = await supabase
                    .from('courses')
                    .update(courseData)
                    .eq('id', courseId);

                if (error) throw error;
                this.showMessage('✅ Course updated successfully!', 'success');
            } else {
                // Create new course
                const { error } = await supabase
                    .from('courses')
                    .insert([courseData]);

                if (error) throw error;
                this.showMessage('✅ Course created successfully!', 'success');
            }

            await this.loadCourses();
            await this.loadStats();
            this.closeCourseModal();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showMessage('❌ Error saving course: ' + error.message, 'error');
        } finally {
            // Reset button state
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async toggleCourseStatus(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;

        try {
            const { error } = await supabase
                .from('courses')
                .update({ is_active: !course.is_active })
                .eq('id', courseId);

            if (error) throw error;

            await this.loadCourses();
            await this.loadStats();
            this.showMessage(`✅ Course ${!course.is_active ? 'activated' : 'deactivated'} successfully!`, 'success');
            
        } catch (error) {
            console.error('Error toggling course status:', error);
            this.showMessage('❌ Error updating course: ' + error.message, 'error');
        }
    }

    async deleteCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;

        this.showConfirmModal(
            'Delete Course',
            `Are you sure you want to delete "${course.title}"? This action cannot be undone.`,
            async () => {
                try {
                    const { error } = await supabase
                        .from('courses')
                        .delete()
                        .eq('id', courseId);

                    if (error) throw error;

                    await this.loadCourses();
                    await this.loadStats();
                    this.showMessage('✅ Course deleted successfully!', 'success');
                    
                } catch (error) {
                    console.error('Error deleting course:', error);
                    this.showMessage('❌ Error deleting course: ' + error.message, 'error');
                }
            }
        );
    }

    // COURSES RENDERING AND FILTERING
    renderCourses() {
        const container = document.getElementById('adminCoursesList');
        if (!container) return;

        if (this.filteredCourses.length === 0) {
            container.innerHTML = `
                <div class="placeholder-message">
                    <p>No courses found. Click "Add New Course" to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredCourses.map(course => {
            const statusClass = course.is_active ? 'status-active' : 'status-inactive';
            const statusText = course.is_active ? 'Active' : 'Inactive';
            
            return `
                <div class="course-item ${!course.is_active ? 'inactive' : ''}">
                    <div class="course-header">
                        <div class="course-info">
                            <h3>${course.title}</h3>
                            <div class="course-meta">
                                <span class="course-tier">${course.required_tier.toUpperCase()} TIER</span>
                                <span class="course-price">$${course.price}</span>
                                <span class="course-status ${statusClass}">${statusText}</span>
                                <span class="course-status status-${course.status}">${course.status}</span>
                            </div>
                        </div>
                        <div class="course-actions">
                            <button class="btn-small" onclick="adminPanel.openCourseModal('${course.id}')">Edit</button>
                            <button class="btn-small ${course.is_active ? 'btn-danger' : ''}" 
                                    onclick="adminPanel.toggleCourseStatus('${course.id}')">
                                ${course.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn-small btn-danger" onclick="adminPanel.deleteCourse('${course.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="course-description">
                        <p>${course.description}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterCourses(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        switch (filter) {
            case 'active':
                this.filteredCourses = this.courses.filter(course => course.is_active);
                break;
            case 'inactive':
                this.filteredCourses = this.courses.filter(course => !course.is_active);
                break;
            case 'free':
                this.filteredCourses = this.courses.filter(course => course.required_tier === 'free');
                break;
            case 'premium':
                this.filteredCourses = this.courses.filter(course => course.required_tier === 'premium');
                break;
            default:
                this.filteredCourses = [...this.courses];
        }

        this.renderCourses();
    }

    searchCourses(query) {
        if (!query.trim()) {
            this.filteredCourses = [...this.courses];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredCourses = this.courses.filter(course => 
                course.title.toLowerCase().includes(searchTerm) ||
                course.description.toLowerCase().includes(searchTerm) ||
                course.required_tier.toLowerCase().includes(searchTerm)
            );
        }
        this.renderCourses();
    }

    // STUDENTS MANAGEMENT
    renderStudents() {
        const container = document.getElementById('studentsList');
        if (!container) return;

        if (this.students.length === 0) {
            container.innerHTML = `
                <div class="placeholder-message">
                    <p>No students found. Student data will appear here once users start signing up.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.students.map(student => {
            return `
                <div class="student-item">
                    <div class="student-info">
                        <h3>${student.email}</h3>
                        <div class="student-meta">
                            <span>Tier: ${student.subscription_tier || 'free'}</span>
                            <span>Joined: ${new Date(student.created_at).toLocaleDateString()}</span>
                            <span>Last Sign In: ${student.last_sign_in_at ? new Date(student.last_sign_in_at).toLocaleDateString() : 'Never'}</span>
                        </div>
                    </div>
                    <div class="student-actions">
                        <button class="btn-small" onclick="adminPanel.editStudent('${student.id}')">Edit Tier</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    searchStudents(query) {
        // Implement student search functionality
        console.log('Searching students:', query);
    }

    // MODAL MANAGEMENT
    openCourseModal(courseId = null) {
        const modal = document.getElementById('courseModal');
        const title = document.getElementById('courseModalTitle');
        const form = document.getElementById('courseForm');
        
        if (courseId) {
            // Edit mode
            const course = this.courses.find(c => c.id === courseId);
            if (course) {
                title.textContent = 'Edit Course';
                document.getElementById('courseId').value = course.id;
                document.getElementById('courseTitle').value = course.title;
                document.getElementById('courseDescription').value = course.description;
                document.getElementById('courseTier').value = course.required_tier;
                document.getElementById('coursePrice').value = course.price;
                document.getElementById('courseStatus').value = course.status;
                document.getElementById('courseActive').checked = course.is_active;
            }
        } else {
            // Create mode
            title.textContent = 'Add New Course';
            form.reset();
            document.getElementById('courseId').value = '';
            document.getElementById('courseStatus').value = 'draft';
            document.getElementById('courseActive').checked = true;
        }
        
        modal.classList.add('active');
    }

    closeCourseModal() {
        document.getElementById('courseModal').classList.remove('active');
        document.getElementById('courseForm').reset();
    }

    showConfirmModal(title, message, confirmCallback) {
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMessage').textContent = message;
        
        const confirmBtn = document.getElementById('confirmActionBtn');
        confirmBtn.onclick = confirmCallback;
        
        document.getElementById('confirmModal').classList.add('active');
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }

    // UTILITY METHODS
    showLoading(section) {
        const container = document.getElementById(`admin${section.charAt(0).toUpperCase() + section.slice(1)}List`);
        if (container) {
            container.innerHTML = '<div class="loading-message">Loading...</div>';
        }
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('adminMessage');
        messageEl.textContent = message;
        messageEl.className = `form-message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.showMessage('❌ Logout failed: ' + error.message, 'error');
        }
    }

    // Student management methods (to be implemented)
    editStudent(studentId) {
        this.showMessage('Student tier editing will be implemented in Phase 2', 'info');
    }
}

// Global functions for navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    
    // Update active state in navigation (optional)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Update URL hash
    window.location.hash = sectionId;
}

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Supabase Configuration
    const SUPABASE_URL = 'https://usooclimfkregwrtmdki.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb29jbGltZmtyZWd3cnRtZGtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0Nzg2MTEsImV4cCI6MjA3OTA1NDYxMX0.43Wy4GS_DSx4IWXmFKg5wz0YwmV7lsadWcm0ysCcfe0';

    // Initialize Supabase
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Initialize Admin Panel
    window.adminPanel = new AdminPanel();
});

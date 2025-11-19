// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.courses = [];
        this.students = [];
        this.modules = [];
        this.filteredCourses = [];
        this.currentFilter = 'all';
        this.currentCourseId = null;
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

        // Module form
        document.getElementById('moduleForm').addEventListener('submit', (e) => this.handleModuleSubmit(e));

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

            // Get total modules
            const { data: modules, error: modulesError } = await supabase
                .from('course_modules')
                .select('id');
            
            if (!modulesError) {
                document.getElementById('totalModules').textContent = modules.length;
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

    async loadModules(courseId) {
        try {
            this.showModulesLoading();
            
            const { data, error } = await supabase
                .from('course_modules')
                .select('*')
                .eq('course_id', courseId)
                .order('module_order', { ascending: true });

            if (error) throw error;
            
            this.modules = data || [];
            this.renderModules();
            
        } catch (error) {
            console.error('Error loading modules:', error);
            this.showMessage('Error loading modules: ' + error.message, 'error');
            this.modules = [];
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

    // MODULES CRUD OPERATIONS
    async handleModuleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('moduleSubmitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        
        // Show loading state
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        submitBtn.disabled = true;

        const moduleId = document.getElementById('moduleId').value;
        const courseId = document.getElementById('moduleCourseId').value;
        const moduleData = {
            course_id: courseId,
            title: document.getElementById('moduleTitle').value,
            description: document.getElementById('moduleDescription').value,
            module_order: parseInt(document.getElementById('moduleOrder').value),
            duration: document.getElementById('moduleDuration').value,
            video_url: document.getElementById('moduleVideoUrl').value,
            required_tier: document.getElementById('moduleTier').value,
            is_premium: document.getElementById('moduleIsPremium').checked
        };

        try {
            if (moduleId) {
                // Update existing module
                const { error } = await supabase
                    .from('course_modules')
                    .update(moduleData)
                    .eq('id', moduleId);

                if (error) throw error;
                this.showMessage('✅ Module updated successfully!', 'success');
            } else {
                // Create new module
                const { error } = await supabase
                    .from('course_modules')
                    .insert([moduleData]);

                if (error) throw error;
                this.showMessage('✅ Module created successfully!', 'success');
            }

            await this.loadModules(courseId);
            await this.loadStats();
            this.closeModuleModal();
            
        } catch (error) {
            console.error('Error saving module:', error);
            this.showMessage('❌ Error saving module: ' + error.message, 'error');
        } finally {
            // Reset button state
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async deleteModule(moduleId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (!module) return;

        this.showConfirmModal(
            'Delete Module',
            `Are you sure you want to delete "${module.title}"? This action cannot be undone.`,
            async () => {
                try {
                    const { error } = await supabase
                        .from('course_modules')
                        .delete()
                        .eq('id', moduleId);

                    if (error) throw error;

                    await this.loadModules(this.currentCourseId);
                    await this.loadStats();
                    this.showMessage('✅ Module deleted successfully!', 'success');
                    
                } catch (error) {
                    console.error('Error deleting module:', error);
                    this.showMessage('❌ Error deleting module: ' + error.message, 'error');
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
            // FIXED: Only show status badge, not active/inactive
            const statusClass = `status-${course.status}`;
            const statusText = course.status.charAt(0).toUpperCase() + course.status.slice(1);
            
            return `
                <div class="course-item ${!course.is_active ? 'inactive' : ''}">
                    <div class="course-header">
                        <div class="course-info">
                            <h3>${course.title}</h3>
                            <div class="course-meta">
                                <span class="course-tier">${course.required_tier.toUpperCase()} TIER</span>
                                <span class="course-price">$${course.price}</span>
                                <span class="course-status ${statusClass}">${statusText}</span>
                                ${!course.is_active ? '<span class="course-status status-inactive">INACTIVE</span>' : ''}
                            </div>
                        </div>
                        <div class="course-actions">
                            <button class="btn-small" onclick="adminPanel.openCourseModal('${course.id}')">Edit</button>
                            <button class="btn-small ${course.is_active ? 'btn-danger' : 'btn-success'}" 
                                    onclick="adminPanel.toggleCourseStatus('${course.id}')">
                                ${course.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn-small" onclick="adminPanel.viewModules('${course.id}')">Modules</button>
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

    // MODULES RENDERING
    renderModules() {
        const container = document.getElementById('modulesListView');
        if (!container) return;

        if (this.modules.length === 0) {
            container.innerHTML = `
                <div class="placeholder-message">
                    <p>No modules found. Click "Add Module" to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.modules.map(module => {
            return `
                <div class="module-item">
                    <div class="module-info">
                        <h5>${module.title}</h5>
                        <div class="module-meta">
                            <span>Order: ${module.module_order}</span>
                            <span>Duration: ${module.duration || 'N/A'}</span>
                            <span>Tier: ${module.required_tier}</span>
                            ${module.is_premium ? '<span class="course-tier">PREMIUM</span>' : ''}
                        </div>
                        <p style="color: #ccc; margin-top: 0.5rem; font-size: 0.9rem;">${module.description}</p>
                    </div>
                    <div class="module-actions">
                        <button class="btn-small" onclick="adminPanel.openModuleModal('${this.currentCourseId}', '${module.id}')">Edit</button>
                        <button class="btn-small btn-danger" onclick="adminPanel.deleteModule('${module.id}')">Delete</button>
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
                this.filteredCourses = this.courses.filter(course => course.required_tier === 'basic');
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

    openModuleModal(courseId, moduleId = null) {
        this.currentCourseId = courseId;
        const modal = document.getElementById('moduleModal');
        const title = document.getElementById('moduleModalTitle');
        const form = document.getElementById('moduleForm');
        
        document.getElementById('moduleCourseId').value = courseId;
        
        if (moduleId) {
            // Edit mode
            const module = this.modules.find(m => m.id === moduleId);
            if (module) {
                title.textContent = 'Edit Module';
                document.getElementById('moduleId').value = module.id;
                document.getElementById('moduleTitle').value = module.title;
                document.getElementById('moduleDescription').value = module.description;
                document.getElementById('moduleOrder').value = module.module_order;
                document.getElementById('moduleDuration').value = module.duration || '';
                document.getElementById('moduleVideoUrl').value = module.video_url || '';
                document.getElementById('moduleTier').value = module.required_tier;
                document.getElementById('moduleIsPremium').checked = module.is_premium;
            }
        } else {
            // Create mode
            title.textContent = 'Add New Module';
            form.reset();
            document.getElementById('moduleId').value = '';
            document.getElementById('moduleOrder').value = this.modules.length + 1;
            document.getElementById('moduleTier').value = 'free';
            document.getElementById('moduleIsPremium').checked = false;
        }
        
        modal.classList.add('active');
    }

    closeModuleModal() {
        document.getElementById('moduleModal').classList.remove('active');
        document.getElementById('moduleForm').reset();
    }

    async viewModules(courseId) {
        this.currentCourseId = courseId;
        const course = this.courses.find(c => c.id === courseId);
        
        if (course) {
            document.getElementById('modulesViewTitle').textContent = `Modules - ${course.title}`;
            document.getElementById('modulesCourseTitle').textContent = course.title;
            document.getElementById('modulesCourseDescription').textContent = course.description;
            
            await this.loadModules(courseId);
            document.getElementById('modulesView').classList.add('active');
        }
    }

    closeModulesView() {
        document.getElementById('modulesView').classList.remove('active');
        this.currentCourseId = null;
        this.modules = [];
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

    showModulesLoading() {
        const container = document.getElementById('modulesListView');
        if (container) {
            container.innerHTML = '<div class="loading-message">Loading modules...</div>';
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
        this.showMessage('Student tier editing will be implemented in Phase 3', 'info');
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
// Add these methods to the existing AdminPanel class in admin.js

// Enhanced Student Management Methods
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

        // Get user courses and progress
        const { data: userCourses, error: coursesError } = await supabase
            .from('user_courses')
            .select('*')
            .eq('payment_status', 'completed');

        const { data: userProgress, error: progressError } = await supabase
            .from('user_progress')
            .select('*');

        // Combine all data
        this.students = users.users.map(user => {
            const profile = profiles.find(p => p.id === user.id) || {};
            const courses = userCourses?.filter(uc => uc.user_id === user.id) || [];
            const progress = userProgress?.filter(up => up.user_id === user.id) || [];
            
            return {
                ...user,
                ...profile,
                enrolled_courses: courses.length,
                completed_modules: progress.filter(p => p.completed).length,
                total_progress: progress.length > 0 ? 
                    Math.round((progress.filter(p => p.completed).length / progress.length) * 100) : 0
            };
        });

        this.renderStudents();
        
    } catch (error) {
        console.error('Error loading students:', error);
        this.students = [];
    }
}

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
                        <span class="tier-badge tier-${student.subscription_tier || 'basic'}">${(student.subscription_tier || 'basic').toUpperCase()}</span>
                        <span>Joined: ${new Date(student.created_at).toLocaleDateString()}</span>
                        <span>Courses: ${student.enrolled_courses}</span>
                        <span>Progress: ${student.total_progress}%</span>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="btn-small" onclick="adminPanel.editStudentTier('${student.id}')">Edit Tier</button>
                    <button class="btn-small" onclick="adminPanel.viewStudentDetails('${student.id}')">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

async editStudentTier(studentId) {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return;

    const newTier = prompt(`Change tier for ${student.email}\n\nCurrent: ${student.subscription_tier || 'basic'}\n\nEnter new tier (basic/premium):`, student.subscription_tier || 'basic');
    
    if (newTier && ['basic', 'premium'].includes(newTier.toLowerCase())) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ subscription_tier: newTier.toLowerCase() })
                .eq('id', studentId);

            if (error) throw error;

            this.showMessage(`✅ Tier updated to ${newTier} for ${student.email}`, 'success');
            await this.loadStudents();
            
        } catch (error) {
            console.error('Error updating student tier:', error);
            this.showMessage('❌ Error updating tier: ' + error.message, 'error');
        }
    }
}

async viewStudentDetails(studentId) {
    const student = this.students.find(s => s.id === studentId);
    if (!student) return;

    // Load detailed student information
    const [courses, progress, activity] = await Promise.all([
        this.getStudentCourses(studentId),
        this.getStudentProgress(studentId),
        this.getStudentActivity(studentId)
    ]);

    const detailsHtml = `
        <div class="student-details">
            <div class="detail-section">
                <h4>Student Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${student.email}</span>
                    </div>
                    <div class="detail-item">
                        <label>Tier:</label>
                        <span class="tier-badge tier-${student.subscription_tier || 'basic'}">${(student.subscription_tier || 'basic').toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Joined:</label>
                        <span>${new Date(student.created_at).toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Sign In:</label>
                        <span>${student.last_sign_in_at ? new Date(student.last_sign_in_at).toLocaleString() : 'Never'}</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4>Learning Progress</h4>
                <div class="progress-stats">
                    <div class="stat">
                        <span class="stat-number">${student.enrolled_courses}</span>
                        <span class="stat-label">Enrolled Courses</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${student.completed_modules}</span>
                        <span class="stat-label">Completed Modules</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${student.total_progress}%</span>
                        <span class="stat-label">Overall Progress</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h4>Enrolled Courses</h4>
                ${courses.length > 0 ? `
                    <div class="courses-list">
                        ${courses.map(course => `
                            <div class="course-progress-item">
                                <div class="course-info">
                                    <h5>${course.title}</h5>
                                    <span>Progress: ${course.progress}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${course.progress}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>No enrolled courses</p>'}
            </div>

            <div class="detail-section">
                <h4>Recent Activity</h4>
                ${activity.length > 0 ? `
                    <div class="activity-list">
                        ${activity.slice(0, 5).map(act => `
                            <div class="activity-item">
                                <span>${this.formatActivity(act)}</span>
                                <small>${new Date(act.created_at).toLocaleString()}</small>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p>No recent activity</p>'}
            </div>
        </div>
    `;

    // You would show this in a modal similar to course/modals
    this.showStudentDetailsModal(student.email, detailsHtml);
}

async getStudentCourses(studentId) {
    try {
        const { data, error } = await supabase
            .from('user_courses')
            .select(`
                *,
                courses (title)
            `)
            .eq('user_id', studentId)
            .eq('payment_status', 'completed');

        if (error) throw error;

        // Calculate progress for each course
        const coursesWithProgress = await Promise.all(
            (data || []).map(async (userCourse) => {
                const progress = await this.getCourseProgressForStudent(studentId, userCourse.course_id);
                return {
                    title: userCourse.courses?.title || 'Unknown Course',
                    progress: progress.percentage
                };
            })
        );

        return coursesWithProgress;
    } catch (error) {
        console.error('Error loading student courses:', error);
        return [];
    }
}

async getCourseProgressForStudent(studentId, courseId) {
    try {
        const { data: modules, error } = await supabase
            .from('course_modules')
            .select('id')
            .eq('course_id', courseId);

        if (error) throw error;

        const { data: progress, error: progressError } = await supabase
            .from('user_progress')
            .select('module_id, completed')
            .eq('user_id', studentId)
            .in('module_id', modules.map(m => m.id));

        if (progressError) throw progressError;

        const completed = progress?.filter(p => p.completed).length || 0;
        const total = modules.length;

        return {
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    } catch (error) {
        console.error('Error calculating course progress:', error);
        return { completed: 0, total: 0, percentage: 0 };
    }
}

async getStudentProgress(studentId) {
    try {
        const { data, error } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', studentId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading student progress:', error);
        return [];
    }
}

async getStudentActivity(studentId) {
    try {
        const { data, error } = await supabase
            .from('user_activity')
            .select('*')
            .eq('user_id', studentId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error loading student activity:', error);
        return [];
    }
}

formatActivity(activity) {
    switch (activity.activity_type) {
        case 'module_access':
            return `Accessed module: ${activity.metadata?.module_title || 'Unknown'}`;
        case 'module_complete':
            return `Completed module: ${activity.metadata?.module_title || 'Unknown'}`;
        case 'course_purchase':
            return `Purchased course: ${activity.metadata?.course_title || 'Unknown'}`;
        case 'tier_upgrade':
            return `Upgraded from ${activity.metadata?.from_tier} to ${activity.metadata?.to_tier}`;
        default:
            return 'Activity recorded';
    }
}

showStudentDetailsModal(title, content) {
    // Create or show modal with student details
    // Similar to your existing modal system
    console.log('Show student details:', title, content);
    // Implement modal display logic here
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

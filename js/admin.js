// Admin Panel JavaScript
class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.courses = [];
        this.students = [];
        this.userProgress = [];
        this.init();
    }

    async init() {
        await this.checkAdminAuth();
        await this.loadDashboardData();
        this.setupEventListeners();
        this.renderDashboard();
    }

    async checkAdminAuth() {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session?.user) {
            this.currentUser = session.user;
            
            // Check if user is admin (you might want to add admin role to profiles)
            const isAdmin = await this.checkAdminRole(session.user.id);
            
            if (!isAdmin) {
                alert('Access denied. Admin privileges required.');
                window.location.href = 'course.html';
                return;
            }
            
            document.getElementById('adminEmail').textContent = session.user.email;
            document.getElementById('mobileAdminEmail').textContent = session.user.email;
            
        } else {
            window.location.href = 'login.html';
        }
    }

    async checkAdminRole(userId) {
        try {
            const { data, error } = await supabase
                .from('admin_roles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) {
                console.log('Admin role check error:', error);
                return false;
            }

            return !!data; // Returns true if admin role exists
        } catch (error) {
            console.error('Error checking admin role:', error);
            return false;
        }
    }

    async loadDashboardData() {
        await this.loadCourses();
        await this.loadStudents();
        await this.loadUserProgress();
        await this.loadAnalytics();
    }

    async loadCourses() {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.courses = data || [];
        } catch (error) {
            console.error('Error loading courses:', error);
            this.courses = [];
        }
    }

    async loadStudents() {
        try {
            // Get all users (you might want to paginate this in production)
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

        } catch (error) {
            console.error('Error loading students:', error);
            this.students = [];
        }
    }

    async loadUserProgress() {
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select(`
                    *,
                    course_modules (
                        title,
                        course_id
                    ),
                    profiles (
                        subscription_tier
                    )
                `);

            if (error) throw error;
            this.userProgress = data || [];
        } catch (error) {
            console.error('Error loading user progress:', error);
            this.userProgress = [];
        }
    }

    async loadAnalytics() {
        // This would typically involve more complex queries
        // For now, we'll calculate basic stats
        const totalStudents = this.students.length;
        const totalCourses = this.courses.length;
        const activeUsers = this.students.filter(s => s.last_sign_in_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
        
        // Calculate revenue (simplified)
        const userCourses = await this.getUserCourses();
        const totalRevenue = userCourses.reduce((sum, uc) => {
            const course = this.courses.find(c => c.id === uc.course_id);
            return sum + (course?.price || 0);
        }, 0);

        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('totalCourses').textContent = totalCourses;
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    }

    async getUserCourses() {
        try {
            const { data, error } = await supabase
                .from('user_courses')
                .select('*')
                .eq('payment_status', 'completed');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading user courses:', error);
            return [];
        }
    }

    setupEventListeners() {
        // Logout buttons
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('mobileAdminLogoutBtn').addEventListener('click', () => this.logout());

        // Form submissions
        document.getElementById('courseForm').addEventListener('submit', (e) => this.handleCourseSubmit(e));
        document.getElementById('moduleForm').addEventListener('submit', (e) => this.handleModuleSubmit(e));

        // Search functionality
        document.getElementById('studentSearch').addEventListener('input', (e) => this.searchStudents(e.target.value));

        // Modal close on overlay click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    renderDashboard() {
        this.renderCourses();
        this.renderStudents();
        this.renderRecentActivity();
    }

    renderCourses() {
        const container = document.getElementById('adminCoursesList');
        if (!container) return;

        container.innerHTML = this.courses.map(course => {
            const modules = this.getCourseModules(course.id);
            
            return `
                <div class="course-item">
                    <div class="course-header">
                        <div class="course-info">
                            <h3>${course.title}</h3>
                            <div class="course-meta">
                                <span class="course-tier">Tier: ${course.required_tier}</span>
                                <span class="course-price">$${course.price}</span>
                                <span class="course-status">${course.is_active ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                        <div class="course-actions">
                            <button class="btn-small" onclick="adminPanel.editCourse('${course.id}')">Edit</button>
                            <button class="btn-small btn-secondary" onclick="adminPanel.toggleCourseStatus('${course.id}')">
                                ${course.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn-small btn-danger" onclick="adminPanel.deleteCourse('${course.id}')">Delete</button>
                            <button class="btn-small" onclick="adminPanel.openModuleModal('${course.id}')">+ Add Module</button>
                        </div>
                    </div>
                    <div class="course-description">
                        <p>${course.description}</p>
                    </div>
                    <div class="course-modules">
                        ${modules.map(module => `
                            <div class="module-item">
                                <div class="module-info">
                                    <h4>${module.title}</h4>
                                    <div class="module-meta">
                                        <span>Order: ${module.module_order}</span>
                                        <span>Duration: ${module.duration}</span>
                                        <span>Tier: ${module.required_tier}</span>
                                    </div>
                                </div>
                                <div class="module-actions">
                                    <button class="btn-small" onclick="adminPanel.editModule('${module.id}')">Edit</button>
                                    <button class="btn-small btn-danger" onclick="adminPanel.deleteModule('${module.id}')">Delete</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStudents() {
        const container = document.getElementById('studentsList');
        if (!container) return;

        container.innerHTML = this.students.map(student => {
            const progress = this.getStudentProgress(student.id);
            const enrolledCourses = this.getStudentCourses(student.id);
            
            return `
                <div class="student-item">
                    <div class="student-info">
                        <h3>${student.email}</h3>
                        <div class="student-meta">
                            <span>Tier: ${student.subscription_tier || 'free'}</span>
                            <span>Joined: ${new Date(student.created_at).toLocaleDateString()}</span>
                            <span>Courses: ${enrolledCourses.length}</span>
                        </div>
                    </div>
                    <div class="student-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <span>${progress.completed} of ${progress.total} modules completed</span>
                    </div>
                    <div class="student-actions">
                        <button class="btn-small" onclick="adminPanel.viewStudentDetails('${student.id}')">View Details</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivityList');
        if (!container) return;

        // Get recent user progress
        const recentProgress = this.userProgress
            .sort((a, b) => new Date(b.last_accessed || b.created_at) - new Date(a.last_accessed || a.created_at))
            .slice(0, 10);

        container.innerHTML = recentProgress.map(progress => {
            const student = this.students.find(s => s.id === progress.user_id);
            const module = progress.course_modules;
            
            return `
                <div class="activity-item">
                    <div>${student?.email || 'Unknown user'} ${progress.completed ? 'completed' : 'started'} "${module?.title || 'Unknown module'}"</div>
                    <small>${new Date(progress.last_accessed || progress.created_at).toLocaleString()}</small>
                </div>
            `;
        }).join('');
    }

    getCourseModules(courseId) {
        // This would typically come from your database
        // For now, we'll return empty array
        return [];
    }

    getStudentProgress(studentId) {
        const studentProgress = this.userProgress.filter(up => up.user_id === studentId);
        const completed = studentProgress.filter(up => up.completed).length;
        const total = studentProgress.length;
        
        return {
            completed,
            total,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    getStudentCourses(studentId) {
        // This would typically come from your user_courses table
        return [];
    }

    // Course Management
    async handleCourseSubmit(e) {
        e.preventDefault();
        
        const courseId = document.getElementById('courseId').value;
        const courseData = {
            title: document.getElementById('courseTitle').value,
            description: document.getElementById('courseDescription').value,
            required_tier: document.getElementById('courseTier').value,
            price: parseFloat(document.getElementById('coursePrice').value),
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
                this.showMessage('Course updated successfully!', 'success');
            } else {
                // Create new course
                const { error } = await supabase
                    .from('courses')
                    .insert([courseData]);

                if (error) throw error;
                this.showMessage('Course created successfully!', 'success');
            }

            await this.loadCourses();
            this.renderCourses();
            this.closeCourseModal();
            
        } catch (error) {
            console.error('Error saving course:', error);
            this.showMessage('Error saving course: ' + error.message, 'error');
        }
    }

    async handleModuleSubmit(e) {
        e.preventDefault();
        
        const moduleId = document.getElementById('moduleId').value;
        const courseId = document.getElementById('moduleCourseId').value;
        const moduleData = {
            course_id: courseId,
            title: document.getElementById('moduleTitle').value,
            description: document.getElementById('moduleDescription').value,
            module_order: parseInt(document.getElementById('moduleOrder').value),
            duration: document.getElementById('moduleDuration').value,
            video_url: document.getElementById('moduleVideoUrl').value,
            required_tier: document.getElementById('moduleTier').value
        };

        try {
            if (moduleId) {
                // Update existing module
                const { error } = await supabase
                    .from('course_modules')
                    .update(moduleData)
                    .eq('id', moduleId);

                if (error) throw error;
                this.showMessage('Module updated successfully!', 'success');
            } else {
                // Create new module
                const { error } = await supabase
                    .from('course_modules')
                    .insert([moduleData]);

                if (error) throw error;
                this.showMessage('Module created successfully!', 'success');
            }

            await this.loadCourses();
            this.renderCourses();
            this.closeModuleModal();
            
        } catch (error) {
            console.error('Error saving module:', error);
            this.showMessage('Error saving module: ' + error.message, 'error');
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
            this.renderCourses();
            this.showMessage(`Course ${!course.is_active ? 'activated' : 'deactivated'} successfully!`, 'success');
            
        } catch (error) {
            console.error('Error toggling course status:', error);
            this.showMessage('Error updating course: ' + error.message, 'error');
        }
    }

    async deleteCourse(courseId) {
        if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);

            if (error) throw error;

            await this.loadCourses();
            this.renderCourses();
            this.showMessage('Course deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showMessage('Error deleting course: ' + error.message, 'error');
        }
    }

    async deleteModule(moduleId) {
        if (!confirm('Are you sure you want to delete this module?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('course_modules')
                .delete()
                .eq('id', moduleId);

            if (error) throw error;

            await this.loadCourses();
            this.renderCourses();
            this.showMessage('Module deleted successfully!', 'success');
            
        } catch (error) {
            console.error('Error deleting module:', error);
            this.showMessage('Error deleting module: ' + error.message, 'error');
        }
    }

    // Modal Management
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
                document.getElementById('courseActive').checked = course.is_active;
            }
        } else {
            // Create mode
            title.textContent = 'Add New Course';
            form.reset();
            document.getElementById('courseId').value = '';
        }
        
        modal.classList.add('active');
    }

    closeCourseModal() {
        document.getElementById('courseModal').classList.remove('active');
    }

    openModuleModal(courseId, moduleId = null) {
        const modal = document.getElementById('moduleModal');
        const title = document.getElementById('moduleModalTitle');
        const form = document.getElementById('moduleForm');
        
        document.getElementById('moduleCourseId').value = courseId;
        
        if (moduleId) {
            // Edit mode - you would load module data here
            title.textContent = 'Edit Module';
            document.getElementById('moduleId').value = moduleId;
        } else {
            // Create mode
            title.textContent = 'Add New Module';
            form.reset();
            document.getElementById('moduleId').value = '';
        }
        
        modal.classList.add('active');
    }

    closeModuleModal() {
        document.getElementById('moduleModal').classList.remove('active');
    }

    async viewStudentDetails(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        const progress = this.getStudentProgress(studentId);
        const enrolledCourses = this.getStudentCourses(studentId);
        
        const details = document.getElementById('studentDetails');
        details.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${student.email}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Subscription Tier:</div>
                <div class="detail-value">${student.subscription_tier || 'free'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Joined:</div>
                <div class="detail-value">${new Date(student.created_at).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Last Sign In:</div>
                <div class="detail-value">${student.last_sign_in_at ? new Date(student.last_sign_in_at).toLocaleString() : 'Never'}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Progress:</div>
                <div class="detail-value">${progress.completed} of ${progress.total} modules completed (${progress.percentage}%)</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Enrolled Courses:</div>
                <div class="detail-value">${enrolledCourses.length} courses</div>
            </div>
        `;

        document.getElementById('studentModal').classList.add('active');
    }

    closeStudentModal() {
        document.getElementById('studentModal').classList.remove('active');
    }

    searchStudents(query) {
        const filteredStudents = this.students.filter(student => 
            student.email.toLowerCase().includes(query.toLowerCase())
        );
        
        // Re-render students list with filtered results
        const container = document.getElementById('studentsList');
        // ... (similar to renderStudents but with filtered data)
    }

    editCourse(courseId) {
        this.openCourseModal(courseId);
    }

    editModule(moduleId) {
        // You would need to load the module data first
        // For now, we'll just open the modal
        this.openModuleModal(null, moduleId);
    }

    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            alert('Logout failed: ' + error.message);
        }
    }

    showMessage(message, type) {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `form-message ${type}`;
        messageEl.textContent = message;
        messageEl.style.position = 'fixed';
        messageEl.style.top = '100px';
        messageEl.style.right = '20px';
        messageEl.style.zIndex = '3000';
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }
}

// Global functions for HTML onclick handlers
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    
    // Update URL hash
    window.location.hash = sectionId;
}

function openCourseModal(courseId = null) {
    window.adminPanel.openCourseModal(courseId);
}

function closeCourseModal() {
    window.adminPanel.closeCourseModal();
}

function openModuleModal(courseId, moduleId = null) {
    window.adminPanel.openModuleModal(courseId, moduleId);
}

function closeModuleModal() {
    window.adminPanel.closeModuleModal();
}

function closeStudentModal() {
    window.adminPanel.closeStudentModal();
}

// Mobile Menu Functionality (similar to your existing code)
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileCloseBtn = document.getElementById('mobileCloseBtn');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

function openMobileMenu() {
    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    document.body.classList.add('menu-open');
}

function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    document.body.classList.remove('menu-open');
}

// Event Listeners for mobile menu
mobileMenuBtn?.addEventListener('click', openMobileMenu);
mobileCloseBtn?.addEventListener('click', closeMobileMenu);
mobileMenuOverlay?.addEventListener('click', closeMobileMenu);

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminPanel = new AdminPanel();
});

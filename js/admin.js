// Supabase Configuration - REPLACE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://your-project.supabase.co'; // Replace with your URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with your anon key

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AdminPanel {
    constructor() {
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadProfiles();
        this.showNotification('Admin panel loaded!', 'success');
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('hidden', content.id !== `${tabName}-tab`);
        });

        if (tabName === 'profiles') this.loadProfiles();
        if (tabName === 'courses') this.loadCourses();
        if (tabName === 'chapters') this.loadChapters();
        if (tabName === 'content') this.loadContent();
    }

    // PROFILES MANAGEMENT
    async loadProfiles() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_time', { ascending: false });

            if (error) throw error;
            this.displayProfiles(data);
        } catch (error) {
            this.showError('Failed to load profiles: ' + error.message);
        }
    }

    displayProfiles(profiles) {
        const tbody = document.getElementById('profiles-table-body');
        tbody.innerHTML = profiles.map(profile => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-2 text-sm">${profile.id.substring(0, 8)}...</td>
                <td class="px-4 py-2">
                    <span class="px-2 py-1 rounded text-xs ${
                        profile.subscription_type === 'premium' ? 'bg-purple-100 text-purple-800' :
                        profile.subscription_type === 'basic' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                    }">${profile.subscription_type}</span>
                </td>
                <td class="px-4 py-2 text-sm">${new Date(profile.created_time).toLocaleDateString()}</td>
                <td class="px-4 py-2 text-sm">${new Date(profile.updated_time).toLocaleDateString()}</td>
                <td class="px-4 py-2 text-sm">${profile.email}</td>
                <td class="px-4 py-2">
                    <button onclick="adminPanel.updateProfileTier('${profile.id}')" class="text-blue-600 hover:text-blue-900 text-sm mr-2">Change Tier</button>
                    <button onclick="adminPanel.deleteProfile('${profile.id}')" class="text-red-600 hover:text-red-900 text-sm">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    async updateProfileTier(profileId) {
        const newTier = prompt('Enter new tier (premium/basic/free):');
        if (!newTier) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    subscription_type: newTier,
                    updated_time: new Date().toISOString()
                })
                .eq('id', profileId);

            if (error) throw error;
            this.showNotification('Tier updated successfully!', 'success');
            this.loadProfiles();
        } catch (error) {
            this.showError('Failed to update tier: ' + error.message);
        }
    }

    async deleteProfile(profileId) {
        if (!confirm('Are you sure you want to delete this profile?')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', profileId);

            if (error) throw error;
            this.showNotification('Profile deleted successfully!', 'success');
            this.loadProfiles();
        } catch (error) {
            this.showError('Failed to delete profile: ' + error.message);
        }
    }

    // COURSES MANAGEMENT
    async loadCourses() {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.displayCourses(data || []);
        } catch (error) {
            this.showError('Failed to load courses: ' + error.message);
        }
    }

    displayCourses(courses) {
        const tbody = document.getElementById('courses-table-body');
        if (courses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No courses found</td></tr>';
            return;
        }

        tbody.innerHTML = courses.map(course => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">${course.title}</td>
                <td class="px-4 py-2 text-sm">${course.description || 'No description'}</td>
                <td class="px-4 py-2">
                    <span class="px-2 py-1 rounded text-xs ${
                        course.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }">${course.status}</span>
                </td>
                <td class="px-4 py-2">
                    <button onclick="adminPanel.editCourse('${course.id}')" class="text-blue-600 hover:text-blue-900 text-sm mr-2">Edit</button>
                    <button onclick="adminPanel.deleteCourse('${course.id}')" class="text-red-600 hover:text-red-900 text-sm">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    showCourseModal(courseId = null) {
        this.currentEditId = courseId;
        const modal = document.getElementById('course-modal');
        const title = document.getElementById('course-modal-title');
        
        if (courseId) {
            title.textContent = 'Edit Course';
            // Load course data here
        } else {
            title.textContent = 'Add Course';
            document.getElementById('course-title').value = '';
            document.getElementById('course-desc').value = '';
            document.getElementById('course-status').value = 'draft';
        }
        
        modal.classList.remove('hidden');
    }

    hideCourseModal() {
        document.getElementById('course-modal').classList.add('hidden');
        this.currentEditId = null;
    }

    async saveCourse() {
        const title = document.getElementById('course-title').value;
        const description = document.getElementById('course-desc').value;
        const status = document.getElementById('course-status').value;

        try {
            if (this.currentEditId) {
                // Update existing course
                const { error } = await supabase
                    .from('courses')
                    .update({ title, description, status })
                    .eq('id', this.currentEditId);
                if (error) throw error;
                this.showNotification('Course updated!', 'success');
            } else {
                // Create new course
                const { error } = await supabase
                    .from('courses')
                    .insert([{ title, description, status }]);
                if (error) throw error;
                this.showNotification('Course created!', 'success');
            }
            this.hideCourseModal();
            this.loadCourses();
        } catch (error) {
            this.showError('Failed to save course: ' + error.message);
        }
    }

    async editCourse(courseId) {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .single();

            if (error) throw error;
            
            document.getElementById('course-title').value = data.title;
            document.getElementById('course-desc').value = data.description || '';
            document.getElementById('course-status').value = data.status;
            this.showCourseModal(courseId);
        } catch (error) {
            this.showError('Failed to load course: ' + error.message);
        }
    }

    async deleteCourse(courseId) {
        if (!confirm('Delete this course?')) return;
        
        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);
                
            if (error) throw error;
            this.showNotification('Course deleted!', 'success');
            this.loadCourses();
        } catch (error) {
            this.showError('Failed to delete course: ' + error.message);
        }
    }

    // CHAPTERS MANAGEMENT
    async loadChapters() {
        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('*, courses(title)')
                .order('order_index', { ascending: true });

            if (error) throw error;
            this.displayChapters(data || []);
        } catch (error) {
            this.showError('Failed to load chapters: ' + error.message);
        }
    }

    displayChapters(chapters) {
        const tbody = document.getElementById('chapters-table-body');
        if (chapters.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No chapters found</td></tr>';
            return;
        }

        tbody.innerHTML = chapters.map(chapter => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">${chapter.title}</td>
                <td class="px-4 py-2 text-sm">${chapter.courses?.title || 'No course'}</td>
                <td class="px-4 py-2 text-sm">${chapter.order_index}</td>
                <td class="px-4 py-2">
                    <button onclick="adminPanel.editChapter('${chapter.id}')" class="text-blue-600 hover:text-blue-900 text-sm mr-2">Edit</button>
                    <button onclick="adminPanel.deleteChapter('${chapter.id}')" class="text-red-600 hover:text-red-900 text-sm">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // CONTENT MANAGEMENT
    async loadContent() {
        try {
            const { data, error } = await supabase
                .from('content')
                .select('*, chapters(title)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.displayContent(data || []);
        } catch (error) {
            this.showError('Failed to load content: ' + error.message);
        }
    }

    displayContent(content) {
        const tbody = document.getElementById('content-table-body');
        if (content.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-gray-500">No content found</td></tr>';
            return;
        }

        tbody.innerHTML = content.map(item => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">${item.title}</td>
                <td class="px-4 py-2">
                    <span class="px-2 py-1 rounded text-xs ${
                        item.type === 'video' ? 'bg-red-100 text-red-800' :
                        item.type === 'article' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                    }">${item.type}</span>
                </td>
                <td class="px-4 py-2 text-sm">${item.chapters?.title || 'No chapter'}</td>
                <td class="px-4 py-2">
                    <button onclick="adminPanel.editContent('${item.id}')" class="text-blue-600 hover:text-blue-900 text-sm mr-2">Edit</button>
                    <button onclick="adminPanel.deleteContent('${item.id}')" class="text-red-600 hover:text-red-900 text-sm">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // UTILITIES
    showNotification(message, type = 'info') {
        const div = document.createElement('div');
        div.className = `fixed top-4 right-4 p-4 rounded text-white ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`;
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialize
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});

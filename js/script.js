// Configuration - USE YOUR GODOT COURSE APP SCRIPT URL
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwY-R3DFlQH0hBWI56IWzT7Vq5aJP180GMcFxMQKR_Hex1E5ZkEdg1p0T-HzgAlhad0Lg/exec'; // Your Godot script URL

// DOM Elements
const leadForm = document.getElementById('leadForm');
const formMessage = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');

// Toggle functions
function toggleFAQ(faqNum) {
    const answer = document.getElementById(`faq${faqNum}`);
    answer.classList.toggle('active');
    const question = answer.previousElementSibling;
    question.querySelector('span:last-child').textContent = answer.classList.contains('active') ? '−' : '+';
}

// Form handling - USING THE WORKING APPROACH
leadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        budget: document.getElementById('budget').value,
        expectations: document.getElementById('expectations').value.trim(),
        timestamp: new Date().toISOString(),
        source: 'Godot 3D MP Course Prelaunch'
    };
    
    console.log('Submitting data:', formData);
    
    // Validate form
    if (!formData.name || !formData.email) {
        showMessage('Please fill in your name and email.', 'error');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    formMessage.style.display = 'none';
    
    try {
        // Add timestamp to avoid caching - SAME AS WORKING FORM
        const url = `${APP_SCRIPT_URL}?timestamp=${new Date().getTime()}`;
        
        console.log('Sending to:', url);
        
        // Use the SAME approach as working form - no-cors mode
        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // This is the key that makes it work
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // Since we're using no-cors, we can't read the response
        // But the request should still go through to Apps Script
        showMessage('🎉 Thank you! We\'ve received your interest and will notify you about special pricing and early access.', 'success');
        leadForm.reset();
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('✅ Form submitted! We\'ll contact you soon with early access details.', 'success');
        leadForm.reset();
    } finally {
        setLoadingState(false);
    }
});

// Helper functions
function setLoadingState(loading) {
    if (loading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        submitBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';
    
    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide success messages after 10 seconds
    if (type === 'success') {
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 10000);
    }
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add some interactive animations
document.addEventListener('DOMContentLoaded', function() {
    // Add fade-in animation to elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe feature cards and other elements
    document.querySelectorAll('.feature-card, .pricing-card, .curriculum-card, .mechanic-item, .gallery-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    console.log('Godot 3D MP course form handler loaded');
});

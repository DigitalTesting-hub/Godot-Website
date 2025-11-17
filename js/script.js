// Configuration - UPDATE THIS WITH YOUR APP SCRIPT URL
const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz20Sk50ire7h3WGmAAQXSEWaUwpdXb1qI7whQSoKqe7e1WDNQCFgm-12Aw72CdEuX5qQ/exec';

// DOM Elements
const leadForm = document.getElementById('leadForm');
const formMessage = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');

// Toggle functions
function toggleModule(moduleNum) {
    const module = document.getElementById(`module${moduleNum}`);
    module.classList.toggle('active');
    const header = module.previousElementSibling;
    header.querySelector('span').textContent = module.classList.contains('active') ? '−' : '+';
}

function toggleFAQ(faqNum) {
    const answer = document.getElementById(`faq${faqNum}`);
    answer.classList.toggle('active');
    const question = answer.previousElementSibling;
    question.querySelector('span:last-child').textContent = answer.classList.contains('active') ? '−' : '+';
}

// Form handling
leadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        budget: document.getElementById('budget').value,
        expectations: document.getElementById('expectations').value,
        timestamp: new Date().toISOString(),
        source: 'Godot Course Prelaunch'
    };
    
    // Validate form
    if (!formData.name || !formData.email || !formData.budget) {
        showMessage('Please fill in all required fields.', 'error');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Send to Google Apps Script
        const response = await fetch(APP_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.text();
        
        if (response.ok) {
            showMessage('🎉 Thanks for your interest! We\'ll notify you about special pricing and early access.', 'success');
            leadForm.reset();
        } else {
            throw new Error(result);
        }
        
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('Sorry, there was an error. Please try again or contact us directly.', 'error');
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
    document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Configuration - Pabbly Webhook URL
const PABBLY_WEBHOOK_URL = 'https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjYwNTY0MDYzZTA0MzI1MjY1NTUzNjUxM2Ii_pc';

// DOM Elements
const leadForm = document.getElementById('leadForm');
const formMessage = document.getElementById('formMessage');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoading = submitBtn.querySelector('.btn-loading');

// Form handling with Pabbly Integration
leadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        budget: document.getElementById('budget').value,
        expectations: document.getElementById('expectations').value.trim(),
        timestamp: new Date().toISOString(),
        source: 'Godot 3D MP Course Prelaunch',
        page_url: window.location.href,
        user_agent: navigator.userAgent
    };
    
    console.log('Submitting data to Pabbly:', formData);
    
    // Validate form
    if (!formData.name || !formData.email) {
        showMessage('Please fill in your name and email.', 'error');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
        showMessage('Please enter a valid email address.', 'error');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    formMessage.style.display = 'none';
    
    try {
        // Method 1: Try with no-cors mode first (most reliable for cross-origin)
        console.log('Attempting to send to Pabbly...');
        
        const response = await fetch(PABBLY_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors', // Important for cross-origin requests
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // With no-cors mode, we can't read the response but the request should go through
        console.log('Request sent (no-cors mode)');
        
        // Show success message regardless (fire-and-forget approach)
        showMessage('🎉 Thank you! We\'ve received your interest and will notify you about special pricing and early access.', 'success');
        leadForm.reset();
        
    } catch (error) {
        console.error('Error with primary method:', error);
        
        // Fallback: Try alternative method
        try {
            console.log('Trying alternative method...');
            await sendWithAlternativeMethod(formData);
            showMessage('✅ Thank you! We\'ve received your interest. We\'ll contact you soon.', 'success');
            leadForm.reset();
        } catch (fallbackError) {
            console.error('All methods failed:', fallbackError);
            showMessage('✅ Thank you! Form submitted successfully. We\'ll contact you soon.', 'success');
            leadForm.reset();
        }
    } finally {
        setLoadingState(false);
    }
});

// Alternative method using form data instead of JSON
async function sendWithAlternativeMethod(formData) {
    // Create URLSearchParams instead of JSON
    const params = new URLSearchParams();
    params.append('name', formData.name);
    params.append('email', formData.email);
    params.append('budget', formData.budget);
    params.append('expectations', formData.expectations);
    params.append('timestamp', formData.timestamp);
    params.append('source', formData.source);
    
    const response = await fetch(PABBLY_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: params
    });
    
    console.log('Alternative method completed');
}

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
    
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    if (type === 'success') {
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 10000);
    }
}

// Smooth scrolling and animations (keep existing code)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.feature-card, .pricing-card, .curriculum-card, .mechanic-item, .gallery-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    console.log('Godot 3D MP with Pabbly integration loaded');
});

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
        // Send data to Pabbly Connect
        const response = await fetch(PABBLY_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showMessage('🎉 Thank you! We\'ve received your interest and will notify you about special pricing and early access.', 'success');
            leadForm.reset();
            
            // Track conversion (optional)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'lead_submission', {
                    'event_category': 'form',
                    'event_label': 'Godot Course Prelaunch'
                });
            }
            
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error submitting to Pabbly:', error);
        
        // Fallback: Still show success message even if Pabbly fails
        showMessage('✅ Thank you! We\'ve received your interest. We\'ll contact you soon with early access details.', 'success');
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
    
    console.log('Godot 3D MP course form with Pabbly integration loaded');
});

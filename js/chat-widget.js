// Simplified chat-widget.js - Focus on core functionality
class ChatWidget {
    constructor() {
        console.log('🚀 Initializing Chat Widget...');
        this.isChatOpen = false;
        this.currentTicketId = null;
        this.userName = '';
        this.isNewChat = true;
        this.backendUrl = 'https://1454e379-5d20-4c4f-91ff-4859f3439300-00-2mhzvdi91js6d.sisko.replit.dev/';
        
        this.initializeElements();
        this.attachEventListeners();
        
        console.log('✅ Chat Widget Ready');
    }

    initializeElements() {
        console.log('🔍 Finding chat elements...');
        
        this.elements = {
            chatToggle: document.getElementById('chatToggle'),
            chatContainer: document.getElementById('chatContainer'),
            closeChat: document.getElementById('closeChat'),
            welcomeScreen: document.getElementById('welcomeScreen'),
            chatMessages: document.getElementById('chatMessages'),
            chatInputArea: document.getElementById('chatInputArea'),
            startChatBtn: document.getElementById('startChatBtn'),
            messageInput: document.getElementById('messageInput'),
            sendMessageBtn: document.getElementById('sendMessageBtn'),
            userNameInput: document.getElementById('userName'),
            ticketIdInput: document.getElementById('ticketId')
        };

        // Log found elements for debugging
        Object.entries(this.elements).forEach(([key, element]) => {
            console.log(`${key}:`, element ? '✅ Found' : '❌ Missing');
        });

        // Ensure chat starts closed
        if (this.elements.chatContainer) {
            this.elements.chatContainer.style.display = 'none';
        }
        
        this.resetChatState();
    }

    resetChatState() {
        if (this.elements.chatMessages) this.elements.chatMessages.innerHTML = '';
        if (this.elements.userNameInput) this.elements.userNameInput.value = '';
        if (this.elements.ticketIdInput) this.elements.ticketIdInput.value = '';
        if (this.elements.welcomeScreen) this.elements.welcomeScreen.style.display = 'flex';
        if (this.elements.chatMessages) this.elements.chatMessages.style.display = 'none';
        if (this.elements.chatInputArea) this.elements.chatInputArea.style.display = 'none';
        
        this.currentTicketId = null;
        this.userName = '';
        this.isNewChat = true;
    }

    attachEventListeners() {
        console.log('🔗 Attaching event listeners...');
        
        // Chat toggle
        if (this.elements.chatToggle) {
            this.elements.chatToggle.onclick = () => this.toggleChat();
            console.log('✅ Chat toggle listener attached');
        }

        // Close chat
        if (this.elements.closeChat) {
            this.elements.closeChat.onclick = () => this.closeChat();
        }

        // Start chat
        if (this.elements.startChatBtn) {
            this.elements.startChatBtn.onclick = () => this.startChat();
        }

        // Send message
        if (this.elements.sendMessageBtn) {
            this.elements.sendMessageBtn.onclick = () => this.sendMessage();
        }

        // Enter key for message input
        if (this.elements.messageInput) {
            this.elements.messageInput.onkeypress = (e) => {
                if (e.key === 'Enter') this.sendMessage();
            };
        }

        // Close chat when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isChatOpen && 
                this.elements.chatContainer && 
                !this.elements.chatContainer.contains(e.target) && 
                this.elements.chatToggle && 
                !this.elements.chatToggle.contains(e.target)) {
                this.closeChat();
            }
        });

        console.log('✅ All event listeners attached');
    }

    toggleChat() {
        console.log('🎯 Toggle chat called, current state:', this.isChatOpen);
        this.isChatOpen = !this.isChatOpen;
        
        if (this.elements.chatContainer) {
            this.elements.chatContainer.style.display = this.isChatOpen ? 'flex' : 'none';
            console.log('💬 Chat container display:', this.elements.chatContainer.style.display);
        }
        
        if (this.isChatOpen && this.elements.messageInput) {
            setTimeout(() => {
                this.elements.messageInput.focus();
            }, 100);
        }
    }

    closeChat() {
        console.log('❌ Closing chat');
        this.isChatOpen = false;
        if (this.elements.chatContainer) {
            this.elements.chatContainer.style.display = 'none';
        }
    }

    async startChat() {
        if (!this.elements.userNameInput) return;
        
        this.userName = this.elements.userNameInput.value.trim();
        const ticketId = this.elements.ticketIdInput ? this.elements.ticketIdInput.value.trim() : '';
        
        if (!this.userName) {
            alert('Please enter your name to continue');
            return;
        }
        
        console.log('🚀 Starting chat for user:', this.userName);
        
        try {
            if (ticketId) {
                this.currentTicketId = ticketId;
                this.isNewChat = false;
                await this.continueExistingChat();
            } else {
                this.currentTicketId = this.generateTicketId();
                this.isNewChat = true;
                await this.startNewChat();
            }
            
            if (this.elements.welcomeScreen) this.elements.welcomeScreen.style.display = 'none';
            if (this.elements.chatMessages) this.elements.chatMessages.style.display = 'flex';
            if (this.elements.chatInputArea) this.elements.chatInputArea.style.display = 'flex';
            
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Error starting chat: ' + error.message);
        }
    }

    async startNewChat() {
        if (!this.elements.chatMessages) return;
        
        this.elements.chatMessages.innerHTML = '';
        
        // Simulate API call for demo
        this.addMessage(`Your ticket ID is: ${this.currentTicketId}. Please save this ID to continue this chat later.`, 'bot');
        this.addMessage(`Hello ${this.userName}! How can I help you today?`, 'bot');
    }

    async continueExistingChat() {
        if (!this.elements.chatMessages) return;
        
        this.elements.chatMessages.innerHTML = '';
        this.addMessage(`Welcome back ${this.userName}! Continuing your previous conversation.`, 'bot');
    }

    async sendMessage() {
        if (!this.elements.messageInput || !this.currentTicketId) return;
        
        const message = this.elements.messageInput.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Simulate bot response after delay
        setTimeout(() => {
            this.hideTypingIndicator();
            this.addMessage("Thanks for your message! Our support team will get back to you soon.", 'bot');
        }, 1000);
    }

    addMessage(text, sender, scroll = true) {
        if (!this.elements.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        this.elements.chatMessages.appendChild(messageDiv);
        
        if (scroll) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }

    showTypingIndicator() {
        if (!this.elements.chatMessages) return;
        
        const existingIndicator = document.getElementById('typingIndicator');
        if (existingIndicator) existingIndicator.remove();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = '● ● ●';
        
        typingDiv.appendChild(contentDiv);
        this.elements.chatMessages.appendChild(typingDiv);
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    generateTicketId() {
        return 'TKT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
}

// Global initialization
let chatWidgetInstance = null;

function initializeChatWidget() {
    if (chatWidgetInstance) {
        console.log('⚠️ Chat widget already initialized');
        return chatWidgetInstance;
    }
    
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        chatWidgetInstance = new ChatWidget();
        window.chatWidget = chatWidgetInstance;
        console.log('🌐 Chat widget added to window object');
    }, 100);
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatWidget);
} else {
    initializeChatWidget();
}

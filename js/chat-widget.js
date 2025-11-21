// Real API chat-widget.js - Connects to actual backend
class ChatWidget {
    constructor() {
        console.log('🚀 Initializing Chat Widget with Real API...');
        this.isChatOpen = false;
        this.currentTicketId = null;
        this.userName = '';
        this.isNewChat = true;
        this.backendUrl = 'https://1454e379-5d20-4c4f-91ff-4859f3439300-00-2mhzvdi91js6d.sisko.replit.dev';
        
        this.initializeElements();
        this.attachEventListeners();
        this.startPolling();
        
        console.log('✅ Chat Widget Ready with Real API');
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
        
        try {
            const response = await this.sendToBackend('/api/new_chat', {
                userName: this.userName,
                ticketId: this.currentTicketId
            });
            
            if (response.success) {
                this.addMessage(`Your ticket ID is: ${this.currentTicketId}. Please save this ID to continue this chat later.`, 'bot');
                this.addMessage(`Hello ${this.userName}! Welcome to Game Support. How can I help you today?`, 'bot');
            } else {
                throw new Error(response.error || 'Failed to start chat');
            }
        } catch (error) {
            console.error('Error starting new chat:', error);
            this.addMessage(`Sorry, there was an error starting the chat. Please try again.`, 'bot');
        }
    }

    async continueExistingChat() {
        if (!this.elements.chatMessages) return;
        
        this.elements.chatMessages.innerHTML = '';
        
        try {
            const response = await this.sendToBackend('/api/continue_chat', {
                userName: this.userName,
                ticketId: this.currentTicketId
            });
            
            if (response.success) {
                this.addMessage(`Welcome back ${this.userName}! Continuing your previous conversation.`, 'bot');
                // Load existing messages
                await this.loadMessages();
            } else {
                throw new Error(response.error || 'Failed to continue chat');
            }
        } catch (error) {
            console.error('Error continuing chat:', error);
            this.addMessage(`Sorry, couldn't load your previous conversation. Starting a new one.`, 'bot');
            this.currentTicketId = this.generateTicketId();
            this.isNewChat = true;
            await this.startNewChat();
        }
    }

    async sendMessage() {
        if (!this.elements.messageInput || !this.currentTicketId) return;
        
        const message = this.elements.messageInput.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.sendToBackend('/api/user_message', {
                userName: this.userName,
                ticketId: this.currentTicketId,
                message: message
            });
            
            this.hideTypingIndicator();
            
            if (response.success && response.message) {
                this.addMessage(response.message, 'bot');
            } else {
                this.addMessage("I apologize, but I'm having trouble processing your message. Please try again.", 'bot');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.addMessage("Sorry, I'm having trouble connecting to the support team. Please try again later.", 'bot');
        }
    }

    async loadMessages() {
        try {
            const response = await this.sendToBackend('/api/get_messages', {
                ticketId: this.currentTicketId
            });
            
            if (response.success && response.messages) {
                response.messages.forEach(msg => {
                    this.addMessage(msg.message, msg.sender === 'user' ? 'user' : 'bot', false);
                });
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    async sendToBackend(endpoint, data) {
        console.log(`📤 Sending to ${endpoint}:`, data);
        
        const response = await fetch(`${this.backendUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`📥 Response from ${endpoint}:`, result);
        return result;
    }

    startPolling() {
        // Poll for new messages every 3 seconds when chat is open
        setInterval(async () => {
            if (this.currentTicketId && this.isChatOpen) {
                try {
                    await this.loadMessages();
                } catch (error) {
                    console.error('Error polling messages:', error);
                }
            }
        }, 3000);
    }

    addMessage(text, sender, scroll = true) {
        if (!this.elements.chatMessages) return;
        
        // Check if message already exists to avoid duplicates
        const existingMessages = Array.from(this.elements.chatMessages.querySelectorAll('.message-content'))
            .map(el => el.textContent);
            
        if (existingMessages.includes(text)) {
            return; // Skip duplicate
        }
        
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
        try {
            chatWidgetInstance = new ChatWidget();
            window.chatWidget = chatWidgetInstance;
            console.log('🌐 Chat widget added to window object');
        } catch (error) {
            console.error('❌ Failed to initialize chat widget:', error);
        }
    }, 100);
}

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeChatWidget);
} else {
    initializeChatWidget();
}
// Add these methods to your ChatWidget class in chat-widget.js

isMobileDevice() {
    return window.innerWidth <= 768;
}

toggleChat() {
    console.log('🎯 Toggle chat called, current state:', this.isChatOpen);
    this.isChatOpen = !this.isChatOpen;
    
    if (this.elements.chatContainer) {
        this.elements.chatContainer.style.display = this.isChatOpen ? 'flex' : 'none';
        console.log('💬 Chat container display:', this.elements.chatContainer.style.display);
    }
    
    // Mobile-specific handling
    if (this.isMobileDevice()) {
        if (this.isChatOpen) {
            document.body.classList.add('chat-open');
            this.createBackdrop();
        } else {
            document.body.classList.remove('chat-open');
            this.removeBackdrop();
        }
    }
    
    if (this.isChatOpen && this.elements.messageInput) {
        setTimeout(() => {
            this.elements.messageInput.focus();
        }, 100);
    }
}

createBackdrop() {
    // Remove existing backdrop if any
    this.removeBackdrop();
    
    // Create backdrop for mobile
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'chat-backdrop active';
    this.backdrop.onclick = () => this.closeChat();
    document.body.appendChild(this.backdrop);
}

removeBackdrop() {
    if (this.backdrop) {
        this.backdrop.remove();
        this.backdrop = null;
    }
}

closeChat() {
    console.log('❌ Closing chat');
    this.isChatOpen = false;
    if (this.elements.chatContainer) {
        this.elements.chatContainer.style.display = 'none';
    }
    
    // Mobile-specific cleanup
    if (this.isMobileDevice()) {
        document.body.classList.remove('chat-open');
        this.removeBackdrop();
    }
}

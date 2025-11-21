// chat-widget.js - Updated with Backend Integration
class ChatWidget {
    constructor() {
        if (window.chatWidgetInitialized) return;
        
        this.isChatOpen = false;
        this.currentTicketId = null;
        this.userName = '';
        this.isNewChat = true;
        this.lastMessageId = null;
        this.pollingInterval = null;
        
        // REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT URL
        this.backendUrl = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
        
        this.initializeElements();
        this.attachEventListeners();
        
        window.chatWidgetInitialized = true;
    }

    initializeElements() {
        this.chatToggle = document.getElementById('chatToggle');
        this.chatContainer = document.getElementById('chatContainer');
        this.closeChat = document.getElementById('closeChat');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInputArea = document.getElementById('chatInputArea');
        this.startChatBtn = document.getElementById('startChatBtn');
        this.messageInput = document.getElementById('messageInput');
        this.sendMessageBtn = document.getElementById('sendMessageBtn');
        this.userNameInput = document.getElementById('userName');
        this.ticketIdInput = document.getElementById('ticketId');
        
        this.resetChatState();
    }

    resetChatState() {
        if (this.chatMessages) this.chatMessages.innerHTML = '';
        if (this.userNameInput) this.userNameInput.value = '';
        if (this.ticketIdInput) this.ticketIdInput.value = '';
        if (this.welcomeScreen) this.welcomeScreen.style.display = 'flex';
        if (this.chatMessages) this.chatMessages.style.display = 'none';
        if (this.chatInputArea) this.chatInputArea.style.display = 'none';
        
        this.currentTicketId = null;
        this.userName = '';
        this.isNewChat = true;
        this.lastMessageId = null;
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    attachEventListeners() {
        if (!this.chatToggle || !this.closeChat || !this.startChatBtn) return;

        this.chatToggle.addEventListener('click', () => this.toggleChat());
        this.closeChat.addEventListener('click', () => this.closeChatWindow());
        this.startChatBtn.addEventListener('click', () => this.startChat());
        this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        
        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }

        document.addEventListener('click', (e) => {
            if (this.isChatOpen && 
                !this.chatContainer.contains(e.target) && 
                !this.chatToggle.contains(e.target)) {
                this.closeChatWindow();
            }
        });
    }

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
        this.chatContainer.style.display = this.isChatOpen ? 'flex' : 'none';
        
        if (this.isChatOpen) {
            setTimeout(() => {
                if (this.messageInput && this.currentTicketId) {
                    this.messageInput.focus();
                }
            }, 100);
        }
    }

    closeChatWindow() {
        this.isChatOpen = false;
        this.chatContainer.style.display = 'none';
    }

    async startChat() {
        this.userName = this.userNameInput.value.trim();
        const ticketId = this.ticketIdInput.value.trim();
        
        if (!this.userName) {
            alert('Please enter your name to continue');
            return;
        }
        
        try {
            this.startChatBtn.disabled = true;
            this.startChatBtn.textContent = 'Connecting...';
            
            if (ticketId) {
                // Continue existing chat
                this.currentTicketId = ticketId;
                this.isNewChat = false;
                await this.continueExistingChat();
            } else {
                // Start new chat
                this.currentTicketId = this.generateTicketId();
                this.isNewChat = true;
                await this.startNewChat();
            }
            
            this.welcomeScreen.style.display = 'none';
            this.chatMessages.style.display = 'flex';
            this.chatInputArea.style.display = 'flex';
            
            // Start polling for new messages
            this.startPolling();
            
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Error starting chat: ' + error.message);
            this.startChatBtn.disabled = false;
            this.startChatBtn.textContent = 'Start Chat';
        }
    }

    async startNewChat() {
        this.chatMessages.innerHTML = '';
        
        const response = await this.sendToBackend('new_chat', {
            userName: this.userName,
            ticketId: this.currentTicketId
        });
        
        if (response.success) {
            this.addMessage(`Hello ${this.userName}! How can we help you today?`, 'bot');
            this.addMessage(`Your ticket ID is: ${this.currentTicketId}`, 'bot', true);
            this.addMessage(`Please save this ID to continue this chat later.`, 'bot');
        } else {
            throw new Error(response.error || 'Failed to start chat');
        }
    }

    async continueExistingChat() {
        this.chatMessages.innerHTML = '';
        
        const response = await this.sendToBackend('continue_chat', {
            userName: this.userName,
            ticketId: this.currentTicketId
        });
        
        if (response.success) {
            this.addMessage(`Welcome back ${this.userName}!`, 'bot');
            this.addMessage(`Continuing your previous conversation (${this.currentTicketId})`, 'bot');
            
            // Load previous messages
            await this.loadMessages();
        } else {
            throw new Error(response.error || 'Failed to continue chat');
        }
    }

    async loadMessages() {
        try {
            const response = await this.sendToBackend('get_messages', {
                ticketId: this.currentTicketId,
                lastMessageId: this.lastMessageId
            });
            
            if (response.success && response.messages) {
                response.messages.forEach(msg => {
                    this.addMessage(msg.message, msg.sender === 'user' ? 'user' : 'bot', false, msg.id);
                    this.lastMessageId = msg.id;
                });
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.currentTicketId) return;
        
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        
        try {
            await this.sendToBackend('user_message', {
                userName: this.userName,
                ticketId: this.currentTicketId,
                message: message
            });
            
            // Show typing indicator briefly
            this.showTypingIndicator();
            setTimeout(() => this.hideTypingIndicator(), 2000);
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('Failed to send message. Please try again.', 'bot');
        }
    }

    addMessage(text, sender, isTicketId = false, messageId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        if (messageId) messageDiv.dataset.messageId = messageId;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (isTicketId) {
            contentDiv.innerHTML = `<div class="ticket-id">${text}</div>`;
        } else {
            contentDiv.textContent = text;
        }
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const existingIndicator = document.getElementById('typingIndicator');
        if (existingIndicator) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = '● ● ●';
        
        typingDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    async sendToBackend(action, data) {
        const response = await fetch(this.backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                ...data
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    startPolling() {
        // Poll for new messages every 3 seconds
        this.pollingInterval = setInterval(async () => {
            if (this.currentTicketId && this.isChatOpen) {
                await this.loadMessages();
            }
        }, 3000);
    }

    generateTicketId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TKT-${timestamp}-${random}`.toUpperCase();
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatWidget) {
        window.chatWidget = new ChatWidget();
    }
});

// chat-widget.js - With Backend Integration
class ChatWidget {
    constructor() {
        if (window.chatWidgetInitialized) return;
        
        this.isChatOpen = false;
        this.currentTicketId = null;
        this.userName = '';
        this.isNewChat = true;
        this.backendUrl = 'YOUR_GOOGLE_APPS_SCRIPT_URL'; // Replace with your GAS URL
        
        this.initializeElements();
        this.attachEventListeners();
        this.startPolling();
        
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
                if (this.messageInput) this.messageInput.focus();
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
            if (ticketId) {
                this.currentTicketId = ticketId;
                this.isNewChat = false;
                await this.continueExistingChat();
            } else {
                this.currentTicketId = this.generateTicketId();
                this.isNewChat = true;
                await this.startNewChat();
            }
            
            this.welcomeScreen.style.display = 'none';
            this.chatMessages.style.display = 'flex';
            this.chatInputArea.style.display = 'flex';
            
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Error starting chat. Please try again.');
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
            this.addMessage(`Your ticket ID is: ${this.currentTicketId}. Please save this ID to continue this chat later.`, 'bot');
        } else {
            throw new Error(response.error);
        }
    }

    async continueExistingChat() {
        this.chatMessages.innerHTML = '';
        
        const response = await this.sendToBackend('continue_chat', {
            userName: this.userName,
            ticketId: this.currentTicketId
        });
        
        if (response.success) {
            this.addMessage(`Welcome back ${this.userName}! Continuing your previous conversation.`, 'bot');
            
            // Load previous messages
            const messagesResponse = await this.sendToBackend('get_messages', {
                ticketId: this.currentTicketId
            });
            
            if (messagesResponse.success) {
                messagesResponse.messages.forEach(msg => {
                    this.addMessage(msg.message, msg.sender === 'user' ? 'user' : 'bot');
                });
            }
        } else {
            throw new Error(response.error);
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
            
            this.showTypingIndicator();
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('Failed to send message. Please try again.', 'bot');
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const existingIndicator = document.getElementById('typingIndicator');
        if (existingIndicator) existingIndicator.remove();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = '● ● ●';
        
        typingDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        setTimeout(() => {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) {
                indicator.remove();
                // In real implementation, this would be replaced with actual bot response
                this.addMessage("Thanks for your message! Our team will respond shortly.", 'bot');
            }
        }, 2000);
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
        
        return await response.json();
    }

    startPolling() {
        // Poll for new messages every 3 seconds
        setInterval(async () => {
            if (this.currentTicketId && this.isChatOpen) {
                try {
                    const response = await this.sendToBackend('get_messages', {
                        ticketId: this.currentTicketId
                    });
                    
                    if (response.success) {
                        // Implement message sync logic here
                        this.syncMessages(response.messages);
                    }
                } catch (error) {
                    console.error('Error polling messages:', error);
                }
            }
        }, 3000);
    }

    syncMessages(messages) {
        // Compare existing messages with new messages and update if needed
        // This prevents duplicate messages
        const existingMessages = Array.from(this.chatMessages.querySelectorAll('.message-content'))
            .map(el => el.textContent);
            
        messages.forEach(msg => {
            if (!existingMessages.includes(msg.message)) {
                this.addMessage(msg.message, msg.sender === 'user' ? 'user' : 'bot');
            }
        });
    }

    generateTicketId() {
        return 'TKT-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.chatWidget) {
        window.chatWidget = new ChatWidget();
    }
});

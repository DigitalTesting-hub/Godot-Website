// chat-loader.js - Simple version
document.addEventListener('DOMContentLoaded', function() {
    // Load CSS
    const chatCSS = document.createElement('link');
    chatCSS.rel = 'stylesheet';
    chatCSS.href = 'css/chat-widget.css';
    document.head.appendChild(chatCSS);
    
    // Add HTML
    const chatHTML = `
    <div class="chat-widget">
        <button class="chat-button" id="chatToggle">🤖</button>
        <div class="chat-container" id="chatContainer">
            <div class="chat-header">
                <h3>
                    Game Support
                    <button class="close-chat" id="closeChat">×</button>
                </h3>
            </div>
            <div class="chat-body">
                <div class="welcome-screen" id="welcomeScreen">
                    <h3>Game Support</h3>
                    <p>Need help with the course? Chat with our support team.</p>
                    <div class="input-group">
                        <label for="userName">Your Name</label>
                        <input type="text" id="userName" placeholder="Enter your name">
                    </div>
                    <div class="input-group">
                        <label for="ticketId">Ticket ID (Optional)</label>
                        <input type="text" id="ticketId" placeholder="Enter ticket ID to continue">
                    </div>
                    <button class="start-chat-btn" id="startChatBtn">Start Chat</button>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
            </div>
            <div class="chat-input-area" id="chatInputArea">
                <input type="text" class="chat-input" id="messageInput" placeholder="Type your message...">
                <button class="send-button" id="sendMessageBtn">➤</button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', chatHTML);
    
    // Load the main chat widget script
    setTimeout(function() {
        const script = document.createElement('script');
        script.src = 'js/chat-widget.js';
        script.onload = function() {
            // Initialize after script loads
            setTimeout(function() {
                if (typeof ChatWidget !== 'undefined' && !window.chatWidget) {
                    window.chatWidget = new ChatWidget();
                    console.log('Chat widget loaded on other page');
                }
            }, 100);
        };
        document.body.appendChild(script);
    }, 100);
});

/* ========================================
   Derecho Virtual - Chatbot
   ENHANCED: Dynamic, fun, university vibe
   Auto-reminders, +34 prefix, animated
   ======================================== */

// API Endpoint (Vercel serverless function - API key is stored securely on server)
// Change this URL after deploying to Vercel
const API_ENDPOINT = '/api/chat';

// Calendly Configuration
const CALENDLY_URL = 'https://calendly.com/derecho-virtual/demostracion-gratuita-derechovirtual';

// Reminder interval (45 seconds)
const REMINDER_INTERVAL = 45000;

// Conversation steps - SALES SETTER APPROACH
const CONVERSATION_STEPS = {
    0: { message: "¡Ey! 👋 ¿Estudiando Derecho a distancia y agobiado con los exámenes? Tengo algo que puede cambiarte el cuatrimestre 🔥", waitForResponse: true },
    1: { message: "Mira, en 30 min te enseño GRATIS cómo aprobar con nuestro método: clases de 15 min, esquemas listos y una IA que te resuelve dudas al momento. ¿Te apuntas? 🎯", waitForResponse: true },
    2: { message: "Genial! Para reservarte hueco en la demo, ¿en qué uni estudias? 🎓", waitForResponse: true, collectField: 'universidad' },
    3: { message: "Perfecto! ¿Cómo te llamas? 😊", waitForResponse: true, collectField: 'nombre' },
    4: { message: "Guay {nombre}! Dame tu email para mandarte el enlace de la demo 📧", waitForResponse: true, collectField: 'email' },
    5: { message: "Último paso! Tu móvil por si hay cambios de última hora ☎️", waitForResponse: true, collectField: 'telefono' },
    6: { message: "¡Perfecto {nombre}! 🎉 Haz clic en el botón y elige tu hueco. ¡Hay pocas plazas esta semana!", showCalendly: true }
};

// Reminder messages - SALES URGENCY
const REMINDER_MESSAGES = [
    "¿Sigues ahí? 👀 Las plazas para esta semana se acaban rápido...",
    "Ey! Solo te faltan 30 segundos para reservar tu demo gratis 🎯",
    "No te quedes sin probar el método que ha ayudado a cientos de alumnos a aprobar 💪",
    "¿Tienes alguna duda? Pregúntame lo que quieras, estoy aquí para ayudarte 😊",
    "Mira, la demo es gratis y sin compromiso. ¿Qué pierdes por probar? 🔥"
];

// Chatbot State
let chatState = {
    currentStep: 0,
    collectedData: {
        universidad: '',
        nombre: '',
        email: '',
        telefono: ''
    },
    conversationHistory: [],
    awaitingResponse: false,
    reminderTimer: null,
    reminderCount: 0,
    lastUserMessageTime: null
};

// System prompt - SALES SETTER MINDSET
const SYSTEM_PROMPT = `Eres un SETTER DE VENTAS de Derecho Virtual. Tu ÚNICO objetivo es conseguir que el alumno reserve la demo gratuita. Hablas como un chaval universitario pero con mentalidad comercial.

PERSONALIDAD:
- Cercano, empático, con algún emoji
- Mensajes CORTOS (1-2 líneas máximo)
- Siempre positivo y motivador
- NUNCA te rindes, siempre reconduces a la demo

DATOS RECOPILADOS: {{COLLECTED_DATA}}
CONTEXTO: {{CURRENT_CONTEXT}}

TÉCNICAS DE VENTA QUE USAS:
1. BENEFICIO: Siempre habla de aprobar exámenes, no de características
2. URGENCIA: "Las plazas vuelan", "Esta semana hay huecos"
3. PRUEBA SOCIAL: "Cientos de alumnos ya lo usan"
4. SIN RIESGO: "Es gratis, sin compromiso, 30 min"

MANEJO DE OBJECIONES:
- "No tengo tiempo" → "Solo son 30 min que te pueden ahorrar meses de estudio. ¿Qué día te viene mejor?"
- "No me interesa" → "Entiendo, pero ¿no quieres al menos ver cómo otros alumnos de tu uni están aprobando? Es gratis"
- "Ya tengo mi método" → "Genial! Pero siempre está bien conocer alternativas. En la demo ves si te aporta algo nuevo"
- "Es caro?" → "La demo es 100% gratis! Y luego ya decides. ¿Te reservo hueco?"
- Cualquier duda → Responde brevemente y CIERRA: "¿Te apuntas a verlo en la demo?"

REGLA DE ORO: SIEMPRE termina con una pregunta que acerque a la demo:
- Si NO tenemos universidad → "¿En qué uni estudias? 🎓"
- Si tenemos uni pero NO nombre → "¿Cómo te llamas?"
- Si tenemos nombre pero NO email → "Dame tu email para reservarte"
- Si tenemos email pero NO teléfono → "¿Y tu móvil?"
- Si tenemos TODO → celebra y empuja al botón`;

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    createChatbotHTML();
    initChatbot();
});

// Create chatbot HTML structure with LOGO
function createChatbotHTML() {
    const chatbotHTML = `
        <!-- Chatbot Toggle Button with LOGO -->
        <button class="chatbot-toggle" id="chatbot-toggle" aria-label="Abrir chat">
            <img src="logo.jpg" alt="Derecho Virtual" class="logo-img">
            <svg class="close-icon" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
        </button>

        <!-- Chatbot Container -->
        <div class="chatbot-container" id="chatbot-container">
            <div class="chatbot-header">
                <div class="chatbot-avatar">
                    <img src="logo.jpg" alt="Derecho Virtual">
                </div>
                <div class="chatbot-info">
                    <h4>Derecho Virtual</h4>
                    <div class="chatbot-status">
                        <span class="status-dot"></span>
                        <span>En línea</span>
                    </div>
                </div>
            </div>
            
            <div class="chatbot-messages" id="chatbot-messages">
                <!-- Messages will be inserted here -->
            </div>
            
            <div class="quick-replies" id="quick-replies" style="display: none;">
                <!-- Quick reply buttons -->
            </div>
            
            <div class="chatbot-input">
                <input type="text" id="chatbot-input" placeholder="Escribe algo..." autocomplete="off">
                <button type="button" id="chatbot-send" aria-label="Enviar mensaje">
                    <svg viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
}

// Initialize chatbot functionality
function initChatbot() {
    const toggle = document.getElementById('chatbot-toggle');
    const container = document.getElementById('chatbot-container');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    // Toggle chatbot
    toggle.addEventListener('click', function () {
        container.classList.toggle('active');
        toggle.classList.toggle('active');

        // Send first message on first open
        if (container.classList.contains('active') && chatState.currentStep === 0 && chatState.conversationHistory.length === 0) {
            sendNextBotMessage();
            startReminderTimer();
        }

        if (container.classList.contains('active')) {
            input.focus();
        } else {
            stopReminderTimer();
        }
    });

    // Send message on button click
    sendBtn.addEventListener('click', handleSendMessage);

    // Send message on Enter key
    input.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}

// Start reminder timer
function startReminderTimer() {
    stopReminderTimer(); // Clear any existing timer
    chatState.lastUserMessageTime = Date.now();

    chatState.reminderTimer = setInterval(() => {
        const timeSinceLastMessage = Date.now() - chatState.lastUserMessageTime;

        // Only send reminder if user hasn't responded and we're waiting
        if (timeSinceLastMessage >= REMINDER_INTERVAL && chatState.awaitingResponse) {
            sendReminder();
        }
    }, REMINDER_INTERVAL);
}

// Stop reminder timer
function stopReminderTimer() {
    if (chatState.reminderTimer) {
        clearInterval(chatState.reminderTimer);
        chatState.reminderTimer = null;
    }
}

// Send a reminder message
function sendReminder() {
    // Max 4 reminders to avoid harassment
    if (chatState.reminderCount >= 4) {
        stopReminderTimer();
        sendBotMessage("Bueno, te dejo tranquilo 😊 Si te interesa, aquí estaré. ¡Mucha suerte con los exámenes! 🍀");
        return;
    }

    if (chatState.reminderCount >= REMINDER_MESSAGES.length) {
        chatState.reminderCount = 0;
    }

    const reminder = REMINDER_MESSAGES[chatState.reminderCount];
    sendBotMessage(reminder);
    chatState.reminderCount++;
    chatState.lastUserMessageTime = Date.now();
}

// Send the next bot message in the sequence
function sendNextBotMessage() {
    const step = CONVERSATION_STEPS[chatState.currentStep];

    if (!step) return;

    // Replace {nombre} placeholder if we have the name
    let message = step.message;
    if (chatState.collectedData.nombre) {
        message = message.replace('{nombre}', chatState.collectedData.nombre);
    }

    sendBotMessage(message);

    if (step.showCalendly) {
        setTimeout(() => {
            showCalendlyButton();
        }, 1000);
        stopReminderTimer();
    }

    // Update input autocomplete based on current step
    updateInputAutocomplete(step.collectField);

    chatState.awaitingResponse = step.waitForResponse || false;
}

// Handle sending user message
async function handleSendMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();

    if (!message) return;

    // Clear input and reset timer
    input.value = '';
    chatState.lastUserMessageTime = Date.now();
    chatState.reminderCount = 0;

    // Add user message to chat
    addMessage(message, 'user');
    chatState.conversationHistory.push({ role: 'user', content: message });

    // Get current step info
    const currentStep = CONVERSATION_STEPS[chatState.currentStep];

    // Check if this is a question/off-script response
    const isQuestion = message.includes('?') ||
        message.toLowerCase().includes('para qué') ||
        message.toLowerCase().includes('como funciona') ||
        message.toLowerCase().includes('no quiero') ||
        message.toLowerCase().includes('no sé') ||
        message.toLowerCase().includes('dudas');

    if (isQuestion && currentStep && currentStep.collectField) {
        // User is asking a question instead of providing data
        showTypingIndicator();
        try {
            const response = await handleOffScriptQuestion(message);
            hideTypingIndicator();
            sendBotMessage(response);
            // Re-ask the current question after answering
            setTimeout(() => {
                sendNextBotMessage();
            }, 1500);
        } catch (error) {
            hideTypingIndicator();
            sendBotMessage('Uy, algo ha fallado 😅 ¿Puedes repetirlo?');
        }
        return;
    }

    // Collect data if we're at a data collection step
    if (currentStep && currentStep.collectField) {
        const extracted = extractData(message, currentStep.collectField);
        if (extracted) {
            chatState.collectedData[currentStep.collectField] = extracted;
            console.log(`${currentStep.collectField} collected:`, extracted);
        }
    }

    // Move to next step
    chatState.currentStep++;

    // Check if we have the final step
    if (CONVERSATION_STEPS[chatState.currentStep]) {
        setTimeout(() => {
            sendNextBotMessage();
        }, 800);
    }
}

// Extract data based on field type
function extractData(message, fieldType) {
    const cleanMessage = message.trim();

    switch (fieldType) {
        case 'email':
            const emailMatch = cleanMessage.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            return emailMatch ? emailMatch[0].toLowerCase() : cleanMessage;

        case 'telefono':
            // Clean the phone number and add +34 prefix
            let phone = cleanMessage.replace(/[\s.\-()]/g, '');

            // Remove any existing prefix if present
            if (phone.startsWith('+34')) {
                phone = phone.substring(3);
            } else if (phone.startsWith('34') && phone.length > 9) {
                phone = phone.substring(2);
            } else if (phone.startsWith('0034')) {
                phone = phone.substring(4);
            }

            // Keep only digits
            phone = phone.replace(/\D/g, '');

            // Take last 9 digits if longer
            if (phone.length > 9) {
                phone = phone.slice(-9);
            }

            // Add +34 prefix
            return '+34' + phone;

        case 'nombre':
            return cleanMessage.split(' ').map(w =>
                w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
            ).join(' ');

        case 'universidad':
        default:
            return cleanMessage;
    }
}

// Handle off-script questions using ChatGPT
async function handleOffScriptQuestion(question) {
    const dataStatus = [];
    if (chatState.collectedData.universidad) dataStatus.push(`Universidad: ${chatState.collectedData.universidad}`);
    if (chatState.collectedData.nombre) dataStatus.push(`Nombre: ${chatState.collectedData.nombre}`);
    if (chatState.collectedData.email) dataStatus.push(`Email: ${chatState.collectedData.email}`);
    if (chatState.collectedData.telefono) dataStatus.push(`Teléfono: ${chatState.collectedData.telefono}`);

    const collectedDataStr = dataStatus.length > 0 ? dataStatus.join('\n') : 'Ninguno todavía';

    const currentStepInfo = CONVERSATION_STEPS[chatState.currentStep];
    const contextStr = currentStepInfo && currentStepInfo.collectField
        ? `Estamos pidiendo: ${currentStepInfo.collectField}`
        : 'Empezando la conversación';

    const systemPrompt = SYSTEM_PROMPT
        .replace('{{COLLECTED_DATA}}', collectedDataStr)
        .replace('{{CURRENT_CONTEXT}}', contextStr);

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
    ];

    const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: messages,
            temperature: 0.8,
            max_tokens: 100
        })
    });

    if (!response.ok) {
        throw new Error('API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Show Calendly scheduling button
function showCalendlyButton() {
    const messagesContainer = document.getElementById('chatbot-messages');

    // Check if button already exists
    if (document.querySelector('.calendly-button-container')) return;

    // Create button container
    const buttonDiv = document.createElement('div');
    buttonDiv.className = 'calendly-button-container';
    buttonDiv.innerHTML = `
        <button class="calendly-schedule-btn" onclick="openCalendlyWidget()">
            🗓️ ¡Elegir Fecha y Hora!
        </button>
    `;

    // Add styles for the button
    buttonDiv.querySelector('button').style.cssText = `
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
        border: none;
        padding: 16px 32px;
        border-radius: 30px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 15px auto;
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        transition: all 0.3s ease;
        animation: pulse-btn 2s infinite;
    `;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse-btn {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    document.head.appendChild(style);

    messagesContainer.appendChild(buttonDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Open Calendly in new tab with prefilled data
function openCalendlyWidget() {
    const data = chatState.collectedData;

    // Build URL with prefill parameters
    const params = new URLSearchParams({
        name: data.nombre || '',
        email: data.email || '',
        a1: data.telefono || '',
        a2: data.universidad || ''
    });

    // Open Calendly in new tab
    const calendlyFullUrl = `${CALENDLY_URL}?${params.toString()}`;
    window.open(calendlyFullUrl, '_blank');

    // Send confirmation message
    setTimeout(() => {
        sendBotMessage('¡Genial! Te he abierto el calendario en otra pestaña. Elige cuando te venga bien y te llegará un email de confirmación 📩 ¡Nos vemos en la demo! 🚀');
    }, 500);
}

// Add message to chat
function addMessage(text, type) {
    const messagesContainer = document.getElementById('chatbot-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    messageDiv.textContent = text;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send bot message
function sendBotMessage(text) {
    addMessage(text, 'bot');
    chatState.conversationHistory.push({ role: 'assistant', content: text });
}

// Update input autocomplete attribute based on current field
function updateInputAutocomplete(fieldType) {
    const input = document.getElementById('chatbot-input');
    if (!input) return;

    const autocompleteMap = {
        'email': { autocomplete: 'email', placeholder: 'tu@email.com', type: 'email' },
        'telefono': { autocomplete: 'tel', placeholder: '612 345 678', type: 'tel' },
        'nombre': { autocomplete: 'name', placeholder: 'Tu nombre...', type: 'text' },
        'universidad': { autocomplete: 'organization', placeholder: 'Tu universidad...', type: 'text' }
    };

    const config = autocompleteMap[fieldType] || { autocomplete: 'off', placeholder: 'Escribe algo...', type: 'text' };

    input.setAttribute('autocomplete', config.autocomplete);
    input.setAttribute('placeholder', config.placeholder);
    input.setAttribute('type', config.type);
}

// Show typing indicator
function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Hide quick replies
function hideQuickReplies() {
    const container = document.getElementById('quick-replies');
    if (container) container.style.display = 'none';
}

// Reset chat
function resetChat() {
    stopReminderTimer();
    chatState = {
        currentStep: 0,
        collectedData: {
            universidad: '',
            nombre: '',
            email: '',
            telefono: ''
        },
        conversationHistory: [],
        awaitingResponse: false,
        reminderTimer: null,
        reminderCount: 0,
        lastUserMessageTime: null
    };

    const messagesContainer = document.getElementById('chatbot-messages');
    messagesContainer.innerHTML = '';
}

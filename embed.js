/* ========================================
   Derecho Virtual - Embeddable Chatbot Widget
   Just add one script tag to any website!
   ======================================== */

(function () {
    'use strict';

    // Configuration - Vercel deployment URL
    const WIDGET_BASE_URL = 'https://chat-bot-ia-nine.vercel.app';

    // API Endpoint (Vercel serverless function - API key is stored securely on server)
    const API_ENDPOINT = WIDGET_BASE_URL + '/api/chat';

    // Calendly Configuration
    const CALENDLY_URL = 'https://calendly.com/derecho-virtual/demostracion-gratuita-derechovirtual';

    // Reminder interval (45 seconds)
    const REMINDER_INTERVAL = 45000;

    // Logo URL - hosted on your domain
    const LOGO_URL = WIDGET_BASE_URL + '/logo.jpg';

    // Conversation steps - SALES SETTER APPROACH
    const CONVERSATION_STEPS = {
        0: { message: "¡Ey! 👋 ¿Estudiando Derecho a distancia y agobiado con los exámenes? Tengo algo que puede cambiarte el cuatrimestre �", waitForResponse: true },
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
        "Mira, la demo es gratis y sin compromiso. ¿Qué pierdes por probar? �"
    ];

    // Chatbot State
    let chatState = {
        currentStep: 0,
        collectedData: { universidad: '', nombre: '', email: '', telefono: '' },
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

    // Inject CSS
    function injectStyles() {
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            .dv-chatbot-toggle {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5), 0 0 0 0 rgba(99, 102, 241, 0.4);
                z-index: 999999;
                transition: all 0.3s ease;
                border: 4px solid rgba(255, 255, 255, 0.3);
                animation: dv-pulse-attention 2s infinite, dv-float 3s ease-in-out infinite;
            }
            
            @keyframes dv-pulse-attention {
                0% { box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5), 0 0 0 0 rgba(99, 102, 241, 0.6); }
                70% { box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5), 0 0 0 20px rgba(99, 102, 241, 0); }
                100% { box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5), 0 0 0 0 rgba(99, 102, 241, 0); }
            }
            
            @keyframes dv-float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
            }
            
            .dv-chatbot-toggle:hover {
                transform: scale(1.15) translateY(-5px);
                box-shadow: 0 12px 40px rgba(99, 102, 241, 0.6);
                animation: none;
            }
            
            .dv-chatbot-toggle::before {
                content: '💬';
                position: absolute;
                top: -12px;
                right: -12px;
                background: #ef4444;
                color: white;
                font-size: 0.75rem;
                padding: 4px 8px;
                border-radius: 12px;
                font-weight: 700;
                animation: dv-bounce-badge 1s infinite;
            }
            
            @keyframes dv-bounce-badge {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
            
            .dv-chatbot-toggle .dv-logo-img {
                width: 50px;
                height: 50px;
                object-fit: contain;
                border-radius: 50%;
            }
            
            .dv-chatbot-toggle .dv-close-icon {
                display: none;
                width: 36px;
                height: 36px;
                fill: white;
            }
            
            .dv-chatbot-toggle.active { animation: none; }
            .dv-chatbot-toggle.active::before { display: none; }
            .dv-chatbot-toggle.active .dv-logo-img { display: none; }
            .dv-chatbot-toggle.active .dv-close-icon { display: block; }
            
            .dv-chatbot-container {
                position: fixed;
                bottom: 7rem;
                right: 1.5rem;
                width: 400px;
                max-width: calc(100vw - 2rem);
                height: 550px;
                max-height: calc(100vh - 10rem);
                background: white;
                border-radius: 1.5rem;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
                display: none;
                flex-direction: column;
                overflow: hidden;
                z-index: 999998;
                animation: dv-slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            
            .dv-chatbot-container.active { display: flex; }
            
            @keyframes dv-slideUp {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            .dv-chatbot-header {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                padding: 1.25rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .dv-chatbot-avatar {
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 50%;
                overflow: hidden;
            }
            
            .dv-chatbot-avatar img { width: 100%; height: 100%; object-fit: cover; }
            
            .dv-chatbot-info h4 {
                font-size: 1.1rem;
                font-weight: 700;
                margin: 0 0 4px 0;
            }
            
            .dv-chatbot-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.8rem;
                opacity: 0.85;
            }
            
            .dv-status-dot {
                width: 10px;
                height: 10px;
                background: #4ade80;
                border-radius: 50%;
                animation: dv-pulse 2s infinite;
                box-shadow: 0 0 8px #4ade80;
            }
            
            @keyframes dv-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.6; transform: scale(0.9); }
            }
            
            .dv-chatbot-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                background: linear-gradient(180deg, #f9fafb 0%, white 100%);
            }
            
            .dv-chat-message {
                max-width: 85%;
                padding: 0.875rem 1rem;
                border-radius: 1.25rem;
                font-size: 0.9375rem;
                line-height: 1.55;
                animation: dv-messageIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            
            @keyframes dv-messageIn {
                from { opacity: 0; transform: translateY(15px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            .dv-chat-message.bot {
                background: white;
                color: #374151;
                align-self: flex-start;
                border-bottom-left-radius: 6px;
                box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
                border-left: 3px solid #6366f1;
            }
            
            .dv-chat-message.user {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 6px;
            }
            
            .dv-chat-message.typing {
                display: flex;
                gap: 5px;
                padding: 1rem 1.25rem;
            }
            
            .dv-typing-dot {
                width: 10px;
                height: 10px;
                background: #6366f1;
                border-radius: 50%;
                animation: dv-typingBounce 1.4s infinite ease-in-out;
            }
            
            .dv-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .dv-typing-dot:nth-child(3) { animation-delay: 0.4s; }
            
            @keyframes dv-typingBounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-8px); }
            }
            
            .dv-chatbot-input {
                padding: 1rem;
                background: white;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 0.75rem;
            }
            
            .dv-chatbot-input input {
                flex: 1;
                padding: 0.875rem 1.25rem;
                border: 2px solid #e5e7eb;
                border-radius: 2rem;
                font-size: 0.9375rem;
                font-family: inherit;
                outline: none;
                transition: all 0.2s ease;
            }
            
            .dv-chatbot-input input:focus {
                border-color: #6366f1;
                box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
            }
            
            .dv-chatbot-input button {
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.25s ease;
            }
            
            .dv-chatbot-input button:hover {
                transform: scale(1.1);
                box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
            }
            
            .dv-chatbot-input button svg {
                width: 22px;
                height: 22px;
                fill: white;
            }
            
            .dv-calendly-btn {
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
                animation: dv-pulse-btn 2s infinite;
            }
            
            @keyframes dv-pulse-btn {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            @media (max-width: 480px) {
                .dv-chatbot-container {
                    bottom: 0;
                    right: 0;
                    left: 0;
                    width: 100%;
                    max-width: 100%;
                    height: 100vh;
                    max-height: 100vh;
                    border-radius: 0;
                    z-index: 9999999;
                }
                .dv-chatbot-toggle.active {
                    display: none !important;
                }
                .dv-chatbot-toggle {
                    bottom: 1rem;
                    right: 1rem;
                    width: 65px;
                    height: 65px;
                }
                .dv-header-close {
                    display: flex !important;
                }
                .dv-chatbot-header {
                    padding: 1rem;
                }
                .dv-chatbot-input {
                    padding: 0.75rem;
                    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));
                }
                .dv-chatbot-input input {
                    padding: 0.75rem 1rem;
                    font-size: 16px;
                }
                .dv-chat-message {
                    max-width: 90%;
                    font-size: 0.9rem;
                }
            }
            
            .dv-header-close {
                display: none;
                margin-left: auto;
                background: rgba(255,255,255,0.2);
                border: none;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                cursor: pointer;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .dv-header-close:hover {
                background: rgba(255,255,255,0.3);
            }
            .dv-header-close svg {
                width: 20px;
                height: 20px;
                fill: white;
            }
        `;

        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Create HTML
    function createHTML() {
        const html = `
            <button class="dv-chatbot-toggle" id="dv-chatbot-toggle">
                <img src="${LOGO_URL}" alt="Derecho Virtual" class="dv-logo-img" onerror="this.outerHTML='📚'">
                <svg class="dv-close-icon" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
            <div class="dv-chatbot-container" id="dv-chatbot-container">
                <div class="dv-chatbot-header">
                    <div class="dv-chatbot-avatar">
                        <img src="${LOGO_URL}" alt="Derecho Virtual" onerror="this.outerHTML='📚'">
                    </div>
                    <div class="dv-chatbot-info">
                        <h4>Derecho Virtual</h4>
                        <div class="dv-chatbot-status">
                            <span class="dv-status-dot"></span>
                            <span>En línea</span>
                        </div>
                    </div>
                    <button class="dv-header-close" id="dv-header-close">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="dv-chatbot-messages" id="dv-chatbot-messages"></div>
                <div class="dv-chatbot-input">
                    <input type="text" id="dv-chatbot-input" placeholder="Escribe algo..." autocomplete="off">
                    <button type="button" id="dv-chatbot-send">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        `;

        const container = document.createElement('div');
        container.id = 'dv-chatbot-widget';
        container.innerHTML = html;
        document.body.appendChild(container);
    }

    // Initialize
    function init() {
        const toggle = document.getElementById('dv-chatbot-toggle');
        const container = document.getElementById('dv-chatbot-container');
        const input = document.getElementById('dv-chatbot-input');
        const sendBtn = document.getElementById('dv-chatbot-send');
        const headerClose = document.getElementById('dv-header-close');

        // Check if mobile
        const isMobile = window.innerWidth <= 480;

        function openChat() {
            container.classList.add('active');
            toggle.classList.add('active');
            if (isMobile) toggle.style.display = 'none';
            if (chatState.currentStep === 0 && chatState.conversationHistory.length === 0) {
                sendNextBotMessage();
                startReminderTimer();
            }
            input.focus();
        }

        function closeChat() {
            container.classList.remove('active');
            toggle.classList.remove('active');
            toggle.style.display = '';
            stopReminderTimer();
        }

        toggle.addEventListener('click', function () {
            if (container.classList.contains('active')) {
                closeChat();
            } else {
                openChat();
            }
        });

        // Header close button for mobile
        headerClose.addEventListener('click', closeChat);

        sendBtn.addEventListener('click', handleSendMessage);
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') handleSendMessage();
        });
    }

    function startReminderTimer() {
        stopReminderTimer();
        chatState.lastUserMessageTime = Date.now();
        chatState.reminderTimer = setInterval(() => {
            if (Date.now() - chatState.lastUserMessageTime >= REMINDER_INTERVAL && chatState.awaitingResponse) {
                sendReminder();
            }
        }, REMINDER_INTERVAL);
    }

    function stopReminderTimer() {
        if (chatState.reminderTimer) {
            clearInterval(chatState.reminderTimer);
            chatState.reminderTimer = null;
        }
    }

    function sendReminder() {
        // Max 4 reminders to avoid harassment
        if (chatState.reminderCount >= 4) {
            stopReminderTimer();
            sendBotMessage("Bueno, te dejo tranquilo 😊 Si te interesa, aquí estaré. ¡Mucha suerte con los exámenes! 🍀");
            return;
        }

        if (chatState.reminderCount >= REMINDER_MESSAGES.length) chatState.reminderCount = 0;
        sendBotMessage(REMINDER_MESSAGES[chatState.reminderCount]);
        chatState.reminderCount++;
        chatState.lastUserMessageTime = Date.now();
    }

    function sendNextBotMessage() {
        const step = CONVERSATION_STEPS[chatState.currentStep];
        if (!step) return;

        let message = step.message;
        if (chatState.collectedData.nombre) {
            message = message.replace('{nombre}', chatState.collectedData.nombre);
        }

        sendBotMessage(message);
        updateInputAutocomplete(step.collectField);

        if (step.showCalendly) {
            setTimeout(showCalendlyButton, 1000);
            stopReminderTimer();
        }

        chatState.awaitingResponse = step.waitForResponse || false;
    }

    async function handleSendMessage() {
        const input = document.getElementById('dv-chatbot-input');
        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        chatState.lastUserMessageTime = Date.now();
        chatState.reminderCount = 0;

        addMessage(message, 'user');
        chatState.conversationHistory.push({ role: 'user', content: message });

        const currentStep = CONVERSATION_STEPS[chatState.currentStep];

        const isQuestion = message.includes('?') ||
            message.toLowerCase().includes('para qué') ||
            message.toLowerCase().includes('no quiero');

        if (isQuestion && currentStep && currentStep.collectField) {
            showTypingIndicator();
            try {
                const response = await handleOffScriptQuestion(message);
                hideTypingIndicator();
                sendBotMessage(response);
                setTimeout(sendNextBotMessage, 1500);
            } catch (error) {
                hideTypingIndicator();
                sendBotMessage('Uy, algo ha fallado 😅 ¿Puedes repetirlo?');
            }
            return;
        }

        if (currentStep && currentStep.collectField) {
            chatState.collectedData[currentStep.collectField] = extractData(message, currentStep.collectField);
        }

        chatState.currentStep++;

        if (CONVERSATION_STEPS[chatState.currentStep]) {
            setTimeout(sendNextBotMessage, 800);
        }
    }

    function extractData(message, fieldType) {
        const clean = message.trim();
        switch (fieldType) {
            case 'email':
                const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                return emailMatch ? emailMatch[0].toLowerCase() : clean;
            case 'telefono':
                let phone = clean.replace(/[\s.\-()]/g, '').replace(/^(\+?34|0034)/, '');
                phone = phone.replace(/\D/g, '');
                if (phone.length > 9) phone = phone.slice(-9);
                return '+34' + phone;
            case 'nombre':
                return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            default:
                return clean;
        }
    }

    async function handleOffScriptQuestion(question) {
        const dataStatus = Object.entries(chatState.collectedData)
            .filter(([k, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n') || 'Ninguno';

        const currentStepInfo = CONVERSATION_STEPS[chatState.currentStep];
        const contextStr = currentStepInfo?.collectField ? `Pidiendo: ${currentStepInfo.collectField}` : 'Inicio';

        const systemPrompt = SYSTEM_PROMPT
            .replace('{{COLLECTED_DATA}}', dataStatus)
            .replace('{{CURRENT_CONTEXT}}', contextStr);

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
                temperature: 0.8,
                max_tokens: 100
            })
        });

        if (!response.ok) throw new Error('API failed');
        const data = await response.json();
        return data.choices[0].message.content;
    }

    function showCalendlyButton() {
        const container = document.getElementById('dv-chatbot-messages');
        if (container.querySelector('.dv-calendly-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'dv-calendly-btn';
        btn.innerHTML = '🗓️ ¡Elegir Fecha y Hora!';
        btn.onclick = openCalendly;
        container.appendChild(btn);
        container.scrollTop = container.scrollHeight;
    }

    function openCalendly() {
        const data = chatState.collectedData;
        const params = new URLSearchParams({
            name: data.nombre || '',
            email: data.email || '',
            a1: data.telefono || '',
            a2: data.universidad || ''
        });
        window.open(`${CALENDLY_URL}?${params.toString()}`, '_blank');
        setTimeout(() => {
            sendBotMessage('¡Genial! Elige cuando te venga bien y te llegará un email. ¡Nos vemos en la demo! 🚀');
        }, 500);
    }

    function addMessage(text, type) {
        const container = document.getElementById('dv-chatbot-messages');
        const div = document.createElement('div');
        div.className = `dv-chat-message ${type}`;
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function sendBotMessage(text) {
        addMessage(text, 'bot');
        chatState.conversationHistory.push({ role: 'assistant', content: text });
    }

    function showTypingIndicator() {
        const container = document.getElementById('dv-chatbot-messages');
        const div = document.createElement('div');
        div.className = 'dv-chat-message bot typing';
        div.id = 'dv-typing-indicator';
        div.innerHTML = '<span class="dv-typing-dot"></span><span class="dv-typing-dot"></span><span class="dv-typing-dot"></span>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('dv-typing-indicator');
        if (indicator) indicator.remove();
    }

    function updateInputAutocomplete(fieldType) {
        const input = document.getElementById('dv-chatbot-input');
        if (!input) return;

        const config = {
            'email': { autocomplete: 'email', placeholder: 'tu@email.com', type: 'email' },
            'telefono': { autocomplete: 'tel', placeholder: '612 345 678', type: 'tel' },
            'nombre': { autocomplete: 'name', placeholder: 'Tu nombre...', type: 'text' },
            'universidad': { autocomplete: 'organization', placeholder: 'Tu universidad...', type: 'text' }
        }[fieldType] || { autocomplete: 'off', placeholder: 'Escribe algo...', type: 'text' };

        input.setAttribute('autocomplete', config.autocomplete);
        input.setAttribute('placeholder', config.placeholder);
        input.setAttribute('type', config.type);
    }

    // Auto-open chatbot after 25 seconds if not opened manually
    function autoOpen() {
        const toggle = document.getElementById('dv-chatbot-toggle');
        const container = document.getElementById('dv-chatbot-container');
        const input = document.getElementById('dv-chatbot-input');
        const isMobile = window.innerWidth <= 480;

        // Only auto-open if chat hasn't been opened yet
        if (!container.classList.contains('active') && chatState.conversationHistory.length === 0) {
            container.classList.add('active');
            toggle.classList.add('active');
            if (isMobile) toggle.style.display = 'none';
            sendNextBotMessage();
            startReminderTimer();
            input.focus();
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectStyles();
            createHTML();
            init();
            // Auto-open after 25 seconds
            setTimeout(autoOpen, 25000);
        });
    } else {
        injectStyles();
        createHTML();
        init();
        // Auto-open after 25 seconds
        setTimeout(autoOpen, 25000);
    }

})();

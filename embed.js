/* ========================================
   Derecho Virtual - Embeddable Chatbot Widget
   REWRITTEN: Clean toggle/close button logic
   ======================================== */

(function () {
    'use strict';

    // Configuration - Vercel deployment URL
    const WIDGET_BASE_URL = 'https://chat-bot-ia-nine.vercel.app';

    // API Endpoint (Vercel serverless function)
    const API_ENDPOINT = WIDGET_BASE_URL + '/api/chat';

    // Calendly Configuration
    const CALENDLY_URL = 'https://calendly.com/derecho-virtual/demostracion-gratuita-derechovirtual';

    // Reminder interval (45 seconds)
    const REMINDER_INTERVAL = 45000;

    // Logo URL
    const LOGO_URL = WIDGET_BASE_URL + '/logo.jpg';

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

    // Reminder messages
    const REMINDER_MESSAGES = [
        "¿Sigues ahí? 👀 Las plazas para esta semana se acaban rápido...",
        "Ey! Solo te faltan 30 segundos para reservar tu demo gratis 🎯",
        "No te quedes sin probar el método que ha ayudado a cientos de alumnos a aprobar 💪",
        "¿Tienes alguna duda? Pregúntame lo que quieras 😊"
    ];

    // State
    let chatState = {
        currentStep: 0,
        collectedData: { universidad: '', nombre: '', email: '', telefono: '' },
        conversationHistory: [],
        awaitingResponse: false,
        reminderTimer: null,
        reminderCount: 0,
        lastUserMessageTime: null,
        isOpen: false
    };

    // System prompt
    const SYSTEM_PROMPT = `Eres un SETTER DE VENTAS de Derecho Virtual para estudiantes universitarios. Tu ÚNICO objetivo es conseguir que reserven una demo gratuita.

PERSONALIDAD: Estudiante universitario, cercano, usa emojis, mensajes CORTOS (1-2 líneas máximo).

DATOS RECOPILADOS: {{COLLECTED_DATA}}
CONTEXTO: {{CURRENT_CONTEXT}}

TÉCNICAS: Beneficio, urgencia, prueba social, sin riesgo.
REGLA: SIEMPRE termina con una pregunta que acerque a la demo.`;

    // CSS Styles
    function injectStyles() {
        const css = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            #dv-widget { font-family: 'Inter', sans-serif; }
            
            /* TOGGLE BUTTON - Only visible when chat is CLOSED */
            #dv-toggle {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                width: 70px;
                height: 70px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border-radius: 50%;
                border: none;
                cursor: pointer;
                box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: dv-pulse 2s infinite;
            }
            #dv-toggle.hidden { display: none !important; }
            #dv-toggle img { width: 45px; height: 45px; border-radius: 50%; }
            #dv-toggle::after {
                content: '💬';
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ef4444;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
            }
            @keyframes dv-pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4); }
                50% { transform: scale(1.05); box-shadow: 0 8px 40px rgba(99, 102, 241, 0.6); }
            }
            
            /* CHAT CONTAINER */
            #dv-chat {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                width: 380px;
                height: 520px;
                background: white;
                border-radius: 1.5rem;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
                z-index: 999999;
            }
            #dv-chat.open { display: flex; animation: dv-slideUp 0.3s ease-out; }
            @keyframes dv-slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* HEADER with close button */
            #dv-header {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                padding: 1rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            #dv-header img { width: 45px; height: 45px; border-radius: 50%; background: rgba(255,255,255,0.1); }
            #dv-header-info { flex: 1; }
            #dv-header-info h4 { margin: 0; font-size: 1rem; }
            #dv-header-info span { font-size: 0.8rem; opacity: 0.8; }
            #dv-header-info span::before { content: '🟢 '; }
            
            /* CLOSE BUTTON in header */
            #dv-close {
                width: 36px;
                height: 36px;
                background: rgba(255,255,255,0.2);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 20px;
                font-weight: bold;
            }
            #dv-close:hover { background: rgba(255,255,255,0.3); }
            
            /* MESSAGES */
            #dv-messages {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                background: #f9fafb;
            }
            .dv-msg {
                max-width: 85%;
                padding: 0.875rem 1rem;
                border-radius: 1rem;
                font-size: 0.9rem;
                line-height: 1.5;
                animation: dv-msgIn 0.3s ease-out;
            }
            @keyframes dv-msgIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .dv-msg.bot {
                background: white;
                align-self: flex-start;
                border-left: 3px solid #6366f1;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            .dv-msg.user {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                align-self: flex-end;
            }
            .dv-typing { display: flex; gap: 4px; padding: 1rem; }
            .dv-typing span {
                width: 8px; height: 8px;
                background: #6366f1;
                border-radius: 50%;
                animation: dv-bounce 1.4s infinite;
            }
            .dv-typing span:nth-child(2) { animation-delay: 0.2s; }
            .dv-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes dv-bounce {
                0%, 80%, 100% { transform: translateY(0); }
                40% { transform: translateY(-6px); }
            }
            
            /* INPUT */
            #dv-input-wrap {
                padding: 0.75rem 1rem;
                background: white;
                border-top: 1px solid #e5e7eb;
                display: flex;
                gap: 0.5rem;
            }
            #dv-input {
                flex: 1;
                padding: 0.75rem 1rem;
                border: 2px solid #e5e7eb;
                border-radius: 2rem;
                font-size: 0.9rem;
                outline: none;
            }
            #dv-input:focus { border-color: #6366f1; }
            #dv-send {
                width: 44px;
                height: 44px;
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                color: white;
                font-size: 18px;
            }
            
            /* CALENDLY BUTTON */
            .dv-calendly {
                background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                color: white;
                border: none;
                padding: 14px 28px;
                border-radius: 2rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                margin: 1rem auto;
                display: block;
                animation: dv-pulse 2s infinite;
            }
            
            /* MOBILE */
            @media (max-width: 500px) {
                #dv-toggle { width: 60px; height: 60px; bottom: 1rem; right: 1rem; }
                #dv-toggle img { width: 40px; height: 40px; }
                #dv-chat {
                    top: 0; left: 0; right: 0; bottom: 0;
                    width: 100%; height: 100%;
                    border-radius: 0;
                }
                #dv-input { font-size: 16px; }
            }
        `;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    // HTML Structure
    function createHTML() {
        const html = `
            <button id="dv-toggle">
                <img src="${LOGO_URL}" alt="Chat" onerror="this.outerHTML='📚'">
            </button>
            <div id="dv-chat">
                <div id="dv-header">
                    <img src="${LOGO_URL}" alt="DV" onerror="this.outerHTML='📚'">
                    <div id="dv-header-info">
                        <h4>Derecho Virtual</h4>
                        <span>En línea</span>
                    </div>
                    <button id="dv-close">✕</button>
                </div>
                <div id="dv-messages"></div>
                <div id="dv-input-wrap">
                    <input type="text" id="dv-input" placeholder="Escribe algo..." autocomplete="off">
                    <button id="dv-send">➤</button>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.id = 'dv-widget';
        div.innerHTML = html;
        document.body.appendChild(div);
    }

    // Open chat
    function openChat() {
        document.getElementById('dv-toggle').classList.add('hidden');
        document.getElementById('dv-chat').classList.add('open');
        chatState.isOpen = true;
        if (chatState.currentStep === 0 && chatState.conversationHistory.length === 0) {
            sendNextBotMessage();
            startReminderTimer();
        }
        document.getElementById('dv-input').focus();
    }

    // Close chat
    function closeChat() {
        document.getElementById('dv-toggle').classList.remove('hidden');
        document.getElementById('dv-chat').classList.remove('open');
        chatState.isOpen = false;
        stopReminderTimer();
    }

    // Initialize
    function init() {
        document.getElementById('dv-toggle').addEventListener('click', openChat);
        document.getElementById('dv-close').addEventListener('click', closeChat);
        document.getElementById('dv-send').addEventListener('click', handleSendMessage);
        document.getElementById('dv-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSendMessage();
        });
    }

    // Reminder timer
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
        if (chatState.reminderCount >= 4) {
            stopReminderTimer();
            addMessage("Te dejo tranquilo 😊 Si te interesa, aquí estaré. ¡Suerte con los exámenes! 🍀", 'bot');
            return;
        }
        if (chatState.reminderCount >= REMINDER_MESSAGES.length) chatState.reminderCount = 0;
        addMessage(REMINDER_MESSAGES[chatState.reminderCount], 'bot');
        chatState.reminderCount++;
        chatState.lastUserMessageTime = Date.now();
    }

    // Send next bot message
    function sendNextBotMessage() {
        const step = CONVERSATION_STEPS[chatState.currentStep];
        if (!step) return;
        let msg = step.message;
        if (chatState.collectedData.nombre) {
            msg = msg.replace('{nombre}', chatState.collectedData.nombre);
        }
        addMessage(msg, 'bot');
        updateInputField(step.collectField);
        if (step.showCalendly) {
            setTimeout(showCalendlyButton, 800);
            stopReminderTimer();
        }
        chatState.awaitingResponse = step.waitForResponse || false;
    }

    // Handle user message
    async function handleSendMessage() {
        const input = document.getElementById('dv-input');
        const msg = input.value.trim();
        if (!msg) return;
        input.value = '';
        chatState.lastUserMessageTime = Date.now();
        chatState.reminderCount = 0;
        addMessage(msg, 'user');
        chatState.conversationHistory.push({ role: 'user', content: msg });

        const step = CONVERSATION_STEPS[chatState.currentStep];
        const isQuestion = msg.includes('?') || msg.toLowerCase().includes('cuánto') || msg.toLowerCase().includes('precio');

        if (isQuestion && step && step.collectField) {
            showTyping();
            try {
                const resp = await callAI(msg);
                hideTyping();
                addMessage(resp, 'bot');
                setTimeout(sendNextBotMessage, 1500);
            } catch {
                hideTyping();
                addMessage('Disculpa, ha habido un error. ¿Puedes repetirlo?', 'bot');
            }
            return;
        }

        if (step && step.collectField) {
            chatState.collectedData[step.collectField] = extractData(msg, step.collectField);
        }
        chatState.currentStep++;
        if (CONVERSATION_STEPS[chatState.currentStep]) {
            setTimeout(sendNextBotMessage, 600);
        }
    }

    // Extract data
    function extractData(msg, field) {
        const clean = msg.trim();
        if (field === 'email') {
            const m = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            return m ? m[0].toLowerCase() : clean;
        }
        if (field === 'telefono') {
            let p = clean.replace(/[\s.\-()]/g, '').replace(/^(\+?34|0034)/, '').replace(/\D/g, '');
            if (p.length > 9) p = p.slice(-9);
            return '+34' + p;
        }
        if (field === 'nombre') {
            return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        return clean;
    }

    // Call AI
    async function callAI(question) {
        const dataStatus = Object.entries(chatState.collectedData).filter(([k, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n') || 'Ninguno';
        const step = CONVERSATION_STEPS[chatState.currentStep];
        const ctx = step?.collectField ? `Pidiendo: ${step.collectField}` : 'Inicio';
        const prompt = SYSTEM_PROMPT.replace('{{COLLECTED_DATA}}', dataStatus).replace('{{CURRENT_CONTEXT}}', ctx);

        const resp = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'system', content: prompt }, { role: 'user', content: question }],
                temperature: 0.8,
                max_tokens: 100
            })
        });
        if (!resp.ok) throw new Error('API failed');
        const data = await resp.json();
        return data.choices[0].message.content;
    }

    // UI helpers
    function addMessage(text, type) {
        const container = document.getElementById('dv-messages');
        const div = document.createElement('div');
        div.className = `dv-msg ${type}`;
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        chatState.conversationHistory.push({ role: type === 'bot' ? 'assistant' : 'user', content: text });
    }

    function showTyping() {
        const container = document.getElementById('dv-messages');
        const div = document.createElement('div');
        div.className = 'dv-msg bot dv-typing';
        div.id = 'dv-typing';
        div.innerHTML = '<span></span><span></span><span></span>';
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('dv-typing');
        if (el) el.remove();
    }

    function updateInputField(field) {
        const input = document.getElementById('dv-input');
        const cfg = {
            'email': { autocomplete: 'email', placeholder: 'tu@email.com', type: 'email' },
            'telefono': { autocomplete: 'tel', placeholder: '612 345 678', type: 'tel' },
            'nombre': { autocomplete: 'name', placeholder: 'Tu nombre...', type: 'text' },
            'universidad': { autocomplete: 'organization', placeholder: 'Tu universidad...', type: 'text' }
        }[field] || { autocomplete: 'off', placeholder: 'Escribe algo...', type: 'text' };
        input.setAttribute('autocomplete', cfg.autocomplete);
        input.setAttribute('placeholder', cfg.placeholder);
        input.setAttribute('type', cfg.type);
    }

    function showCalendlyButton() {
        const container = document.getElementById('dv-messages');
        if (container.querySelector('.dv-calendly')) return;
        const btn = document.createElement('button');
        btn.className = 'dv-calendly';
        btn.textContent = '🗓️ ¡Reservar Demo Gratis!';
        btn.onclick = () => {
            const d = chatState.collectedData;
            const params = new URLSearchParams({ name: d.nombre, email: d.email, a1: d.telefono, a2: d.universidad });
            window.open(`${CALENDLY_URL}?${params}`, '_blank');
            setTimeout(() => addMessage('¡Genial! Elige el mejor día. Te llegará confirmación por email 📩', 'bot'), 500);
        };
        container.appendChild(btn);
        container.scrollTop = container.scrollHeight;
    }

    // Auto-open after 25 seconds
    function autoOpen() {
        if (!chatState.isOpen && chatState.conversationHistory.length === 0) {
            openChat();
        }
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyles();
            createHTML();
            init();
            setTimeout(autoOpen, 25000);
        });
    } else {
        injectStyles();
        createHTML();
        init();
        setTimeout(autoOpen, 25000);
    }

})();

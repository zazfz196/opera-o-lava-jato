// script.js - Lógica do frontend para o site do lava-jato

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades
    initNavbar();
    initFormValidation();
    initDateRestrictions();
    initWhatsAppIntegration();
    initSmoothScrolling();
    initAnimations();
    initServiceSelection();
    initScrollProgress();
    initNewBooking();
    initServiceCalculator();
});

// Navbar responsiva
function initNavbar() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            const isOpen = navMenu.classList.toggle('active');
            navToggle.classList.toggle('active', isOpen);
            navToggle.setAttribute('aria-expanded', String(isOpen));
            navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
        });

        // Fechar menu ao clicar em um link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.setAttribute('aria-label', 'Abrir menu');
            });
        });
    }
}

// Validação do formulário
function initFormValidation() {
    const form = document.getElementById('agendamentoForm');

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (validateForm()) {
                await submitForm();
            }
        });

        // Máscara para telefone
        const telefoneInput = document.getElementById('telefone');
        if (telefoneInput) {
            telefoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                    value = value.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
                    e.target.value = value;
                }
            });
        }
    }
}

// Restrições de data (apenas domingos)
function initDateRestrictions() {
    const dataInput = document.getElementById('data');

    if (dataInput) {
        // Definir data mínima como hoje
        const hoje = new Date();
        const dataMinima = hoje.toISOString().split('T')[0];
        dataInput.min = dataMinima;

        // Definir data máxima como 30 dias à frente
        const dataMaxima = new Date();
        dataMaxima.setDate(dataMaxima.getDate() + 30);
        dataInput.max = dataMaxima.toISOString().split('T')[0];

        dataInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value + 'T00:00:00');
            const dayOfWeek = selectedDate.getDay();

            if (dayOfWeek !== 0) { // 0 = Domingo
                showMessage('A lavagem só está disponível aos domingos.', 'error');
                this.value = '';
                return;
            }

            // Verificar disponibilidade
            checkAvailability(this.value);
        });
    }
}

// Verificar disponibilidade da data
async function checkAvailability(date) {
    try {
        const response = await fetch(`/api/disponibilidade?data=${encodeURIComponent(date)}`);
        const disponibilidade = await response.json();

        if (disponibilidade.total >= disponibilidade.capacidade) {
            showMessage('As solicitações deste domingo estão completas.', 'error');
            document.getElementById('data').value = '';
            return;
        }

        updateAvailableTimes(disponibilidade.horariosOcupados || []);
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
    }
}

// Atualizar horários disponíveis
function updateAvailableTimes(horariosOcupados) {
    const horarioSelect = document.getElementById('horario');

    // Resetar opções
    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';

    const horariosDisponiveis = ['12:00', '12:15', '12:30', '12:45'];

    horariosDisponiveis.forEach(horario => {
        if (!horariosOcupados.includes(horario)) {
            const option = document.createElement('option');
            option.value = horario;
            option.textContent = horario;
            horarioSelect.appendChild(option);
        }
    });
}

// Atalho para o WhatsApp
function initWhatsAppIntegration() {
    const whatsappButton = document.createElement('a');
    whatsappButton.href = 'https://wa.me/5531992675735?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20o%20Lava%20Jato%20Sol.';
    whatsappButton.className = 'whatsapp-float';
    whatsappButton.target = '_blank';
    whatsappButton.rel = 'noopener';
    whatsappButton.setAttribute('aria-label', 'Abrir WhatsApp do Lava Jato Sol');
    whatsappButton.innerHTML = '<i class="fab fa-whatsapp"></i>';
    document.body.appendChild(whatsappButton);
}

// Scroll suave
function initSmoothScrolling() {
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
}

// Animações de entrada
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);

    // Observar elementos para animar
    document.querySelectorAll('.service-card, .pricing-card, .gallery-item, .testimonial-card, .work-card, .team-story, .video-story').forEach(el => {
        observer.observe(el);
    });
}

// Validação do formulário
function validateForm() {
    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const servicos = getSelectedServices();
    const data = document.getElementById('data').value;
    const horario = document.getElementById('horario').value;

    // Limpar mensagens anteriores
    clearMessages();

    let isValid = true;

    if (!nome) {
        showMessage('Por favor, informe seu nome completo.', 'error');
        isValid = false;
    }

    if (!telefone || telefone.length < 14) {
        showMessage('Por favor, informe um telefone válido.', 'error');
        isValid = false;
    }

    if (!servicos.length) {
        showMessage('Por favor, selecione pelo menos um serviço.', 'error');
        isValid = false;
    }

    if (!data) {
        showMessage('Por favor, selecione uma data.', 'error');
        isValid = false;
    }

    if (!horario) {
        showMessage('Por favor, selecione um horário.', 'error');
        isValid = false;
    }

    return isValid;
}

// Enviar formulário
async function submitForm() {
    const form = document.getElementById('agendamentoForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Desabilitar botão
    submitButton.disabled = true;
    submitButton.textContent = 'Agendando...';

    const formData = {
        nome: document.getElementById('nome').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        veiculo: document.getElementById('veiculo').value.trim(),
        servicos: getSelectedServices(),
        data: document.getElementById('data').value,
        horario: document.getElementById('horario').value,
        observacoes: document.getElementById('observacoes').value.trim()
    };

    try {
        const response = await fetch('/api/agendamentos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            form.hidden = true;
            const successPanel = document.getElementById('mensagemSucesso');
            successPanel.hidden = false;
            successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            form.reset();

        } else {
            showMessage(result.error || 'Erro ao realizar agendamento.', 'error');
        }

    } catch (error) {
        console.error('Erro:', error);
        const staticPreview = ['5500', '5501'].includes(window.location.port) || window.location.protocol === 'file:';
        showMessage(
            staticPreview
                ? 'O formulário precisa do servidor de agendamentos. No VS Code, use “npm start” e abra http://localhost:3000.'
                : 'Não foi possível falar com o servidor de agendamentos. Confirme se “npm start” continua em execução.',
            'error'
        );
    } finally {
        // Reabilitar botão
        submitButton.disabled = false;
        submitButton.textContent = 'Solicitar agendamento';
    }
}

// Enviar mensagem WhatsApp
function sendWhatsAppMessage(data) {
    const servicoNome = calculateServiceSelection(data.servicos).label;
    const mensagem = `*Novo Agendamento - Lava Jato Sol*%0A%0A*Nome:* ${data.nome}%0A*Telefone:* ${data.telefone}%0A*Serviço:* ${servicoNome}%0A*Data:* ${formatDate(data.data)}%0A*Horário:* ${data.horario}%0A%0A*Confirme este agendamento!*`;

    const whatsappUrl = `https://wa.me/5531992675735?text=${mensagem}`;

    // Abrir WhatsApp em nova aba
    window.open(whatsappUrl, '_blank');
}

// Formatar data para display
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Salvar no localStorage como backup
function saveToLocalStorage(data) {
    let agendamentos = JSON.parse(localStorage.getItem('agendamentos') || '[]');
    agendamentos.push({
        ...data,
        id: Date.now(),
        criadoEm: new Date().toISOString()
    });
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
}

// Mostrar mensagens
function showMessage(message, type) {
    clearMessages();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    const form = document.getElementById('agendamentoForm');
    form.appendChild(messageDiv);

    // Auto-remover após 5 segundos
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Limpar mensagens
function clearMessages() {
    document.querySelectorAll('.message').forEach(msg => msg.remove());
}

// Função utilitária para debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initServiceSelection() {
    const presetServices = {
        'lavagem-simples': ['lavagem-simples'],
        pretinho: ['pretinho'],
        aspiracao: ['aspiracao'],
        'limpeza-interna': ['limpeza-interna'],
        'lavagem-pretinho': ['lavagem-simples', 'pretinho'],
        'lavagem-aspiracao': ['lavagem-simples', 'aspiracao'],
        'lavagem-limpeza': ['lavagem-simples', 'limpeza-interna'],
        'pacote-completo': ['lavagem-simples', 'pretinho', 'aspiracao', 'limpeza-interna']
    };

    document.querySelectorAll('.btn-service').forEach(button => {
        button.addEventListener('click', () => {
            setSelectedServices(presetServices[button.dataset.service] || []);
            document.getElementById('contato').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });

    const selectedService = new URLSearchParams(window.location.search).get('servico');
    if (presetServices[selectedService]) {
        setSelectedServices(presetServices[selectedService]);
    }
}

const serviceCatalog = {
    'lavagem-simples': { name: 'Lavagem simples', price: 40, duration: '20–25 min' },
    pretinho: { name: 'Pretinho nas rodas', price: 15, duration: '5–10 min' },
    aspiracao: { name: 'Aspiração interna', price: 15, duration: '10–15 min' },
    'limpeza-interna': { name: 'Limpeza interna', price: 20, duration: '10–15 min' }
};

const serviceOrder = Object.keys(serviceCatalog);
const comboCatalog = {
    'lavagem-simples|pretinho': { price: 50, duration: '25–30 min' },
    'lavagem-simples|aspiracao': { price: 50, duration: '25–35 min' },
    'lavagem-simples|limpeza-interna': { price: 50, duration: '25–30 min' },
    'pretinho|aspiracao': { price: 25, duration: '10–20 min' },
    'pretinho|limpeza-interna': { price: 30, duration: '10–20 min' },
    'aspiracao|limpeza-interna': { price: 30, duration: '15–25 min' },
    'lavagem-simples|pretinho|aspiracao': { price: 60, duration: '25–35 min' },
    'lavagem-simples|pretinho|limpeza-interna': { price: 60, duration: '25–35 min' },
    'lavagem-simples|aspiracao|limpeza-interna': { price: 60, duration: '25–40 min' },
    'pretinho|aspiracao|limpeza-interna': { price: 40, duration: '20–30 min' },
    'lavagem-simples|pretinho|aspiracao|limpeza-interna': { price: 70, duration: '25–40 min' }
};

function getSelectedServices() {
    return Array.from(document.querySelectorAll('input[name="servicos"]:checked'))
        .map(input => input.value)
        .sort((a, b) => serviceOrder.indexOf(a) - serviceOrder.indexOf(b));
}

function setSelectedServices(services) {
    document.querySelectorAll('input[name="servicos"]').forEach(input => {
        input.checked = services.includes(input.value);
    });
    updateServiceSummary();
}

function calculateServiceSelection(services) {
    const selected = [...new Set(services)]
        .filter(service => serviceCatalog[service])
        .sort((a, b) => serviceOrder.indexOf(a) - serviceOrder.indexOf(b));
    const originalPrice = selected.reduce((sum, id) => sum + serviceCatalog[id].price, 0);
    const combo = comboCatalog[selected.join('|')];
    const price = combo?.price ?? originalPrice;
    const names = selected.map(id => serviceCatalog[id].name);
    return {
        label: selected.length === serviceOrder.length ? 'Pacote completo' : names.join(' + '),
        originalPrice,
        price,
        savings: originalPrice - price,
        duration: combo?.duration ?? (selected[0] ? serviceCatalog[selected[0]].duration : '')
    };
}

function initServiceCalculator() {
    document.querySelectorAll('input[name="servicos"]').forEach(input => {
        input.addEventListener('change', updateServiceSummary);
    });
    updateServiceSummary();
}

function updateServiceSummary() {
    const selection = calculateServiceSelection(getSelectedServices());
    const original = document.getElementById('selectionOriginal');
    const savings = document.getElementById('selectionSavings');
    document.getElementById('selectionLabel').textContent = selection.label || 'Selecione os cuidados desejados';
    document.getElementById('selectionDuration').textContent =
        selection.duration ? `Tempo estimado: ${selection.duration}` : 'O valor do combo aparece aqui';
    document.getElementById('selectionPrice').textContent = currency(selection.price);
    original.textContent = currency(selection.originalPrice);
    original.hidden = selection.savings <= 0;
    savings.textContent = `Você economiza ${currency(selection.savings)}`;
    savings.hidden = selection.savings <= 0;
}

function currency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0
    });
}

function initScrollProgress() {
    const progressBar = document.getElementById('progressBar');
    if (!progressBar) return;

    const updateProgress = () => {
        const available = document.documentElement.scrollHeight - window.innerHeight;
        const progress = available > 0 ? (window.scrollY / available) * 100 : 0;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
    };

    window.addEventListener('scroll', debounce(updateProgress, 16), { passive: true });
    updateProgress();
}

function initNewBooking() {
    const button = document.getElementById('novoAgendamento');
    const form = document.getElementById('agendamentoForm');
    const successPanel = document.getElementById('mensagemSucesso');

    if (!button || !form || !successPanel) return;
    button.addEventListener('click', () => {
        successPanel.hidden = true;
        form.hidden = false;
        document.getElementById('nome').focus();
    });
}

const currentYear = document.getElementById('currentYear');
if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

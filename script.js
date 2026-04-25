// script.js - Lógica do frontend para o site do lava-jato

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar funcionalidades
    initNavbar();
    initFormValidation();
    initDateRestrictions();
    initWhatsAppIntegration();
    initSmoothScrolling();
    initAnimations();
});

// Navbar responsiva
function initNavbar() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Fechar menu ao clicar em um link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
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
        const response = await fetch('/api/agendamentos');
        const agendamentos = await response.json();

        const agendamentosNoDia = agendamentos.filter(agendamento => {
            const agendamentoDate = new Date(agendamento.data);
            const selectedDate = new Date(date + 'T00:00:00');
            return agendamentoDate.toDateString() === selectedDate.toDateString();
        });

        if (agendamentosNoDia.length >= 3) {
            showMessage('Esta data já está lotada. Máximo 3 agendamentos por domingo.', 'error');
            document.getElementById('data').value = '';
            return;
        }

        // Atualizar horários disponíveis
        updateAvailableTimes(agendamentosNoDia);
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
    }
}

// Atualizar horários disponíveis
function updateAvailableTimes(agendamentosExistentes) {
    const horarioSelect = document.getElementById('horario');
    const horariosOcupados = agendamentosExistentes.map(a => a.horario);

    // Resetar opções
    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';

    const horariosDisponiveis = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

    horariosDisponiveis.forEach(horario => {
        if (!horariosOcupados.includes(horario)) {
            const option = document.createElement('option');
            option.value = horario;
            option.textContent = horario;
            horarioSelect.appendChild(option);
        }
    });
}

// Integração com WhatsApp
function initWhatsAppIntegration() {
    // Adicionar botão flutuante do WhatsApp
    const whatsappButton = document.createElement('a');
    whatsappButton.href = 'https://wa.me/5511999999999?text=Olá! Gostaria de agendar uma lavagem.';
    whatsappButton.className = 'whatsapp-float';
    whatsappButton.target = '_blank';
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
    document.querySelectorAll('.service-card, .pricing-card, .gallery-item, .testimonial-card').forEach(el => {
        observer.observe(el);
    });
}

// Validação do formulário
function validateForm() {
    const nome = document.getElementById('nome').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const servico = document.getElementById('servico').value;
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

    if (!servico) {
        showMessage('Por favor, selecione um serviço.', 'error');
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
        servico: document.getElementById('servico').value,
        data: document.getElementById('data').value,
        horario: document.getElementById('horario').value
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
            showMessage('Agendamento realizado com sucesso!', 'success');

            // Enviar WhatsApp
            sendWhatsAppMessage(formData);

            // Limpar formulário
            form.reset();

            // Salvar no localStorage como backup
            saveToLocalStorage(formData);

        } else {
            showMessage(result.error || 'Erro ao realizar agendamento.', 'error');
        }

    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao conectar com o servidor. Tente novamente.', 'error');

        // Fallback: salvar localmente
        saveToLocalStorage(formData);
        showMessage('Agendamento salvo localmente. Entre em contato por WhatsApp.', 'success');
    } finally {
        // Reabilitar botão
        submitButton.disabled = false;
        submitButton.textContent = 'Agendar Agora';
    }
}

// Enviar mensagem WhatsApp
function sendWhatsAppMessage(data) {
    const servicoNome = document.getElementById('servico').options[document.getElementById('servico').selectedIndex].text;
    const mensagem = `*Novo Agendamento - Lava Jato Premium*%0A%0A*Nome:* ${data.nome}%0A*Telefone:* ${data.telefone}%0A*Serviço:* ${servicoNome}%0A*Data:* ${formatDate(data.data)}%0A*Horário:* ${data.horario}%0A%0A*Confirme este agendamento!*`;

    const whatsappUrl = `https://wa.me/5511999999999?text=${mensagem}`;

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
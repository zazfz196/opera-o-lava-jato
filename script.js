// Função para scroll suave até a seção de contato
function scrollToContato() {
    const section = document.getElementById('contato');
    section.scrollIntoView({ behavior: 'smooth' });
}

// Função para enviar formulário
async function enviarFormulario(event) {
    event.preventDefault();

    // Pegando os valores do formulário
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const meioContato = document.getElementById('meioContato').value;
    const servico = document.getElementById('servico').value;
    const data = document.getElementById('data').value;
    const mensagem = document.getElementById('mensagem').value.trim();

    // Validação básica
    if (!nome || !email || !telefone || !meioContato || !servico || !data) {
        mostrarMensagem('Erro', 'Por favor, preencha todos os campos obrigatórios!');
        return;
    }

    // Validação de email
    if (!validarEmail(email)) {
        mostrarMensagem('Erro', 'Por favor, insira um email válido!');
        return;
    }

    // Validação de telefone
    if (!validarTelefone(telefone)) {
        mostrarMensagem('Erro', 'Por favor, insira um telefone válido!');
        return;
    }

    if (!isSunday(data)) {
        mostrarMensagem('Erro', 'Escolha um domingo para o agendamento.');
        return;
    }

    if (quantidadeAgendamentosNoDia(data) >= 3) {
        mostrarMensagem('Erro', 'Este domingo já atingiu 3 agendamentos. Escolha outro domingo.');
        // Recarregar opções disponíveis
        const selectData = document.getElementById('data');
        if (selectData) {
            popularDomingosDisponiveis(selectData);
        }
        return;
    }

    const agendamento = {
        nome,
        email,
        telefone,
        meioContato,
        servico,
        data,
        mensagem,
        dataEnvio: new Date().toISOString()
    };

    const servidorOk = await enviarParaServidor(agendamento);
    if (!servidorOk) {
        return;
    }

    salvarAgendamento(agendamento);

    if (meioContato === 'whatsapp') {
        enviarPorWhatsApp(agendamento);
    } else if (meioContato === 'email') {
        enviarPorEmail(agendamento);
    }

    mostrarMensagem('Sucesso', 'Agendamento realizado com sucesso! Em breve entraremos em contato.');
    document.querySelector('.formulario').reset();
}

// Função para validar email
function validarEmail(email) {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regexEmail.test(email);
}

// Função para validar telefone
function validarTelefone(telefone) {
    const regexTelefone = /^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/;
    return regexTelefone.test(telefone) || telefone.replace(/\D/g, '').length >= 10;
}

// Função para exibir mensagem de status
function mostrarMensagem(tipo, texto) {
    const mensagemDiv = document.getElementById('mensagem-envio');
    mensagemDiv.textContent = texto;
    
    if (tipo === 'Sucesso') {
        mensagemDiv.classList.remove('erro');
        mensagemDiv.classList.add('sucesso');
    } else if (tipo === 'Erro') {
        mensagemDiv.classList.remove('sucesso');
        mensagemDiv.classList.add('erro');
    }

    // Remover mensagem após 5 segundos
    setTimeout(() => {
        mensagemDiv.classList.remove('sucesso', 'erro');
        mensagemDiv.textContent = '';
    }, 5000);
}

// Função para salvar agendamento no localStorage
function salvarAgendamento(agendamento) {
    let agendamentos = JSON.parse(localStorage.getItem('agendamentos')) || [];
    agendamentos.push({
        ...agendamento,
        id: Date.now(),
        dataCriacao: new Date().toLocaleString('pt-BR')
    });
    localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
    console.log('Agendamento salvo localmente:', agendamentos);
}

// Função para enviar o agendamento para o backend
function enviarParaServidor(agendamento) {
    const url = 'http://localhost:3000/agendamentos';
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(agendamento)
    })
    .then(async response => {
        const data = await response.json();
        if (!response.ok) {
            console.warn('Servidor rejeitou o agendamento:', data.error || data);
            mostrarMensagem('Erro', data.error || 'Erro ao enviar agendamento ao servidor.');
            return false;
        }
        console.log('Resposta do servidor:', data);
        return true;
    })
    .catch(error => {
        console.warn('Não foi possível enviar o agendamento ao servidor:', error);
        mostrarMensagem('Erro', 'Erro ao enviar agendamento ao servidor. Tente novamente mais tarde.');
        return false;
    });
}

// Função para enviar por WhatsApp quando selecionado
function enviarPorWhatsApp(agendamento) {
    const texto = `Olá! Gostaria de agendar um serviço:\n` +
        `Serviço: ${agendamento.servico}\n` +
        `Data: ${formatarData(agendamento.data)}\n` +
        `Nome: ${agendamento.nome}\n` +
        `Email: ${agendamento.email}\n` +
        `Telefone: ${agendamento.telefone}\n` +
        `Mensagem: ${agendamento.mensagem || 'Sem mensagem adicional'}`;

    const numeroWhatsApp = '5531992675735'; // Número do agendamento solicitado
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;
    window.open(urlWhatsApp, '_blank');
}

function enviarPorEmail(agendamento) {
    const emailDestino = 'miguelvalderedo2011@gmail.com';
    const assunto = 'Novo agendamento de lava jato';
    const corpo = `Olá,%0D%0A%0D%0A` +
        `Gostaria de agendar um serviço. Seguem os dados:%0D%0A%0D%0A` +
        `Nome: ${agendamento.nome}%0D%0A` +
        `Email: ${agendamento.email}%0D%0A` +
        `Telefone: ${agendamento.telefone}%0D%0A` +
        `Serviço: ${agendamento.servico}%0D%0A` +
        `Data: ${formatarData(agendamento.data)}%0D%0A` +
        `Mensagem: ${agendamento.mensagem || 'Sem mensagem adicional'}%0D%0A`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailDestino)}&su=${encodeURIComponent(assunto)}&body=${corpo}`;
    window.open(gmailUrl, '_blank');
}

// Função para recuperar agendamentos do localStorage
function obterAgendamentos() {
    return JSON.parse(localStorage.getItem('agendamentos')) || [];
}

function isSunday(dataString) {
    const [year, month, day] = dataString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDay() === 0;
}

function quantidadeAgendamentosNoDia(dataString) {
    return obterAgendamentos().filter(agendamento => agendamento.data === dataString).length;
}

function getNextSunday() {
    // Baseado no contexto: hoje é 24/04/2026
    // Se 27/04 é segunda-feira, então 26/04 deve ser domingo
    // Vamos verificar qual dia da semana é hoje e calcular corretamente

    const hoje = new Date(2026, 3, 24); // Abril é mês 3 (0-indexed)
    const diaSemana = hoje.getDay();

    // Se hoje é domingo, retorna hoje
    if (diaSemana === 0) {
        return '2026-04-24';
    }

    // Caso contrário, calcula quantos dias até o próximo domingo
    const diasAteDomingo = 7 - diaSemana;
    const proximoDomingo = new Date(hoje);
    proximoDomingo.setDate(hoje.getDate() + diasAteDomingo);

    return proximoDomingo.toISOString().split('T')[0];
}

function popularDomingosDisponiveis(selectElement) {
    // Limpar opções existentes exceto a primeira
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }

    // Lista manual de domingos baseada no calendário correto
    // Começando do primeiro domingo disponível: 26/04/2026
    const domingosDisponiveis = [
        '2026-04-26', // Primeiro domingo
        '2026-05-03',
        '2026-05-10',
        '2026-05-17',
        '2026-05-24',
        '2026-05-31',
        '2026-06-07',
        '2026-06-14',
        '2026-06-21',
        '2026-06-28',
        '2026-07-05',
        '2026-07-12'
    ];

    for (const dataString of domingosDisponiveis) {
        const vagasRestantes = 3 - quantidadeAgendamentosNoDia(dataString);

        if (vagasRestantes > 0) {
            const option = document.createElement('option');
            option.value = dataString;
            option.textContent = `${formatarData(dataString)} (${vagasRestantes} vaga${vagasRestantes > 1 ? 's' : ''} disponível${vagasRestantes > 1 ? 'is' : ''})`;
            selectElement.appendChild(option);
        }
    }
}

// Função para formatar data em português
function formatarData(data) {
    const opções = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(data).toLocaleDateString('pt-BR', opções);
}

// Função para aplicar máscara de telefone
document.addEventListener('DOMContentLoaded', () => {
    const inputTelefone = document.getElementById('telefone');
    
    if (inputTelefone) {
        inputTelefone.addEventListener('input', (e) => {
            let valor = e.target.value.replace(/\D/g, '');
            
            if (valor.length > 11) {
                valor = valor.substring(0, 11);
            }
            
            if (valor.length === 11) {
                valor = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7)}`;
            } else if (valor.length === 10) {
                valor = `(${valor.substring(0, 2)}) ${valor.substring(2, 6)}-${valor.substring(6)}`;
            } else if (valor.length > 2) {
                valor = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
            } else if (valor.length > 0) {
                valor = `(${valor}`;
            }
            
            e.target.value = valor;
        });
    }

    // Popular seletor de data com domingos disponíveis
    const selectData = document.getElementById('data');
    if (selectData) {
        popularDomingosDisponiveis(selectData);
    }

    // Adicionar efeito de scroll nas seções
    observarSecoes();
});

// Função para observar seções e adicionar animações
function observarSecoes() {
    const opcoes = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entradas) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                entrada.target.style.opacity = '1';
                entrada.target.style.transform = 'translateY(0)';
            }
        });
    }, opcoes);

    // Observar todos os cards
    document.querySelectorAll('.servico-card, .depoimento-card, .galeria-item').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.6s ease';
        observer.observe(card);
    });
}

// Função para calcular preço estimado
function calcularPreco(servico, tamanho) {
    const precos = {
        'Lavagem Básica': { pequeno: 30, médio: 40, suv: 50 },
        'Detalhamento Premium': { pequeno: 80, médio: 100, suv: 120 },
        'Cristalização': { pequeno: 150, médio: 180, suv: 220 },
        'Higienização Interna': { pequeno: 60, médio: 80, suv: 100 },
        'Pacote Completo': { pequeno: 250, médio: 320, suv: 400 }
    };

    if (precos[servico] && precos[servico][tamanho]) {
        return precos[servico][tamanho];
    }
    return 0;
}

// Função para copiar agendamentos para WhatsApp
function copiarParaWhatsApp(agendamento) {
    const texto = `
Olá! Gostaria de agendar um serviço:
📍 Serviço: ${agendamento.servico}
📅 Data: ${formatarData(agendamento.data)}
👤 Nome: ${agendamento.nome}
📧 Email: ${agendamento.email}
📞 Telefone: ${agendamento.telefone}
💬 Mensagem: ${agendamento.mensagem || 'Sem mensagem adicional'}
    `.trim();

    // URL do WhatsApp (substitua o número pelo seu)
    const numeroWhatsApp = '5531992675735'; // Número do agendamento solicitado
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;
    
    window.open(urlWhatsApp, '_blank');
}

// Função para limpar dados du localStorage (para teste)
function limparAgendamentos() {
    if (confirm('Tem certeza que deseja limpar todos os agendamentos?')) {
        localStorage.removeItem('agendamentos');
        console.log('Agendamentos limpos');
    }
}

// Função para exibir statisticas (exemplo)
function obterEstatisticas() {
    const agendamentos = obterAgendamentos();
    return {
        totalAgendamentos: agendamentos.length,
        servicoMaisPopular: agendamentos.length > 0 
            ? agendamentos.reduce((acc, curr) => {
                acc[curr.servico] = (acc[curr.servico] || 0) + 1;
                return acc;
              }, {})
            : {},
        ultimoAgendamento: agendamentos[agendamentos.length - 1] || null
    };
}

// Log de função útil para teste
window.lavajato = {
    calcularPreco,
    obterAgendamentos,
    limparAgendamentos,
    obterEstatisticas,
    copiarParaWhatsApp
};

console.log('🚗 Lava Jato Site JS Carregado!');
console.log('Funções disponíveis: lavajato.calcularPreco(), lavajato.obterAgendamentos(), lavajato.obterEstatisticas()');

// Função para scroll suave até a seção de contato
function scrollToContato() {
    const section = document.getElementById('contato');
    section.scrollIntoView({ behavior: 'smooth' });
}

// Função para enviar formulário
function enviarFormulario(event) {
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

    // Salvar localmente e enviar ao backend
    salvarAgendamento(agendamento);
    enviarParaServidor(agendamento);

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
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(agendamento)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Resposta do servidor:', data);
    })
    .catch(error => {
        console.warn('Não foi possível enviar o agendamento ao servidor:', error);
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

    // Definir data mínima no input de data como hoje
    const inputData = document.getElementById('data');
    if (inputData) {
        const hoje = new Date().toISOString().split('T')[0];
        inputData.min = hoje;
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

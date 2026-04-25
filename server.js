const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const storageFile = path.join(__dirname, 'agendamentos.json');

app.use(cors());
app.use(express.json());

const contatoConfig = {
    tipo: 'email',
    emailDestino: 'miguelvalderedo2011@gmail.com',
    whatsappNumero: '5531992675735',
    smtp: {
        host: '',
        port: 587,
        secure: false,
        auth: {
            user: '',
            pass: ''
        }
    }
};

function ensureStorageFile() {
    if (!fs.existsSync(storageFile)) {
        fs.writeFileSync(storageFile, '[]', 'utf8');
    }
}

function salvarAgendamento(agendamento) {
    ensureStorageFile();
    const json = fs.readFileSync(storageFile, 'utf8');
    const agendamentos = JSON.parse(json || '[]');
    agendamentos.push(agendamento);
    fs.writeFileSync(storageFile, JSON.stringify(agendamentos, null, 2), 'utf8');
}

async function enviarEmail(agendamento) {
    if (!contatoConfig.smtp.auth.user || !contatoConfig.smtp.auth.pass) {
        return false;
    }

    const transporter = nodemailer.createTransport(contatoConfig.smtp);
    const texto = `Novo agendamento:\n\n` +
        `Nome: ${agendamento.nome}\n` +
        `Email: ${agendamento.email}\n` +
        `Telefone: ${agendamento.telefone}\n` +
        `Meio de contato: ${agendamento.meioContato}\n` +
        `Serviço: ${agendamento.servico}\n` +
        `Data: ${agendamento.data}\n` +
        `Mensagem: ${agendamento.mensagem || 'Sem mensagem adicional'}\n`;

    const mailOptions = {
        from: contatoConfig.smtp.auth.user,
        to: contatoConfig.emailDestino,
        subject: 'Novo agendamento de lava jato',
        text: texto
    };

    await transporter.sendMail(mailOptions);
    return true;
}

app.post('/agendamentos', async (req, res) => {
    const agendamento = req.body;

    if (!agendamento || !agendamento.nome || !agendamento.email || !agendamento.telefone || !agendamento.servico || !agendamento.data) {
        return res.status(400).json({ error: 'Dados de agendamento incompletos.' });
    }

    agendamento.id = Date.now();
    agendamento.dataCriacao = new Date().toLocaleString('pt-BR');

    try {
        salvarAgendamento(agendamento);
        const emailEnviado = await enviarEmail(agendamento);

        return res.status(201).json({ success: true, emailEnviado, agendamento });
    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        return res.status(500).json({ error: 'Falha ao gravar agendamento.' });
    }
});

app.get('/agendamentos', (req, res) => {
    ensureStorageFile();
    const json = fs.readFileSync(storageFile, 'utf8');
    res.json(JSON.parse(json || '[]'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Backend de agendamento rodando em http://localhost:${port}`);
});

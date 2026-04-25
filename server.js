const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configuração do nodemailer (substitua com suas credenciais)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'seu-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'sua-senha'
  }
});

// Rota para agendamentos
app.get('/api/agendamentos', (req, res) => {
  try {
    const data = fs.readFileSync('agendamentos.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]);
  }
});

app.post('/api/agendamentos', (req, res) => {
  const { nome, telefone, servico, data, horario } = req.body;

  // Carregar agendamentos existentes
  let agendamentos = [];
  try {
    const data = fs.readFileSync('agendamentos.json', 'utf8');
    agendamentos = JSON.parse(data);
  } catch (error) {
    // Arquivo não existe ainda
  }

  // Verificar limite de 3 agendamentos por domingo
  const dataSelecionada = new Date(data);
  const agendamentosNoDia = agendamentos.filter(agendamento => {
    const agendamentoData = new Date(agendamento.data);
    return agendamentoData.toDateString() === dataSelecionada.toDateString();
  });

  if (agendamentosNoDia.length >= 3) {
    return res.status(400).json({ error: 'Limite de 3 agendamentos por dia atingido' });
  }

  // Adicionar novo agendamento
  const novoAgendamento = {
    id: Date.now(),
    nome,
    telefone,
    servico,
    data,
    horario,
    criadoEm: new Date().toISOString()
  };

  agendamentos.push(novoAgendamento);

  // Salvar no arquivo
  fs.writeFileSync('agendamentos.json', JSON.stringify(agendamentos, null, 2));

  res.json({ success: true, agendamento: novoAgendamento });
});

// Rota para enviar email
app.post('/api/enviar-email', (req, res) => {
  const { nome, email, mensagem } = req.body;

  const mailOptions = {
    from: process.env.EMAIL_USER || 'seu-email@gmail.com',
    to: 'contato@lavajato.com', // Substitua pelo seu email
    subject: `Contato do site - ${nome}`,
    text: `Nome: ${nome}\nEmail: ${email}\n\nMensagem:\n${mensagem}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: 'Erro ao enviar email' });
    } else {
      res.json({ success: true });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
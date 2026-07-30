const fs = require('fs');
const path = require('path');

// Gera uma pasta de publicação contendo apenas os arquivos públicos necessários.
// Assim, código do servidor, configurações e dependências não viram assets acessíveis.
const root = __dirname;
const dist = path.join(root, 'dist');
const client = path.join(dist, 'client');
const server = path.join(dist, 'server');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(client, { recursive: true });
fs.mkdirSync(server, { recursive: true });

const publicFiles = [
  'index.html',
  'style.css',
  'script.js',
  'dashboard.html',
  'dashboard.css',
  'dashboard.js',
  'login.html',
  'login.css',
  'login.js',
  'robots.txt'
];

const publicImages = [
  'hero.png',
  'logo-clean.png',
  'feedback-1.mp4',
  'finalizado.jpeg',
  'finalizado2.jpeg',
  'lavagem-em-andamento-placa-protegida.png',
  'sol.jpeg'
];

for (const file of publicFiles) {
  fs.copyFileSync(path.join(root, file), path.join(client, file));
}

fs.cpSync(path.join(root, 'assets'), path.join(client, 'assets'), { recursive: true });
fs.mkdirSync(path.join(client, 'imagens'), { recursive: true });
for (const file of publicImages) {
  fs.copyFileSync(path.join(root, 'imagens', file), path.join(client, 'imagens', file));
}

fs.copyFileSync(path.join(root, 'worker.js'), path.join(server, 'index.js'));
console.log('Build de hospedagem concluído.');

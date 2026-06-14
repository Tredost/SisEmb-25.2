const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

// Conexão com o banco de dados SQLite local
const db = new sqlite3.Database('./dados.sqlite', (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    inicializarBancoDeDados();
  }
});

function inicializarBancoDeDados() {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT UNIQUE,
      senha TEXT
    )
  `, () => {
    // Insere admin padrão se não existir
    db.run(`INSERT OR IGNORE INTO usuarios (usuario, senha) VALUES ('admin', 'admin')`);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      broker_url TEXT,
      broker_porta INTEGER,
      topico TEXT,
      edificio_real TEXT,
      unidade_real TEXT
    )
  `, () => {
    // Insere configuração padrão se não existir
    db.run(`INSERT OR IGNORE INTO configuracoes (id, broker_url, broker_porta, topico, edificio_real, unidade_real) 
            VALUES (1, 'broker.hivemq.com', 1883, 'ianes/gasshield/dispositivos/+/status', 'aurora', '302')`, () => {
      // Iniciar MQTT com a configuração salva
      iniciarClienteMQTT();
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS locais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      tipo TEXT,
      endereco TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS unidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_local INTEGER,
      identificacao TEXT,
      andar_ou_bloco TEXT,
      nome_morador TEXT,
      contato TEXT,
      dispositivo_instalado TEXT,
      bateria INTEGER DEFAULT 100,
      sinal INTEGER DEFAULT 100,
      FOREIGN KEY(id_local) REFERENCES locais(id)
    )
  `);
}

// Cliente MQTT
let clienteMqtt = null;

function iniciarClienteMQTT() {
  db.get('SELECT * FROM configuracoes WHERE id = 1', (err, config) => {
    if (err || !config) return console.error('Erro ao buscar configuração MQTT');

    if (clienteMqtt) {
      clienteMqtt.end(); // Encerra conexão antiga se houver
    }

    const brokerUrl = `mqtt://${config.broker_url}:${config.broker_porta}`;
    console.log(`Conectando ao MQTT: ${brokerUrl}`);
    
    clienteMqtt = mqtt.connect(brokerUrl);

    clienteMqtt.on('connect', () => {
      console.log('Conectado ao Broker MQTT com sucesso!');
      if (config.topico) {
        clienteMqtt.subscribe(config.topico, (err) => {
          if (!err) {
            console.log(`Inscrito no tópico: ${config.topico}`);
          }
        });
      }
    });

    clienteMqtt.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        // Payload esperado: {"device_id": "esp32-sala", "mq9": 1830, "alarme": true}
        
        // Regra de conversão: MQ-9 vai de 0 a 4095
        // O PRD trabalha com LEL (0 a 100%). Vamos mapear os limites do MQ-9 para LEL
        // Se limite configurado no ESP32 é 450, vamos assumir que 450 é 10% LEL (alarme crítico)
        // Isso é uma aproximação proporcional:
        let glpLel = (payload.mq9 / 450) * 10;
        glpLel = Math.min(Math.max(glpLel, 0), 100); // Limita entre 0 e 100

        // Repassar para o Frontend via WebSocket
        io.emit('leitura_real', {
          device_id: payload.device_id,
          mq9_raw: payload.mq9,
          glp_lel: parseFloat(glpLel.toFixed(2)),
          alarme_ativo: payload.alarme,
          configuracao_real: config // envia pra saber em qual prédio aplicar no mapa
        });
      } catch (e) {
        console.error('Erro ao processar mensagem MQTT:', e.message);
      }
    });

    clienteMqtt.on('error', (err) => {
      console.error('Erro no cliente MQTT:', err.message);
    });
  });
}

// --- ROTAS DA API ---

app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  db.get('SELECT * FROM usuarios WHERE usuario = ? AND senha = ?', [usuario, senha], (err, row) => {
    if (err) return res.status(500).json({ erro: 'Erro no servidor' });
    if (row) {
      res.json({ sucesso: true, mensagem: 'Login realizado com sucesso' });
    } else {
      res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    }
  });
});

app.get('/api/config', (req, res) => {
  db.get('SELECT * FROM configuracoes WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar configurações' });
    res.json(row);
  });
});

app.post('/api/config', (req, res) => {
  const { broker_url, broker_porta, topico, edificio_real, unidade_real } = req.body;
  
  db.run(`
    UPDATE configuracoes 
    SET broker_url = ?, broker_porta = ?, topico = ?, edificio_real = ?, unidade_real = ?
    WHERE id = 1
  `, [broker_url, broker_porta, topico, edificio_real, unidade_real], function(err) {
    if (err) return res.status(500).json({ erro: 'Erro ao salvar configurações' });
    
    // Reinicia o cliente MQTT com as novas configurações
    iniciarClienteMQTT();
    
    res.json({ sucesso: true, mensagem: 'Configurações atualizadas e MQTT reiniciado.' });
  });
});

// -- CRUD Locais --
app.get('/api/locais', (req, res) => {
  db.all('SELECT * FROM locais', [], (err, rows) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar locais' });
    res.json(rows);
  });
});

app.post('/api/locais', (req, res) => {
  const { nome, tipo, endereco } = req.body;
  db.run('INSERT INTO locais (nome, tipo, endereco) VALUES (?, ?, ?)', [nome, tipo, endereco], function(err) {
    if (err) return res.status(500).json({ erro: 'Erro ao salvar local' });
    res.json({ id: this.lastID, nome, tipo, endereco });
  });
});

app.delete('/api/locais/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM locais WHERE id = ?', id, function(err) {
    if (err) return res.status(500).json({ erro: 'Erro ao deletar local' });
    db.run('DELETE FROM unidades WHERE id_local = ?', id); // Cascade manual
    res.json({ sucesso: true });
  });
});

// -- CRUD Unidades --
app.get('/api/unidades', (req, res) => {
  db.all('SELECT * FROM unidades', [], (err, rows) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar unidades' });
    res.json(rows);
  });
});

app.get('/api/unidades/local/:id_local', (req, res) => {
  db.all('SELECT * FROM unidades WHERE id_local = ?', [req.params.id_local], (err, rows) => {
    if (err) return res.status(500).json({ erro: 'Erro ao buscar unidades' });
    res.json(rows);
  });
});

app.post('/api/unidades', (req, res) => {
  const { id_local, identificacao, andar_ou_bloco, nome_morador, contato, dispositivo_instalado } = req.body;
  db.run(`INSERT INTO unidades (id_local, identificacao, andar_ou_bloco, nome_morador, contato, dispositivo_instalado)
          VALUES (?, ?, ?, ?, ?, ?)`, 
    [id_local, identificacao, andar_ou_bloco, nome_morador, contato, dispositivo_instalado], 
    function(err) {
      if (err) return res.status(500).json({ erro: 'Erro ao salvar unidade' });
      res.json({ id: this.lastID, id_local, identificacao, andar_ou_bloco, nome_morador, contato, dispositivo_instalado });
    });
});

app.delete('/api/unidades/:id', (req, res) => {
  db.run('DELETE FROM unidades WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(500).json({ erro: 'Erro ao deletar unidade' });
    res.json({ sucesso: true });
  });
});

// Inicialização do Servidor
const PORTA = 3001;
server.listen(PORTA, () => {
  console.log(`Servidor Backend rodando na porta ${PORTA}`);
});

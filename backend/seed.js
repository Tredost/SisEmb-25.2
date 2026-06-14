const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./dados.sqlite');

const nomesEdificios = ['Aurora', 'Horizonte', 'Vista Mar', 'Solaris', 'Lumina', 'Vertice', 'Oasis', 'Prime', 'Zenith', 'Acqua'];
const nomesCondominios = ['Vale Verde', 'Reserva Natural', 'Parque das Flores', 'Bosque Maia', 'Vila Nova', 'Jardins', 'Colinas', 'Bela Vista', 'Recanto', 'Monte Rei'];
const nomesResidencias = ['Casa Silva', 'Casa Souza', 'Casa Oliveira', 'Sobrado Santos', 'Casa Lima', 'Casa Costa', 'Casa Pereira', 'Residencia Carvalho', 'Casa Almeida', 'Casa Ribeiro'];

const gerarAptos = (id_local, numAptosPorAndar, numAndares) => {
  const unidades = [];
  for (let andar = 1; andar <= numAndares; andar++) {
    for (let apto = 1; apto <= numAptosPorAndar; apto++) {
      unidades.push({
        id_local: id_local,
        identificacao: andar.toString() + '0' + apto.toString(),
        andar_ou_bloco: andar.toString() + ' Andar',
        nome_morador: 'Morador ' + andar.toString() + '0' + apto.toString(),
        contato: '(11) 99999-0000',
        dispositivo_instalado: 'MQ-9 + ESP32'
      });
    }
  }
  return unidades;
};

const gerarCasasCondominio = (id_local, numCasas) => {
  const unidades = [];
  for (let i = 1; i <= numCasas; i++) {
    unidades.push({
      id_local: id_local,
      identificacao: 'Casa ' + i,
      andar_ou_bloco: i % 2 === 0 ? 'Rua A' : 'Rua B',
      nome_morador: 'Familia ' + i,
      contato: '(11) 98888-0000',
      dispositivo_instalado: 'MQ-9 + ESP32'
    });
  }
  return unidades;
};

const gerarResidenciaUnica = (id_local) => {
  return [{
    id_local: id_local,
    identificacao: 'Principal',
    andar_ou_bloco: 'Terreo',
    nome_morador: 'Proprietario',
    contato: '(11) 97777-0000',
    dispositivo_instalado: 'MQ-9 + ESP32'
  }];
};

db.serialize(() => {
  db.run('DELETE FROM unidades');
  db.run('DELETE FROM locais');

  let localId = 1;
  const insertLocal = db.prepare('INSERT INTO locais (id, nome, tipo, endereco) VALUES (?, ?, ?, ?)');
  const insertUnidade = db.prepare('INSERT INTO unidades (id_local, identificacao, andar_ou_bloco, nome_morador, contato, dispositivo_instalado) VALUES (?, ?, ?, ?, ?, ?)');

  // 10 Edificios
  nomesEdificios.forEach((nome, i) => {
    insertLocal.run(localId, 'Edificio ' + nome, 'Edificio', 'Av. Central, ' + (100 + i));
    const aptos = gerarAptos(localId, 4, 3);
    aptos.forEach(u => insertUnidade.run(u.id_local, u.identificacao, u.andar_ou_bloco, u.nome_morador, u.contato, u.dispositivo_instalado));
    localId++;
  });

  // 10 Condominios
  nomesCondominios.forEach((nome, i) => {
    insertLocal.run(localId, 'Condominio ' + nome, 'Condominio', 'Estrada Velha, ' + (200 + i));
    const casas = gerarCasasCondominio(localId, 10);
    casas.forEach(u => insertUnidade.run(u.id_local, u.identificacao, u.andar_ou_bloco, u.nome_morador, u.contato, u.dispositivo_instalado));
    localId++;
  });

  // 10 Residencias
  nomesResidencias.forEach((nome, i) => {
    insertLocal.run(localId, nome, 'Residencia', 'Rua das Flores, ' + (300 + i));
    const casa = gerarResidenciaUnica(localId);
    casa.forEach(u => insertUnidade.run(u.id_local, u.identificacao, u.andar_ou_bloco, u.nome_morador, u.contato, u.dispositivo_instalado));
    localId++;
  });

  insertLocal.finalize();
  insertUnidade.finalize();
});

db.close(() => {
  console.log('Banco de dados populado com 30 locais e suas unidades!');
});

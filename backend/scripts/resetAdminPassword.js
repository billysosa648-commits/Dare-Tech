// Restablece la contraseña de un administrador tras confirmar la base de datos destino.
require('dotenv').config();
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');

// Solicita una contraseña sin mostrar los caracteres en la terminal.
function askHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') throw new Error('Ejecuta este comando desde una terminal interactiva.');
  return new Promise((resolve, reject) => {
    let value = '';
    const wasRaw = stdin.isRaw;
    const finish = (callback, result) => {
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      callback(result);
    };
    const onData = chunk => {
      for (const character of String(chunk)) {
        if (character === '\u0003') return finish(reject, new Error('Operación cancelada.'));
        if (character === '\r' || character === '\n') return finish(resolve, value);
        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
          continue;
        }
        if (character >= ' ') value += character;
      }
    };
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

// Valida el usuario, confirma destino y cambia la clave con el mismo hash del login.
async function main() {
  if (!process.env.MONGO_URI) throw new Error('Falta MONGO_URI en el entorno del backend.');
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    const username = (await terminal.question('Usuario administrador: ')).trim();
    terminal.close();
    if (!username) throw new Error('El usuario no puede estar vacío.');

    const password = await askHidden('Nueva contraseña (12 a 72 caracteres): ');
    const confirmation = await askHidden('Repite la nueva contraseña: ');
    if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
    if (Array.from(password).length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('La contraseña debe tener de 12 a 72 caracteres UTF-8.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    const databaseName = mongoose.connection.db.databaseName;
    stdout.write(`Destino: ${mongoose.connection.host}/${databaseName}\n`);
    const requiredConfirmation = `RESET ${databaseName}`;
    const targetPrompt = readline.createInterface({ input: stdin, output: stdout });
    let targetConfirmation;
    try {
      targetConfirmation = await targetPrompt.question(`Para confirmar que esta es la base correcta, escribe: ${requiredConfirmation}\n> `);
    } finally {
      targetPrompt.close();
    }
    if (targetConfirmation !== requiredConfirmation) throw new Error('No se cambió nada; la base no fue confirmada.');

    const admin = await Admin.findOne({ username });
    if (!admin) throw new Error('No existe ese usuario administrador en esta base de datos.');
    admin.passwordHash = await bcrypt.hash(password, 12);
    admin.passwordChangeRequired = false;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();
    stdout.write('Contraseña actualizada. Las sesiones anteriores quedaron cerradas.\n');
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

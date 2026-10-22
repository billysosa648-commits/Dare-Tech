const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');

function matchesSecret(provided, expected) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

async function registerAdmin(req, res) {
  const setupFlags = Admin.db.collection('systemFlags');
  let ownsBootstrap = false;
  try {
    const { username, password } = req.body;
    const bootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!bootstrapKey || Buffer.byteLength(bootstrapKey, 'utf8') < 32 ||
        !matchesSecret(req.get('x-admin-bootstrap-key'), bootstrapKey)) {
      return res.status(404).json({ message: 'Ruta no disponible' });
    }

    const claim = await setupFlags.updateOne(
      { _id: 'admin-bootstrap' },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    if (!claim.upsertedCount) return res.status(409).json({ message: 'El administrador inicial ya fue creado' });
    ownsBootstrap = true;
    if (await Admin.exists({})) return res.status(409).json({ message: 'El administrador inicial ya fue creado' });

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await Admin.create({ username, passwordHash, role: 'admin', tokenVersion: 0, passwordChangeRequired: false });
    ownsBootstrap = false;
    res.status(201).json({ message: 'Administrador creado correctamente', id: admin._id });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'No se pudo crear el administrador' });
    console.error('Error al crear administrador:', error.message);
    res.status(500).json({ message: 'No se pudo crear el administrador' });
  } finally {
    if (ownsBootstrap) await setupFlags.deleteOne({ _id: 'admin-bootstrap' }).catch(() => {});
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordMeetsPolicy = Array.from(password).length >= 12 && Buffer.byteLength(password, 'utf8') <= 72;
    if (!passwordMeetsPolicy && !admin.passwordChangeRequired) {
      admin.passwordChangeRequired = true;
      await admin.save();
    }
    const token = jwt.sign(
      { id: admin._id.toString(), username: admin.username, role: admin.role || 'admin', tokenVersion: admin.tokenVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '1h', issuer: 'dare-tech-api', audience: 'dare-tech-admin' }
    );
    res.json({ message: 'Login exitoso', token, expiresIn: 3600, passwordChangeRequired: !passwordMeetsPolicy || admin.passwordChangeRequired });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ message: 'No se pudo iniciar sesión' });
  }
}

async function logout(req, res) {
  try {
    await Admin.updateOne({ _id: req.admin.id }, { $inc: { tokenVersion: 1 } });
    res.status(204).end();
  } catch (error) {
    console.error('Error al cerrar sesión:', error.message);
    res.status(500).json({ message: 'No se pudo cerrar sesión' });
  }
}

async function changePassword(req, res) {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    await Admin.updateOne({ _id: req.admin.id }, { $set: { passwordHash, passwordChangeRequired: false }, $inc: { tokenVersion: 1 } });
    res.status(204).end();
  } catch (error) {
    console.error('Error al cambiar contraseña:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar la contraseña' });
  }
}

module.exports = { registerAdmin, login, logout, changePassword };

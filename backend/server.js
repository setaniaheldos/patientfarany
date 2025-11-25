const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Connexion à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test_s0cj_user:gEPKE0njXS8Whcj8cZhjxNIRvWt7toqK@dpg-d4ijd9q4d50c73d4p2eg-a.oregon-postgres.render.com/test_s0cj',
  ssl: {
    rejectUnauthorized: false  // Accepte les certificats auto-signés (idéal pour dev/prod cloud)
  }
});

pool.connect((err) => {
  if (err) return console.error('Erreur de connexion à PostgreSQL :', err.message);
  console.log('✅ Connecté à la base de données PostgreSQL');
});

// 🔧 Création des tables (async init)
(async () => {
  try {
    // Table patients
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        cinPatient TEXT PRIMARY KEY,
        prenom TEXT NOT NULL,
        nom TEXT NOT NULL,
        age INTEGER NOT NULL,
        adresse TEXT,
        email TEXT UNIQUE,
        sexe TEXT CHECK (sexe IN ('Homme', 'Femme')),
        telephone TEXT UNIQUE
      );
    `);

    // Table praticiens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS praticiens (
        cinPraticien TEXT PRIMARY KEY,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        telephone TEXT UNIQUE,
        email TEXT UNIQUE,
        specialite TEXT
      );
    `);

    // Table rendezvous
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rendezvous (
        idRdv SERIAL PRIMARY KEY,
        cinPatient TEXT NOT NULL,
        cinPraticien TEXT NOT NULL,
        dateHeure TIMESTAMP NOT NULL,
        statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirme', 'annule')),
        idRdvParent INTEGER,
        FOREIGN KEY (cinPatient) REFERENCES patients(cinPatient) ON DELETE CASCADE,
        FOREIGN KEY (cinPraticien) REFERENCES praticiens(cinPraticien) ON DELETE CASCADE,
        FOREIGN KEY (idRdvParent) REFERENCES rendezvous(idRdv)
      );
    `);

    // Table consultations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS consultations (
        idConsult SERIAL PRIMARY KEY,
        idRdv INTEGER NOT NULL,
        dateConsult TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        compteRendu TEXT,
        prix NUMERIC DEFAULT NULL,
        FOREIGN KEY (idRdv) REFERENCES rendezvous(idRdv) ON DELETE CASCADE
      );
    `);

    // Table prescriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        idPrescrire SERIAL PRIMARY KEY,
        idConsult INTEGER NOT NULL,
        typePrescrire TEXT NOT NULL,
        posologie TEXT NOT NULL,
        datePrescrire DATE,
        FOREIGN KEY (idConsult) REFERENCES consultations(idConsult) ON DELETE CASCADE
      );
    `);

    // Table des admins
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    // Table des utilisateurs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        isApproved INTEGER DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS examen (
        idExamen SERIAL PRIMARY KEY,
        idConsult INTEGER NOT NULL,
        typeExamen TEXT NOT NULL,
        dateExamen TEXT NOT NULL,
        resultat TEXT,
        FOREIGN KEY (idConsult) REFERENCES consultations(idConsult) ON DELETE CASCADE
      );
    `);

    console.log('✅ Toutes les tables ont été créées (si elles n’existaient pas)');
  } catch (err) {
    console.error('Erreur lors de la création des tables :', err.message);
  }
})();

// Routes CRUD pour patients (fusion des deux GET pour gérer le query param)
app.get('/patients', async (req, res) => {
  try {
    const { nom = '' } = req.query;
    let sql = 'SELECT * FROM patients WHERE 1=1';
    let params = [];

    if (nom) {
      sql += ' AND LOWER(nom) LIKE $1';
      params.push(`%${nom.toLowerCase()}%`);
    }

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/patients', async (req, res) => {
  const { cinPatient, prenom, nom, age, adresse, email, sexe, telephone } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO patients VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [cinPatient, prenom, nom, age, adresse, email, sexe, telephone]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/patients/:cinPatient', async (req, res) => {
  const { prenom, nom, age, adresse, email, sexe, telephone } = req.body;
  const { cinPatient } = req.params;
  try {
    const result = await pool.query(
      `UPDATE patients SET prenom=$1, nom=$2, age=$3, adresse=$4, email=$5, sexe=$6, telephone=$7 WHERE cinPatient=$8`,
      [prenom, nom, age, adresse, email, sexe, telephone, cinPatient]
    );
    res.json({ modified: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/patients/:cinPatient', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM patients WHERE cinPatient=$1`, [req.params.cinPatient]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route GET : Lister les utilisateurs en attente de validation
app.get('/users/pending', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE isApproved = 0');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route PUT : Valider un utilisateur (autoriser l'accès)
app.put('/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE users SET isApproved = 1 WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json({ message: "Utilisateur validé avec succès" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route DELETE : Refuser/supprimer un utilisateur en attente
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//table praticiens

// 📄 Lister tous les praticiens
app.get('/praticiens', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM praticiens');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ Ajouter un praticien
app.post('/praticiens', async (req, res) => {
  const { cinPraticien, nom, prenom, telephone, email, specialite } = req.body;
  try {
    await pool.query(
      `INSERT INTO praticiens (cinPraticien, nom, prenom, telephone, email, specialite) VALUES ($1, $2, $3, $4, $5, $6)`,
      [cinPraticien, nom, prenom, telephone, email, specialite]
    );
    res.status(201).json({ message: 'Praticien ajouté' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Modifier un praticien
app.put('/praticiens/:cinPraticien', async (req, res) => {
  const { nom, prenom, telephone, email, specialite } = req.body;
  const { cinPraticien } = req.params;
  try {
    const result = await pool.query(
      `UPDATE praticiens SET nom=$1, prenom=$2, telephone=$3, email=$4, specialite=$5 WHERE cinPraticien=$6`,
      [nom, prenom, telephone, email, specialite, cinPraticien]
    );
    res.status(200).json({ message: 'Praticien mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ Supprimer un praticien
app.delete('/praticiens/:cinPraticien', async (req, res) => {
  try {
    await pool.query(`DELETE FROM praticiens WHERE cinPraticien = $1`, [req.params.cinPraticien]);
    res.status(200).json({ message: 'Praticien supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// table randezvous

// 📌 ROUTES POUR rendezvous

// GET : Tous les rendez-vous
app.get('/rendezvous', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM rendezvous`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST : Créer un rendez-vous
app.post('/rendezvous', async (req, res) => {
  const { cinPatient, cinPraticien, dateHeure, statut = 'en_attente', idRdvParent = null } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO rendezvous (cinPatient, cinPraticien, dateHeure, statut, idRdvParent) VALUES ($1, $2, $3, $4, $5) RETURNING idRdv`,
      [cinPatient, cinPraticien, dateHeure, statut, idRdvParent]
    );
    res.json({ id: result.rows[0].idRdv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT : Modifier un rendez-vous
app.put('/rendezvous/:idRdv', async (req, res) => {
  const { cinPatient, cinPraticien, dateHeure, statut, idRdvParent } = req.body;
  try {
    await pool.query(
      `UPDATE rendezvous SET cinPatient=$1, cinPraticien=$2, dateHeure=$3, statut=$4, idRdvParent=$5 WHERE idRdv=$6`,
      [cinPatient, cinPraticien, dateHeure, statut, idRdvParent, req.params.idRdv]
    );
    res.json({ message: 'Rendez-vous mis à jour' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE : Supprimer un rendez-vous
app.delete('/rendezvous/:idRdv', async (req, res) => {
  try {
    await pool.query(`DELETE FROM rendezvous WHERE idRdv = $1`, [req.params.idRdv]);
    res.json({ message: 'Rendez-vous supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route POST : Connexion utilisateur
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' });
    if (!user.isapproved) return res.status(403).json({ error: 'Compte en attente de validation' });

    const match = await bcrypt.compare(password, user.password);
    if (match) res.json({ message: 'Connexion réussie', user });
    else res.status(401).json({ error: 'Mot de passe incorrect' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route POST : Inscription utilisateur (non validé)
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hashed]);
    res.json({ message: 'Compte créé. En attente de validation par un administrateur.' });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Route pour ajouter un admin
app.post('/admins', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });

  try {
    const countResult = await pool.query('SELECT COUNT(*) as count FROM admins');
    if (parseInt(countResult.rows[0].count) >= 3) return res.status(400).json({ error: "Nombre maximum d'administrateurs atteint (3)" });

    const adminResult = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (adminResult.rows.length > 0) return res.status(400).json({ error: "Cet email existe déjà." });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO admins (email, password) VALUES ($1, $2) RETURNING id', [email, hashed]);
    res.status(201).json({ id: result.rows[0].id, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route POST : Authentification admin
app.post('/admins/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ error: "Admin non trouvé" });

    const match = await bcrypt.compare(password, admin.password);
    if (match) {
      res.status(200).json({ message: "Connexion admin réussie", admin: { id: admin.id, email: admin.email } });
    } else {
      res.status(401).json({ error: "Mot de passe incorrect" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Liste de tous les admins ---
app.get('/admins', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email FROM admins');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Liste de tous les utilisateurs ---
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, isApproved FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un administrateur par son id
app.delete('/admins/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Admin non trouvé" });
    res.json({ message: "Admin supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un utilisateur par son id
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📄 Lister toutes les consultations (inclut le prix)
app.get('/consultations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM consultations');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ Ajouter une consultation (avec prix optionnel)
app.post('/consultations', async (req, res) => {
  const { idRdv, dateConsult, compteRendu, prix } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO consultations (idRdv, dateConsult, compteRendu, prix) VALUES ($1, $2, $3, $4) RETURNING idConsult`,
      [idRdv, dateConsult || new Date().toISOString(), compteRendu || '', prix || null]
    );
    res.status(201).json({ id: result.rows[0].idConsult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Modifier une consultation (prix modifiable)
app.put('/consultations/:idConsult', async (req, res) => {
  const { idRdv, dateConsult, compteRendu, prix } = req.body;
  const { idConsult } = req.params;
  try {
    const result = await pool.query(
      `UPDATE consultations SET idRdv = $1, dateConsult = $2, compteRendu = $3, prix = $4 WHERE idConsult = $5`,
      [idRdv, dateConsult, compteRendu, prix, idConsult]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Consultation non trouvée" });
    res.json({ modified: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ Supprimer une consultation
app.delete('/consultations/:idConsult', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM consultations WHERE idConsult = $1`, [req.params.idConsult]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔍 Recherche avancée (inchangée, mais renvoie aussi le prix)
app.get('/consultations/search', async (req, res) => {
  const { patient, praticien, date, compteRendu } = req.query;

  let sql = `
    SELECT c.*, c.prix FROM consultations c
    LEFT JOIN rendezvous r ON c.idRdv = r.idRdv
    LEFT JOIN patients p ON r.cinPatient = p.cinPatient
    LEFT JOIN praticiens pr ON r.cinPraticien = pr.cinPraticien
    WHERE 1=1
  `;
  let params = [];
  let paramIndex = 1;

  if (patient) {
    sql += ` AND (p.nom LIKE $${paramIndex} OR p.prenom LIKE $${paramIndex + 1})`;
    params.push(`%${patient}%`, `%${patient}%`);
    paramIndex += 2;
  }
  if (praticien) {
    sql += ` AND (pr.nom LIKE $${paramIndex} OR pr.prenom LIKE $${paramIndex + 1})`;
    params.push(`%${praticien}%`, `%${praticien}%`);
    paramIndex += 2;
  }
  if (date) {
    sql += ` AND date(c.dateConsult) = date($${paramIndex})`;
    params.push(date);
    paramIndex += 1;
  }
  if (compteRendu) {
    sql += ` AND c.compteRendu LIKE $${paramIndex}`;
    params.push(`%${compteRendu}%`);
    paramIndex += 1;
  }

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📄 Lister toutes les prescriptions
app.get('/prescriptions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prescriptions');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ Ajouter une prescription
app.post('/prescriptions', async (req, res) => {
  const { idConsult, typePrescrire, posologie, datePrescrire } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO prescriptions (idConsult, typePrescrire, posologie, datePrescrire) VALUES ($1, $2, $3, $4) RETURNING idPrescrire`,
      [idConsult, typePrescrire, posologie, datePrescrire]
    );
    res.status(201).json({ id: result.rows[0].idPrescrire });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Modifier une prescription
app.put('/prescriptions/:idPrescrire', async (req, res) => {
  const { idConsult, typePrescrire, posologie, datePrescrire } = req.body;
  const { idPrescrire } = req.params;
  try {
    const result = await pool.query(
      `UPDATE prescriptions SET idConsult=$1, typePrescrire=$2, posologie=$3, datePrescrire=$4 WHERE idPrescrire=$5`,
      [idConsult, typePrescrire, posologie, datePrescrire, idPrescrire]
    );
    res.json({ modified: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ Supprimer une prescription
app.delete('/prescriptions/:idPrescrire', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM prescriptions WHERE idPrescrire=$1`, [req.params.idPrescrire]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📄 Lister tous les examens
app.get('/examens', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM examen');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ Ajouter un examen
app.post('/examens', async (req, res) => {
  const { idConsult, typeExamen, dateExamen, resultat } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO examen (idConsult, typeExamen, dateExamen, resultat) VALUES ($1, $2, $3, $4) RETURNING idExamen`,
      [idConsult, typeExamen, dateExamen, resultat]
    );
    res.status(201).json({ id: result.rows[0].idExamen });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Modifier un examen
app.put('/examens/:idExamen', async (req, res) => {
  const { idConsult, typeExamen, dateExamen, resultat } = req.body;
  const { idExamen } = req.params;
  try {
    const result = await pool.query(
      `UPDATE examen SET idConsult=$1, typeExamen=$2, dateExamen=$3, resultat=$4 WHERE idExamen=$5`,
      [idConsult, typeExamen, dateExamen, resultat, idExamen]
    );
    res.json({ modified: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ Supprimer un examen
app.delete('/examens/:idExamen', async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM examen WHERE idExamen=$1`, [req.params.idExamen]);
    res.json({ deleted: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un rendez-vous et créer une consultation si confirmé
app.put('/rendezvous/:id', async (req, res) => {
  const { statut } = req.body;
  const idRdv = req.params.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mettre à jour le rendez-vous
    await client.query('UPDATE rendezvous SET statut = $1 WHERE idRdv = $2', [statut, idRdv]);

    // Si confirmé, ajouter dans consultations si pas déjà présent
    if (statut === 'confirme') {
      const existsResult = await client.query('SELECT * FROM consultations WHERE idRdv = $1', [idRdv]);
      if (existsResult.rows.length === 0) {
        // Récupérer les infos du rendez-vous
        const rdvResult = await client.query('SELECT * FROM rendezvous WHERE idRdv = $1', [idRdv]);
        const rdv = rdvResult.rows[0];
        if (rdv) {
          await client.query(
            'INSERT INTO consultations (idRdv, dateConsult, compteRendu) VALUES ($1, $2, $3)',
            [rdv.idRdv, rdv.dateHeure, '']
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Rendez-vous mis à jour' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Démarrer serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
const db = require("../db");

exports.listUsers = async (req, res) => {
  try {
    const result = await db.query("SELECT id, email, role, created_at FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list users" });
  }
};

exports.createUser = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    await db.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3)",
      [email, password, role || 'user']
    );
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

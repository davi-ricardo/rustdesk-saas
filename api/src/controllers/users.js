const db = require("../db");

exports.listUsers = async (req, res) => {
  try {
    const result = await db.query("SELECT id, username, email, role, is_active, created_at FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list users" });
  }
};

exports.createUser = async (req, res) => {
  const { username, email, password, role } = req.body;
  try {
    await db.query(
      "INSERT INTO users (username, email, password, role, is_active) VALUES ($1, $2, $3, $4, true)",
      [username || null, email, password, role || 'user']
    );
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, password, role } = req.body;
  
  try {
    if (password) {
      await db.query(
        "UPDATE users SET username = $1, email = $2, password = $3, role = $4 WHERE id = $5",
        [username || null, email, password, role, id]
      );
    } else {
      await db.query(
        "UPDATE users SET username = $1, email = $2, role = $3 WHERE id = $4",
        [username || null, email, role, id]
      );
    }
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
};

exports.toggleUserStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING is_active",
      [id]
    );
    res.json({ status: "ok", is_active: result.rows[0].is_active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle user status" });
  }
};

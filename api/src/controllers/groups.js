const db = require("../db");

exports.listGroups = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT g.*, COUNT(ab.id) as device_count 
      FROM groups g 
      LEFT JOIN address_book ab ON g.id = ab.group_id 
      GROUP BY g.id 
      ORDER BY g.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list groups" });
  }
};

exports.createGroup = async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING *",
      [name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create group" });
  }
};

exports.updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await db.query(
      "UPDATE groups SET name = $1, description = $2 WHERE id = $3 RETURNING *",
      [name, description, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update group" });
  }
};

exports.deleteGroup = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM groups WHERE id = $1", [id]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete group" });
  }
};

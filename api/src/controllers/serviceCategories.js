const db = require("../db");

exports.listCategories = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM service_categories ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list categories" });
  }
};

exports.createCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    await db.query(
      "INSERT INTO service_categories (name, description) VALUES ($1, $2)",
      [name, description || null]
    );
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    await db.query(
      "UPDATE service_categories SET name = $1, description = $2 WHERE id = $3",
      [name, description || null, id]
    );
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM service_categories WHERE id = $1", [id]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

const jwt = require("jsonwebtoken");
const db = require("../db");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (user && user.password === password) {
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || "supersecretkey",
        { expiresIn: "1d" }
      );

      return res.json({ token, user: { id: user.id, email: user.email } });
    }

    return res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
};

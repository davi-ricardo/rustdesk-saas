const jwt = require("jsonwebtoken");
const db = require("../db");

exports.login = async (req, res) => {
  const { email, password } = req.body; // 'email' aqui é o que vem do campo de texto (pode ser username)

  try {
    // Busca o usuário pelo email OU pelo username
    const result = await db.query(
      "SELECT * FROM users WHERE email = $1 OR username = $1", 
      [email]
    );
    const user = result.rows[0];

    if (user && user.password === password) {
      // Verifica se o usuário está ativo
      if (!user.is_active) {
        return res.status(403).json({ error: "User is disabled" });
      }
      
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || "supersecretkey",
        { expiresIn: "1d" }
      );

      return res.json({ token, user: { id: user.id, email: user.email, role: user.role, username: user.username } });
    }

    return res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Database error" });
  }
};

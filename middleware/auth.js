import jwt from 'jsonwebtoken';

export function checkToken(req, res, next) {
  const authHeader = req.headers['authorization'];  // corrigido aqui

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'Acesso negado, token não fornecido!' });
  }

  try {
    const secret = process.env.SECRET;

    const verified = jwt.verify(token, secret);

    req.userId = verified.id;  // salva o id do usuário no req.userId para usar nas rotas

    next();
  } catch (err) {
    res.status(400).json({ msg: 'Token inválido!' });
  }
}

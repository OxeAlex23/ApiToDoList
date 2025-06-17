import jwt from 'jsonwebtoken';

export function checkToken(req, res, next) {
    const authHeader = req.headers['autorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({msg: 'Acesso negado, token nao fornecido!'})
    };

    try {
        const secret = process.env.SECRET;

        const verified = jwt.verify(token, secret);

        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({msg: 'token inválido!'})
    }
}
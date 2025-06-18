import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserTasks from './modules/UserTasks.js';
import { checkToken } from './middleware/auth.js';
import cors from 'cors';

const User = UserTasks;
const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {

    res.status(200).json({ msg: 'servidor rodando' });
})

app.get('/:id', checkToken, async (req, res) => {
    const idUser = req.params.id;
    const user = await User.findById(idUser, '-password');
    const tasks = user.tasks

    res.status(200).json({ task: tasks });
})

app.post('/register', async (req, res) => {
    const { name, email, password, birthdate } = req.body;

    if (!name) {
        return res.status(422).json({ msg: 'nome é obrigatório!' });
    }
    if (!email) {
        return res.status(422).json({ msg: 'email é obrigatório!' });
    }
    if (!password) {
        return res.status(422).json({ msg: 'senha é obrigatório!' });
    }

    if (!birthdate) {
        return res.status(422).json({ msg: 'data de aniversário é obrigatória!' });
    }

    const userExist = await User.findOne({ email: email });

    if (userExist) {
        return res.status(422).json({ msg: 'Usuário já existe!' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);


    const user = new User({
        name, email, password: passwordHash, tasks, birthdate
    });

    try {
        await user.save();

        const secret = process.env.SECRET;
        const token = jwt.sign({
            id: user._id
        }, secret,
        );
        res.status(200).json({ msg: 'Usuário criado com Sucesso!', token, userId: user._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro no servidor!' });
    }


})

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
        return res.status(402).json({ msg: 'email ou senha inválidos' });
    }

    if (!password) {
        return res.status(402).json({ msg: 'email ou senha inválidos' });
    }

    const user = await User.findOne({ email: email });

    if (!user) {
        return res.status(404).json({ msg: 'Usuário não encontrado!' });
    }

    const checkPass = await bcrypt.compare(password, user.password);

    if (!checkPass) {
        return res.status(422).json({ msg: 'Senha Inválida!' })
    }

    try {
        const secret = process.env.SECRET;
        const token = jwt.sign({
            id: user._id
        }, secret,
        );

        res.status(201).json({ msg: 'logado com sucesso!', token, userId: user._id });

    } catch (err) {
        console.error(err)
        res.status(400).json({ msg: 'erro ao logar!' });
    }
})


app.patch('/createTasks/:id', checkToken , async (req, res) => {
    const { tasks: newTasks } = req.body;
    const idUser = req.params.id;

    try {

        const user = await User.findById(idUser, '-password');
        if (!user) {
            return res.status(404).json({ msg: 'Usuário não encontrado!' });
        }
        if (!newTasks || Object.keys(newTasks).length === 0) {
            return res.status(400).json({ msg: 'campo não pode estar vazio!' })
        }

        if (!Array.isArray(user.tasks)) {
            user.tasks = [];
        }

        user.tasks = user.tasks.concat(newTasks)

        await user.save(); // a=salva as alteraçoes

        res.status(200).json({ msg: 'Tarefa criada com sucesso!' })


    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao criar tarefa', error: err.message });
    }
})

app.put('/editTask/:id/:index', async (req, res) => {
    const userId = req.params.id;
    const index = parseInt(req.params.index); // índice da tarefa a ser editada
    const { newTask } = req.body; // o novo conteúdo da tarefa

    if (!newTask) {
        return res.status(400).json({ msg: 'Nova tarefa não enviada no corpo da requisição!' });
    }

    try {
        const user = await User.findById(userId, '-password');
        if (!user) {
            return res.status(404).json({ msg: 'Usuário não encontrado!' });
        }

        if (!Array.isArray(user.tasks)) {
            return res.status(400).json({ msg: 'Usuário não possui tarefas!' });
        }

        if (index < 0 || index >= user.tasks.length) {
            return res.status(400).json({ msg: 'Índice da tarefa inválido!' });
        }

        // atualiza a tarefa específica
        user.tasks[index] = newTask;

        await user.save();

        res.status(200).json({ msg: 'Tarefa atualizada com sucesso!', tasks: user.tasks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao atualizar tarefa', error: err.message });
    }
});

app.delete('/deleteTask/:id/:index', checkToken , async (req, res) => {
    const userId = req.params.id;
    const index = parseInt(req.params.index);

    try {
        const user = await User.findById(userId, '-password');

        if (!user) {
            return res.status(404).json({msg: 'usuário não encontrado!'});
        }

        if(isNaN(index) || index < 0 || index >= user.tasks.length) {
            return res.status(400).json({msg: 'index inválido!'});
        }

        user.tasks.splice(index, 1);

        await user.save();

        res.status(200).json({msg: 'task excluida com sucesso!'});
    } catch (err) {
        console.error('erro ao deletar tarefa', err);
    }


});

const DbPassword = process.env.DB_PASSWORD;
const DbUser = process.env.DB_USER;

mongoose.connect(`mongodb+srv://${DbUser}:${DbPassword}@apitodolist.ubykyp2.mongodb.net/?retryWrites=true&w=majority&appName=ApiToDoList`).then(() => {
    app.listen(3000);
    console.log('conect to bd')
}).catch((err) => console.error(err));


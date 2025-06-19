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
        name, email, password: passwordHash, birthdate
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
});

app.post('/addTask/:userId', async (req, res) => {
    const { description } = req.body;
    const { userId } = req.params;

    if (!description || description.trim() === '') {
        return res.status(400).json({ msg: 'Descrição da tarefa é obrigatória' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

        user.tasks.push({ description, checked: false });

        await user.save();

        res.status(201).json({ msg: 'Tarefa adicionada com sucesso!', tasks: user.tasks });
    } catch (err) {
        res.status(500).json({ msg: 'Erro ao adicionar tarefa', error: err.message });
    }
});


app.patch('/createTasks/:id', checkToken , async (req, res) => {
    const { tasks: newTasks } = req.body;
    const idUser = req.params.id;

    try {
        const user = await User.findById(idUser, '-password');

        if (!user) {
            return res.status(404).json({ msg: 'Usuário não encontrado!' });
        }

        if (!newTasks || newTasks.length === 0) {
            return res.status(400).json({ msg: 'Campo não pode estar vazio!' });
        }

        if (!Array.isArray(user.tasks)) {
            user.tasks = [];
        }

        const tasksConverted = newTasks.map(tarefa => {

            if (typeof tarefa === 'string') {
                return { description: tarefa, checked: false };
            }

            if (typeof tarefa === 'object' && tarefa.description) {
                return {
                    description: tarefa.description,
                    checked: tarefa.checked ?? false
                };
            }
            return null;
        }).filter(Boolean);

        user.tasks = user.tasks.concat(tasksConverted);

        await user.save();

        res.status(200).json({ msg: 'Tarefa criada com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Erro ao criar tarefa', error: err.message });
    }
});

app.patch('/toggleTask/:userId/:taskId', checkToken, async (req, res) => {
    const { userId, taskId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

        const task = user.tasks.id(taskId);
        if (!task) return res.status(404).json({ msg: 'Tarefa não encontrada' });

        task.checked = !task.checked;

        await user.save();

        res.json({ msg: 'Status da tarefa atualizado com sucesso!', task });
    } catch (err) {
        res.status(500).json({ msg: 'Erro ao atualizar tarefa.', error: err.message });
    }
});


app.put('/editTask/:userId/:taskId', checkToken , async (req, res) => {
    const { userId, taskId } = req.params;
    const { description } = req.body;

    if (!description || description.trim() === '') {
        return res.status(400).json({ msg: 'Descrição da tarefa é obrigatória' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

        const task = user.tasks.id(taskId);
        if (!task) return res.status(404).json({ msg: 'Tarefa não encontrada' });

        task.description = description;

        await user.save();

        res.json({ msg: 'Descrição da tarefa atualizada com sucesso!', task });
    } catch (err) {
        res.status(500).json({ msg: 'Erro ao atualizar tarefa', error: err.message });
    }
});


app.delete('/deleteTask/:userId/:taskId', checkToken , async (req, res) => {
    const { userId, taskId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: 'Usuário não encontrado' });

        user.tasks = user.tasks.filter(task => task._id.toString() !== taskId);

        await user.save();

        res.json({ msg: 'Tarefa removida com sucesso!', tasks: user.tasks });
    } catch (err) {
        res.status(500).json({ msg: 'Erro ao remover tarefa.', error: err.message });
    }
});


const DbPassword = process.env.DB_PASSWORD;
const DbUser = process.env.DB_USER;

mongoose.connect(`mongodb+srv://${DbUser}:${DbPassword}@apitodolist.ubykyp2.mongodb.net/?retryWrites=true&w=majority&appName=ApiToDoList`).then(() => {
    app.listen(3000);
    console.log('conect to bd')
}).catch((err) => console.error(err));


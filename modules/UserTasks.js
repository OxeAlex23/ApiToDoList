import mongoose from "mongoose";

 const UserTasks = mongoose.model('UserTasks', {
    name: String,
    email: String,
    password: String,
    tasks: {
    type:  [String],
    default: [], 
    },
    birthdate: String
})

export default UserTasks
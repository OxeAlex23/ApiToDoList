import mongoose from "mongoose";

 const UserTasks = mongoose.model('UserTasks', {
    name: String,
    email: String,
    password: String,
    tasks: {
    type:  [
        {
            description: String,
            checked: {
                type: Boolean,
                default: false
            }
        }
    ],
    default: [], 
    },
    birthdate: String
})

export default UserTasks
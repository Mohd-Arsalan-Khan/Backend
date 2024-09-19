// rquire('dotenv').config({path: "./env"})

import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env"
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT || 3000, () => {
        console.log(`connection running on port ${process.env.PORT}`)
    })//todo error listen we have to do
})
.catch((error) =>{
    console.log("Connection DB failed", error)
})







// import express from "express"

// const app = express()

// ;( async ( ) =>{
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//        app.on("error", (error) =>{
//         console.log("no connection", error);
//         throw error
//        })
//        app.listen(process.env.PORT, ()=>{
//         console.log(`app is listening on port ${process.env.PORT}`)
//        })
//     } catch (error) {
//         console.error("error", error)
//         throw error
//     }
// })()
import mongoose from "mongoose";
mongoose.set("strictQuery", false);
 // not give error if any query request is irrelevant

const connectionToDb = async (req , res) =>{
    try {
        const {connection} = await mongoose.connect(process.env.MONGO_URL );
        if(connection){
            console.log(`connected to the mongo db ${connection.host}`);
        }
    } catch (error) {
       console.log (error);
        process.exit(1);

    }

  
 }
 export default connectionToDb ;
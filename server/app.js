import   express from 'express';
const app = express();
import  cors from 'cors';
import  cookieParser from 'cookie-parser';
import  { config } from 'dotenv';
config();
import morgan from 'morgan';
import useroutes from './routes/user.routes.js'
import errormiddleware from './middlewares/error.middleware.js';



app.use(express.urlencoded({ extended:true}));
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))
app.use(cookieParser());
app.use (morgan('dev')); // console random requested 
app.use('/ping', function(req,res){
    res.send('/pong');
});

//rotes of 3 model
app.use('/api/v1/user',useroutes );


app.all('*',(req, res) =>{
    res.status(400).send('opps!! 404 page is not find '); // res if random request is send in port 
});

app.use (errormiddleware);
export default app;


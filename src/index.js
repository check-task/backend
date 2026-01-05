import dotenv from "dotenv";
import express from "express"; // -> ES Module'
import cors from "cors";
import { errorHandler } from "./middlewares/error.middleware.js";
import { stateHandler } from "./middlewares/state.middleware.js";
import { corsOptions } from "./config/cors.config.js";

dotenv.config();
console.log(process.env.PORT);

const app = express();
const port = process.env.PORT;

//cors 방식 허용
app.use(cors(corsOptions));
app.use(express.static("public"));
//request의 본문을 json으로 해석할 수 있도록 함.(JSON 형태의 요청 body를 파싱하기 위함)
app.use(express.json());
//단순 객체 문자열 형태로 본문 데이터 해석 (form-data 형태의 요청 body를 파싱하기 위함)
app.use(express.urlencoded({ extended: false }));

app.use(stateHandler);

app.get("/", (req, res) => {
  return res.success({ message: "Hello World!" }, "성공");
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

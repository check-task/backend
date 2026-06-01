export const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://checktask.kr",
    "https://api.checktask.kr",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

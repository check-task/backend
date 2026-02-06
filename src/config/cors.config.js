export const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://checktask.kro.kr",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

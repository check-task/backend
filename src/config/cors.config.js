export const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://frontend-one-chi-11.vercel.app",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

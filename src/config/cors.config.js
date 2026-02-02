export const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://frontend-one-chi-11.vercel.app",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credential: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

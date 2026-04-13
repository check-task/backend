export const stateHandler = (req, res, next) => {
  res.success = (data, message = "성공") => {
    return res.status(200).json({ resultType: "SUCCESS", message, data });
  };
  next();
};

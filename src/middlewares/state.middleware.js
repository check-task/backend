export const stateHandler = (req, message = '성공', data) => {
  res.success = (success) => {
    return res.status(200).json({ resultType: "SUCCESS", message, data });
  };
  next();
};

const AppError = require("./appError");

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new AppError("Server configuration is incomplete", 500, {
      code: "CONFIG_MISSING",
      expose: false,
      details: { missing: name },
    });
  }

  return value;
};

module.exports = { requireEnv };

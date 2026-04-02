const AppError = require("./appError");

const VALID_JOBS = [
  "Uber", "Ola", "Swiggy", "Zomato", "Blinkit", "Zepto", "Rapido", 
  "Amazon Flex", "BigBasket", "Delhivery", "BluSmart", "Dunzo", 
  "Namma Yatri", "BlueDart", "JioMart", "InDriver", "Other"
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ensureNonEmptyString = (value, fieldName) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${fieldName} is required`, 400, { code: "VALIDATION_ERROR" });
  }

  return value.trim();
};

const ensureEmail = (value) => {
  const email = ensureNonEmptyString(value, "email").toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError("email must be a valid email address", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return email;
};

const ensureMinLengthString = (value, fieldName, minLength) => {
  const normalized = ensureNonEmptyString(value, fieldName);

  if (normalized.length < minLength) {
    throw new AppError(`${fieldName} must be at least ${minLength} characters long`, 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return normalized;
};

const ensureNumber = (value, fieldName, options = {}) => {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${fieldName} is required`, 400, { code: "VALIDATION_ERROR" });
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new AppError(`${fieldName} must be a valid number`, 400, {
      code: "VALIDATION_ERROR",
    });
  }

  if (options.min !== undefined && parsed < options.min) {
    throw new AppError(`${fieldName} must be at least ${options.min}`, 400, {
      code: "VALIDATION_ERROR",
    });
  }

  if (options.max !== undefined && parsed > options.max) {
    throw new AppError(`${fieldName} must be at most ${options.max}`, 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return parsed;
};

const parseOptionalNumber = (value, fieldName, options = {}) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return ensureNumber(value, fieldName, options);
};

const parseOptionalDate = (value, fieldName = "date") => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} must be a valid date`, 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return parsed;
};

const normalizeJob = (value, options = {}) => {
  const { required = true } = options;

  if (value === undefined || value === null || value === "") {
    if (!required) {
      return undefined;
    }
    throw new AppError("job is required", 400, { code: "VALIDATION_ERROR" });
  }

  if (typeof value !== "string") {
    throw new AppError("job must be a string", 400, { code: "VALIDATION_ERROR" });
  }

  const normalized = value.trim();
  
  // Find case-insensitive match in our master list
  const matchedJob = VALID_JOBS.find(
    (j) => j.toLowerCase() === normalized.toLowerCase()
  );

  if (!matchedJob) {
    throw new AppError(
      `job must be one of: ${VALID_JOBS.join(", ")}`,
      400,
      { code: "VALIDATION_ERROR" }
    );
  }

  return matchedJob;
};

const parseOptionalString = (value, fieldName) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(`${fieldName} must be a string`, 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return value.trim();
};

const parseCoordinates = (latValue, lonValue, options = {}) => {
  const { required = false } = options;
  const hasLat = latValue !== undefined && latValue !== null && latValue !== "";
  const hasLon = lonValue !== undefined && lonValue !== null && lonValue !== "";

  if (!hasLat && !hasLon) {
    if (required) {
      throw new AppError("lat and lon are required", 400, { code: "VALIDATION_ERROR" });
    }

    return null;
  }

  if (!hasLat || !hasLon) {
    throw new AppError("lat and lon must be provided together", 400, {
      code: "VALIDATION_ERROR",
    });
  }

  return {
    lat: ensureNumber(latValue, "lat", { min: -90, max: 90 }),
    lon: ensureNumber(lonValue, "lon", { min: -180, max: 180 }),
  };
};

module.exports = {
  EMAIL_REGEX,
  VALID_JOBS,
  ensureEmail,
  ensureMinLengthString,
  ensureNonEmptyString,
  ensureNumber,
  normalizeJob,
  parseCoordinates,
  parseOptionalDate,
  parseOptionalNumber,
  parseOptionalString,
};

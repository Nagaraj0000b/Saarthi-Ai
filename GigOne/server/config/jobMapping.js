/**
 * @fileoverview Job category and platform mapping configuration.
 * Centralizes the definition of job categories and their associated platforms
 * to ensure consistency across the backend and ML services.
 * 
 * @module server/config/jobMapping
 */

const jobMapping = {
  categories: [
    "Ride hailing drivers (cab+ bike)",
    "Ride hailing instant delivery",
    "Delivery workers in General",
    "On Demand home based services",
    "Remote service providers"
  ],
  platforms: {
    "Ride hailing drivers (cab+ bike)": [
      "Uber",
      "Ola",
      "BluSmart",
      "Namma Yatri",
      "InDriver",
      "Rapido"
    ],
    "Ride hailing instant delivery": [
      "Swiggy",
      "Zomato",
      "Blinkit",
      "Zepto"
    ],
    "Delivery workers in General": [
      "Amazon Flex",
      "Delhivery",
      "BlueDart",
      "Dunzo",
      "BigBasket",
      "JioMart"
    ],
    "On Demand home based services": [
      "Urban Company",
      "Local Plumber",
      "Local Electrician",
      "Home Cleaning Co",
      "Elderly Care",
      "Pet Walker"
    ],
    "Remote service providers": [
      "DataEntry Inc",
      "SupportHero",
      "Virtual Assistant Hub",
      "Translation Pro"
    ]
  }
};

module.exports = jobMapping;

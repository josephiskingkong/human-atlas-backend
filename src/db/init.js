const { CategoryModel } = require("./models/CategoryModel");
const { OrganModel } = require("./models/OrganModel");
const { PointModel } = require("./models/PointModel");

// PointModel.sync({ force: true })
// OrganModel.sync({ force: true })
CategoryModel.sync({ force: true })
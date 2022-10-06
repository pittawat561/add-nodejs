const mysql = require("mysql2");
const dbConnection = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "nodejsdb"
}).promise()

module.exports = dbConnection;
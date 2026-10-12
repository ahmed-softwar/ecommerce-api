
const connection = require("./config/database");

connection.query("SELECT 1 AS result", (error, rows) => {
    if (error) {
        console.log(error.message);
    } else {
        console.log(rows);
    }

    connection.end();
});
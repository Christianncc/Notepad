import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "testing_wwlj_user", // The username for the PostgreSQL connection.
  host: "dpg-cuc3a6bv2p9s73d143q0-a.oregon-postgres.render.com", // The host where the PostgreSQL database is running.
  database: "world", // The name of the PostgreSQL database to connect to.
  password: "vPGvGXtPGFuSMYQ6D5aiQEXWAgI3IubT", // The password for the PostgreSQL user.
  port: 5432, // The port number where the PostgreSQL database is running (default is 5432).
  ssl: {
    rejectUnauthorized: false, // This will allow self-signed certificates (in some cases), but ensure you understand the security implications.
  },
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;


// Helper to get user by ID
async function getUserById(userId) {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
  return result.rows[0];
}



async function checkVisisted() {

  const result = await db.query("SELECT country_code FROM visited_countries_user WHERE user_id = 1");
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function checkUsers() {
  const result = await db.query("SELECT id, name, color FROM users");
  let users = [];
  return result.rows;
  return users;
  
}


app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const users = await checkUsers();

  // Ensure selectedUser is always passed, default to the first user if no user is selected
  const selectedUser = users.length > 0 ? users[0] : null;

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: selectedUser ? selectedUser.color : "blue",  // Default to "blue" if no user is selected
    selectedUser: selectedUser,
  });
});


// Route to handle GET request for /delete
app.get("/delete", async (req, res) => {
  try {
    // Fetch the users from the database
    const usersResult = await db.query("SELECT id, name, color FROM users");
    const users = usersResult.rows;  // This is the array of users

    // Pass the users array to the delete.ejs page
    res.render("delete.ejs", { users: users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.send("Error fetching users for deletion.");
  }
});




app.post("/user", async (req, res) => {


  if (req.body.add) {
    // Redirect to the "new" page to add a new family member
    return res.render("new.ejs");
  }

  if (req.body.delete) {
    // Redirect to the "delete" page (make sure we call the /delete route)
    return res.redirect("/delete");  // Correct the routing here
  }


  const userId = req.body.user;  // Fetch the user ID from the form
  
  if (userId) {
    try {
      // Fetch the selected user's details
      const selectedUserResult = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
      const selectedUser = selectedUserResult.rows[0];

      // Fetch the visited countries for the user
      const visitedCountriesResult = await db.query(
        "SELECT country_code FROM visited_countries_user WHERE user_id = $1",
        [userId]
      );
      const visitedCountries = visitedCountriesResult.rows.map(row => row.country_code);
      const totalCountries = visitedCountries.length;

      // Fetch all users
      const users = await checkUsers();

      // Render the user page with user and visited countries information
      res.render("index.ejs", {
        users: users,
        selectedUser: selectedUser,
        visitedCountries: visitedCountries,
        total: totalCountries,
        countries: visitedCountries.join(","),
        color: selectedUser.color
      });
    } catch (err) {
      console.log(err);
      res.send("Error fetching user data.");
    }
  } else {
    res.redirect("/");  // If no user ID is provided, redirect to the main page
  }
});

app.get("/user", async (req, res) => {
  const userId = req.query.user;  // Fetch the user ID from the query parameter
  if (userId) {
    try {
      // Fetch the selected user's details
      const selectedUserResult = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
      const selectedUser = selectedUserResult.rows[0];

      // Fetch the visited countries for the user
      const visitedCountriesResult = await db.query(
        "SELECT country_code FROM visited_countries_user WHERE user_id = $1",
        [userId]
      );
      const visitedCountries = visitedCountriesResult.rows.map(row => row.country_code);
      const totalCountries = visitedCountries.length;

      // Fetch all users
      const users = await checkUsers();

      // Render the user page with user and visited countries information
      res.render("index.ejs", {
        users: users,
        selectedUser: selectedUser,
        visitedCountries: visitedCountries,
        total: totalCountries,
        countries: visitedCountries.join(","),
        color: selectedUser.color
      });
    } catch (err) {
      console.log(err);
      res.send("Error fetching user data.");
    }
  } else {
    res.redirect("/");  // If no user ID is provided, redirect to the main page
  }
});


app.post("/delete", async (req, res) => {
  const userId = req.body.user;
  console.log(userId);
  // Check if the 'delete' button was clicked
  if (req.body.delete === "true") {
    console.log("success");
    try {
      // First, delete the user's visited countries to avoid foreign key violations
      await db.query("DELETE FROM visited_countries_user WHERE user_id = $1", [userId]);

      // Now, delete the user from the 'users' table
      await db.query("DELETE FROM users WHERE id = $1", [userId]);

      // Redirect to the home page after deletion
      res.redirect("/");  // Redirect to the main page after deleting the user
    } catch (err) {
      console.error("Error deleting user:", err);
      res.send("Error deleting user.");
    }
    return; // Prevent further processing if the delete action is performed
  }

  // If delete flag is not set, simply return to the main page or show error
  res.redirect("/");
});


app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const userId = req.body["user_id"];  // Get user_id from the form

  try {
    // Query for country code based on country name
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    if (!data) {
      return res.send("Country not found");
    }

    const countryCode = data.country_code;

    // Check if this user has already visited this country
    const checkVisitedResult = await db.query(
      "SELECT 1 FROM visited_countries_user WHERE user_id = $1 AND country_code = $2",
      [userId, countryCode]
    );

    if (checkVisitedResult.rows.length > 0) {
      // If the country has already been visited, show an error message
      return res.render("index.ejs", {
        error: "This country has already been visited by this user.",
        users: await checkUsers(),
        selectedUser: await getUserById(userId),
        countries: await checkVisisted(),
        total: (await checkVisisted()).length,
        color: (await getUserById(userId)).color
      });
    }

    // Insert the country code and user_id into visited_countries_user table
    await db.query(
      "INSERT INTO visited_countries_user (country_code, user_id) VALUES ($1, $2)",
      [countryCode, userId]
    );

    // After country is added, redirect to the same page with the selected user context
    res.redirect(`/user?user=${userId}`);
  } catch (err) {
    console.log(err);
    res.send("Error querying countries");
  }
});




app.post("/new", async (req, res) => {

  const newName = req.body["name"];
  const pickColor = req.body.color;

  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES ($1, $2)", [newName, pickColor]
    );
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

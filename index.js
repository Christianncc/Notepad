import express from "express"; // Imports the Express framework for building the web server.
import bodyParser from "body-parser"; // Imports the body-parser middleware to parse incoming request bodies.
import pg from "pg"; // Imports the pg (node-postgres) library for interacting with PostgreSQL databases.
 
const app = express(); // Creates an Express application instance.
const port = 3000; // Specifies the port number on which the server will listen for incoming requests.
 
const db = new pg.Client({
  user: "christian_project_db_user", // The username for the PostgreSQL connection.
  host: "dpg-cveit9gfnakc738f1400-a.oregon-postgres.render.com", // The host where the PostgreSQL database is running.
  database: "world", // The name of the PostgreSQL database to connect to.
  password: "STARv7jqVAQWEdp3iA1QOXc7XHPdxjHJ", // The password for the PostgreSQL user.
  port: 5432, // The port number where the PostgreSQL database is running (default is 5432).
  ssl: {
    rejectUnauthorized: false, // This will allow self-signed certificates (in some cases), but ensure you understand the security implications.
  },
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true })); // Configures Express to use body-parser to parse URL-encoded bodies (such as form submissions).
app.use(express.static("public")); // Serves static files from the 'public' directory, such as CSS, JS, and images.

async function checkNotes() { // Defines an asynchronous function to fetch all notes from the database.
  const result = await db.query("SELECT * FROM items ORDER BY id ASC"); // Executes a query to get all items ordered by 'id'.
  return result.rows; // Returns the result rows (array of notes).
}

app.get("/", async (req, res) => { // Defines the route for handling GET requests to the root URL.
  const notes = await checkNotes(); // Fetches the list of notes from the database using the checkNotes function.
  const errorMessage = req.query.error; // Retrieves an optional error message from the query string (e.g., ?error=emptyItem).
  res.render("index.ejs", { // Renders the 'index.ejs' template and passes data to it.
    listTitle: "Today", // Passes the list title to the template.
    listItems: notes, // Passes the list of notes to the template.
    errorMessage: errorMessage, // Passes any error message to the template (e.g., "emptyItem").
  });
});

app.post("/add", async (req, res) => { // Defines the route for handling POST requests to add a new item.
  const item = req.body.newItem.trim(); // Retrieves the new item from the form and trims any leading/trailing spaces.
  if (!item) { // Checks if the item is empty (i.e., user did not input any text).
    return res.redirect("/?error=emptyItem"); // Redirects back to the main page with an error message indicating the item is empty.
  }

  try {
    await db.query("INSERT INTO items (title) VALUES ($1)", [item]); // Inserts the new item into the database.
    res.redirect("/"); // Redirects to the root page after successfully adding the item.
  } catch (err) {
    console.error("Error adding note:", err); // Logs the error if there is an issue with adding the note.
    res.send("Error adding note."); // Sends a generic error message in case of failure.
  }
});

app.post("/edit", async (req, res) => { // Defines the route for handling POST requests to update an existing item.
  const updatedItemTitle = req.body.updatedItemTitle; // Retrieves the updated title from the form.
  const id = req.body.updatedItemId; // Retrieves the ID of the item to be updated.

  if (updatedItemTitle) { // Checks if the updated title is not empty.
    try {
      await db.query("UPDATE items SET title = ($1) WHERE id = $2", [updatedItemTitle, id]); // Updates the item in the database with the new title.
      res.redirect("/"); // Redirects to the root page after successfully updating the item.
    } catch (err) {
      console.error("Error deleting note:", err); // Logs the error if the update operation fails.
      res.send("Error deleting note."); // Sends an error message in case of failure (note: this message seems incorrect; should be about updating).
    }
  }
});

app.post("/delete", async (req, res) => { // Defines the route for handling POST requests to delete an item.
  if (req.body.deleteItemId) { // Checks if the ID of the item to delete is provided.
    try {
      await db.query("DELETE FROM items WHERE id = $1", [req.body.deleteItemId]); // Deletes the item from the database based on the provided ID.
    } catch (err) {
      console.error("Error deleting note:", err); // Logs the error if there is an issue with deleting the note.
      res.send("Error deleting note."); // Sends a generic error message in case of failure.
    }
    res.redirect("/"); // Redirects to the root page after the item is deleted.
  }
});

app.listen(port, () => { // Starts the server and listens for incoming requests on the specified port.
  console.log(`Server running on port ${port}`); // Logs a message indicating that the server is running.
});

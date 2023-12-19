const path = require("path");
const express = require("express");
const ws = require("ws");
const crypto = require("crypto");
const sqlite3 = require("sqlite3");
const http = require("http");

// Out libraries
const _hash = require("./hash");
const _q = require("./queries");

// SQLite
const db = new sqlite3.Database("db.sqlite3");
_q.createDefaultTables(db);

// Create express app
const app = express();
app.use(express.json());

// For file uploads
const multer = require("multer");

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // Set the directory for storing image files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Rename the file to prevent conflicts
  },
});

const upload = multer({ storage: storage });

// register path
app.post("/register", async (req, res) => {
  await _q.createNewUser(db, req.body.username.toLowerCase(), req.body.password);

  res.status(200).send()
});

// upload path
app.post("/upload", upload.single("image"), (req, res) => {
  // Retrieve user token from request body
  const userToken = JSON.parse(req.body.userToken);

  // Validate user token and find user ID
  db.get(
    "SELECT id FROM users WHERE token = ?",
    [userToken.token],
    (tokenErr, userRow) => {
      if (tokenErr) {
        return res.status(500).send({ message: "Error verifying user token." });
      } else if (!userRow) {
        return res.status(400).send({ message: "Invalid user token." });
      } else {
        // If the user token is valid, proceed with file upload
        if (!req.file) {
          return res.status(400).send({ message: "No file uploaded." });
        }

        const imageUrl = req.file.path.replace("public/", ""); // Path where the file is saved

        // Insert file info into the database
        db.run(
          "INSERT INTO pictures (user_id, image_url) VALUES (?, ?)",
          [userRow.id, imageUrl],
          function (err) {
            if (err) {
              return res
                .status(500)
                .send({ message: "Error uploading image." });
            }

            db.get(
              "SELECT pictures.*, users.username FROM pictures INNER JOIN users ON users.id = pictures.user_id WHERE pictures.id = ?",
              [this.lastID],
              (err, row) => {
                // Notify all listernes immediatly

                if (err) {
                  console.log(err);
                }

                for (let i = 0; i < peers.length; i++) {
                  peers[i].connection.send(
                    JSON.stringify({
                      image_url: row.image_url,
                      username: row.username,
                      time_sent: row.time_sent,
                    })
                  );
                }
              }
            );

            res.status(200).send({ imageId: this.lastID, imageUrl: imageUrl });
          }
        );
      }
    }
  );
});

// Path to get all images on load
app.get("/images", (req, res) => {
  db.all(
    "SELECT p.*, u.username FROM pictures p inner join users u on u.id = p.user_id",
    (err, rows) => {
      if (err) {
        return res.status(500).send("Error retrieving images.");
      }
      res.status(200).json(rows);
    }
  );
});

//Login endpoint
app.post("/login", (req, res) => {
  // Check if user exists
  db.get(
    "SELECT * FROM users WHERE username = ?",
    [req.body.username.toLowerCase()],
    async (err, row) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error logging in");
      } else if (row === undefined) {
        res.status(400).send("User not found");
      } else {
        //Check if password is correct
        const checkHash = await _hash.verifyPass(
          req.body.password,
          row.password_hash
        );
        if (checkHash) {
          //Create token
          const token = crypto.randomBytes(16).toString("hex");

          //Save token to database
          db.run(
            "UPDATE users SET token = ? WHERE username = ?",
            [token, req.body.username.toLowerCase()],
            (err) => {
              if (err) {
                res.status(500).send("Error creating token");
              }
            }
          );

          //Send token to client
          res
            .status(200)
            .send({ username: req.body.username.toLowerCase(), token: token });
        } else {
          res.status(400).send("Incorrect password");
        }
      }
    }
  );
});

app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);

// Create websocket server
const wss = new ws.Server({ server });
let peers = [];

// Handle websocket peers
wss.on("connection", (connection) => {
  connection.on("message", (message) => {
    // Handle message
    try {
      message = JSON.parse(message);

      // Check if token is valid from user (login checked)
      if (message.token) {
        db.get(
          "SELECT * FROM users WHERE token = ?",
          [message.token],
          (err, row) => {
            if (err) {
              console.log(err);
            } else if (row === undefined) {
              connection.send(
                JSON.stringify({
                  tokenValid: false,
                })
              );
            } else {
              // Check if user is already connected
              let userConnected = false;
              for (let i = 0; i < peers.length; i++) {
                if (peers[i].user_id === row.id) {
                  userConnected = true;
                }
              }

              // Add user to peers if not already connected
              if (!userConnected) {
                peers.push({
                  user_id: row.id,
                  connection: connection,
                });

                // Send all channels rooms to new user
                db.all("SELECT * FROM channels", (err, rows) => {
                  if (err) {
                    console.log(err);
                  } else {
                    // Loop and send
                    for (let i = 0; i < rows.length; i++) {
                      connection.send(
                        JSON.stringify({
                          channel_id: rows[i].id,
                          channelname: rows[i].channelname,
                          image_url: rows[i].image_url,
                        })
                      );
                    }
                  }
                });

                // Fetch all messages from database and send them to the user
                db.all(
                  `SELECT channels.id, time_sent, message, channelname, username FROM messages
                                INNER JOIN channels ON channels.id = messages.channel_id
                                INNER JOIN users ON users.id = messages.user_id`,
                  (err, rows) => {
                    if (err) {
                      console.log(err);
                    } else {
                      // Loop and send
                      for (let i = 0; i < rows.length; i++) {
                        connection.send(
                          JSON.stringify({
                            channel_id: rows[i].id,
                            message: rows[i].message,
                            username: rows[i].username,
                            time_sent: rows[i].time_sent,
                            channelname: rows[i].channelname,
                          })
                        );
                      }
                    }
                  }
                );
              }
            }
          }
        );
      } else if (message.message) {
        // Send message to all users
        let peerUser = null;

        for (let i = 0; i < peers.length; i++) {
          if (peers[i].connection === connection) {
            peerUser = peers[i].user_id;
          }
        }

        // Check if user is connected 
        if (peerUser !== null) {
          //Add message to database
          db.run(
            "INSERT INTO messages (channel_id, user_id, message) VALUES (?, ?, ?)",
            [message.channel_id, peerUser, message.message],
            (err) => {
              if (err) {
                console.log(err);
              }

              //Fetch latest message from database
              db.get(
                `SELECT channels.id, time_sent, message, channelname, username FROM messages
                            INNER JOIN channels ON channels.id = messages.channel_id
                            INNER JOIN users ON users.id = messages.user_id
                            WHERE messages.id = (SELECT MAX(id) FROM messages)`,
                (err, row) => {
                  if (err) {
                    console.log(err);
                  } else {
                    //Send message to all connected users
                    for (let i = 0; i < peers.length; i++) {
                      peers[i].connection.send(
                        JSON.stringify({
                          message: row.message,
                          username: row.username,
                          time_sent: row.time_sent,
                          channel_id: row.id,
                          channel: row.channelname,
                        })
                      );
                    }
                  }
                }
              );
            }
          );
        } else {
          console.log("Could not connect");
        }
      }
    } catch (error) {
      console.log(error);
    }
  });

  connection.on("close", () => {
    for (let i = 0; i < peers.length; i++) {
      if (peers[i].connection === connection) {
        peers.splice(i, 1);
      }
    }
  });
});

server.listen(3000, () => {
  console.log("Running on :3000");
});

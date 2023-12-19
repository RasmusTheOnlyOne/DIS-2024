const _hash = require("./hash");

module.exports.createDefaultTables = (db) => {
  db.exec(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT UNIQUE,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )`);

  db.exec(`CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channelname TEXT NOT NULL,
        image_url TEXT NOT NULL
    )`);

  db.exec(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time_sent DATETIME DEFAULT CURRENT_TIMESTAMP,
        channel_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(channel_id) REFERENCES channels(id)
    )`);

  db.exec(`CREATE TABLE IF NOT EXISTS pictures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        time_sent DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

  // Create channels if they don't exist
  db.all("SELECT * FROM channels", (err, rows) => {
    if (err) {
      console.log(err);
    } else {
      if (rows.length === 0) {
        db.run("INSERT INTO channels (channelname, image_url) VALUES (?, ?)", [
          "Home",
          "https://cdn-icons-png.flaticon.com/512/1946/1946488.png",
        ]);
        db.run("INSERT INTO channels (channelname, image_url) VALUES (?, ?)", [
          "Work",
          "https://cdn-icons-png.flaticon.com/512/1670/1670355.png",
        ]);
        db.run("INSERT INTO channels (channelname, image_url) VALUES (?, ?)", [
          "Workout",
          "https://cdn-icons-png.flaticon.com/512/4729/4729230.png",
        ]);
        db.run("INSERT INTO channels (channelname, image_url) VALUES (?, ?)", [
          "Wine & Dine",
          "https://cdn-icons-png.flaticon.com/512/1942/1942436.png",
        ]);
      }
    }
  });
};

module.exports.createNewUser = async (db, username, password) => {
  const hash = await _hash.hashPass(password)

  await db.run(
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    [username.toLowerCase(), hash],
    (err) => {
      return err;
    }
  );
};

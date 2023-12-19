const bcrypt = require('bcrypt');
const saltRounds = 10; // Increase this if you want more security

module.exports.hashPass = async (password) => {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        // Store hashedPassword in your database
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password', error);
        // Handle error appropriately
        throw error;
    }
}

module.exports.verifyPass = async (providedPassword, storedHash) => {
  try {
      const match = await bcrypt.compare(providedPassword, storedHash);
      // If match is true, then the provided password is correct
      // Otherwise, it's incorrect
      return match;
  } catch (error) {
      console.error('Error verifying password', error);
      // Handle error appropriately
      throw error;
  }
}
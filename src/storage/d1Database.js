export async function getUserFromDB(db, telegramId) {
  try {
    const result = await db.prepare(`
      SELECT * FROM users WHERE telegram_id = ?
    `).bind(telegramId).first();
    
    return result;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function createUser(db, userData) {
  try {
    const result = await db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, preferences, created_at, last_active)
      VALUES (?, ?, ?, '{}', datetime('now'), datetime('now'))
    `).bind(
      userData.telegram_id,
      userData.username || '',
      userData.first_name || ''
    ).run();
    
    // Return the created user
    return await db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(result.meta.last_row_id).first();
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function updateUserActivity(db, userId) {
  try {
    await db.prepare(`
      UPDATE users SET last_active = datetime('now') WHERE id = ?
    `).bind(userId).run();
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}
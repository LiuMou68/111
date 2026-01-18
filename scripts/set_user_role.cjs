const mysql = require('mysql2/promise');

const args = process.argv.slice(2);
const username = args[0];
const roleName = args[1];

if (!username || !roleName) {
    console.log('Usage: node scripts/set_user_role.cjs <username> <role_type>');
    console.log('Role Types: admin (1), student (2), activity (3)');
    process.exit(1);
}

const roleMap = {
    'admin': 1,
    'student': 2,
    'activity': 3
};

const roleId = roleMap[roleName] || parseInt(roleName);

if (![1, 2, 3].includes(roleId)) {
    console.error('Invalid role type. Use: admin, student, or activity');
    process.exit(1);
}

async function setRole() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'certificate_db'
    });

    try {
        // 1. Check user exists
        const [users] = await pool.query('SELECT * FROM user WHERE Username = ?', [username]);
        if (users.length === 0) {
            console.error(`User "${username}" not found.`);
            process.exit(1);
        }
        
        const user = users[0];
        console.log(`Current Role ID for ${username}: ${user.Role_ID}`);
        
        // 2. Update role
        await pool.query('UPDATE user SET Role_ID = ? WHERE User_ID = ?', [roleId, user.User_ID]);
        console.log(`Successfully updated ${username} to Role ID ${roleId} (${roleName})`);
        
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

setRole();
import mysql from 'mysql2/promise';

// 数据库连接配置
const dbConfig = {
    host: 'localhost',
    user: 'chat_rjjr_cn',
    password: '7y9NE2rGehAS494M',
    database: 'chat_rjjr_cn'
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 用户相关操作
export async function verifyUser(username, password) {
    try {
        const [rows] = await pool.execute(
            'SELECT id, username FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('验证用户失败:', error);
        throw error;
    }
}

// 聊天历史相关操作
export async function getChatHistory(userId) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM chat_histories WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    } catch (error) {
        console.error('获取聊天历史失败:', error);
        throw error;
    }
}

export async function saveChatHistory(userId, title, messages) {
    try {
        // 开始事务
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 保存聊天历史
            const [result] = await connection.execute(
                'INSERT INTO chat_histories (user_id, title) VALUES (?, ?)',
                [userId, title]
            );
            const chatId = result.insertId;

            // 保存消息
            for (const msg of messages) {
                await connection.execute(
                    'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)',
                    [chatId, msg.role, msg.content]
                );
            }

            // 提交事务
            await connection.commit();
            return chatId;
        } catch (error) {
            // 回滚事务
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('保存聊天历史失败:', error);
        throw error;
    }
}

export async function deleteChatHistory(userId, chatId) {
    try {
        await pool.execute(
            'DELETE FROM chat_histories WHERE id = ? AND user_id = ?',
            [chatId, userId]
        );
        return true;
    } catch (error) {
        console.error('删除聊天历史失败:', error);
        throw error;
    }
}

export async function getMessages(chatId) {
    try {
        const [rows] = await pool.execute(
            'SELECT role, content FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
            [chatId]
        );
        return rows;
    } catch (error) {
        console.error('获取消息失败:', error);
        throw error;
    }
} 
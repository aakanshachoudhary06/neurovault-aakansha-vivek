import initSqlJs, { Database } from 'sql.js';
import localforage from 'localforage';
import graphService from './graphService';

let db: Database | null = null;
const DB_KEY = 'memory.sqlite';

async function migrateSummaryCreatedFields() {
  const db = await loadOrCreateDB();
  // Find summaries with missing or empty created field
  const res = db.exec("SELECT id FROM summaries WHERE created IS NULL OR created = ''");
  const now = new Date().toISOString();
  if (res[0]?.values?.length) {
    for (const row of res[0].values) {
      const id = row[0];
      db.run('UPDATE summaries SET created = ? WHERE id = ?', [now, id]);
    }
    await saveDB();
  }
}

async function loadOrCreateDB() {
  if (db) return db;
  
  try {
    const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });
    // Try to load from IndexedDB
    const saved = await localforage.getItem<Uint8Array>(DB_KEY);
    if (saved) {
      db = new SQL.Database(saved);
      // Ensure the session_id column exists in existing databases
      try {
        db.run('ALTER TABLE chat_history ADD COLUMN session_id TEXT');
        await saveDB();
      } catch (e) {
        // Column already exists, ignore error
      }
      
      // Ensure the new summary columns exist in existing databases
      try {
        db.run('ALTER TABLE summaries ADD COLUMN transcript_hash TEXT');
        await saveDB();
      } catch (e) {
        // Column already exists, ignore error
      }
      
      try {
        db.run('ALTER TABLE summaries ADD COLUMN transcript TEXT');
        await saveDB();
      } catch (e) {
        // Column already exists, ignore error
      }

      try {
        db.run('ALTER TABLE summaries ADD COLUMN title TEXT');
        await saveDB();
      } catch (e) {
        // Column already exists, ignore error
      }
    } else {
      db = new SQL.Database();
      db.run(`
        CREATE TABLE IF NOT EXISTS audio_files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          blob BLOB,
          transcript TEXT,
          created DATETIME
        );
        CREATE TABLE IF NOT EXISTS summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT,
          transcript_hash TEXT,
          transcript TEXT,
          created DATETIME
        );
        CREATE TABLE IF NOT EXISTS chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT,
          content TEXT,
          created DATETIME,
          session_id TEXT
        );
      `);
      
      // Add session_id column to existing chat_history table if it doesn't exist
      try {
        db.run('ALTER TABLE chat_history ADD COLUMN session_id TEXT');
      } catch (e) {
        // Column already exists, ignore error
      }

      // Add sample audio files if none exist
      const audioCount = db.exec('SELECT COUNT(*) FROM audio_files')[0]?.values?.[0]?.[0] || 0;
      if (audioCount === 0) {
        // Add harvard.wav with meaningful transcript
        const harvardTranscript = "Harvard University is a prestigious institution located in Cambridge, Massachusetts. The university conducts groundbreaking research in various fields including medicine, technology, and social sciences. Students from around the world come to study at Harvard's various schools and departments.";
        db.run('INSERT INTO audio_files (name, blob, transcript, created) VALUES (?, ?, ?, ?)',
          ['harvard.wav', new Uint8Array([]), harvardTranscript, new Date().toISOString()]);

        // Add another sample file
        const techTranscript = "Artificial intelligence and machine learning are transforming industries worldwide. Companies like Google, Microsoft, and OpenAI are leading the development of advanced AI systems. These technologies have applications in healthcare, finance, education, and many other sectors.";
        db.run('INSERT INTO audio_files (name, blob, transcript, created) VALUES (?, ?, ?, ?)',
          ['tech_discussion.wav', new Uint8Array([]), techTranscript, new Date().toISOString()]);
      }

      await saveDB();
    }
    // After schema setup, run migration to fix missing created fields in summaries
    await migrateSummaryCreatedFields();
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function saveDB() {
  if (db) {
    const data = db.export();
    await localforage.setItem(DB_KEY, data);
  }
}

export async function testDatabase() {
  try {
    const db = await loadOrCreateDB();
    const res = db.exec('SELECT COUNT(*) FROM audio_files');
    return { success: true, count: res[0]?.values?.[0]?.[0] || 0 };
  } catch (error) {
    console.error('Database test failed:', error);
    return { success: false, error: error.message };
  }
}

// Audio
export async function saveAudioFile(name: string, blob: Blob, transcript: string) {
  const db = await loadOrCreateDB();
  const reader = new FileReader();
  return new Promise<void>((resolve) => {
    reader.onload = async () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer);
      db.run('INSERT INTO audio_files (name, blob, transcript, created) VALUES (?, ?, ?, ?)', [name, arr, transcript, new Date().toISOString()]);
      await saveDB();

      // Auto-add to knowledge graph
      try {
        await graphService.addTranscriptToGraph(transcript, 'local-user-1');
        console.log('✅ Audio transcript automatically added to knowledge graph');
      } catch (error) {
        console.error('❌ Failed to add audio transcript to knowledge graph:', error);
      }

      resolve();
    };
    reader.readAsArrayBuffer(blob);
  });
}

export async function getAudioFiles() {
  const db = await loadOrCreateDB();
  const res = db.exec('SELECT * FROM audio_files ORDER BY created DESC');
  return res[0]?.values || [];
}

export async function getAudioFileById(id: number) {
  const db = await loadOrCreateDB();
  const res = db.exec('SELECT * FROM audio_files WHERE id = ?', [id]);
  if (res[0]?.values && res[0].values.length > 0) {
    const file = res[0].values[0];
    return {
      id: file[0],
      name: file[1],
      blob: file[2],
      transcript: file[3],
      created: file[4]
    };
  }
  return null;
}

export async function deleteAudioFile(id: number) {
  const db = await loadOrCreateDB();
  db.run('DELETE FROM audio_files WHERE id = ?', [id]);
  await saveDB();
}

export async function updateAudioFileName(id: number, newName: string) {
  const db = await loadOrCreateDB();
  db.run('UPDATE audio_files SET name = ? WHERE id = ?', [newName, id]);
  await saveDB();
}

// Summaries
export async function saveSummary(text: string, transcriptHash?: string, transcript?: string, title?: string) {
  const db = await loadOrCreateDB();
  db.run('INSERT INTO summaries (text, transcript_hash, transcript, created, title) VALUES (?, ?, ?, ?, ?)',
         [text, transcriptHash || null, transcript || null, new Date().toISOString(), title || 'Untitled Summary']);
  await saveDB();

  // Auto-add to knowledge graph
  try {
    const contentToAdd = transcript || text; // Use transcript if available, otherwise use summary text
    await graphService.addTranscriptToGraph(contentToAdd, 'local-user-1');
    console.log('✅ Summary automatically added to knowledge graph');
  } catch (error) {
    console.error('❌ Failed to add summary to knowledge graph:', error);
  }
}

export async function getSummaries() {
  const db = await loadOrCreateDB();
  const res = db.exec('SELECT * FROM summaries ORDER BY created DESC');
  return res[0]?.values || [];
}

export async function getSummaryByTranscriptHash(transcriptHash: string) {
  const db = await loadOrCreateDB();
  const res = db.exec('SELECT * FROM summaries WHERE transcript_hash = ? ORDER BY created DESC LIMIT 1', [transcriptHash]);
  if (res[0]?.values && res[0].values.length > 0) {
    const summary = res[0].values[0];
    return {
      id: summary[0],
      text: summary[1],
      transcriptHash: summary[2],
      transcript: summary[3],
      created: summary[4],
      title: summary[5]
    };
  }
  return null;
}

export async function deleteSummary(id: number) {
  const db = await loadOrCreateDB();
  db.run('DELETE FROM summaries WHERE id = ?', [id]);
  await saveDB();
}

export async function updateSummaryTitle(id: number, newTitle: string) {
  const db = await loadOrCreateDB();
  db.run('UPDATE summaries SET title = ? WHERE id = ?', [newTitle, id]);
  await saveDB();
}

// Chat - Updated to support chat sessions
export async function saveChatSession(messages: { role: string; content: string }[]) {
  const db = await loadOrCreateDB();
  const sessionId = Date.now().toString();
  const timestamp = new Date().toISOString();
  
  // Save each message in the session
  messages.forEach((message, index) => {
    db.run('INSERT INTO chat_history (role, content, created, session_id) VALUES (?, ?, ?, ?)', 
           [message.role, message.content, timestamp, sessionId]);
  });
  await saveDB();
  return sessionId;
}

export function generateSessionId(): string {
  return Date.now().toString();
}

export async function saveChatMessage(role: string, content: string, sessionId?: string) {
  const db = await loadOrCreateDB();
  if (sessionId) {
    db.run('INSERT INTO chat_history (role, content, created, session_id) VALUES (?, ?, ?, ?)', [role, content, new Date().toISOString(), sessionId]);
  } else {
    db.run('INSERT INTO chat_history (role, content, created) VALUES (?, ?, ?)', [role, content, new Date().toISOString()]);
  }
  await saveDB();

  // Auto-add user messages to knowledge graph (skip AI responses to avoid duplication)
  if (role === 'user') {
    try {
      await graphService.addTranscriptToGraph(content, 'local-user-1');
      console.log('✅ Chat message automatically added to knowledge graph');
    } catch (error) {
      console.error('❌ Failed to add chat message to knowledge graph:', error);
    }
  }
}

export async function getChatHistory() {
  const db = await loadOrCreateDB();
  const res = db.exec('SELECT * FROM chat_history ORDER BY created DESC');
  return res[0]?.values || [];
}

export async function getChatSessions() {
  const db = await loadOrCreateDB();
  
  // Ensure chat_sessions table exists
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id TEXT PRIMARY KEY,
        title TEXT,
        is_favorite BOOLEAN DEFAULT 0,
        is_archived BOOLEAN DEFAULT 0,
        created DATETIME
      )
    `);
  } catch (e) {
    // Table already exists
  }
  
  // Get unique sessions with their message counts and metadata
  const res = db.exec(`
    SELECT 
      ch.session_id,
      MIN(ch.created) as created,
      COUNT(*) as message_count,
      cs.title,
      cs.is_favorite,
      cs.is_archived
    FROM chat_history ch
    LEFT JOIN chat_sessions cs ON ch.session_id = cs.session_id
    WHERE ch.session_id IS NOT NULL
    GROUP BY ch.session_id 
    ORDER BY created DESC
  `);
  
  // For each session, get a preview of the first message
  const sessionsWithPreview = [];
  for (const session of res[0]?.values || []) {
    const previewRes = db.exec('SELECT content FROM chat_history WHERE session_id = ? ORDER BY created ASC LIMIT 1', [session[0]]);
    const preview = previewRes[0]?.values?.[0]?.[0] || '';
    sessionsWithPreview.push([
      session[0], // session_id
      session[1], // created
      session[2], // message_count
      preview,    // preview
      session[3] || null, // title
      session[4] || 0,    // is_favorite
      session[5] || 0     // is_archived
    ]);
  }
  
  return sessionsWithPreview;
}

export async function getChatSessionById(sessionId: string) {
  const db = await loadOrCreateDB();
  const res = db.exec('SELECT * FROM chat_history WHERE session_id = ? ORDER BY created ASC', [sessionId]);
  return res[0]?.values || [];
}

export async function deleteChatSession(sessionId: string) {
  const db = await loadOrCreateDB();
  db.run('DELETE FROM chat_history WHERE session_id = ?', [sessionId]);
  await saveDB();
}

export async function updateChatSessionTitle(sessionId: string, newTitle: string) {
  const db = await loadOrCreateDB();
  // First, ensure the chat_sessions table exists
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id TEXT PRIMARY KEY,
        title TEXT,
        is_favorite BOOLEAN DEFAULT 0,
        is_archived BOOLEAN DEFAULT 0,
        created DATETIME
      )
    `);
  } catch (e) {
    // Table already exists
  }
  
  // Insert or update the session title
  db.run(`
    INSERT OR REPLACE INTO chat_sessions (session_id, title, created) 
    VALUES (?, ?, (SELECT MIN(created) FROM chat_history WHERE session_id = ?))
  `, [sessionId, newTitle, sessionId]);
  
  await saveDB();
}

export async function toggleChatSessionFavorite(sessionId: string) {
  const db = await loadOrCreateDB();
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id TEXT PRIMARY KEY,
        title TEXT,
        is_favorite BOOLEAN DEFAULT 0,
        is_archived BOOLEAN DEFAULT 0,
        created DATETIME
      )
    `);
  } catch (e) {
    // Table already exists
  }
  
  // Toggle favorite status
  db.run(`
    INSERT OR REPLACE INTO chat_sessions (session_id, is_favorite, created) 
    VALUES (?, 
      CASE WHEN (SELECT is_favorite FROM chat_sessions WHERE session_id = ?) = 1 THEN 0 ELSE 1 END,
      (SELECT MIN(created) FROM chat_history WHERE session_id = ?)
    )
  `, [sessionId, sessionId, sessionId]);
  
  await saveDB();
}

export async function toggleChatSessionArchive(sessionId: string) {
  const db = await loadOrCreateDB();
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        session_id TEXT PRIMARY KEY,
        title TEXT,
        is_favorite BOOLEAN DEFAULT 0,
        is_archived BOOLEAN DEFAULT 0,
        created DATETIME
      )
    `);
  } catch (e) {
    // Table already exists
  }
  
  // Toggle archive status
  db.run(`
    INSERT OR REPLACE INTO chat_sessions (session_id, is_archived, created) 
    VALUES (?, 
      CASE WHEN (SELECT is_archived FROM chat_sessions WHERE session_id = ?) = 1 THEN 0 ELSE 1 END,
      (SELECT MIN(created) FROM chat_history WHERE session_id = ?)
    )
  `, [sessionId, sessionId, sessionId]);
  
  await saveDB();
}

// Utility function to clear all data (for testing)
export async function clearAllData() {
  const db = await loadOrCreateDB();
  db.run('DELETE FROM audio_files');
  db.run('DELETE FROM summaries');
  db.run('DELETE FROM chat_history');
  await saveDB();
}

// Generate a simple hash for transcript caching
export function generateTranscriptHash(transcript: string): string {
  let hash = 0;
  if (transcript.length === 0) return hash.toString();
  for (let i = 0; i < transcript.length; i++) {
    const char = transcript.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Generate a topic-based title for chat sessions
export async function generateChatTitle(sessionId: string): Promise<string> {
  const db = await loadOrCreateDB();
  
  // Get the first few messages from the session
  const res = db.exec(`
    SELECT content FROM chat_history 
    WHERE session_id = ? AND role = 'user' 
    ORDER BY created ASC 
    LIMIT 3
  `, [sessionId]);
  
  if (!res[0]?.values || res[0].values.length === 0) {
    return 'New Chat';
  }
  
  // Combine the first few user messages
  const messages = res[0].values.map(row => row[0]).join(' ');
  
  // Extract key topics using simple heuristics
  const topics = extractTopics(messages);
  
  if (topics.length > 0) {
    return topics.slice(0, 2).join(' • ');
  }
  
  // Fallback: use first few words of the first message
  const firstMessage = res[0].values[0][0];
  const words = firstMessage.split(' ').slice(0, 4).join(' ');
  return words.length > 20 ? words.substring(0, 20) + '...' : words;
}

// Extract topics from text using simple heuristics
function extractTopics(text: string): string[] {
  const topics: string[] = [];
  
  // Common topic indicators
  const topicPatterns = [
    /(?:about|discuss|talk|regarding|concerning)\s+([a-zA-Z\s]+?)(?:\?|\.|$)/gi,
    /(?:what|how|why|when|where)\s+(?:is|are|was|were|do|does|did)\s+([a-zA-Z\s]+?)(?:\?|\.|$)/gi,
    /(?:project|feature|task|meeting|budget|deadline|team|client)\s+([a-zA-Z\s]+?)(?:\?|\.|$)/gi,
    /(?:help|assist|support)\s+(?:with|on)\s+([a-zA-Z\s]+?)(?:\?|\.|$)/gi
  ];
  
  for (const pattern of topicPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const topic = match.replace(/^(?:about|discuss|talk|regarding|concerning|what|how|why|when|where|is|are|was|were|do|does|did|project|feature|task|meeting|budget|deadline|team|client|help|assist|support|with|on)\s+/gi, '').trim();
        if (topic.length > 3 && topic.length < 30 && !topics.includes(topic)) {
          topics.push(topic);
        }
      }
    }
  }
  
  // If no patterns found, extract key words
  if (topics.length === 0) {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    const keyWords = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 3);
    
    if (keyWords.length > 0) {
      topics.push(keyWords.join(' '));
    }
  }
  
  return topics;
}

// Search chat sessions with content preview
export async function searchChatSessions(searchTerm: string): Promise<any[]> {
  const db = await loadOrCreateDB();
  
  if (!searchTerm.trim()) {
    return await getChatSessions();
  }
  
  // Search in chat content and return sessions with matching messages
  const res = db.exec(`
    SELECT DISTINCT
      ch.session_id,
      MIN(ch.created) as created,
      COUNT(*) as message_count,
      cs.title,
      cs.is_favorite,
      cs.is_archived,
      GROUP_CONCAT(
        CASE 
          WHEN ch.content LIKE ? THEN ch.content 
          ELSE NULL 
        END, ' | '
      ) as matching_content
    FROM chat_history ch
    LEFT JOIN chat_sessions cs ON ch.session_id = cs.session_id
    WHERE ch.session_id IS NOT NULL 
      AND ch.content LIKE ?
    GROUP BY ch.session_id 
    ORDER BY created DESC
  `, [`%${searchTerm}%`, `%${searchTerm}%`]);
  
  const sessionsWithPreview = [];
  for (const session of res[0]?.values || []) {
    const previewRes = db.exec('SELECT content FROM chat_history WHERE session_id = ? ORDER BY created ASC LIMIT 1', [session[0]]);
    const preview = previewRes[0]?.values?.[0]?.[0] || '';
    sessionsWithPreview.push([
      session[0], // session_id
      session[1], // created
      session[2], // message_count
      preview,    // preview
      session[3] || null, // title
      session[4] || 0,    // is_favorite
      session[5] || 0,    // is_archived
      session[6] || null  // matching_content
    ]);
  }
  
  return sessionsWithPreview;
}

// Function to reset database schema (for fixing migration issues)
export async function resetDatabase() {
  await localforage.removeItem(DB_KEY);
  db = null;
  return await loadOrCreateDB();
}

// Function to force database migration (for fixing schema issues)
export async function migrateDatabase() {
  try {
    const db = await loadOrCreateDB();
    
    // Add missing columns if they don't exist
    const columns = ['transcript_hash', 'transcript'];
    for (const column of columns) {
      try {
        db.run(`ALTER TABLE summaries ADD COLUMN ${column} TEXT`);
        console.log(`Added column: ${column}`);
      } catch (e) {
        console.log(`Column ${column} already exists`);
      }
    }

    try {
      db.run('ALTER TABLE summaries ADD COLUMN title TEXT');
      console.log('Added column: title');
      await saveDB();
    } catch (e) {
      console.log('Column title already exists');
    }

    // After adding the column, populate it for existing rows:
    const res = db.exec('SELECT id, text FROM summaries WHERE title IS NULL OR title = ""');
    if (res[0]?.values?.length) {
      for (const row of res[0].values) {
        const id = row[0];
        const text = row[1];
        let title = 'Untitled Summary';
        try {
          let jsonString = text.trim();
          if (jsonString.startsWith('```json')) {
            jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }
          const parsed = JSON.parse(jsonString);
          if (parsed.title) title = parsed.title;
        } catch {}
        db.run('UPDATE summaries SET title = ? WHERE id = ?', [title, id]);
      }
      await saveDB();
    }
    
    await saveDB();
    return { success: true, message: 'Database migration completed' };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// Get the most recent transcript
export async function getLatestTranscript() {
  const db = await loadOrCreateDB();
  const res = db.exec('SELECT transcript FROM audio_files ORDER BY created DESC LIMIT 1');
  if (res[0] && res[0].values && res[0].values[0]) {
    return res[0].values[0][0] as string;
  }
  return '';
} 
/**
 * 一次性运维脚本：在 TiDB(MySQL) 上创建疝鸡杯表并写入种子题（幂等）。
 * 运行：DATABASE_URL='mysql://...' npx tsx scripts/setup-quiz.ts
 */
import mysql from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import { quizSeed } from '../server/database/seeds/quiz.seed';

const DDL_QUESTIONS = `
CREATE TABLE IF NOT EXISTS quiz_questions (
  id varchar(36) NOT NULL,
  stem text NOT NULL,
  options json,
  correct_option int NOT NULL DEFAULT 0,
  category varchar(20) NOT NULL DEFAULT 'basic',
  difficulty varchar(20) NOT NULL DEFAULT 'medium',
  source_url text,
  source_note varchar(255),
  status varchar(20) NOT NULL DEFAULT 'active',
  submitter_id varchar(36),
  submitter_name varchar(100),
  _created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  _updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY qq_status_idx (status),
  KEY qq_category_idx (category),
  KEY qq_submitter_idx (submitter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const DDL_SCORES = `
CREATE TABLE IF NOT EXISTS quiz_scores (
  id varchar(36) NOT NULL,
  user_id varchar(36),
  user_display_name varchar(100),
  user_avatar_url text,
  mode varchar(20) NOT NULL DEFAULT 'timed',
  score int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  duration_sec int,
  max_streak int,
  opponent_id varchar(36),
  is_win tinyint(1),
  _created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY qs_mode_created_idx (mode, _created_at),
  KEY qs_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL 未设置');

  const conn = await mysql.createConnection({
    uri: url,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });

  await conn.query(DDL_QUESTIONS);
  await conn.query(DDL_SCORES);
  console.log('tables ready');

  const [rows] = await conn.query<mysql.RowDataPacket[]>('SELECT stem FROM quiz_questions');
  const existing = new Set(rows.map((r) => r.stem));

  let inserted = 0;
  for (const q of quizSeed) {
    if (existing.has(q.stem)) continue;
    await conn.query(
      `INSERT INTO quiz_questions
        (id, stem, options, correct_option, category, difficulty, source_url, source_note, status, submitter_id, submitter_name, _created_at, _updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, NULL, NOW(3), NOW(3))`,
      [
        randomUUID(),
        q.stem,
        JSON.stringify(q.options),
        q.answerIndex,
        q.category,
        q.difficulty,
        q.sourceUrl,
        q.sourceNote,
      ],
    );
    inserted += 1;
  }

  const [countRows] = await conn.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS n FROM quiz_questions');
  console.log(`inserted ${inserted}; total questions ${countRows[0].n}`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

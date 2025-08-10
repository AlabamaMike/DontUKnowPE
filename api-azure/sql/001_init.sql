-- Minimal schema for questions (parity with D1, simplified)
CREATE TABLE IF NOT EXISTS categories (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id NVARCHAR(40) PRIMARY KEY,
  category_id INT NULL REFERENCES categories(id),
  kind NVARCHAR(10) NOT NULL, -- 'tf' | 'mc' | 'num'
  text NVARCHAR(400) NOT NULL,
  options_json NVARCHAR(MAX) NULL,
  answer_text NVARCHAR(100) NULL,
  tolerance FLOAT NULL
);

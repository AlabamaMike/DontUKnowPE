-- Seed a few TF questions for local testing
INSERT INTO questions (id, kind, text, answer_text) VALUES
  ('tf1','tf','The sky is blue.','true'),
  ('tf2','tf','2 + 2 equals 5.','false');

INSERT INTO questions (id, kind, text, options_json, answer_text) VALUES
  ('mc1','mc','Which is a prime?', '["4","6","7","8"]','2');

INSERT INTO questions (id, kind, text, answer_text, tolerance) VALUES
  ('num1','num','Pi rounded to 2 decimals?','3.14', 0.01);

-- seed categories
INSERT INTO categories (id, name) VALUES
  ('general', 'General Knowledge'),
  ('pe_tech', 'Private Equity Technology')
ON CONFLICT(id) DO NOTHING;

-- seed sample questions (expand later)
INSERT INTO questions (id, kind, category_id, text, options_json, answer_text, difficulty) VALUES
  ('q_tf_1','tf','general','The capital of Australia is Sydney.', NULL, 'false', 1),
  ('q_tf_2','tf','pe_tech','In a typical LBO, leverage often exceeds 50% of enterprise value.', NULL, 'true', 2),
  ('q_mc_1','mc','general','Which planet is known as the Red Planet?', '["Venus","Mars","Jupiter","Mercury"]', '1', 1),
  ('q_mc_2','mc','pe_tech','Which metric best indicates ARR efficiency?', '["LTV/CAC","Gross Margin","NDR","Churn Rate"]', '2', 2),
  ('q_num_1','num','pe_tech','If ARR is 20 and EV/ARR is 10x, what is EV?', NULL, '200', 1)
ON CONFLICT(id) DO NOTHING;

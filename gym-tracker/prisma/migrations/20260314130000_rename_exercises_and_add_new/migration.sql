-- Rename existing default exercises to canonical names
UPDATE "Exercise" SET name = 'LAT PULLDOWN',     "isCompound" = true  WHERE id = 'default-lat-pull';
UPDATE "Exercise" SET name = 'TRICEPS PUSHDOWN',  "isCompound" = false WHERE id = 'default-triceps-push';
UPDATE "Exercise" SET name = 'CABLE ROW',         "isCompound" = true  WHERE id = 'default-rowing-pull';
UPDATE "Exercise" SET name = 'BICEPS MACHINE',    "isCompound" = false WHERE id = 'default-biceps-curls';
UPDATE "Exercise" SET name = 'PEC DECK',          "isCompound" = false WHERE id = 'default-pec-fly';
UPDATE "Exercise" SET name = 'BACK SQUAT',        "isCompound" = true  WHERE id = 'default-squats';
UPDATE "Exercise" SET name = 'LEG PRESS',         "isCompound" = true  WHERE id = 'default-leg-push';
UPDATE "Exercise" SET name = 'SEATED CURL',       "isCompound" = false WHERE id = 'default-leg-pull';
UPDATE "Exercise" SET name = 'STANDING CALVES',   "isCompound" = false WHERE id = 'default-calf-extension';

-- Set isCompound for exercises that keep their name
UPDATE "Exercise" SET "isCompound" = true  WHERE id = 'default-shoulder-press';
UPDATE "Exercise" SET "isCompound" = true  WHERE id = 'default-chest-press';
UPDATE "Exercise" SET "isCompound" = false WHERE id = 'default-lateral-raise';
UPDATE "Exercise" SET "isCompound" = false WHERE id = 'default-back-extension';
UPDATE "Exercise" SET "isCompound" = true  WHERE id = 'default-pushups';
UPDATE "Exercise" SET "isCompound" = true  WHERE id = 'default-pullups';

-- Insert new Upper Body exercises (skip if already exists)
INSERT INTO "Exercise" (id, name, "muscleGroup", "isDefault", "isBodyweight", "isCompound", "sortOrder")
VALUES
  ('default-bench-press',      'BENCH PRESS',      'UPPER_BODY', true, false, true,  1),
  ('default-incline-press',    'INCLINE PRESS',    'UPPER_BODY', true, false, true,  2),
  ('default-assisted-pullups', 'ASSISTED PULLUPS', 'UPPER_BODY', true, false, true,  5),
  ('default-supported-row',    'SUPPORTED ROW',    'UPPER_BODY', true, false, true,  7),
  ('default-barbell-row',      'BARBELL ROW',      'UPPER_BODY', true, false, true,  8),
  ('default-overhead-press',   'OVERHEAD PRESS',   'UPPER_BODY', true, false, true,  10),
  ('default-assisted-dips',    'ASSISTED DIPS',    'UPPER_BODY', true, false, true,  11)
ON CONFLICT (id) DO NOTHING;

-- Insert new Lower Body exercises
INSERT INTO "Exercise" (id, name, "muscleGroup", "isDefault", "isBodyweight", "isCompound", "sortOrder")
VALUES
  ('default-romanian-dl',      'ROMANIAN DEADLIFT', 'LOWER_BODY', true, false, true,  3),
  ('default-deadlift',         'DEADLIFT',          'LOWER_BODY', true, false, true,  4),
  ('default-hack-squat',       'HACK SQUAT',        'LOWER_BODY', true, false, true,  5),
  ('default-smith-squat',      'SMITH SQUAT',       'LOWER_BODY', true, false, true,  6),
  ('default-bulgarian-squat',  'BULGARIAN SQUAT',   'LOWER_BODY', true, false, true,  7),
  ('default-walking-lunges',   'WALKING LUNGES',    'LOWER_BODY', true, false, true,  8),
  ('default-hip-thrust',       'HIP THRUST',        'LOWER_BODY', true, false, true,  9),
  ('default-leg-extension',    'LEG EXTENSION',     'LOWER_BODY', true, false, false, 10),
  ('default-lying-curl',       'LYING CURL',        'LOWER_BODY', true, false, false, 12),
  ('default-glute-drive',      'GLUTE DRIVE',       'LOWER_BODY', true, false, false, 13)
ON CONFLICT (id) DO NOTHING;

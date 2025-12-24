/*
  # הוספת שעה מתוכננת לתחנות תבנית

  1. שינויים
    - הוספת עמודה `scheduled_time` לטבלת `template_stations`
    - ברירת מחדל: 09:00 (9 בבוקר)
    - סוג: TIME (שעה ללא תאריך)

  2. מטרה
    - לאפשר קביעת שעה ספציפית לכל תחנה בתבנית
    - לשמור על סדר זמני של המשימות עבור העובדים
*/

-- הוספת עמודת שעה מתוכננת לטבלת תחנות התבנית
ALTER TABLE template_stations 
ADD COLUMN IF NOT EXISTS scheduled_time TIME DEFAULT '09:00:00';

-- עדכון כל התחנות הקיימות לשעה ברירת מחדל אם אין להן שעה
UPDATE template_stations 
SET scheduled_time = '09:00:00' 
WHERE scheduled_time IS NULL;
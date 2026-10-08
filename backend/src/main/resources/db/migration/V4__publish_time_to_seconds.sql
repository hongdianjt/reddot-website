ALTER TABLE content_item
  MODIFY COLUMN publish_date DATETIME NULL,
  MODIFY COLUMN published_at TIMESTAMP NULL;

UPDATE content_item
SET publish_date = COALESCE(published_at, publish_date)
WHERE content_type IN ('solutions', 'news')
  AND publish_date IS NOT NULL;

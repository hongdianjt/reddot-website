ALTER TABLE content_item
  ADD COLUMN published_at TIMESTAMP(3) NULL AFTER publish_date,
  ADD INDEX idx_content_publish_time (content_type, publish_date, published_at);

UPDATE content_item
SET published_at = created_at
WHERE enabled = TRUE AND published_at IS NULL;

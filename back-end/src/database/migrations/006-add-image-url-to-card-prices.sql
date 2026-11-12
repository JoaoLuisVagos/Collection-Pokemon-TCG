SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'card_prices'
    AND COLUMN_NAME = 'image_url'
);

SET @migration_sql = IF(
  @column_exists = 0,
  'ALTER TABLE `card_prices` ADD COLUMN `image_url` TEXT NULL',
  'SELECT 1'
);

PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

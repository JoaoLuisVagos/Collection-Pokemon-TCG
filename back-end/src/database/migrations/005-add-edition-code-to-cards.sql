SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cards'
    AND COLUMN_NAME = 'edition_code'
);

SET @migration_sql = IF(
  @column_exists = 0,
  'ALTER TABLE `cards` ADD COLUMN `edition_code` VARCHAR(20) NULL',
  'SELECT 1'
);

PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

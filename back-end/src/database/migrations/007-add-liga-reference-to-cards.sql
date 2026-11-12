SET @columns_to_add = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cards'
    AND COLUMN_NAME IN ('liga_card_name', 'liga_card_number', 'liga_printed_total', 'liga_card_reference')
);

SET @migration_sql = IF(
  @columns_to_add = 0,
  'ALTER TABLE `cards`
     ADD COLUMN `liga_card_name` VARCHAR(255) NULL,
     ADD COLUMN `liga_card_number` VARCHAR(20) NULL,
     ADD COLUMN `liga_printed_total` VARCHAR(20) NULL,
     ADD COLUMN `liga_card_reference` VARCHAR(255) NULL',
  'SELECT 1'
);

PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

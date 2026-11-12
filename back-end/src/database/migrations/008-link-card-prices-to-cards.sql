SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'card_prices'
    AND COLUMN_NAME = 'card_id'
);

SET @migration_sql = IF(
  @column_exists = 0,
  'ALTER TABLE `card_prices` ADD COLUMN `card_id` INT NULL',
  'SELECT 1'
);

PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

UPDATE card_prices AS price
INNER JOIN cards AS card
  ON LOWER(TRIM(price.card_name)) = LOWER(TRIM(card.name_card))
 AND UPPER(price.edition_code) = UPPER(card.edition_code)
SET price.card_id = card.id
WHERE price.card_id IS NULL;

SET @constraint_exists = (
  SELECT COUNT(*)
  FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'card_prices'
    AND CONSTRAINT_NAME = 'fk_card_prices_card'
);

SET @migration_sql = IF(
  @constraint_exists = 0,
  'ALTER TABLE `card_prices`
     ADD CONSTRAINT `fk_card_prices_card`
     FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`)
     ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE migration_statement FROM @migration_sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

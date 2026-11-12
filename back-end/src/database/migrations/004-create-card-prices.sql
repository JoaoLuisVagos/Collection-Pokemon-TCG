
CREATE TABLE IF NOT EXISTS `card_prices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `card_name` VARCHAR(255) NOT NULL,
  `edition_code` VARCHAR(20) NOT NULL,
  `price_min` DECIMAL(10,2),
  `price_avg` DECIMAL(10,2),
  `price_max` DECIMAL(10,2),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_card_edition` (`card_name`, `edition_code`)
);

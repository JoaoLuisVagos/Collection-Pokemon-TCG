CREATE TABLE IF NOT EXISTS `cards` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `tcgdex_id` VARCHAR(80) NOT NULL,
    `name_card` VARCHAR(120) NULL,
    `set_name_card` VARCHAR(120) NULL,
    `rarity_card` VARCHAR(80) NULL,
    `image_card` TEXT NULL,
    `amount__price_card` DOUBLE NULL,
    `price_usd_card` DOUBLE NULL,
    `price_brl_card` DOUBLE NULL,
    `discount_percent_card` DOUBLE NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_cards_tcgdex_id` (`tcgdex_id`)
)
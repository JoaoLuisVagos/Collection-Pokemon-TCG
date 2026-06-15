CREATE TABLE IF NOT EXISTS `cards` (
    `id` INT NOT NULL,
    `tcgdex_id` INT NULL,
    `name_card` VARCHAR(45) NULL,
    `set_name_card` VARCHAR(45) NULL,
    `rarity_card` VARCHAR(45) NULL,
    `image_card` VARCHAR(45) NULL,
    `amount__price_card` DOUBLE NULL,
    PRIMARY KEY (`id`)
)
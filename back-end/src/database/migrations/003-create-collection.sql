CREATE TABLE IF NOT EXISTS `collection` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `card_id` INT NOT NULL,
    `amount_card_collection` INT NULL DEFAULT 1,
    `acquisition_date_card_collection` DATE NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_collection_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_collection_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
)
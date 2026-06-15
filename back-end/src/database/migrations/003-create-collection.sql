CREATE TABLE IF NOT EXISTS `collection` (
    `id` INT NOT NULL,
    `user_id` VARCHAR(45) NOT NULL,
    `card_id` VARCHAR(45) NOT NULL,
    `amount_card_collectiCollectionon` VARCHAR(45) NULL,
    `acquisition_date_card_collection` VARCHAR(45) NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `user_id` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT `card_id` FOREIGN KEY (`id`) REFERENCES `cards` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
)
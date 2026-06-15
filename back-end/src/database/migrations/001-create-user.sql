CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name_user` VARCHAR(120) NULL,
    `email_user` VARCHAR(120) NULL,
    `password_user` VARCHAR(255) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email_user`)
);
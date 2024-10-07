CREATE database user_poc;

USE user_poc;

/*USERS TABLE*/
CREATE TABLE `users` (
  `userid` int NOT NULL AUTO_INCREMENT,
  `firstname` varchar(100) DEFAULT NULL,
  `lastname` varchar(50) DEFAULT NULL,
  `email` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `jwt_token` varchar(255) DEFAULT NULL,
  `secret_key` varchar(255) DEFAULT NULL,
  `role` ENUM('admin', 'user') DEFAULT 'user',
  lastActivity datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, 
  PRIMARY KEY (`userid`),
  UNIQUE KEY `email` (`email`)
);

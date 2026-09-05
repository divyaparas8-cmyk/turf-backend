-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: 127.0.0.1    Database: turf_db
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activity_logs` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` varchar(50) DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `activity_logs_action_idx` (`action`),
  KEY `activity_logs_created_at_idx` (`created_at`),
  KEY `activity_logs_user_id_fkey` (`user_id`),
  CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ad_commissions`
--

DROP TABLE IF EXISTS `ad_commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ad_commissions` (
  `id` varchar(50) NOT NULL,
  `ad_id` varchar(50) NOT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) NOT NULL,
  `booking_id` varchar(50) NOT NULL,
  `booking_amount` decimal(10,2) NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL,
  `commission_amount` decimal(10,2) NOT NULL,
  `owner_amount` decimal(10,2) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `status` enum('PENDING','PAID','SETTLED') NOT NULL DEFAULT 'PENDING',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `ad_commissions_ad_id_idx` (`ad_id`),
  KEY `ad_commissions_status_idx` (`status`),
  KEY `ad_commissions_owner_id_fkey` (`owner_id`),
  KEY `ad_commissions_branch_id_fkey` (`branch_id`),
  CONSTRAINT `ad_commissions_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `advertisements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ad_commissions_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ad_commissions_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_commissions`
--

LOCK TABLES `ad_commissions` WRITE;
/*!40000 ALTER TABLE `ad_commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `ad_commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ad_payments`
--

DROP TABLE IF EXISTS `ad_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ad_payments` (
  `id` varchar(50) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `ad_id` varchar(50) NOT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) NOT NULL,
  `billing_date` date NOT NULL DEFAULT current_timestamp(3),
  `gst_registration` varchar(50) NOT NULL DEFAULT '27AAAAA0000A1Z5',
  `campaign_name` varchar(150) DEFAULT NULL,
  `turf_owner_name` varchar(100) DEFAULT NULL,
  `payment_mode` varchar(50) NOT NULL DEFAULT 'Razorpay Payout',
  `base_amount` decimal(10,2) DEFAULT NULL,
  `gst_amount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL,
  `payout_ref_number` varchar(100) DEFAULT NULL,
  `receipt_pdf_url` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ad_payments_invoice_number_key` (`invoice_number`),
  KEY `ad_payments_ad_id_idx` (`ad_id`),
  KEY `ad_payments_owner_id_idx` (`owner_id`),
  KEY `ad_payments_branch_id_fkey` (`branch_id`),
  CONSTRAINT `ad_payments_ad_id_fkey` FOREIGN KEY (`ad_id`) REFERENCES `advertisements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ad_payments_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ad_payments_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ad_payments`
--

LOCK TABLES `ad_payments` WRITE;
/*!40000 ALTER TABLE `ad_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `ad_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `advertisements`
--

DROP TABLE IF EXISTS `advertisements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `advertisements` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL DEFAULT 'br_001',
  `owner_id` varchar(50) DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `type` enum('GUARANTEED_BOOKING','DISCOUNT_OFFER','IMPRESSION_AD') NOT NULL DEFAULT 'GUARANTEED_BOOKING',
  `status` enum('PENDING','APPROVED','ACTIVE','BOOKING_GENERATED','COMMISSION_PENDING','PAID','COMPLETED','EXPIRED','REJECTED') NOT NULL DEFAULT 'ACTIVE',
  `icon` varchar(10) DEFAULT '?',
  `duration_months` int(11) NOT NULL DEFAULT 1,
  `budget_total` decimal(10,2) NOT NULL DEFAULT 5000.00,
  `daily_budget` decimal(10,2) NOT NULL DEFAULT 500.00,
  `budget_spent` decimal(10,2) NOT NULL DEFAULT 0.00,
  `commission_rate` decimal(5,2) NOT NULL DEFAULT 12.00,
  `commission_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `booking_goal` int(11) NOT NULL DEFAULT 30,
  `avg_slot_price` decimal(10,2) NOT NULL DEFAULT 1500.00,
  `target_radius_km` int(11) NOT NULL DEFAULT 5,
  `estimated_reach` int(11) NOT NULL DEFAULT 12500,
  `revenue` decimal(10,2) NOT NULL DEFAULT 0.00,
  `views` int(11) NOT NULL DEFAULT 0,
  `clicks` int(11) NOT NULL DEFAULT 0,
  `bookings` int(11) NOT NULL DEFAULT 0,
  `ctr` varchar(20) DEFAULT '0%',
  `roi` varchar(20) DEFAULT '0%',
  `cpa` varchar(20) DEFAULT '₹0',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `advertisements_branch_id_fkey` (`branch_id`),
  KEY `advertisements_owner_id_fkey` (`owner_id`),
  CONSTRAINT `advertisements_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `advertisements_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `advertisements`
--

LOCK TABLES `advertisements` WRITE;
/*!40000 ALTER TABLE `advertisements` DISABLE KEYS */;
/*!40000 ALTER TABLE `advertisements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_code` varchar(50) DEFAULT NULL,
  `slot_id` varchar(50) DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `mobile_number` varchar(20) NOT NULL,
  `sport_name` varchar(50) DEFAULT 'Cricket',
  `court_name` varchar(100) DEFAULT 'Turf A',
  `time_slot` varchar(50) DEFAULT '10:00 AM',
  `duty_date` date DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `duration` int(11) NOT NULL DEFAULT 60,
  `check_in_status` enum('PENDING_CHECK_IN','CHECKED_IN','NO_SHOW') NOT NULL DEFAULT 'PENDING_CHECK_IN',
  `checked_in_at` datetime(3) DEFAULT NULL,
  `checked_in_by_staff_id` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bookings_booking_code_key` (`booking_code`),
  KEY `bookings_slot_id_fkey` (`slot_id`),
  KEY `bookings_user_id_fkey` (`user_id`),
  CONSTRAINT `bookings_slot_id_fkey` FOREIGN KEY (`slot_id`) REFERENCES `slots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_media`
--

DROP TABLE IF EXISTS `branch_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branch_media` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `media_type` enum('PHOTO','VIDEO') NOT NULL DEFAULT 'PHOTO',
  `media_url` varchar(255) NOT NULL,
  `is_main_cover` tinyint(1) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `branch_media_branch_id_idx` (`branch_id`),
  CONSTRAINT `branch_media_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_media`
--

LOCK TABLES `branch_media` WRITE;
/*!40000 ALTER TABLE `branch_media` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branch_sports`
--

DROP TABLE IF EXISTS `branch_sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branch_sports` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `sport_id` varchar(50) NOT NULL,
  `regular_price` decimal(10,2) NOT NULL DEFAULT 1000.00,
  `peak_price` decimal(10,2) NOT NULL DEFAULT 1500.00,
  `split_50_50_price` decimal(10,2) NOT NULL DEFAULT 500.00,
  `total_courts` int(11) NOT NULL DEFAULT 2,
  `opening_time` varchar(20) NOT NULL DEFAULT '06:00:00',
  `closing_time` varchar(20) NOT NULL DEFAULT '23:00:00',
  `slot_duration` int(11) NOT NULL DEFAULT 60,
  `umpire_addon_active` tinyint(1) NOT NULL DEFAULT 1,
  `umpire_addon_price` decimal(10,2) NOT NULL DEFAULT 300.00,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `branch_sports_branch_id_sport_id_key` (`branch_id`,`sport_id`),
  KEY `branch_sports_sport_id_fkey` (`sport_id`),
  CONSTRAINT `branch_sports_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `branch_sports_sport_id_fkey` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branch_sports`
--

LOCK TABLES `branch_sports` WRITE;
/*!40000 ALTER TABLE `branch_sports` DISABLE KEYS */;
/*!40000 ALTER TABLE `branch_sports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `branches` (
  `id` varchar(50) NOT NULL,
  `branch_name` varchar(150) NOT NULL,
  `branch_code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `owner_user_id` varchar(50) DEFAULT NULL,
  `subscription_plan_id` varchar(50) DEFAULT 'plan_starter',
  `subscription_price_snapshot` decimal(10,2) DEFAULT NULL,
  `plan_price` decimal(10,2) DEFAULT 0.00,
  `country` varchar(100) DEFAULT 'India',
  `state` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `area` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `full_address` text DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `alternate_mobile` varchar(20) DEFAULT NULL,
  `gst_number` varchar(50) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'Asia/Kolkata',
  `currency` varchar(10) DEFAULT 'INR',
  `logo` varchar(255) DEFAULT NULL,
  `images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`images`)),
  `surface_type` varchar(100) DEFAULT 'TurfPro Synthetic Arena',
  `dimensions_sqft` int(11) DEFAULT 5000,
  `rating` decimal(3,2) NOT NULL DEFAULT 4.50,
  `review_count` int(11) NOT NULL DEFAULT 120,
  `min_price_hourly` decimal(10,2) NOT NULL DEFAULT 700.00,
  `opening_time` varchar(20) NOT NULL DEFAULT '06:00:00',
  `closing_time` varchar(20) NOT NULL DEFAULT '23:00:00',
  `amenities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`amenities`)),
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `sports` text DEFAULT NULL,
  `price_per_hour` decimal(10,2) DEFAULT 1000.00,
  `turf_size` varchar(100) DEFAULT '5,000 Sq.Ft',
  `dimensions` varchar(100) DEFAULT '5,000 Sq.Ft',
  `discount_offer` varchar(255) DEFAULT '20% OFF FIRST MATCH',
  `coupon_code` varchar(100) DEFAULT 'CRICKET20',
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_branch_code_key` (`branch_code`),
  KEY `branches_city_idx` (`city`),
  KEY `branches_status_idx` (`status`),
  KEY `branches_owner_id_fkey` (`owner_id`),
  KEY `branches_owner_user_id_fkey` (`owner_user_id`),
  KEY `branches_subscription_plan_id_fkey` (`subscription_plan_id`),
  CONSTRAINT `branches_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `branches_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `branches_subscription_plan_id_fkey` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES ('br_1787308241625','Indore Strikers Arena','GA-IND-01','Premier synthetic turf venue in Vijay Nagar - Updated via API Test','own_1787307283568_547',NULL,'plan_starter',1000.00,1000.00,'India',NULL,'Indore',NULL,NULL,'Vijay Nagar, Indore',NULL,NULL,'aman@gmail.com','2345234566',NULL,NULL,'Asia/Kolkata','INR',NULL,NULL,'TurfPro Synthetic Arena',5000,4.50,120,700.00,'06:00:00','23:00:00',NULL,'ACTIVE','2026-08-21 16:00:41.631','2026-08-21 16:00:41.631',NULL,1200.00,'5,000 Sq.Ft','5,000 Sq.Ft','20% OFF FIRST MATCH','CRICKET20'),('br_1787309231771','asdas','BR-9863','asfsdfas','own_1787307283568_547',NULL,'plan_pro',3000.00,2499.00,'India','','',NULL,'','',NULL,NULL,'asf@gmail.com','12221122','','','Asia/Kolkata','INR','','[]','TurfPro Synthetic Arena',5000,4.50,120,700.00,'06:00 AM','11:00 PM','[\"Floodlights\",\"Parking\",\"Washroom\"]','ACTIVE','2026-08-21 16:17:11.796','2026-08-21 16:17:11.796',NULL,1000.00,'5,000 Sq.Ft','5,000 Sq.Ft','20% OFF FIRST MATCH','CRICKET20'),('br_1787309376260','kkkkkkkkkkkkkk','BR-4193','asdfghjk','own_1787307283568_547',NULL,'plan_starter',1000.00,1000.00,'India','','Indore',NULL,'','asdfghj',NULL,NULL,'aa@gmail.com','1234567890-','','','Asia/Kolkata','INR','','[]','TurfPro Synthetic Arena',5000,4.50,120,700.00,'06:00 AM','11:00 PM','[\"Floodlights\",\"Parking\",\"Washroom\"]','ACTIVE','2026-08-21 16:19:36.271','2026-08-21 16:19:36.271','[\"Cricket\",\"Football\"]',1800.00,'5,000 Sq.Ft','5,000 Sq.Ft','20% OFF FIRST MATCH','CRICKET20'),('br_1787311865004','test final','BR-1371','fiji','own_1787307283568_547',NULL,'plan_pro',3000.00,2499.00,'India','','',NULL,'452010','',NULL,NULL,'abc@gmail.com','471458141','','','Asia/Kolkata','INR','','[]','TurfPro Synthetic Arena',5000,4.50,120,700.00,'06:00 AM','11:00 PM','[\"Floodlights\",\"Parking\",\"Washroom\"]','ACTIVE','2026-08-21 17:01:05.034','2026-08-21 17:01:05.034',NULL,1000.00,'5,000 Sq.Ft','5,000 Sq.Ft','20% OFF FIRST MATCH','CRICKET20'),('br_1787390095724_879','xsadas','BR-3888',NULL,'own_1787390095601_806',NULL,'plan_pro',NULL,0.00,'India',NULL,'sadas',NULL,'dsafa','Indore, MP',NULL,NULL,'rahul@gmail.com','12222222',NULL,NULL,'Asia/Kolkata','INR',NULL,NULL,'TurfPro Synthetic Arena',5000,4.50,120,700.00,'06:00:00','23:00:00',NULL,'ACTIVE','2026-08-22 14:44:55.726','2026-08-22 14:44:55.726',NULL,1000.00,'5,000 Sq.Ft','5,000 Sq.Ft','20% OFF FIRST MATCH','CRICKET20'),('br_1787390680119_765','cscas','BR-5409','','own_1787390680100_242',NULL,'plan_starter',NULL,0.00,'India','','afsdsad',NULL,'32432434','Indore, MP',NULL,NULL,'amul@gmail.com','11111111112','','','Asia/Kolkata','INR','','[]','TurfPro Synthetic Arena',5000,4.50,120,700.00,'06:00:00','23:00:00','[\"Floodlights\",\"Parking\",\"Washroom\"]','ACTIVE','2026-08-22 14:54:40.121','2026-08-22 14:54:40.121','[\"Cricket\",\"Football\"]',1500.00,'6,000 Sq.Ft','5,000 Sq.Ft','free khel lo','CRICKET20');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `club_players`
--

DROP TABLE IF EXISTS `club_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `club_players` (
  `id` varchar(50) NOT NULL,
  `team_id` varchar(50) DEFAULT NULL,
  `player_name` varchar(100) NOT NULL,
  `sport` varchar(50) NOT NULL,
  `skill_class` varchar(50) NOT NULL DEFAULT 'Advanced',
  `matches_played` int(11) NOT NULL DEFAULT 0,
  `rating_score` decimal(3,1) NOT NULL DEFAULT 4.5,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `club_players_team_id_fkey` (`team_id`),
  CONSTRAINT `club_players_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `club_teams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `club_players`
--

LOCK TABLES `club_players` WRITE;
/*!40000 ALTER TABLE `club_players` DISABLE KEYS */;
/*!40000 ALTER TABLE `club_players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `club_teams`
--

DROP TABLE IF EXISTS `club_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `club_teams` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `team_name` varchar(100) NOT NULL,
  `sport` varchar(50) NOT NULL,
  `roster_count` int(11) NOT NULL DEFAULT 11,
  `rank` varchar(20) DEFAULT '#1',
  `wins` int(11) NOT NULL DEFAULT 0,
  `losses` int(11) NOT NULL DEFAULT 0,
  `draws` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `club_teams_branch_id_fkey` (`branch_id`),
  CONSTRAINT `club_teams_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `club_teams`
--

LOCK TABLES `club_teams` WRITE;
/*!40000 ALTER TABLE `club_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `club_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `commissions`
--

DROP TABLE IF EXISTS `commissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `commissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` varchar(50) NOT NULL,
  `ad_id` varchar(50) DEFAULT 'AD-1001',
  `ad_name` varchar(150) NOT NULL,
  `turf_name` varchar(100) DEFAULT 'Champions Turf Arena',
  `booking_amount` int(11) NOT NULL,
  `commission_rate` int(11) DEFAULT 12,
  `commission_amount` int(11) NOT NULL,
  `owner_amount` int(11) NOT NULL,
  `invoice_no` varchar(50) NOT NULL,
  `payment_status` enum('Pending','Paid') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  UNIQUE KEY `invoice_no` (`invoice_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `commissions`
--

LOCK TABLES `commissions` WRITE;
/*!40000 ALTER TABLE `commissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `commissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contact_messages`
--

DROP TABLE IF EXISTS `contact_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contact_messages` (
  `id` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `subject` varchar(150) DEFAULT NULL,
  `message` text NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'UNREAD',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contact_messages`
--

LOCK TABLES `contact_messages` WRITE;
/*!40000 ALTER TABLE `contact_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `contact_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `corporate_bookings`
--

DROP TABLE IF EXISTS `corporate_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `corporate_bookings` (
  `id` varchar(50) NOT NULL,
  `company_name` varchar(150) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL DEFAULT 'Corporate Tournament',
  `city` varchar(100) NOT NULL DEFAULT 'Indore',
  `preferred_turf_id` varchar(50) DEFAULT NULL,
  `estimated_players` varchar(50) NOT NULL DEFAULT '40-50 Players',
  `budget` varchar(100) NOT NULL DEFAULT '₹60,000 - ₹1,20,000',
  `event_date` date DEFAULT NULL,
  `time_slot` varchar(150) DEFAULT 'Full Day Arena Booking (08:00 AM - 08:00 PM)',
  `payment_terms` enum('GST_INVOICE_30_DAY_NET','SPLIT_50_ADVANCE_50_POST','CORPORATE_CARD','UPI_COMPANY_RAZORPAY') NOT NULL DEFAULT 'GST_INVOICE_30_DAY_NET',
  `status` enum('NEW','CONTACTED','PROPOSAL_SENT','NEGOTIATING','CONFIRMED','REJECTED','COMPLETED') NOT NULL DEFAULT 'NEW',
  `quoted_price` decimal(10,2) DEFAULT NULL,
  `quote_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`quote_data`)),
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `corporate_bookings_preferred_turf_id_fkey` (`preferred_turf_id`),
  CONSTRAINT `corporate_bookings_preferred_turf_id_fkey` FOREIGN KEY (`preferred_turf_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `corporate_bookings`
--

LOCK TABLES `corporate_bookings` WRITE;
/*!40000 ALTER TABLE `corporate_bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `corporate_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `crm_leads`
--

DROP TABLE IF EXISTS `crm_leads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `crm_leads` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `contact_name` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `category` enum('CAPTAIN_TEAM','PLAYER','UMPIRE','ORGANIZER','CORPORATE') NOT NULL DEFAULT 'CAPTAIN_TEAM',
  `team_name` varchar(100) DEFAULT NULL,
  `slot_preference` varchar(150) DEFAULT NULL,
  `preferred_sport` varchar(50) DEFAULT NULL,
  `status` enum('NEW','HOT_LEAD','CONTACTED','CORPORATE_PROPOSAL','ACTIVE','INACTIVE') NOT NULL DEFAULT 'NEW',
  `notes` text DEFAULT NULL,
  `broadcast_count` int(11) NOT NULL DEFAULT 0,
  `last_broadcast_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `crm_leads_branch_id_idx` (`branch_id`),
  KEY `crm_leads_category_idx` (`category`),
  KEY `crm_leads_status_idx` (`status`),
  CONSTRAINT `crm_leads_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `crm_leads`
--

LOCK TABLES `crm_leads` WRITE;
/*!40000 ALTER TABLE `crm_leads` DISABLE KEYS */;
/*!40000 ALTER TABLE `crm_leads` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discount_offers`
--

DROP TABLE IF EXISTS `discount_offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `discount_offers` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('PERCENTAGE','FLAT_AMOUNT') NOT NULL DEFAULT 'PERCENTAGE',
  `promo_code` varchar(50) DEFAULT NULL,
  `banner` varchar(255) DEFAULT NULL,
  `thumbnail` varchar(255) DEFAULT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `minimum_booking_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `maximum_discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `applicable_slot_types` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`applicable_slot_types`)),
  `applicable_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`applicable_days`)),
  `applicable_sports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`applicable_sports`)),
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `start_time` varchar(20) DEFAULT '00:00:00',
  `end_time` varchar(20) DEFAULT '23:59:59',
  `usage_limit` int(11) NOT NULL DEFAULT 200,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `per_user_limit` int(11) NOT NULL DEFAULT 1,
  `first_booking_only` tinyint(1) NOT NULL DEFAULT 0,
  `stackable` tinyint(1) NOT NULL DEFAULT 0,
  `auto_apply` tinyint(1) NOT NULL DEFAULT 0,
  `target_radius_km` decimal(5,2) NOT NULL DEFAULT 5.00,
  `location_area` varchar(100) DEFAULT NULL,
  `customer_type` varchar(50) NOT NULL DEFAULT 'All Users',
  `gender_segment` varchar(50) NOT NULL DEFAULT 'All Genders',
  `age_group` varchar(50) NOT NULL DEFAULT 'All Ages',
  `estimated_audience` int(11) NOT NULL DEFAULT 12500,
  `status` enum('DRAFT','ACTIVE','SCHEDULED','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `created_by` varchar(50) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `discount_offers_branch_id_status_idx` (`branch_id`,`status`),
  KEY `discount_offers_promo_code_idx` (`promo_code`),
  KEY `discount_offers_owner_id_fkey` (`owner_id`),
  CONSTRAINT `discount_offers_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `discount_offers_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discount_offers`
--

LOCK TABLES `discount_offers` WRITE;
/*!40000 ALTER TABLE `discount_offers` DISABLE KEYS */;
/*!40000 ALTER TABLE `discount_offers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disputes`
--

DROP TABLE IF EXISTS `disputes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `disputes` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `match_id` varchar(50) DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `type` enum('ESCROW','REFUND','MATCH_RESULT','DAMAGE','CANCELLATION') NOT NULL DEFAULT 'ESCROW',
  `amount` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `status` enum('OPEN','IN_REVIEW','RESOLVED','REJECTED') NOT NULL DEFAULT 'OPEN',
  `resolution_notes` text DEFAULT NULL,
  `resolved_by_user_id` varchar(50) DEFAULT NULL,
  `refund_to_wallet` tinyint(1) NOT NULL DEFAULT 0,
  `resolution_date` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `disputes_status_idx` (`status`),
  KEY `disputes_user_id_fkey` (`user_id`),
  KEY `disputes_booking_id_fkey` (`booking_id`),
  KEY `disputes_match_id_fkey` (`match_id`),
  KEY `disputes_resolved_by_user_id_fkey` (`resolved_by_user_id`),
  CONSTRAINT `disputes_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `disputes_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `disputes_resolved_by_user_id_fkey` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `disputes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disputes`
--

LOCK TABLES `disputes` WRITE;
/*!40000 ALTER TABLE `disputes` DISABLE KEYS */;
/*!40000 ALTER TABLE `disputes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment_rentals`
--

DROP TABLE IF EXISTS `equipment_rentals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `equipment_rentals` (
  `id` varchar(50) NOT NULL,
  `rental_code` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `inventory_id` varchar(50) DEFAULT NULL,
  `item_name` varchar(100) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `rental_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `deposit_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `issued_by_staff_id` varchar(50) DEFAULT NULL,
  `issued_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `due_return_at` datetime(3) DEFAULT NULL,
  `returned_at` datetime(3) DEFAULT NULL,
  `return_condition` varchar(50) DEFAULT 'Good',
  `status` enum('RENTED','RETURNED','DAMAGED','LOST','OVERDUE') NOT NULL DEFAULT 'RENTED',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `equipment_rentals_rental_code_key` (`rental_code`),
  KEY `equipment_rentals_branch_id_status_idx` (`branch_id`,`status`),
  KEY `equipment_rentals_inventory_id_fkey` (`inventory_id`),
  CONSTRAINT `equipment_rentals_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `equipment_rentals_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment_rentals`
--

LOCK TABLES `equipment_rentals` WRITE;
/*!40000 ALTER TABLE `equipment_rentals` DISABLE KEYS */;
/*!40000 ALTER TABLE `equipment_rentals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financial_ledger`
--

DROP TABLE IF EXISTS `financial_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `financial_ledger` (
  `id` varchar(50) NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `payment_id` varchar(50) DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `type` enum('BOOKING_PAYMENT','PLAYER_SHARE_PAYMENT','TEAM_SHARE_PAYMENT','DARE_AUTHORIZATION','DARE_CAPTURE','SECURITY_DEPOSIT','DEPOSIT_RELEASE','CONVENIENCE_FEE','PLATFORM_COMMISSION','OWNER_PAYABLE','OWNER_PAYOUT','REFUND','PARTIAL_REFUND','OVERPAYMENT','REVERSAL','ADJUSTMENT','DISPUTE_HOLD') NOT NULL,
  `direction` enum('CREDIT','DEBIT') NOT NULL,
  `amount` int(11) NOT NULL,
  `gateway_reference` varchar(100) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ledger_match` (`match_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financial_ledger`
--

LOCK TABLES `financial_ledger` WRITE;
/*!40000 ALTER TABLE `financial_ledger` DISABLE KEYS */;
/*!40000 ALTER TABLE `financial_ledger` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fixtures`
--

DROP TABLE IF EXISTS `fixtures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `fixtures` (
  `id` varchar(50) NOT NULL,
  `tournament_id` varchar(50) NOT NULL,
  `round_name` varchar(50) NOT NULL,
  `match_number` int(11) NOT NULL,
  `team_a_id` varchar(50) NOT NULL,
  `team_b_id` varchar(50) NOT NULL,
  `team_a_score` varchar(50) DEFAULT NULL,
  `team_b_score` varchar(50) DEFAULT NULL,
  `team_a_overs` varchar(20) DEFAULT NULL,
  `team_b_overs` varchar(20) DEFAULT NULL,
  `match_summary` varchar(150) DEFAULT NULL,
  `ground_court_name` varchar(100) DEFAULT 'Ground 1 - Main Turf',
  `yellow_cards_team_a` int(11) NOT NULL DEFAULT 0,
  `red_cards_team_a` int(11) NOT NULL DEFAULT 0,
  `yellow_cards_team_b` int(11) NOT NULL DEFAULT 0,
  `red_cards_team_b` int(11) NOT NULL DEFAULT 0,
  `winner_id` varchar(50) DEFAULT NULL,
  `verification_tier` enum('SELF_ENTRY','CAPTAIN_HANDSHAKE','PAID_UMPIRE','OFFICIAL_TOURNAMENT') NOT NULL DEFAULT 'OFFICIAL_TOURNAMENT',
  `match_date` date NOT NULL,
  `match_time` varchar(20) NOT NULL,
  `status` enum('SCHEDULED','LIVE','COMPLETED','ABANDONED') NOT NULL DEFAULT 'SCHEDULED',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `fixtures_tournament_id_fkey` (`tournament_id`),
  KEY `fixtures_team_a_id_fkey` (`team_a_id`),
  KEY `fixtures_team_b_id_fkey` (`team_b_id`),
  KEY `fixtures_winner_id_fkey` (`winner_id`),
  CONSTRAINT `fixtures_team_a_id_fkey` FOREIGN KEY (`team_a_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fixtures_team_b_id_fkey` FOREIGN KEY (`team_b_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fixtures_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fixtures_winner_id_fkey` FOREIGN KEY (`winner_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fixtures`
--

LOCK TABLES `fixtures` WRITE;
/*!40000 ALTER TABLE `fixtures` DISABLE KEYS */;
/*!40000 ALTER TABLE `fixtures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guest_bookings`
--

DROP TABLE IF EXISTS `guest_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `guest_bookings` (
  `id` varchar(50) NOT NULL,
  `sport` varchar(50) NOT NULL,
  `venue` varchar(150) NOT NULL,
  `date` date NOT NULL,
  `time` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Confirmed',
  `customer_name` varchar(100) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guest_bookings`
--

LOCK TABLES `guest_bookings` WRITE;
/*!40000 ALTER TABLE `guest_bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `guest_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `holidays`
--

DROP TABLE IF EXISTS `holidays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `holidays` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `holiday_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `is_full_day` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `holidays_branch_id_fkey` (`branch_id`),
  CONSTRAINT `holidays_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `holidays`
--

LOCK TABLES `holidays` WRITE;
/*!40000 ALTER TABLE `holidays` DISABLE KEYS */;
/*!40000 ALTER TABLE `holidays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `category_class` enum('EQUIPMENT','CONSUMABLE','SAFETY') NOT NULL DEFAULT 'EQUIPMENT',
  `category` varchar(100) DEFAULT 'Equipment',
  `stock_quantity` int(11) NOT NULL DEFAULT 0,
  `min_threshold` int(11) NOT NULL DEFAULT 5,
  `unit_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `asset_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `condition` varchar(50) DEFAULT 'Good',
  `status` enum('IN_STOCK','LOW_STOCK','OUT_OF_STOCK') NOT NULL DEFAULT 'IN_STOCK',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `inventory_branch_id_fkey` (`branch_id`),
  CONSTRAINT `inventory_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory`
--

LOCK TABLES `inventory` WRITE;
/*!40000 ALTER TABLE `inventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leaderboards`
--

DROP TABLE IF EXISTS `leaderboards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `leaderboards` (
  `id` varchar(50) NOT NULL,
  `tournament_id` varchar(50) NOT NULL,
  `team_id` varchar(50) NOT NULL,
  `matches_played` int(11) NOT NULL DEFAULT 0,
  `matches_won` int(11) NOT NULL DEFAULT 0,
  `matches_lost` int(11) NOT NULL DEFAULT 0,
  `matches_tied` int(11) NOT NULL DEFAULT 0,
  `points` int(11) NOT NULL DEFAULT 0,
  `net_run_rate` decimal(5,3) DEFAULT 0.000,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `leaderboards_tournament_id_team_id_key` (`tournament_id`,`team_id`),
  KEY `leaderboards_team_id_fkey` (`team_id`),
  CONSTRAINT `leaderboards_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `leaderboards_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leaderboards`
--

LOCK TABLES `leaderboards` WRITE;
/*!40000 ALTER TABLE `leaderboards` DISABLE KEYS */;
/*!40000 ALTER TABLE `leaderboards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `live_match_sessions`
--

DROP TABLE IF EXISTS `live_match_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `live_match_sessions` (
  `id` varchar(100) NOT NULL,
  `match_id` varchar(50) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'valid',
  `device_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`device_info`)),
  `match_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`match_snapshot`)),
  `last_synced_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `live_match_sessions_match_id_fkey` (`match_id`),
  CONSTRAINT `live_match_sessions_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `live_match_sessions`
--

LOCK TABLES `live_match_sessions` WRITE;
/*!40000 ALTER TABLE `live_match_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `live_match_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_tasks`
--

DROP TABLE IF EXISTS `maintenance_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maintenance_tasks` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `issue_description` varchar(255) NOT NULL,
  `turf_area` varchar(100) NOT NULL DEFAULT 'Turf A Field',
  `assigned_specialist` varchar(100) NOT NULL DEFAULT 'Staff Team',
  `priority_level` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  `target_deadline` date DEFAULT NULL,
  `status` enum('OPEN','IN_PROGRESS','SCHEDULED','COMPLETED') NOT NULL DEFAULT 'OPEN',
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `maintenance_tasks_branch_id_status_idx` (`branch_id`,`status`),
  CONSTRAINT `maintenance_tasks_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_tasks`
--

LOCK TABLES `maintenance_tasks` WRITE;
/*!40000 ALTER TABLE `maintenance_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_tickets`
--

DROP TABLE IF EXISTS `maintenance_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `maintenance_tickets` (
  `id` varchar(50) NOT NULL,
  `asset_name` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT 'Equipment',
  `issue_description` text NOT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  `cost` int(11) DEFAULT 0,
  `status` enum('PENDING','IN_PROGRESS','RESOLVED') DEFAULT 'PENDING',
  `assigned_to` varchar(100) DEFAULT 'Unassigned',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_tickets`
--

LOCK TABLES `maintenance_tickets` WRITE;
/*!40000 ALTER TABLE `maintenance_tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `maintenance_tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_audit_logs`
--

DROP TABLE IF EXISTS `match_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_audit_logs` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `actor_id` varchar(50) DEFAULT 'SYSTEM',
  `action` varchar(100) NOT NULL,
  `before_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before_state`)),
  `after_state` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_state`)),
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_match` (`match_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_audit_logs`
--

LOCK TABLES `match_audit_logs` WRITE;
/*!40000 ALTER TABLE `match_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_handshakes`
--

DROP TABLE IF EXISTS `match_handshakes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_handshakes` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `certificate_code` varchar(50) DEFAULT NULL,
  `captain_a_approved` tinyint(1) NOT NULL DEFAULT 0,
  `captain_b_approved` tinyint(1) NOT NULL DEFAULT 0,
  `umpire_approved` tinyint(1) NOT NULL DEFAULT 0,
  `verification_tier` enum('SELF_ENTRY','CAPTAIN_HANDSHAKE','PAID_UMPIRE','OFFICIAL_TOURNAMENT') NOT NULL DEFAULT 'PAID_UMPIRE',
  `match_result_text` varchar(200) DEFAULT NULL,
  `first_innings_score` varchar(50) DEFAULT NULL,
  `second_innings_score` varchar(50) DEFAULT NULL,
  `mvp_player_name` varchar(100) DEFAULT NULL,
  `mvp_stats` varchar(150) DEFAULT NULL,
  `mvp_rank_points` int(11) NOT NULL DEFAULT 12,
  `scorer_name` varchar(100) DEFAULT NULL,
  `first_innings_batting_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`first_innings_batting_json`)),
  `second_innings_batting_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`second_innings_batting_json`)),
  `bowling_figures_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bowling_figures_json`)),
  `score_data_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`score_data_json`)),
  `confirmation_deadline` datetime(3) DEFAULT NULL,
  `hours_remaining` int(11) DEFAULT 36,
  `dispute_raised` tinyint(1) NOT NULL DEFAULT 0,
  `dispute_reason` text DEFAULT NULL,
  `is_ratified` tinyint(1) NOT NULL DEFAULT 0,
  `verified_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_handshakes_match_id_key` (`match_id`),
  UNIQUE KEY `match_handshakes_certificate_code_key` (`certificate_code`),
  CONSTRAINT `match_handshakes_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_handshakes`
--

LOCK TABLES `match_handshakes` WRITE;
/*!40000 ALTER TABLE `match_handshakes` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_handshakes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_invites`
--

DROP TABLE IF EXISTS `match_invites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_invites` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `team_side` enum('A','B') NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `recipient` varchar(100) DEFAULT NULL,
  `expected_amount` int(11) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('SENT','VIEWED','ACCEPTED','PAID','DECLINED','EXPIRED','REVOKED') DEFAULT 'SENT',
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_match_invite` (`match_id`,`team_side`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_invites`
--

LOCK TABLES `match_invites` WRITE;
/*!40000 ALTER TABLE `match_invites` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_invites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_payments`
--

DROP TABLE IF EXISTS `match_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_payments` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `team_side` varchar(10) DEFAULT 'TEAM_A',
  `player_name` varchar(100) DEFAULT 'Player',
  `player_phone` varchar(20) DEFAULT '',
  `amount` decimal(10,2) NOT NULL,
  `payment_mode` varchar(50) DEFAULT 'FULL_PAY',
  `payment_status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'PENDING',
  `gateway_ref` varchar(100) DEFAULT NULL,
  `upi_transaction_id` varchar(100) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `match_payments_match_id_payment_status_idx` (`match_id`,`payment_status`),
  KEY `match_payments_user_id_fkey` (`user_id`),
  CONSTRAINT `match_payments_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `match_payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_payments`
--

LOCK TABLES `match_payments` WRITE;
/*!40000 ALTER TABLE `match_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_players`
--

DROP TABLE IF EXISTS `match_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_players` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `team_side` enum('A','B') NOT NULL,
  `player_name` varchar(100) DEFAULT NULL,
  `player_phone` varchar(20) DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `share_amount` int(11) NOT NULL,
  `payment_status` enum('CREATED','PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELLED','REFUND_PENDING','REFUNDED') DEFAULT 'CREATED',
  `token_hash` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_match_player` (`match_id`,`team_side`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_players`
--

LOCK TABLES `match_players` WRITE;
/*!40000 ALTER TABLE `match_players` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_results`
--

DROP TABLE IF EXISTS `match_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_results` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `team_a_score_captain_a` int(11) DEFAULT NULL,
  `team_b_score_captain_a` int(11) DEFAULT NULL,
  `team_a_score_captain_b` int(11) DEFAULT NULL,
  `team_b_score_captain_b` int(11) DEFAULT NULL,
  `outcome` enum('TEAM_A_WIN','TEAM_B_WIN','DRAW','DISPUTED') DEFAULT NULL,
  `status` enum('SUBMITTED','MATCHED','DISPUTED','RESOLVED') DEFAULT 'SUBMITTED',
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_id` (`match_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_results`
--

LOCK TABLES `match_results` WRITE;
/*!40000 ALTER TABLE `match_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_scores`
--

DROP TABLE IF EXISTS `match_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_scores` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `team_id` varchar(50) NOT NULL,
  `points_or_goals` int(11) DEFAULT 0,
  `overs_or_minutes` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_scores`
--

LOCK TABLES `match_scores` WRITE;
/*!40000 ALTER TABLE `match_scores` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_settlements`
--

DROP TABLE IF EXISTS `match_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_settlements` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `gross_amount` int(11) NOT NULL,
  `commission_rate` decimal(5,2) DEFAULT 10.00,
  `platform_commission` int(11) NOT NULL,
  `owner_net_amount` int(11) NOT NULL,
  `payout_status` enum('PAYOUT_NOT_READY','PAYOUT_READY','PAYOUT_PROCESSING','PAYOUT_PAID','PAYOUT_FAILED','PAYOUT_ON_HOLD') DEFAULT 'PAYOUT_NOT_READY',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_id` (`match_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_settlements`
--

LOCK TABLES `match_settlements` WRITE;
/*!40000 ALTER TABLE `match_settlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `match_teams`
--

DROP TABLE IF EXISTS `match_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `match_teams` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `team_side` varchar(10) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `captain_name` varchar(100) DEFAULT NULL,
  `captain_phone` varchar(20) DEFAULT NULL,
  `paid_player_count` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `match_teams_match_id_fkey` (`match_id`),
  CONSTRAINT `match_teams_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `match_teams`
--

LOCK TABLES `match_teams` WRITE;
/*!40000 ALTER TABLE `match_teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `match_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `matches` (
  `id` varchar(50) NOT NULL,
  `slot_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `sport_id` varchar(50) DEFAULT NULL,
  `captain_a_id` varchar(50) NOT NULL,
  `captain_b_id` varchar(50) DEFAULT NULL,
  `team_a_name` varchar(100) NOT NULL DEFAULT 'Team A Strikers',
  `team_b_name` varchar(100) NOT NULL DEFAULT 'Open Challenge',
  `payment_mode` enum('FULL_PAY','SPLIT_50_50','PER_PLAYER','DARE_TO_PLAY') NOT NULL DEFAULT 'FULL_PAY',
  `match_status` enum('SLOT_HELD','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','DISPUTED','EXPIRED') NOT NULL DEFAULT 'SLOT_HELD',
  `total_amount` decimal(10,2) NOT NULL,
  `team_a_share` decimal(10,2) NOT NULL DEFAULT 0.00,
  `team_b_share` decimal(10,2) NOT NULL DEFAULT 0.00,
  `per_player_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `opponent_payment_deadline` datetime(3) DEFAULT NULL,
  `dare_strategy` varchar(50) DEFAULT 'SECURED_PREPAYMENT',
  `financial_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`financial_snapshot`)),
  `commission_rate_snapshot` decimal(5,2) DEFAULT NULL,
  `plan_id_snapshot` varchar(50) DEFAULT NULL,
  `cancellation_policy_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`cancellation_policy_snapshot`)),
  `has_umpire_assigned` tinyint(1) NOT NULL DEFAULT 0,
  `umpire_addon_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `team_a_score` int(11) DEFAULT NULL,
  `team_b_score` int(11) DEFAULT NULL,
  `winner_team_side` varchar(20) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `matches_branch_id_match_status_idx` (`branch_id`,`match_status`),
  KEY `matches_slot_id_fkey` (`slot_id`),
  KEY `matches_sport_id_fkey` (`sport_id`),
  KEY `matches_captain_a_id_fkey` (`captain_a_id`),
  KEY `matches_captain_b_id_fkey` (`captain_b_id`),
  CONSTRAINT `matches_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `matches_captain_a_id_fkey` FOREIGN KEY (`captain_a_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `matches_captain_b_id_fkey` FOREIGN KEY (`captain_b_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `matches_slot_id_fkey` FOREIGN KEY (`slot_id`) REFERENCES `slots` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `matches_sport_id_fkey` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offer_earning_alerts`
--

DROP TABLE IF EXISTS `offer_earning_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `offer_earning_alerts` (
  `id` varchar(50) NOT NULL,
  `code` varchar(50) NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'Discount Voucher',
  `payout_amount` decimal(10,2) DEFAULT NULL,
  `badge_text` varchar(50) DEFAULT 'Verified Offer',
  `cta_text` varchar(100) NOT NULL DEFAULT 'Claim Offer',
  `cta_link` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `offer_earning_alerts_code_key` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offer_earning_alerts`
--

LOCK TABLES `offer_earning_alerts` WRITE;
/*!40000 ALTER TABLE `offer_earning_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `offer_earning_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `owner_subscriptions`
--

DROP TABLE IF EXISTS `owner_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `owner_subscriptions` (
  `id` varchar(50) NOT NULL,
  `owner_id` varchar(50) DEFAULT NULL,
  `plan_id` varchar(50) DEFAULT NULL,
  `billing_cycle` enum('MONTHLY','YEARLY') NOT NULL DEFAULT 'MONTHLY',
  `status` enum('ACTIVE','INACTIVE','DRAFT') NOT NULL DEFAULT 'ACTIVE',
  `start_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `end_date` datetime(3) DEFAULT NULL,
  `auto_renew` tinyint(1) NOT NULL DEFAULT 1,
  `last_payment_id` varchar(50) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `plan_name` varchar(100) DEFAULT 'Starter Plan',
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `payment_method` varchar(50) DEFAULT 'ONLINE',
  `transaction_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `owner_subscriptions_owner_id_idx` (`owner_id`),
  KEY `owner_subscriptions_status_idx` (`status`),
  KEY `owner_subscriptions_plan_id_fkey` (`plan_id`),
  CONSTRAINT `owner_subscriptions_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `owner_subscriptions_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `owner_subscriptions`
--

LOCK TABLES `owner_subscriptions` WRITE;
/*!40000 ALTER TABLE `owner_subscriptions` DISABLE KEYS */;
INSERT INTO `owner_subscriptions` VALUES ('sub_1787308723933','own_1787307283568_547','plan_starter','MONTHLY','ACTIVE','2026-08-21 16:08:43.000','2026-09-21 16:08:43.000',1,NULL,'2026-08-21 16:08:43.937','2026-08-21 16:08:43.937','Starter Plan',0.00,'COMPLETED','ONLINE',NULL),('sub_1787389221356','own_1787307283568_547','plan_pro','MONTHLY','ACTIVE','2026-08-22 14:30:21.356','2026-09-22 14:30:21.356',1,NULL,'2026-08-22 14:30:21.358','2026-08-22 14:30:21.358','Professional Plan',3000.00,'COMPLETED','UPI','TXN_1787389221356'),('sub_1787390095838','own_1787390095601_806','plan_pro','MONTHLY','ACTIVE','2026-08-22 14:44:55.840','2026-09-22 14:44:55.840',1,NULL,'2026-08-22 14:44:55.850','2026-08-22 14:44:55.850','Professional Plan',3000.00,'COMPLETED','UPI QR Code (GPAY)','TXN_1787390095839'),('sub_1787390122536','own_1787307283568_547','plan_pro','MONTHLY','ACTIVE','2026-08-22 14:45:22.536','2026-09-22 14:45:22.536',1,NULL,'2026-08-22 14:45:22.537','2026-08-22 14:45:22.537','Professional Plan',3000.00,'COMPLETED','UPI (SUB-89745079)','TXN_1787390122536');
/*!40000 ALTER TABLE `owner_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `owners`
--

DROP TABLE IF EXISTS `owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `owners` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `alternate_mobile` varchar(20) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `business_name` varchar(150) NOT NULL,
  `business_type` varchar(100) DEFAULT 'Sports & Recreation',
  `gst_number` varchar(50) DEFAULT NULL,
  `pan_number` varchar(50) DEFAULT NULL,
  `country` varchar(100) DEFAULT 'India',
  `state` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `full_address` text DEFAULT NULL,
  `active_plan_id` varchar(50) DEFAULT NULL,
  `total_commission_earned` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_revenue_generated` decimal(12,2) NOT NULL DEFAULT 0.00,
  `created_by` varchar(50) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `owners_user_id_key` (`user_id`),
  UNIQUE KEY `owners_email_key` (`email`),
  KEY `owners_active_plan_id_fkey` (`active_plan_id`),
  CONSTRAINT `owners_active_plan_id_fkey` FOREIGN KEY (`active_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `owners_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `owners`
--

LOCK TABLES `owners` WRITE;
/*!40000 ALTER TABLE `owners` DISABLE KEYS */;
INSERT INTO `owners` VALUES ('own_1787307283568_547','usr_1787307283567_749','Aman chouhan','aman@gmail.com','2345234566',NULL,NULL,'ACTIVE','Turf',NULL,NULL,NULL,'India',NULL,NULL,NULL,NULL,'plan_pro',0.00,0.00,'SYSTEM','SYSTEM','2026-08-21 15:44:43.706','2026-08-21 15:44:43.706'),('own_1787390095601_806','usr_1787390095597_942','rahul','rahul@gmail.com','12222222','12111111',NULL,'ACTIVE','xsadas','Sports & Recreation','sadds','asdasd','India','sdas','sadas','dsafa',NULL,'plan_pro',0.00,0.00,'SYSTEM','SYSTEM','2026-08-22 14:44:55.718','2026-08-22 14:44:55.718'),('own_1787390680100_242','usr_1787390680100_534','amul','amul@gmail.com','11111111112','122222222223',NULL,'ACTIVE','cscas','Sports & Recresdfation','fdsafs','dasdfs','India','fsadfds','afsdsad','32432434',NULL,NULL,0.00,0.00,'SYSTEM','SYSTEM','2026-08-22 14:54:40.109','2026-08-22 14:54:40.109');
/*!40000 ALTER TABLE `owners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `booking_id` int(11) DEFAULT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'Booking',
  `amount` decimal(10,2) NOT NULL,
  `commission` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` enum('UPI','CASH','CARD','WALLET','BANK_TRANSFER','ONLINE') NOT NULL DEFAULT 'UPI',
  `status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_invoice_number_key` (`invoice_number`),
  KEY `payments_status_idx` (`status`),
  KEY `payments_payment_method_idx` (`payment_method`),
  KEY `payments_booking_id_fkey` (`booking_id`),
  KEY `payments_user_id_fkey` (`user_id`),
  CONSTRAINT `payments_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_leaderboard`
--

DROP TABLE IF EXISTS `player_leaderboard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_leaderboard` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `avatar` varchar(50) DEFAULT '?',
  `team` varchar(100) DEFAULT 'Indore Team',
  `city` varchar(50) DEFAULT 'Indore',
  `sport` varchar(50) DEFAULT 'Cricket',
  `role` varchar(50) DEFAULT 'All-Rounder',
  `matches` int(11) DEFAULT 0,
  `runs` int(11) DEFAULT 0,
  `batting_avg` float DEFAULT 0,
  `strike_rate` float DEFAULT 0,
  `wickets` int(11) DEFAULT 0,
  `economy` float DEFAULT 0,
  `win_rate` varchar(20) DEFAULT '0%',
  `mvps` int(11) DEFAULT 0,
  `highest_score` varchar(20) DEFAULT '0',
  `best_bowling` varchar(20) DEFAULT '0/0',
  `verification_tier` varchar(20) DEFAULT 'Tier 1',
  `tier_multiplier` float DEFAULT 1,
  `trust_score` int(11) DEFAULT 90,
  `badges` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`badges`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_leaderboard`
--

LOCK TABLES `player_leaderboard` WRITE;
/*!40000 ALTER TABLE `player_leaderboard` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_leaderboard` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_profiles`
--

DROP TABLE IF EXISTS `player_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_profiles` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `player_tag` varchar(100) NOT NULL DEFAULT 'Level 4 Pro Elite',
  `trust_score` int(11) NOT NULL DEFAULT 98,
  `verification_level` int(11) NOT NULL DEFAULT 4,
  `is_phone_verified` tinyint(1) NOT NULL DEFAULT 1,
  `is_id_kyc_verified` tinyint(1) NOT NULL DEFAULT 1,
  `is_match_verified` tinyint(1) NOT NULL DEFAULT 1,
  `is_umpire_pro` tinyint(1) NOT NULL DEFAULT 1,
  `primary_team_name` varchar(100) DEFAULT 'Andheri Strikers',
  `playing_role` varchar(50) NOT NULL DEFAULT 'All-Rounder',
  `batting_style` varchar(50) DEFAULT 'Right-Hand Bat',
  `bowling_style` varchar(50) DEFAULT 'Right-Arm Medium',
  `preferred_sport` varchar(50) NOT NULL DEFAULT 'Cricket',
  `preferred_sports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`preferred_sports`)),
  `city` varchar(100) NOT NULL DEFAULT 'Indore',
  `area_hub` varchar(100) DEFAULT 'Vijay Nagar',
  `highest_score` varchar(20) DEFAULT '104*',
  `best_bowling_figures` varchar(20) DEFAULT '4/18',
  `pps_score` decimal(6,2) NOT NULL DEFAULT 88.60,
  `city_rank` varchar(50) DEFAULT '#4 Indore',
  `total_matches` int(11) NOT NULL DEFAULT 28,
  `total_wins` int(11) NOT NULL DEFAULT 21,
  `win_rate_percent` decimal(5,2) NOT NULL DEFAULT 75.00,
  `tier3_matches_count` int(11) NOT NULL DEFAULT 8,
  `tier2_matches_count` int(11) NOT NULL DEFAULT 12,
  `tier1_matches_count` int(11) NOT NULL DEFAULT 8,
  `total_mvp_awards` int(11) NOT NULL DEFAULT 9,
  `earned_badges` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`earned_badges`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `player_profiles_user_id_key` (`user_id`),
  CONSTRAINT `player_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_profiles`
--

LOCK TABLES `player_profiles` WRITE;
/*!40000 ALTER TABLE `player_profiles` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `player_score_submissions`
--

DROP TABLE IF EXISTS `player_score_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `player_score_submissions` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `player_name` varchar(100) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL DEFAULT 'Indore',
  `area_hub` varchar(100) NOT NULL DEFAULT 'Vijay Nagar',
  `playing_role` varchar(50) NOT NULL DEFAULT 'All-Rounder',
  `verification_tier` enum('SELF_ENTRY','CAPTAIN_HANDSHAKE','PAID_UMPIRE','OFFICIAL_TOURNAMENT') NOT NULL DEFAULT 'PAID_UMPIRE',
  `weight_multiplier` decimal(3,2) NOT NULL DEFAULT 1.50,
  `runs_scored` int(11) NOT NULL DEFAULT 0,
  `balls_faced` int(11) NOT NULL DEFAULT 0,
  `fours` int(11) NOT NULL DEFAULT 0,
  `sixes` int(11) NOT NULL DEFAULT 0,
  `strike_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `wickets_taken` int(11) NOT NULL DEFAULT 0,
  `overs_bowled` decimal(4,1) NOT NULL DEFAULT 0.0,
  `economy_rate` decimal(4,2) NOT NULL DEFAULT 0.00,
  `is_mvp_awarded` tinyint(1) NOT NULL DEFAULT 0,
  `certifier_umpire_id` varchar(50) DEFAULT NULL,
  `computed_pps` decimal(6,2) NOT NULL DEFAULT 0.00,
  `status` varchar(30) NOT NULL DEFAULT 'APPROVED_AND_RANKED',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `player_score_submissions_city_area_hub_idx` (`city`,`area_hub`),
  KEY `player_score_submissions_user_id_fkey` (`user_id`),
  CONSTRAINT `player_score_submissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `player_score_submissions`
--

LOCK TABLES `player_score_submissions` WRITE;
/*!40000 ALTER TABLE `player_score_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `player_score_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pos_order_items`
--

DROP TABLE IF EXISTS `pos_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pos_order_items` (
  `id` varchar(50) NOT NULL,
  `order_id` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `category` varchar(50) DEFAULT 'Turf Booking',
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `total_price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pos_order_items_order_id_fkey` (`order_id`),
  CONSTRAINT `pos_order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `pos_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_order_items`
--

LOCK TABLES `pos_order_items` WRITE;
/*!40000 ALTER TABLE `pos_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `pos_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pos_orders`
--

DROP TABLE IF EXISTS `pos_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pos_orders` (
  `id` varchar(50) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `customer_type` enum('GUEST','MEMBER','WALK_IN') NOT NULL DEFAULT 'GUEST',
  `membership_id` varchar(50) DEFAULT NULL,
  `order_type` enum('TURF_BOOKING','EQUIPMENT_RENTAL','GAMING_SESSION','SNACKS_REFRESHMENT','MERCHANDISE') NOT NULL DEFAULT 'TURF_BOOKING',
  `sport_name` varchar(50) DEFAULT 'Football',
  `court_name` varchar(100) DEFAULT 'Court A (Main Turf)',
  `booking_date` date NOT NULL DEFAULT current_timestamp(3),
  `time_slot` varchar(50) DEFAULT '06:00 PM',
  `duration_minutes` int(11) NOT NULL DEFAULT 60,
  `players_count` int(11) NOT NULL DEFAULT 10,
  `hourly_rate` decimal(10,2) NOT NULL DEFAULT 1200.00,
  `addon_services` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`addon_services`)),
  `addon_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` decimal(10,2) NOT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `gst_tax_rate` decimal(5,2) NOT NULL DEFAULT 18.00,
  `gst_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `grand_total` decimal(10,2) NOT NULL,
  `payment_method` enum('UPI','CASH','CARD','WALLET','BANK_TRANSFER','ONLINE') NOT NULL DEFAULT 'UPI',
  `payment_status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `notes` text DEFAULT NULL,
  `settled_at` datetime(3) DEFAULT current_timestamp(3),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `pos_orders_invoice_number_key` (`invoice_number`),
  KEY `pos_orders_branch_id_idx` (`branch_id`),
  KEY `pos_orders_payment_status_idx` (`payment_status`),
  CONSTRAINT `pos_orders_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pos_orders`
--

LOCK TABLES `pos_orders` WRITE;
/*!40000 ALTER TABLE `pos_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `pos_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_entries`
--

DROP TABLE IF EXISTS `purchase_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `purchase_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inventory_id` varchar(50) NOT NULL,
  `quantity` int(11) NOT NULL,
  `purchase_cost` decimal(10,2) NOT NULL,
  `supplier` varchar(150) DEFAULT NULL,
  `purchase_date` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `purchase_entries_inventory_id_fkey` (`inventory_id`),
  CONSTRAINT `purchase_entries_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `inventory` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_entries`
--

LOCK TABLES `purchase_entries` WRITE;
/*!40000 ALTER TABLE `purchase_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund_requests`
--

DROP TABLE IF EXISTS `refund_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `refund_requests` (
  `id` varchar(50) NOT NULL,
  `ticket_number` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reason` text NOT NULL,
  `requested_by_staff_id` varchar(50) DEFAULT NULL,
  `status` enum('PENDING_REVIEW','APPROVED','REJECTED','REFUNDED') NOT NULL DEFAULT 'PENDING_REVIEW',
  `admin_notes` text DEFAULT NULL,
  `approved_by_user_id` varchar(50) DEFAULT NULL,
  `refunded_to_wallet` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `refund_requests_ticket_number_key` (`ticket_number`),
  KEY `refund_requests_branch_id_status_idx` (`branch_id`,`status`),
  KEY `refund_requests_booking_id_fkey` (`booking_id`),
  CONSTRAINT `refund_requests_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `refund_requests_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund_requests`
--

LOCK TABLES `refund_requests` WRITE;
/*!40000 ALTER TABLE `refund_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `refund_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reviews` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `author_name` varchar(100) NOT NULL,
  `rating` decimal(2,1) NOT NULL,
  `comment` text DEFAULT NULL,
  `is_verified_booking` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `reviews_branch_id_fkey` (`branch_id`),
  KEY `reviews_user_id_fkey` (`user_id`),
  CONSTRAINT `reviews_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `scorecards`
--

DROP TABLE IF EXISTS `scorecards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `scorecards` (
  `id` varchar(50) NOT NULL,
  `player_name` varchar(100) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL DEFAULT 'Indore',
  `area_hub` varchar(100) DEFAULT 'Vijay Nagar',
  `playing_role` varchar(50) NOT NULL DEFAULT 'All-Rounder',
  `tier` enum('SELF_ENTRY','CAPTAIN_HANDSHAKE','PAID_UMPIRE','OFFICIAL_TOURNAMENT') NOT NULL DEFAULT 'PAID_UMPIRE',
  `weight_multiplier` decimal(3,2) NOT NULL DEFAULT 1.50,
  `rank_position` int(11) DEFAULT NULL,
  `matches` int(11) NOT NULL DEFAULT 0,
  `runs` int(11) NOT NULL DEFAULT 0,
  `balls_faced` int(11) DEFAULT 0,
  `fours` int(11) DEFAULT 0,
  `sixes` int(11) DEFAULT 0,
  `batting_avg` decimal(5,2) NOT NULL DEFAULT 0.00,
  `strike_rate` decimal(5,2) NOT NULL DEFAULT 0.00,
  `wickets` int(11) NOT NULL DEFAULT 0,
  `overs_bowled` decimal(4,1) DEFAULT 0.0,
  `economy` decimal(4,2) NOT NULL DEFAULT 0.00,
  `mvp_count` int(11) NOT NULL DEFAULT 0,
  `pps_score` decimal(6,2) NOT NULL DEFAULT 0.00,
  `certifier_umpire_id` varchar(50) DEFAULT NULL,
  `verified_by_user_id` varchar(50) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `scorecards_city_pps_score_idx` (`city`,`pps_score`),
  KEY `scorecards_tier_idx` (`tier`),
  KEY `scorecards_verified_by_user_id_fkey` (`verified_by_user_id`),
  CONSTRAINT `scorecards_verified_by_user_id_fkey` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `scorecards`
--

LOCK TABLES `scorecards` WRITE;
/*!40000 ALTER TABLE `scorecards` DISABLE KEYS */;
/*!40000 ALTER TABLE `scorecards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slot_holds`
--

DROP TABLE IF EXISTS `slot_holds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slot_holds` (
  `id` varchar(50) NOT NULL,
  `slot_id` varchar(50) DEFAULT NULL,
  `branch_id` varchar(50) DEFAULT NULL,
  `match_id` varchar(50) DEFAULT NULL,
  `slot_date` date NOT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `held_by_user_id` varchar(50) DEFAULT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 5,
  `expires_at` datetime(3) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `status` enum('ACTIVE','CONVERTED','EXPIRED','RELEASED') DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  KEY `slot_holds_slot_id_expires_at_idx` (`slot_id`,`expires_at`),
  KEY `slot_holds_branch_id_fkey` (`branch_id`),
  KEY `slot_holds_match_id_fkey` (`match_id`),
  CONSTRAINT `slot_holds_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `slot_holds_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `slot_holds_slot_id_fkey` FOREIGN KEY (`slot_id`) REFERENCES `slots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slot_holds`
--

LOCK TABLES `slot_holds` WRITE;
/*!40000 ALTER TABLE `slot_holds` DISABLE KEYS */;
/*!40000 ALTER TABLE `slot_holds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `slots`
--

DROP TABLE IF EXISTS `slots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `slots` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `sport_id` varchar(50) DEFAULT NULL,
  `court_name` varchar(100) NOT NULL,
  `slot_date` date NOT NULL,
  `start_time` varchar(20) NOT NULL,
  `end_time` varchar(20) NOT NULL,
  `duration` int(11) NOT NULL,
  `regular_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `peak_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_peak_hour` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('AVAILABLE','BOOKED','BLOCKED','COMPLETED') NOT NULL DEFAULT 'AVAILABLE',
  `notes` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `slots_branch_id_slot_date_idx` (`branch_id`,`slot_date`),
  KEY `slots_status_idx` (`status`),
  KEY `slots_sport_id_fkey` (`sport_id`),
  CONSTRAINT `slots_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `slots_sport_id_fkey` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `slots`
--

LOCK TABLES `slots` WRITE;
/*!40000 ALTER TABLE `slots` DISABLE KEYS */;
/*!40000 ALTER TABLE `slots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sports`
--

DROP TABLE IF EXISTS `sports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sports` (
  `id` varchar(50) NOT NULL,
  `name` varchar(50) NOT NULL,
  `icon` varchar(10) DEFAULT '⚽',
  `category` varchar(50) DEFAULT 'Team Sport',
  `default_slot_duration` int(11) NOT NULL DEFAULT 60,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sports_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sports`
--

LOCK TABLES `sports` WRITE;
/*!40000 ALTER TABLE `sports` DISABLE KEYS */;
INSERT INTO `sports` VALUES ('sp_master_01','Football','⚽','Team Sport',60),('sp_master_02','Cricket','🏏','Team Sport',60);
/*!40000 ALTER TABLE `sports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staff_members`
--

DROP TABLE IF EXISTS `staff_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `staff_members` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `role` enum('BRANCH_MANAGER','TECHNICIAN','CASHIER','GROUND_STAFF') NOT NULL DEFAULT 'BRANCH_MANAGER',
  `shift_slot` enum('MORNING_SHIFT','EVENING_SHIFT','NIGHT_SHIFT','FULL_DAY_SHIFT') NOT NULL DEFAULT 'MORNING_SHIFT',
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `staff_members_branch_id_idx` (`branch_id`),
  CONSTRAINT `staff_members_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staff_members`
--

LOCK TABLES `staff_members` WRITE;
/*!40000 ALTER TABLE `staff_members` DISABLE KEYS */;
/*!40000 ALTER TABLE `staff_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_plans` (
  `id` varchar(50) NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_popular` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('ACTIVE','INACTIVE','DRAFT') NOT NULL DEFAULT 'ACTIVE',
  `monthly_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `monthly_branch_limit` int(11) NOT NULL DEFAULT 1,
  `monthly_sports_limit` int(11) NOT NULL DEFAULT 2,
  `monthly_booking_limit` int(11) NOT NULL DEFAULT 200,
  `monthly_active_users_limit` int(11) NOT NULL DEFAULT 5,
  `yearly_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `yearly_branch_limit` int(11) NOT NULL DEFAULT 1,
  `yearly_sports_limit` int(11) NOT NULL DEFAULT 2,
  `yearly_booking_limit` int(11) NOT NULL DEFAULT 2500,
  `yearly_active_users_limit` int(11) NOT NULL DEFAULT 5,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`features`)),
  `bonus_perks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bonus_perks`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES ('plan_enterprise','Enterprise Arena','Custom tailored plan for large stadium & turf networks.',1,'ACTIVE',4990.00,20,15,10000,100,49999.00,20,15,120000,100,'[\"Unlimited Branches\",\"Dedicated Account Manager\",\"Custom Billing Integrations\",\"White Label Branding\",\"SLA Guarantee\"]',NULL,'2026-08-20 13:21:58.272','2026-08-20 13:21:58.272'),('plan_pro','Professional Plan','Perfect for growing multi-turf sports complexes.',1,'ACTIVE',3000.00,5,6,1000,20,20000.00,5,6,15000,20,'[\"All Starter Features\",\"Multi-Branch Management\",\"Advanced Analytics & Exports\",\"POS Integration\",\"Priority 24/7 Support\"]',NULL,'2026-08-20 04:55:45.946','2026-08-20 04:55:45.946'),('plan_starter','Starter Plan','Ideal for single turf owners getting started.',0,'ACTIVE',500.00,1,2,200,5,9999.00,1,2,2500,5,'[\"Online Slot Booking\",\"Basic Analytics\",\"Email Notifications\",\"Standard Support\"]',NULL,'2026-08-20 04:55:45.928','2026-08-20 04:55:45.928');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_settings` (
  `id` varchar(50) NOT NULL,
  `default_rate` decimal(5,2) NOT NULL DEFAULT 5.00,
  `max_rate` decimal(5,2) NOT NULL DEFAULT 15.00,
  `min_rate` decimal(5,2) NOT NULL DEFAULT 2.00,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `sports_rates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sports_rates`)),
  `gst_tax_rate` decimal(5,2) NOT NULL DEFAULT 18.00,
  `payout_frequency` varchar(20) NOT NULL DEFAULT 'WEEKLY',
  `auto_escrow_release_hours` int(11) NOT NULL DEFAULT 24,
  `maintenance_mode` tinyint(1) NOT NULL DEFAULT 0,
  `updated_by` varchar(50) DEFAULT NULL,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES ('global_commission',5.00,15.00,2.00,'ACTIVE','[{\"sportName\":\"Football\",\"commissionRate\":5.0},{\"sportName\":\"Cricket\",\"commissionRate\":5.0},{\"sportName\":\"Badminton\",\"commissionRate\":4.0},{\"sportName\":\"Tennis\",\"commissionRate\":4.5}]',18.00,'WEEKLY',24,0,NULL,'2026-08-20 10:57:04.954');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_membership_requests`
--

DROP TABLE IF EXISTS `team_membership_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_membership_requests` (
  `id` varchar(50) NOT NULL,
  `team_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `status` enum('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `request_message` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_membership_requests_team_id_user_id_key` (`team_id`,`user_id`),
  KEY `team_membership_requests_user_id_fkey` (`user_id`),
  CONSTRAINT `team_membership_requests_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `club_teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `team_membership_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_membership_requests`
--

LOCK TABLES `team_membership_requests` WRITE;
/*!40000 ALTER TABLE `team_membership_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_membership_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `team_players`
--

DROP TABLE IF EXISTS `team_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `team_players` (
  `id` varchar(50) NOT NULL,
  `team_id` varchar(50) NOT NULL,
  `player_name` varchar(100) NOT NULL,
  `jersey_number` int(11) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `id_proof_url` varchar(255) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `team_players_team_id_fkey` (`team_id`),
  CONSTRAINT `team_players_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `team_players`
--

LOCK TABLES `team_players` WRITE;
/*!40000 ALTER TABLE `team_players` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_players` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teams`
--

DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teams` (
  `id` varchar(50) NOT NULL,
  `tournament_id` varchar(50) NOT NULL,
  `team_name` varchar(100) NOT NULL,
  `captain_name` varchar(100) NOT NULL,
  `captain_email` varchar(100) NOT NULL,
  `captain_mobile` varchar(20) NOT NULL,
  `payment_method` enum('UPI','CASH','CARD','WALLET','BANK_TRANSFER','ONLINE') NOT NULL DEFAULT 'UPI',
  `payment_status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `status` enum('PENDING','CONFIRMED','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `teams_tournament_id_fkey` (`tournament_id`),
  CONSTRAINT `teams_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teams`
--

LOCK TABLES `teams` WRITE;
/*!40000 ALTER TABLE `teams` DISABLE KEYS */;
/*!40000 ALTER TABLE `teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_categories`
--

DROP TABLE IF EXISTS `tournament_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tournament_categories` (
  `id` varchar(50) NOT NULL,
  `name` varchar(50) NOT NULL,
  `icon` varchar(10) DEFAULT '?',
  `description` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tournament_categories_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_categories`
--

LOCK TABLES `tournament_categories` WRITE;
/*!40000 ALTER TABLE `tournament_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_matches`
--

DROP TABLE IF EXISTS `tournament_matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tournament_matches` (
  `id` varchar(50) NOT NULL,
  `tournament_id` varchar(50) DEFAULT 't_001',
  `match_number` int(11) NOT NULL,
  `round_name` varchar(50) DEFAULT 'Semi-Finals',
  `team1_name` varchar(100) NOT NULL,
  `team1_score` int(11) DEFAULT 0,
  `team2_name` varchar(100) NOT NULL,
  `team2_score` int(11) DEFAULT 0,
  `winner_name` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'LIVE',
  `live_state_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`live_state_json`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_matches`
--

LOCK TABLES `tournament_matches` WRITE;
/*!40000 ALTER TABLE `tournament_matches` DISABLE KEYS */;
INSERT INTO `tournament_matches` VALUES ('fix_101','t_001',1,'Semi-Finals','Indore Thunders',145,'Warriors XI',122,'Indore Thunders','Completed',NULL,'2026-08-22 06:39:25','2026-08-22 06:39:25'),('fix_102','t_001',2,'Semi-Finals','Royal Challengers',156,'Super Kings',148,'Royal Challengers','Completed',NULL,'2026-08-22 06:39:25','2026-08-22 06:39:25'),('fix_103','t_001',3,'Grand Finale','Indore Thunders',142,'Royal Challengers',0,NULL,'LIVE','{\"totalRuns\":142,\"wickets\":3,\"overs\":15,\"balls\":4}','2026-08-22 06:39:25','2026-08-22 06:39:25');
/*!40000 ALTER TABLE `tournament_matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_notifications`
--

DROP TABLE IF EXISTS `tournament_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tournament_notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) DEFAULT NULL,
  `tournament_id` varchar(50) DEFAULT NULL,
  `type` enum('Approved','Rejected','Registration','Reminder','Winner','General') DEFAULT 'General',
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_notifications`
--

LOCK TABLES `tournament_notifications` WRITE;
/*!40000 ALTER TABLE `tournament_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_payments`
--

DROP TABLE IF EXISTS `tournament_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tournament_payments` (
  `id` varchar(50) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `tournament_id` varchar(50) NOT NULL,
  `team_id` varchar(50) DEFAULT NULL,
  `payer_name` varchar(100) NOT NULL,
  `transaction_type` varchar(50) NOT NULL DEFAULT 'Entry Fee',
  `amount` decimal(10,2) NOT NULL,
  `platform_comm_rate` decimal(5,2) NOT NULL DEFAULT 10.00,
  `commission_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_mode` enum('UPI','CASH','CARD','WALLET','BANK_TRANSFER','ONLINE') NOT NULL DEFAULT 'UPI',
  `status` enum('PENDING','COMPLETED','HELD','FAILED','REFUND_PENDING','REFUNDED') NOT NULL DEFAULT 'COMPLETED',
  `transaction_id` varchar(100) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `tournament_payments_invoice_number_key` (`invoice_number`),
  KEY `tournament_payments_tournament_id_fkey` (`tournament_id`),
  KEY `tournament_payments_team_id_fkey` (`team_id`),
  CONSTRAINT `tournament_payments_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tournament_payments_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_payments`
--

LOCK TABLES `tournament_payments` WRITE;
/*!40000 ALTER TABLE `tournament_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_settings`
--

DROP TABLE IF EXISTS `tournament_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tournament_settings` (
  `id` varchar(50) NOT NULL DEFAULT 'global_tournament_settings',
  `platform_commission_percentage` decimal(5,2) NOT NULL DEFAULT 10.00,
  `automatic_slot_reservation` tinyint(1) NOT NULL DEFAULT 1,
  `allow_staff_tournament_creation` tinyint(1) NOT NULL DEFAULT 1,
  `automated_approval_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_settings`
--

LOCK TABLES `tournament_settings` WRITE;
/*!40000 ALTER TABLE `tournament_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournament_sponsors`
--

DROP TABLE IF EXISTS `tournament_sponsors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tournament_sponsors` (
  `id` varchar(50) NOT NULL,
  `tournament_id` varchar(50) NOT NULL,
  `sponsor_name` varchar(100) NOT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `sponsor_tier` varchar(50) NOT NULL DEFAULT 'Gold Sponsor',
  `package_amount` decimal(10,2) NOT NULL,
  `website_url` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `tournament_sponsors_tournament_id_fkey` (`tournament_id`),
  CONSTRAINT `tournament_sponsors_tournament_id_fkey` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournament_sponsors`
--

LOCK TABLES `tournament_sponsors` WRITE;
/*!40000 ALTER TABLE `tournament_sponsors` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_sponsors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tournaments` (
  `id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `sport_id` varchar(50) NOT NULL,
  `category_id` varchar(50) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `banner_image` varchar(255) DEFAULT NULL,
  `organizer_name` varchar(100) NOT NULL DEFAULT 'SportMatrix Events Team',
  `organizer_contact_number` varchar(20) NOT NULL DEFAULT '+91 98765 43210',
  `tournament_rules` text DEFAULT NULL,
  `registration_start_date` date DEFAULT NULL,
  `registration_last_date` date DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `turf_court_name` varchar(100) DEFAULT 'Ground 1 (Main Turf)',
  `match_duration_minutes` int(11) NOT NULL DEFAULT 60,
  `match_gap_minutes` int(11) NOT NULL DEFAULT 15,
  `entry_fee_per_team` decimal(10,2) NOT NULL DEFAULT 500.00,
  `maximum_teams` int(11) NOT NULL DEFAULT 16,
  `minimum_teams` int(11) NOT NULL DEFAULT 4,
  `prize_pool_total` varchar(150) NOT NULL DEFAULT '₹50,000',
  `first_prize_winner` decimal(10,2) NOT NULL DEFAULT 30000.00,
  `second_prize_runner_up` decimal(10,2) NOT NULL DEFAULT 15000.00,
  `third_prize` decimal(10,2) NOT NULL DEFAULT 5000.00,
  `tournament_format` varchar(50) NOT NULL DEFAULT 'Knockout Bracket',
  `skill_level` varchar(50) NOT NULL DEFAULT 'Open to All',
  `age_limit` varchar(50) NOT NULL DEFAULT 'Open (No limit)',
  `gender_criteria` varchar(50) NOT NULL DEFAULT 'All Genders',
  `players_per_team` int(11) NOT NULL DEFAULT 11,
  `substitute_players` int(11) NOT NULL DEFAULT 5,
  `tournament_visibility` varchar(50) NOT NULL DEFAULT 'Public',
  `registration_approval` varchar(50) NOT NULL DEFAULT 'Auto Approval',
  `refund_policy` varchar(50) NOT NULL DEFAULT 'No Refund',
  `facilities_available` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`facilities_available`)),
  `status` enum('DRAFT','PENDING_APPROVAL','APPROVED','REGISTRATION_OPEN','FEW_SLOTS_LEFT','UPCOMING','ACTIVE','RUNNING','COMPLETED','CANCELLED','REJECTED') NOT NULL DEFAULT 'UPCOMING',
  `weather_check_snapshot` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`weather_check_snapshot`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `banner` varchar(255) DEFAULT NULL,
  `court_name` varchar(100) DEFAULT 'Court A',
  `rules` text DEFAULT NULL,
  `max_teams` int(11) DEFAULT 16,
  `min_teams` int(11) DEFAULT 4,
  `entry_fee` int(11) DEFAULT 0,
  `winner_prize` int(11) DEFAULT 0,
  `runner_prize` int(11) DEFAULT 0,
  `prize_pool` varchar(150) DEFAULT NULL,
  `format` enum('Knockout','League','League + Knockout') DEFAULT 'Knockout',
  `match_duration` int(11) DEFAULT 60,
  `gender` enum('Men','Women','Mixed','All') DEFAULT 'All',
  `owner_remarks` text DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `approved_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tournaments_branch_id_status_idx` (`branch_id`,`status`),
  KEY `tournaments_sport_id_fkey` (`sport_id`),
  KEY `tournaments_category_id_fkey` (`category_id`),
  CONSTRAINT `tournaments_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tournaments_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `tournament_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tournaments_sport_id_fkey` FOREIGN KEY (`sport_id`) REFERENCES `sports` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turfs`
--

DROP TABLE IF EXISTS `turfs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `turfs` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `price` int(11) DEFAULT 0,
  `rating` decimal(2,1) DEFAULT 0.0,
  `sports` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`sports`)),
  `amenities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`amenities`)),
  `opening_time` time DEFAULT '06:00:00',
  `closing_time` time DEFAULT '23:00:00',
  `media` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`media`)),
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turfs`
--

LOCK TABLES `turfs` WRITE;
/*!40000 ALTER TABLE `turfs` DISABLE KEYS */;
/*!40000 ALTER TABLE `turfs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `umpire_duty_assignments`
--

DROP TABLE IF EXISTS `umpire_duty_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `umpire_duty_assignments` (
  `id` varchar(50) NOT NULL,
  `match_id` varchar(50) NOT NULL,
  `branch_id` varchar(50) NOT NULL,
  `umpire_profile_id` varchar(50) NOT NULL,
  `duty_fee` decimal(10,2) NOT NULL DEFAULT 300.00,
  `fee_payment_status` enum('PENDING','RECEIVED') NOT NULL DEFAULT 'RECEIVED',
  `toss_winner_team` varchar(100) DEFAULT NULL,
  `toss_elected` varchar(20) DEFAULT NULL,
  `ball_by_ball_feed` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ball_by_ball_feed`)),
  `current_score_summary` varchar(100) DEFAULT NULL,
  `top_batsman_name` varchar(100) DEFAULT NULL,
  `top_batsman_runs` int(11) DEFAULT 0,
  `top_batsman_balls` int(11) DEFAULT 0,
  `top_bowler_name` varchar(100) DEFAULT NULL,
  `top_bowler_wickets` int(11) DEFAULT 0,
  `top_bowler_runs` int(11) DEFAULT 0,
  `match_mvp_name` varchar(100) DEFAULT NULL,
  `match_mvp_phone` varchar(20) DEFAULT NULL,
  `is_leaderboard_pushed` tinyint(1) NOT NULL DEFAULT 0,
  `duty_status` enum('SCHEDULED','LIVE_NOW','CERTIFIED_COMPLETED','DISPUTED') NOT NULL DEFAULT 'LIVE_NOW',
  `certified_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `umpire_duty_assignments_match_id_key` (`match_id`),
  KEY `umpire_duty_assignments_umpire_profile_id_duty_status_idx` (`umpire_profile_id`,`duty_status`),
  KEY `umpire_duty_assignments_branch_id_fkey` (`branch_id`),
  CONSTRAINT `umpire_duty_assignments_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `umpire_duty_assignments_match_id_fkey` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `umpire_duty_assignments_umpire_profile_id_fkey` FOREIGN KEY (`umpire_profile_id`) REFERENCES `umpire_profiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `umpire_duty_assignments`
--

LOCK TABLES `umpire_duty_assignments` WRITE;
/*!40000 ALTER TABLE `umpire_duty_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `umpire_duty_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `umpire_matches`
--

DROP TABLE IF EXISTS `umpire_matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `umpire_matches` (
  `id` varchar(50) NOT NULL,
  `match_code` varchar(50) NOT NULL,
  `umpire_id` varchar(50) DEFAULT NULL,
  `tournament_id` varchar(50) DEFAULT NULL,
  `match_title` varchar(150) DEFAULT 'Live Duty Match',
  `match_type` varchar(50) DEFAULT 'DARE MATCH',
  `venue` varchar(150) NOT NULL,
  `scheduled_time` varchar(100) NOT NULL,
  `duty_fee` int(11) DEFAULT 300,
  `payment_status` enum('PENDING','RECEIVED','SPLIT_50_50') DEFAULT 'PENDING',
  `payment_mode` varchar(100) DEFAULT 'Direct UPI QR',
  `receipt_no` varchar(50) DEFAULT NULL,
  `team1_name` varchar(100) NOT NULL,
  `team1_captain` varchar(100) DEFAULT NULL,
  `team1_phone` varchar(20) DEFAULT NULL,
  `team1_score` int(11) DEFAULT 0,
  `team1_wickets` int(11) DEFAULT 0,
  `team1_overs` varchar(20) DEFAULT '0.0',
  `team2_name` varchar(100) NOT NULL,
  `team2_captain` varchar(100) DEFAULT NULL,
  `team2_phone` varchar(20) DEFAULT NULL,
  `team2_score` int(11) DEFAULT 0,
  `team2_wickets` int(11) DEFAULT 0,
  `team2_overs` varchar(20) DEFAULT '0.0',
  `target` int(11) DEFAULT 0,
  `winner_name` varchar(100) DEFAULT NULL,
  `toss_winner` varchar(100) DEFAULT NULL,
  `toss_decision` varchar(50) DEFAULT NULL,
  `match_status` enum('UPCOMING','LIVE','COMPLETED','CANCELLED') DEFAULT 'UPCOMING',
  `current_innings` int(11) DEFAULT 1,
  `leaderboard_multiplier` varchar(20) DEFAULT '1.5x',
  `officiated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `match_code` (`match_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `umpire_matches`
--

LOCK TABLES `umpire_matches` WRITE;
/*!40000 ALTER TABLE `umpire_matches` DISABLE KEYS */;
/*!40000 ALTER TABLE `umpire_matches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `umpire_profiles`
--

DROP TABLE IF EXISTS `umpire_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `umpire_profiles` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `certification_level` varchar(100) NOT NULL DEFAULT 'BCCI / Turf Certified Level-2',
  `officiating_locations` varchar(200) NOT NULL DEFAULT 'Spike Turf & Royal Ground (Indore)',
  `city` varchar(100) NOT NULL DEFAULT 'Indore',
  `upi_id` varchar(100) NOT NULL DEFAULT 'rajesh.umpire@okhdfcbank',
  `qr_image_url` varchar(255) DEFAULT NULL,
  `duty_fee_per_match` decimal(10,2) NOT NULL DEFAULT 300.00,
  `is_on_duty` tinyint(1) NOT NULL DEFAULT 1,
  `leaderboard_tier` enum('SELF_ENTRY','CAPTAIN_HANDSHAKE','PAID_UMPIRE','OFFICIAL_TOURNAMENT') NOT NULL DEFAULT 'PAID_UMPIRE',
  `total_matches_officiated` int(11) NOT NULL DEFAULT 5,
  `total_certified_scorecards` int(11) NOT NULL DEFAULT 5,
  `rating` decimal(3,2) NOT NULL DEFAULT 4.90,
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `umpire_profiles_user_id_key` (`user_id`),
  UNIQUE KEY `umpire_profiles_license_number_key` (`license_number`),
  CONSTRAINT `umpire_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `umpire_profiles`
--

LOCK TABLES `umpire_profiles` WRITE;
/*!40000 ALTER TABLE `umpire_profiles` DISABLE KEYS */;
INSERT INTO `umpire_profiles` VALUES ('ump_rajesh','usr_umpire_1','UMP-IND-409','Rajesh Sisodiya','BCCI / Turf Certified Level-2','Spike Turf & Royal Ground (Indore)','Indore','rajesh.umpire@okhdfcbank',NULL,300.00,1,'PAID_UMPIRE',5,5,4.90,'ACTIVE','2026-08-21 11:48:42.240','2026-08-21 11:48:42.240');
/*!40000 ALTER TABLE `umpire_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('SUPER_ADMIN','ADMIN','OWNER','STAFF','UMPIRE','CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
  `mobile` varchar(20) DEFAULT NULL,
  `alternate_mobile` varchar(20) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `staff_branch_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  KEY `users_role_idx` (`role`),
  KEY `users_status_idx` (`status`),
  KEY `users_staff_branch_id_fkey` (`staff_branch_id`),
  CONSTRAINT `users_staff_branch_id_fkey` FOREIGN KEY (`staff_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('usr_1787307283567_749','Aman chouhan','aman@gmail.com','$2b$10$koboJyXy/qJuOV0rW9heNuj6.lpmwDVOagPgpGewaEFbgPe01kRlG','OWNER','2345234566',NULL,NULL,'ACTIVE','2026-08-21 15:44:43.572','2026-08-21 15:44:43.572',NULL),('usr_1787390095597_942','rahul','rahul@gmail.com','$2b$10$uR.rrO6JYxhUI4K6z7r8Dulo9TH5UOs73qd0eQhbwwxXfBilBdq.C','OWNER','12222222',NULL,NULL,'ACTIVE','2026-08-22 14:44:55.611','2026-08-22 14:44:55.611',NULL),('usr_1787390680100_534','amul','amul@gmail.com','$2b$10$KBQkQBK9lZS8jRLez5Sq/uR0gUvmmBDKjVvFJSB0655ts3Sr/4m06','OWNER','11111111112',NULL,NULL,'ACTIVE','2026-08-22 14:54:40.102','2026-08-22 14:54:40.102',NULL),('usr_superadmin_01','Super Administrator','superadmin@gmail.com','$2b$10$KFWmcdP/3m3M/AMTloghk..QIThrjBzWvrjQUsqkMCvZdbxzq/u5a','SUPER_ADMIN','+91 98765 43210',NULL,'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200','ACTIVE','2026-08-20 04:55:45.954','2026-08-20 04:55:45.954',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallet_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `wallet_id` varchar(50) NOT NULL,
  `transaction_code` varchar(50) NOT NULL,
  `type` enum('BOOKING','TOURNAMENT','REFUND','TOP_UP','PRIZE','ESCROW_HOLD','ESCROW_RELEASE','COMMISSION') NOT NULL,
  `description` varchar(255) NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `platform_commission` decimal(10,2) NOT NULL DEFAULT 0.00,
  `settled_net` decimal(10,2) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Completed',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `wallet_transactions_transaction_code_key` (`transaction_code`),
  KEY `wallet_transactions_wallet_id_idx` (`wallet_id`),
  CONSTRAINT `wallet_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallets`
--

DROP TABLE IF EXISTS `wallets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `wallets` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `locked_escrow` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_commission_paid` decimal(10,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `bank_account_masked` varchar(30) DEFAULT '**** **** **** 8848',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `wallets_user_id_key` (`user_id`),
  CONSTRAINT `wallets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallets`
--

LOCK TABLES `wallets` WRITE;
/*!40000 ALTER TABLE `wallets` DISABLE KEYS */;
INSERT INTO `wallets` VALUES ('wal_1787294108100','usr_customer_01',0.00,0.00,0.00,'INR','**** **** **** 8848','2026-08-21 12:05:08.101','2026-08-21 12:05:08.101');
/*!40000 ALTER TABLE `wallets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'turf_db'
--

--
-- Dumping routines for database 'turf_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-23  0:18:02

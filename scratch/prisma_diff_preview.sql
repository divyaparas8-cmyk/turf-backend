-- AlterTable
ALTER TABLE `advertisements` MODIFY `icon` VARCHAR(10) NULL DEFAULT '📢';

-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `branch_id`;

-- AlterTable
ALTER TABLE `branches` DROP COLUMN `coupon_code`,
    DROP COLUMN `dimensions`,
    DROP COLUMN `discount_offer`,
    DROP COLUMN `plan_price`,
    DROP COLUMN `price_per_hour`,
    DROP COLUMN `sports`,
    DROP COLUMN `subscription_price_snapshot`,
    DROP COLUMN `turf_size`;

-- AlterTable
ALTER TABLE `slot_holds` DROP COLUMN `status`;

-- AlterTable
ALTER TABLE `tournament_categories` MODIFY `icon` VARCHAR(10) NULL DEFAULT '🏆';

-- AlterTable
ALTER TABLE `tournaments` DROP COLUMN `approved_by`,
    DROP COLUMN `banner`,
    DROP COLUMN `court_name`,
    DROP COLUMN `created_by`,
    DROP COLUMN `entry_fee`,
    DROP COLUMN `format`,
    DROP COLUMN `gender`,
    DROP COLUMN `match_duration`,
    DROP COLUMN `max_teams`,
    DROP COLUMN `min_teams`,
    DROP COLUMN `owner_remarks`,
    DROP COLUMN `prize_pool`,
    DROP COLUMN `rules`,
    DROP COLUMN `runner_prize`,
    DROP COLUMN `winner_prize`;

-- DropTable
DROP TABLE `commissions`;

-- DropTable
DROP TABLE `financial_ledger`;

-- DropTable
DROP TABLE `maintenance_tickets`;

-- DropTable
DROP TABLE `match_audit_logs`;

-- DropTable
DROP TABLE `match_invites`;

-- DropTable
DROP TABLE `match_players`;

-- DropTable
DROP TABLE `match_results`;

-- DropTable
DROP TABLE `match_scores`;

-- DropTable
DROP TABLE `match_settlements`;

-- DropTable
DROP TABLE `player_leaderboard`;

-- DropTable
DROP TABLE `tournament_matches`;

-- DropTable
DROP TABLE `tournament_notifications`;

-- DropTable
DROP TABLE `turfs`;

-- DropTable
DROP TABLE `umpire_matches`;

┌─────────────────────────────────────────────────────────┐
│  Update available 5.22.0 -> 7.9.1                       │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

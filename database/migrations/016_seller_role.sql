-- Sellers are the third Duka category. They live in the same users table as
-- customers and shoppers so sign-in, tokens and account switching stay shared,
-- while everything they own lives in seller_* tables (017).
--
-- The enum value must be committed before any other statement can use it,
-- which is why this migration does nothing else.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'seller';

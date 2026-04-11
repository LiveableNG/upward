/*
  Warnings:

  - You are about to drop the column `label` on the `upward_payment_line_item` table. All the data in the column will be lost.
  - Added the required column `name` to the `upward_payment_line_item` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "upward_payment_line_item" DROP COLUMN "label",
ADD COLUMN     "name" TEXT NOT NULL;

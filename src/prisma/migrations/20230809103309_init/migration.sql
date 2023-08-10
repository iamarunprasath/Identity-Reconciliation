/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Post";

-- CreateTable
CREATE TABLE "CustomerInfo" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "linkedId" INTEGER,
    "linkPrecedence" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerInfo_pkey" PRIMARY KEY ("id")
);

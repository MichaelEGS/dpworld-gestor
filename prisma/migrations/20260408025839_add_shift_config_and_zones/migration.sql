-- CreateTable
CREATE TABLE "DayShiftConfig" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "shifts" TEXT NOT NULL,

    CONSTRAINT "DayShiftConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayShiftConfig_date_key" ON "DayShiftConfig"("date");

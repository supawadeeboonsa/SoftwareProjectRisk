-- CreateEnum
CREATE TYPE "ScenarioChangeFactor" AS ENUM ('BUDGET', 'TEAM_SIZE', 'TASK_DURATION', 'RISK_PROBABILITY', 'RISK_IMPACT');

-- CreateTable
CREATE TABLE "scenarios" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_changes" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "factor" "ScenarioChangeFactor" NOT NULL,
    "taskId" TEXT,
    "riskId" TEXT,
    "newValue" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formulaVersion" TEXT NOT NULL DEFAULT '1.0',
    "beforeDuration" INTEGER NOT NULL,
    "afterDuration" INTEGER NOT NULL,
    "durationChange" INTEGER NOT NULL,
    "beforeBudget" DECIMAL(14,2) NOT NULL,
    "afterBudget" DECIMAL(14,2) NOT NULL,
    "budgetChange" DECIMAL(14,2) NOT NULL,
    "budgetChangePercent" DECIMAL(10,4),
    "beforeTeamSize" INTEGER NOT NULL,
    "afterTeamSize" INTEGER NOT NULL,
    "riskChanges" JSONB NOT NULL,
    "impactSummary" TEXT[],
    "recommendation" TEXT[],

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_changes" ADD CONSTRAINT "scenario_changes_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_changes" ADD CONSTRAINT "scenario_changes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_changes" ADD CONSTRAINT "scenario_changes_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

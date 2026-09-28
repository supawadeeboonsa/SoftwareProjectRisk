/*
  Warnings:

  - You are about to drop the column `createdAt` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `teamSize` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `risks` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `risks` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `risks` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `scenario_changes` table. All the data in the column will be lost.
  - You are about to drop the column `newValue` on the `scenario_changes` table. All the data in the column will be lost.
  - You are about to drop the column `riskId` on the `scenario_changes` table. All the data in the column will be lost.
  - You are about to drop the column `scenarioId` on the `scenario_changes` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `scenario_changes` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `scenarios` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `scenarios` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `scenarios` table. All the data in the column will be lost.
  - You are about to drop the column `afterBudget` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `afterDuration` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `afterTeamSize` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `beforeBudget` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `beforeDuration` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `beforeTeamSize` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `budgetChange` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `budgetChangePercent` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `durationChange` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `executedAt` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `formulaVersion` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `impactSummary` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `riskChanges` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `scenarioId` on the `simulations` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `task_dependencies` table. All the data in the column will be lost.
  - You are about to drop the column `dependsOnTaskId` on the `task_dependencies` table. All the data in the column will be lost.
  - You are about to drop the column `taskId` on the `task_dependencies` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `tasks` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[task_id,depends_on_task_id]` on the table `task_dependencies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `end_date` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `team_size` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `risks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `risks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_value` to the `scenario_changes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scenario_id` to the `scenario_changes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `scenarios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `scenarios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `after_budget` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `after_duration` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `after_team_size` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `before_budget` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `before_duration` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `before_team_size` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `budget_change` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration_change` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `risk_changes` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scenario_id` to the `simulations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `depends_on_task_id` to the `task_dependencies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `task_id` to the `task_dependencies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "risks" DROP CONSTRAINT "risks_projectId_fkey";

-- DropForeignKey
ALTER TABLE "scenario_changes" DROP CONSTRAINT "scenario_changes_riskId_fkey";

-- DropForeignKey
ALTER TABLE "scenario_changes" DROP CONSTRAINT "scenario_changes_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "scenario_changes" DROP CONSTRAINT "scenario_changes_taskId_fkey";

-- DropForeignKey
ALTER TABLE "scenarios" DROP CONSTRAINT "scenarios_projectId_fkey";

-- DropForeignKey
ALTER TABLE "simulations" DROP CONSTRAINT "simulations_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "task_dependencies" DROP CONSTRAINT "task_dependencies_dependsOnTaskId_fkey";

-- DropForeignKey
ALTER TABLE "task_dependencies" DROP CONSTRAINT "task_dependencies_taskId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_projectId_fkey";

-- DropIndex
DROP INDEX "task_dependencies_taskId_dependsOnTaskId_key";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "createdAt",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
DROP COLUMN "teamSize",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "end_date" DATE NOT NULL,
ADD COLUMN     "start_date" DATE NOT NULL,
ADD COLUMN     "team_size" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "risks" DROP COLUMN "createdAt",
DROP COLUMN "projectId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "scenario_changes" DROP COLUMN "createdAt",
DROP COLUMN "newValue",
DROP COLUMN "riskId",
DROP COLUMN "scenarioId",
DROP COLUMN "taskId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "new_value" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "risk_id" TEXT,
ADD COLUMN     "scenario_id" TEXT NOT NULL,
ADD COLUMN     "task_id" TEXT;

-- AlterTable
ALTER TABLE "scenarios" DROP COLUMN "createdAt",
DROP COLUMN "projectId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "simulations" DROP COLUMN "afterBudget",
DROP COLUMN "afterDuration",
DROP COLUMN "afterTeamSize",
DROP COLUMN "beforeBudget",
DROP COLUMN "beforeDuration",
DROP COLUMN "beforeTeamSize",
DROP COLUMN "budgetChange",
DROP COLUMN "budgetChangePercent",
DROP COLUMN "durationChange",
DROP COLUMN "executedAt",
DROP COLUMN "formulaVersion",
DROP COLUMN "impactSummary",
DROP COLUMN "riskChanges",
DROP COLUMN "scenarioId",
ADD COLUMN     "after_budget" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "after_duration" INTEGER NOT NULL,
ADD COLUMN     "after_team_size" INTEGER NOT NULL,
ADD COLUMN     "before_budget" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "before_duration" INTEGER NOT NULL,
ADD COLUMN     "before_team_size" INTEGER NOT NULL,
ADD COLUMN     "budget_change" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "budget_change_percent" DECIMAL(10,4),
ADD COLUMN     "duration_change" INTEGER NOT NULL,
ADD COLUMN     "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "formula_version" TEXT NOT NULL DEFAULT '1.0',
ADD COLUMN     "impact_summary" TEXT[],
ADD COLUMN     "risk_changes" JSONB NOT NULL,
ADD COLUMN     "scenario_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "task_dependencies" DROP COLUMN "createdAt",
DROP COLUMN "dependsOnTaskId",
DROP COLUMN "taskId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "depends_on_task_id" TEXT NOT NULL,
ADD COLUMN     "task_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "createdAt",
DROP COLUMN "projectId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_task_id_depends_on_task_id_key" ON "task_dependencies"("task_id", "depends_on_task_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_changes" ADD CONSTRAINT "scenario_changes_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_changes" ADD CONSTRAINT "scenario_changes_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_changes" ADD CONSTRAINT "scenario_changes_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

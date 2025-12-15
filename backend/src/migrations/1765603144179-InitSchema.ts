import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1765603144179 implements MigrationInterface {
    name = 'InitSchema1765603144179'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_accounts_role_enum" AS ENUM('SUPER_ADMIN', 'PLANT_ADMIN', 'HR_ADMIN', 'MODERATOR', 'APPROVER', 'EMPLOYEE')`);
        await queryRunner.query(`CREATE TYPE "public"."user_accounts_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_ACTIVATION')`);
        await queryRunner.query(`CREATE TABLE "user_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid, "username" character varying NOT NULL, "email" character varying NOT NULL, "password_hash" character varying, "password_reset_token" character varying, "password_reset_expires" TIMESTAMP, "email_verified" boolean NOT NULL DEFAULT true, "phone_number" character varying, "mfa_enabled" boolean NOT NULL DEFAULT false, "mfa_secret" character varying, "mfa_backup_codes" jsonb, "role" "public"."user_accounts_role_enum" NOT NULL DEFAULT 'EMPLOYEE', "permissions" jsonb, "access_levels" jsonb, "status" "public"."user_accounts_status_enum" NOT NULL DEFAULT 'ACTIVE', "last_login" TIMESTAMP, "login_attempts" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP, "must_change_password" boolean NOT NULL DEFAULT false, "password_changed_at" TIMESTAMP, "profile_image_url" character varying, "language" character varying NOT NULL DEFAULT 'EN', "timezone" character varying NOT NULL DEFAULT 'UTC', "notification_preferences" jsonb, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deactivated_by" uuid, "deactivated_at" TIMESTAMP, "deactivation_reason" character varying, CONSTRAINT "UQ_d45e7ca4a62293443961558c564" UNIQUE ("username"), CONSTRAINT "UQ_df3802ec9c31dd9491e3589378d" UNIQUE ("email"), CONSTRAINT "PK_125e915cf23ad1cfb43815ce59b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "code" character varying NOT NULL, "description" character varying, "is_system" boolean NOT NULL DEFAULT false, "permissions" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "module" character varying NOT NULL, "action" character varying NOT NULL, "resource" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "session_token" character varying NOT NULL, "refresh_token" character varying NOT NULL, "ip_address" character varying, "user_agent" character varying, "device_info" jsonb, "location" character varying, "login_at" TIMESTAMP NOT NULL DEFAULT now(), "last_activity" TIMESTAMP, "expires_at" TIMESTAMP, "is_active" boolean NOT NULL DEFAULT true, "logout_at" TIMESTAMP, "logout_reason" character varying, CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "approval_chains" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employeeId" character varying NOT NULL, "employeeName" character varying NOT NULL, "department" character varying, "sequenceLevel" integer NOT NULL, "managerId" character varying NOT NULL, "managerName" character varying NOT NULL, "branch" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "manager_user_id" uuid, CONSTRAINT "PK_19e868fb98a0586dc06188affe0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_575e9d23919a6d67d1b2fa16df" ON "approval_chains" ("employeeId", "sequenceLevel") `);
        await queryRunner.query(`CREATE TYPE "public"."kpi_definitions_category_enum" AS ENUM('Business', 'MainTasks', 'Projects')`);
        await queryRunner.query(`CREATE TYPE "public"."kpi_definitions_type_enum" AS ENUM('+', '-')`);
        await queryRunner.query(`CREATE TYPE "public"."kpi_definitions_performancerating_enum" AS ENUM('RED', 'YELLOW', 'GREEN')`);
        await queryRunner.query(`CREATE TYPE "public"."kpi_definitions_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "kpi_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_name" character varying NOT NULL, "quarter" character varying NOT NULL, "fiscal_year" integer NOT NULL, "employee_id" uuid NOT NULL, "manager_id" uuid, "department" character varying NOT NULL, "job_title" character varying, "category" "public"."kpi_definitions_category_enum" NOT NULL, "kpi_name_en" character varying NOT NULL, "kpi_name_fa" character varying, "kpi_description" text, "objective_weight" numeric(5,3) NOT NULL, "kpi_weight" numeric(5,3) NOT NULL, "target_value" numeric(15,2), "achievement_value" numeric(15,2), "type" "public"."kpi_definitions_type_enum" NOT NULL, "percentage_achievement" numeric(5,2), "score_achievement" numeric(10,4), "performanceRating" "public"."kpi_definitions_performancerating_enum", "status" "public"."kpi_definitions_status_enum" NOT NULL DEFAULT 'DRAFT', "comments" text, "approved_by" uuid, "approved_at" TIMESTAMP, "approval_notes" text, "rejected_reason" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "created_by" uuid, CONSTRAINT "PK_c68b23412c3d914579ce17c1d24" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c54eb398117316fb9db7b7aef6" ON "kpi_definitions" ("manager_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_d11cd2cdc459a750640f5104ea" ON "kpi_definitions" ("department", "quarter") `);
        await queryRunner.query(`CREATE INDEX "IDX_ad0fdec7e3ee4177ce9d3d9cc8" ON "kpi_definitions" ("employee_id", "quarter") `);
        await queryRunner.query(`CREATE TYPE "public"."kpi_approval_history_fromstatus_enum" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TYPE "public"."kpi_approval_history_tostatus_enum" AS ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED')`);
        await queryRunner.query(`CREATE TABLE "kpi_approval_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kpi_id" uuid NOT NULL, "fromStatus" "public"."kpi_approval_history_fromstatus_enum" NOT NULL, "toStatus" "public"."kpi_approval_history_tostatus_enum" NOT NULL, "approver_id" uuid, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b647f97453d9f27899652b7da4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e9aa4f64f0435a6bfe1f18abe3" ON "kpi_approval_history" ("approver_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_6fb8a2d5e6ea234f1e5c1aa5aa" ON "kpi_approval_history" ("kpi_id", "created_at") `);
        await queryRunner.query(`CREATE TYPE "public"."kpi_period_summary_overallrating_enum" AS ENUM('RED', 'YELLOW', 'GREEN')`);
        await queryRunner.query(`CREATE TABLE "kpi_period_summary" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "quarter" character varying NOT NULL, "fiscal_year" integer NOT NULL, "department" character varying NOT NULL, "total_kpis" integer NOT NULL, "completed_kpis" integer NOT NULL, "average_achievement" numeric(5,2) NOT NULL, "total_score" numeric(10,4) NOT NULL, "overallRating" "public"."kpi_period_summary_overallrating_enum" NOT NULL, "business_score" numeric(10,4), "main_tasks_score" numeric(10,4), "projects_score" numeric(10,4), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_37378c0e677fe142c2b586a5241" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9fa9c2d1756010e253b7fcc934" ON "kpi_period_summary" ("department", "fiscal_year") `);
        await queryRunner.query(`CREATE INDEX "IDX_c484d49ea9c4a25a4b8e589332" ON "kpi_period_summary" ("employee_id", "quarter", "fiscal_year") `);
        await queryRunner.query(`CREATE TABLE "user_import_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying, "username" character varying NOT NULL, "email" character varying NOT NULL, "role" character varying, "status" character varying NOT NULL DEFAULT 'PENDING', "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "created_user_id" uuid, CONSTRAINT "PK_dccc156d2df4aae2be62e39ac98" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('LOGIN', 'LOGOUT', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ASSIGN_ROLE', 'CHANGE_PASSWORD', 'LOCK_USER', 'UNLOCK_USER', 'IMPORT_USERS', 'APPROVE_KPI', 'SUBMIT_KPI', 'UNKNOWN')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "action" "public"."audit_logs_action_enum" NOT NULL, "resource_type" character varying, "resource_id" uuid, "description" text, "metadata" jsonb, "ip_address" character varying, "user_agent" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "approval_chains" ADD CONSTRAINT "FK_c101b473a6b893e640e1c1c5963" FOREIGN KEY ("manager_user_id") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kpi_definitions" ADD CONSTRAINT "FK_1a86f932960e09e6d57d201e42c" FOREIGN KEY ("employee_id") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kpi_definitions" ADD CONSTRAINT "FK_1a6fbcc57b8e3db938ef612423a" FOREIGN KEY ("manager_id") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kpi_approval_history" ADD CONSTRAINT "FK_1b53c570f976c484f419bac6b4a" FOREIGN KEY ("kpi_id") REFERENCES "kpi_definitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kpi_approval_history" ADD CONSTRAINT "FK_e9aa4f64f0435a6bfe1f18abe32" FOREIGN KEY ("approver_id") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "kpi_period_summary" ADD CONSTRAINT "FK_9703fc591365edaf58cf7c18ada" FOREIGN KEY ("employee_id") REFERENCES "user_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_import_logs" ADD CONSTRAINT "FK_26f15dc31ecb9a776a0acb695ce" FOREIGN KEY ("created_user_id") REFERENCES "user_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_import_logs" DROP CONSTRAINT "FK_26f15dc31ecb9a776a0acb695ce"`);
        await queryRunner.query(`ALTER TABLE "kpi_period_summary" DROP CONSTRAINT "FK_9703fc591365edaf58cf7c18ada"`);
        await queryRunner.query(`ALTER TABLE "kpi_approval_history" DROP CONSTRAINT "FK_e9aa4f64f0435a6bfe1f18abe32"`);
        await queryRunner.query(`ALTER TABLE "kpi_approval_history" DROP CONSTRAINT "FK_1b53c570f976c484f419bac6b4a"`);
        await queryRunner.query(`ALTER TABLE "kpi_definitions" DROP CONSTRAINT "FK_1a6fbcc57b8e3db938ef612423a"`);
        await queryRunner.query(`ALTER TABLE "kpi_definitions" DROP CONSTRAINT "FK_1a86f932960e09e6d57d201e42c"`);
        await queryRunner.query(`ALTER TABLE "approval_chains" DROP CONSTRAINT "FK_c101b473a6b893e640e1c1c5963"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP TABLE "user_import_logs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c484d49ea9c4a25a4b8e589332"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fa9c2d1756010e253b7fcc934"`);
        await queryRunner.query(`DROP TABLE "kpi_period_summary"`);
        await queryRunner.query(`DROP TYPE "public"."kpi_period_summary_overallrating_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6fb8a2d5e6ea234f1e5c1aa5aa"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e9aa4f64f0435a6bfe1f18abe3"`);
        await queryRunner.query(`DROP TABLE "kpi_approval_history"`);
        await queryRunner.query(`DROP TYPE "public"."kpi_approval_history_tostatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."kpi_approval_history_fromstatus_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ad0fdec7e3ee4177ce9d3d9cc8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d11cd2cdc459a750640f5104ea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c54eb398117316fb9db7b7aef6"`);
        await queryRunner.query(`DROP TABLE "kpi_definitions"`);
        await queryRunner.query(`DROP TYPE "public"."kpi_definitions_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."kpi_definitions_performancerating_enum"`);
        await queryRunner.query(`DROP TYPE "public"."kpi_definitions_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."kpi_definitions_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_575e9d23919a6d67d1b2fa16df"`);
        await queryRunner.query(`DROP TABLE "approval_chains"`);
        await queryRunner.query(`DROP TABLE "user_sessions"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "user_accounts"`);
        await queryRunner.query(`DROP TYPE "public"."user_accounts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_accounts_role_enum"`);
    }

}

# KPI Field Mapping (Frontend ↔ API ↔ Database)

## Scope
- Component: `frontend/src/pages/KpiDashboard.jsx`
- Endpoints used:
  - `GET /analytics/kpis/status-report?quarter=Qx&fiscalYear=YYYY`
  - `GET /kpis?quarter=Qx&fiscalYear=YYYY&take=5000&skip=0`
- Database: `kpi_definitions` (entity `KPIDefinition`)

## Mapping
- Frontend `department`
  - API JSON: `department`
  - DB column: `kpi_definitions.department`
  - Type: `varchar`

- Frontend `status`
  - API JSON: `status`
  - DB column: `kpi_definitions.status`
  - Type: `enum` (`DRAFT|SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|ARCHIVED`)

- Frontend `quarter`
  - API JSON: `quarter`
  - DB column: `kpi_definitions.quarter`
  - Type: `varchar` (`Q1|Q2|Q3|Q4`)

- Frontend `fiscalYear`
  - API JSON: `fiscalYear`
  - DB column: `kpi_definitions.fiscal_year`
  - Type: `number`

- Derived `completionPercent` (dashboard)
  - Source: `status-report.completionPercentage` or calculated per department:
    - `(APPROVED + REJECTED) / total * 100`
  - Not stored as a DB column (computed)

- Derived `statusBreakdown` (dashboard)
  - Source: `status-report.statusBreakdown`
  - Not stored as a DB column (computed)

## Conventions
- CamelCase is used in API JSON and frontend for entity properties, matching the NestJS entity field names.
- Snake/camel conversion exists at the DB layer via `@Column({ name: '...' })` decorators.
- Frontend query param `departman` is intentional for `KpiPeopleWorks` routing and does not map to DB; the DB/API use `department`.

## Discrepancies
- None within `KpiDashboard.jsx` usage:
  - `department` ↔ `department` ↔ `department` (consistent)
  - `status` ↔ `status` ↔ `status` (consistent)
  - `quarter` ↔ `quarter` ↔ `quarter` (consistent)
  - `fiscalYear` ↔ `fiscalYear` ↔ `fiscal_year` (decorated mapping handled by TypeORM)
- Note: Other pages may use legacy keys like `KPIFa`, `KPI_Info`. These are out of scope for this component and come from a different/legacy API.

## Validation
- Backend: `GET /kpis` now strictly coerces `take`/`skip` to numeric and clamps ranges.
- Frontend: while building department metrics, record with missing/empty `department` is normalized to `"نامشخص"`; only `APPROVED|REJECTED` count as completed.

## Testing
- Dev URL: `http://localhost:5174/` (Vite)
- API URL: `http://localhost:3001`
- Tests performed:
  - `GET /analytics/kpis/status-report` returns `completionPercentage` and `statusBreakdown`.
  - `GET /kpis?quarter=Qx&fiscalYear=YYYY&take=5000&skip=0` returns list without `skip` errors.


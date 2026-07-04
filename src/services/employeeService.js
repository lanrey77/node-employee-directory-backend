const database = require('../database');

/*
 * Legacy JSON and SQLite implementations are retained as commented references.
 *
 * JSON used fs.readFileSync()/fs.writeFileSync() against data/employees.json.
 * SQLite used better-sqlite3 and synchronous database.prepare(...).all/get/run.
 * The complete retired SQLite connection/schema is in src/database.js.
 */

const EMPLOYEE_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'department', 'designation',
  'salary', 'joinDate', 'status', 'location', 'managerId', 'avatar'
];
const SORTABLE_FIELDS = new Set(['id', ...EMPLOYEE_FIELDS]);
const COLUMN = Object.fromEntries(
  ['id', ...EMPLOYEE_FIELDS].map(field => [field, `"${field}"`])
);

function buildWhereClause(query)
{
  const conditions = [];
  const parameters = [];
  const add = value =>
  {
    parameters.push(value);
    return `$${parameters.length}`;
  };

  if (query.q)
  {
    const placeholder = add(`%${String(query.q).toLowerCase()}%`);
    conditions.push(`(
      LOWER("firstName") LIKE ${placeholder} OR LOWER("lastName") LIKE ${placeholder} OR
      LOWER(email) LIKE ${placeholder} OR LOWER(department) LIKE ${placeholder} OR
      LOWER(designation) LIKE ${placeholder} OR LOWER(location) LIKE ${placeholder}
    )`);
  }

  for (const field of ['department', 'status', 'location'])
  {
    if (query[field])
    {
      conditions.push(`${COLUMN[field]} = ${add(query[field])}`);
    }
  }

  if (query.joinDateFrom)
  {
    conditions.push(`"joinDate" >= ${add(query.joinDateFrom)}`);
  }
  if (query.joinDateTo)
  {
    conditions.push(`"joinDate" <= ${add(query.joinDateTo)}`);
  }
  if (query.salaryMin !== undefined && query.salaryMin !== '')
  {
    conditions.push(`salary >= ${add(Number(query.salaryMin))}`);
  }
  if (query.salaryMax !== undefined && query.salaryMax !== '')
  {
    conditions.push(`salary <= ${add(Number(query.salaryMax))}`);
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    parameters
  };
}

function buildOrderClause(query)
{
  if (!query._sort)
  {
    return 'ORDER BY id ASC';
  }

  const fields = String(query._sort).split(',');
  const orders = query._order ? String(query._order).split(',') : [];
  const clauses = fields
    .filter(field => SORTABLE_FIELDS.has(field))
    .map((field, index) =>
      `${COLUMN[field]} ${String(orders[index]).toLowerCase() === 'desc' ? 'DESC' : 'ASC'}`
    );
  return clauses.length ? `ORDER BY ${clauses.join(', ')}` : 'ORDER BY id ASC';
}

function getPagination(query)
{
  const requestedPage = Number.parseInt(query.page ?? query._page, 10);
  const requestedLimit = Number.parseInt(query.limit ?? query.pageSize ?? query._limit, 10);
  return {
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    limit: Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10
  };
}

async function listEmployees(query)
{
  const { sql: where, parameters } = buildWhereClause(query);
  const { page, limit } = getPagination(query);
  const countResult = await database.query(
    `SELECT COUNT(*)::integer AS "totalItems" FROM employees ${where}`,
    parameters
  );
  const totalItems = countResult.rows[0].totalItems;
  const dataResult = await database.query(
    `SELECT * FROM employees ${where} ${buildOrderClause(query)}
     LIMIT $${parameters.length + 1} OFFSET $${parameters.length + 2}`,
    [...parameters, limit, (page - 1) * limit]
  );

  return {
    data: dataResult.rows,
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    },
    totalFiltered: totalItems
  };
}

async function getEmployeeStats()
{
  const totals = (await database.query(`
    SELECT COUNT(*)::integer AS total, MIN(salary) AS "minSalary",
      MAX(salary) AS "maxSalary", MIN("joinDate") AS "earliestJoinDate",
      MAX("joinDate") AS "latestJoinDate"
    FROM employees
  `)).rows[0];

  const groupCounts = async field => Object.fromEntries(
    (await database.query(`
      SELECT ${COLUMN[field]} AS value, COUNT(*)::integer AS count
      FROM employees GROUP BY ${COLUMN[field]}
    `)).rows.map(row => [row.value, row.count])
  );

  return {
    total: totals.total,
    byDepartment: await groupCounts('department'),
    byStatus: await groupCounts('status'),
    byLocation: await groupCounts('location'),
    salaryRange: { min: totals.minSalary, max: totals.maxSalary },
    joinDateRange: {
      earliest: totals.earliestJoinDate,
      latest: totals.latestJoinDate
    }
  };
}

async function exportEmployees(query)
{
  const { sql: where, parameters } = buildWhereClause(query);
  const result = await database.query(
    `SELECT * FROM employees ${where} ${buildOrderClause(query)}`,
    parameters
  );
  return result.rows;
}

async function getEmployeeById(id)
{
  const result = await database.query('SELECT * FROM employees WHERE id = $1', [id]);
  return result.rows[0];
}

async function createEmployee(payload)
{
  const values = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone ?? null,
    department: payload.department ?? null,
    designation: payload.designation ?? null,
    salary: payload.salary ?? null,
    joinDate: payload.joinDate || new Date().toISOString().split('T')[0],
    status: payload.status || 'active',
    location: payload.location ?? null,
    managerId: payload.managerId ?? null,
    avatar: payload.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`
  };
  const result = await database.query(`
    INSERT INTO employees (${EMPLOYEE_FIELDS.map(field => COLUMN[field]).join(', ')})
    VALUES (${EMPLOYEE_FIELDS.map((field, index) => `$${index + 1}`).join(', ')})
    RETURNING *
  `, EMPLOYEE_FIELDS.map(field => values[field]));
  return result.rows[0];
}

async function updateEmployee(id, payload)
{
  const fields = EMPLOYEE_FIELDS.filter(field =>
    Object.prototype.hasOwnProperty.call(payload, field)
  );
  if (!fields.length)
  {
    return getEmployeeById(id);
  }

  const assignments = fields.map((field, index) => `${COLUMN[field]} = $${index + 1}`);
  const result = await database.query(`
    UPDATE employees SET ${assignments.join(', ')}
    WHERE id = $${fields.length + 1}
    RETURNING *
  `, [...fields.map(field => payload[field]), id]);
  return result.rows[0];
}

async function deleteEmployee(id)
{
  return (await database.query(
    'DELETE FROM employees WHERE id = $1 RETURNING id',
    [id]
  )).rowCount > 0;
}

async function bulkDelete(ids)
{
  const numericIds = ids.map(Number).filter(Number.isInteger);
  if (!numericIds.length)
  {
    return 0;
  }
  return (await database.query(
    'DELETE FROM employees WHERE id = ANY($1::integer[])',
    [numericIds]
  )).rowCount;
}

module.exports = {
  listEmployees,
  getEmployeeStats,
  exportEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkDelete
};
